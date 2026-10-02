import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Offline triage only: no scraping, database writes or changes to published catalogue data. */
const Robot = z.object({
  id: z.string().min(1), key: z.string().min(1), maker_slug: z.string().min(1),
  maker: z.string(), model_slug: z.string().min(1), variant: z.string().min(1),
  name: z.string(), public: z.boolean(), form_factor: z.string(), status: z.string(),
  website: z.string().nullable().optional(), sourceUrls: z.array(z.string()).default([]),
});
const Fact = z.object({
  robot_id: z.string(), field: z.string(), qualifier: z.string().nullable().optional(),
  source_tier: z.number().nullable(), source_url: z.string(), evidence_url: z.string().nullable().optional(),
  observed_at: z.string(), invalidated_at: z.string().nullable().optional(),
});
const Availability = z.object({
  robot_id: z.string(), region: z.string(), status: z.string(),
  source_tier: z.number().nullable().optional(), source_kind: z.string().nullable().optional(),
  source_url: z.string(), observed_at: z.string(),
  in_stock: z.boolean().nullable().optional(), lead_time_text: z.string().nullable().optional(),
});
const Issue = z.object({ robot: z.string(), kind: z.string(), detail: z.unknown().optional() });
export const AuditInput = z.object({
  catalogue: z.array(Robot), facts: z.array(Fact), availability: z.array(Availability), issues: z.array(Issue),
  summary: z.object({ auditedAt: z.string(), robots: z.number().int().nonnegative() }).passthrough(),
});
export type AuditInput = z.infer<typeof AuditInput>;

export const PRIORITY_ZERO_ISSUES = [
  'possible_duplicate_name', 'conflicting_specs', 'lifecycle_availability_conflict',
  'inverted_range', 'invalid_confidence', 'invalid_observed_date', 'unknown_field',
  'invalid_source_url', 'numeric_outlier', 'invalid_price', 'invalid_currency',
] as const;
const p0Kinds = new Set<string>(PRIORITY_ZERO_ISSUES);
const saleStatuses = new Set(['for_sale', 'enterprise_only']);
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
const fieldKey = (f: z.infer<typeof Fact>) => f.qualifier ? `${f.field}:${f.qualifier}` : f.field;

export const LIMITATIONS = [
  'Every configuration is unreviewed. This queue is automated triage of a stored audit, not source verification.',
  'Tier counts describe recorded source metadata. They do not establish factual accuracy, correct variant attribution, deployment readiness, stock, or delivery.',
  'Buying claims retain their recorded region. GLOBAL and EU never imply German delivery; tier 3 claims are reported and are excluded from tier 1/2 buying counts.',
  'A tier 1/2 for_sale or enterprise_only claim is not verified stock, seller authorization, a current quote, delivery, or local service coverage.',
  'task_capabilities and deployment_evidence counts are active ledger claims, not validated tasks or deployments. They exclude the separate task YAML library.',
  'Tier 1/2 buying counts cover only the input availability ledger and exclude separately curated data/purchasing/contacts.json listings.',
  'The as-of date is the review planning date. The input audit supplies the observations; this command does not refresh sources or reconstruct historical state.',
];

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}; resolve the audit input rather than silently merging configurations`);
    seen.add(value);
  }
}

export function buildReviewQueue(raw: unknown, asOf: string) {
  validateDate(asOf);
  const input = AuditInput.parse(raw);
  assertUnique(input.catalogue.map((r) => r.id), 'robot id');
  assertUnique(input.catalogue.map((r) => `${r.maker_slug}/${r.model_slug}#${r.variant}`), 'configuration');
  assertUnique(input.catalogue.map((r) => r.key), 'catalogue key');
  if (input.summary.robots !== input.catalogue.length) throw new Error('Audit summary robot count does not match catalogue; regenerate a consistent audit');
  const ids = new Set(input.catalogue.map((r) => r.id));
  const keys = new Set(input.catalogue.map((r) => r.key));
  for (const fact of input.facts) if (!ids.has(fact.robot_id)) throw new Error(`Fact references unknown robot: ${fact.robot_id}`);
  for (const claim of input.availability) if (!ids.has(claim.robot_id)) throw new Error(`Availability references unknown robot: ${claim.robot_id}`);
  for (const issue of input.issues) if (!keys.has(issue.robot) && !ids.has(issue.robot)) throw new Error(`Issue references unknown robot: ${issue.robot}`);

  const rows = input.catalogue.map((robot) => {
    const facts = input.facts.filter((f) => f.robot_id === robot.id);
    const active = facts.filter((f) => !f.invalidated_at);
    const tier1 = active.filter((f) => f.source_tier === 1);
    const dates = tier1.map((f) => f.observed_at).filter((date) => Number.isFinite(Date.parse(date)))
      .sort((a, b) => Date.parse(b) - Date.parse(a) || a.localeCompare(b));
    const issues = input.issues.filter((i) => i.robot === robot.key || i.robot === robot.id);
    const issueKinds = unique(issues.map((i) => i.kind));
    const urgent = issueKinds.filter((kind) => p0Kinds.has(kind));
    const priority: 'P0' | 'P1' | 'P2' = !robot.public ? 'P2' : urgent.length ? 'P0' : 'P1';
    const availability = input.availability.filter((a) => a.robot_id === robot.id);
    const tier12BuyingClaims = availability.filter((a) => (a.source_tier === 1 || a.source_tier === 2) && saleStatuses.has(a.status))
      .map((a) => ({
        region: a.region, status: a.status, sourceTier: a.source_tier!, sourceKind: a.source_kind ?? null,
        sourceUrl: a.source_url, observedAt: a.observed_at,
        recordedInStock: a.in_stock ?? null, recordedLeadTimeText: a.lead_time_text ?? null,
      })).sort((a, b) => a.region.localeCompare(b.region) || a.sourceTier - b.sourceTier || a.sourceUrl.localeCompare(b.sourceUrl));
    const nextActions: string[] = [];
    if (issueKinds.includes('possible_duplicate_name')) nextActions.push('Resolve model and configuration identity against exact manufacturer product pages; do not merge base and EDU by name.');
    if (urgent.length) nextActions.push(`Review recorded integrity/conflict issues against original evidence: ${urgent.join(', ')}.`);
    if (!robot.website) nextActions.push('Find and validate the manufacturer website and exact product page.');
    nextActions.push(tier1.length ? 'Recheck recorded manufacturer facts for this exact configuration, units, qualifiers and operating conditions.' : 'Collect exact manufacturer product-page, manual or datasheet evidence; leave unpublished values unknown.');
    nextActions.push('Check German purchasing channels, published business contacts, buyer restrictions, authorization evidence and service coverage.');
    nextActions.push('Find task-specific deployment evidence including configuration, operating conditions, supervision and measured outcomes.');
    if (!robot.public) nextActions.push('Retain the hidden record and review its identity/lifecycle before considering publication.');
    return {
      robotId: robot.id, key: robot.key, manufacturer: robot.maker, manufacturerSlug: robot.maker_slug,
      model: robot.model_slug, variant: robot.variant, name: robot.name,
      formFactor: robot.form_factor, recordedLifecycle: robot.status, visibility: robot.public ? 'public' : 'hidden',
      priority, priorityReasons: urgent.length ? urgent : [robot.public ? 'public_record_needs_source_review' : 'hidden_record'],
      reviewStatus: 'unreviewed' as const, reviewAsOf: asOf, manufacturerWebsite: robot.website ?? null,
      activeFactCount: active.length, invalidatedFactCount: facts.length - active.length,
      activeTier1FactCount: tier1.length, latestTier1Observation: dates[0] ?? null,
      factFields: unique(active.map(fieldKey)), activeTier1Fields: unique(tier1.map(fieldKey)),
      taskCapabilitiesActiveFactCount: active.filter((f) => f.field === 'task_capabilities').length,
      deploymentEvidenceActiveFactCount: active.filter((f) => f.field === 'deployment_evidence').length,
      issueKinds, recordedIssues: issues.map(({ kind, detail }) => ({ kind, detail: detail ?? null })),
      sourceUrls: unique([...robot.sourceUrls, ...facts.flatMap((f) => [f.source_url, f.evidence_url ?? '']), ...availability.map((a) => a.source_url)]),
      activeTier1SourceUrls: unique(tier1.map((f) => f.source_url)),
      tier12BuyingClaims, tier12BuyingRegions: unique(tier12BuyingClaims.map((a) => a.region)),
      hasRecordedTier12DeBuyingClaim: tier12BuyingClaims.some((a) => a.region === 'DE'),
      reportedTier3BuyingClaimCount: availability.filter((a) => a.source_tier === 3 && saleStatuses.has(a.status)).length,
      nextActions,
    };
  }).sort((a, b) => a.priority.localeCompare(b.priority) || a.key.localeCompare(b.key));
  const publicRows = rows.filter((r) => r.visibility === 'public');
  const summary = {
    schemaVersion: 1, reviewAsOf: asOf, inputAuditedAt: input.summary.auditedAt,
    reviewStatus: 'unreviewed', configurationCount: rows.length, publicConfigurations: publicRows.length,
    hiddenConfigurations: rows.length - publicRows.length, baseConfigurations: rows.filter((r) => r.variant === 'base').length,
    nonBaseConfigurations: rows.filter((r) => r.variant !== 'base').length,
    priorities: Object.fromEntries(['P0', 'P1', 'P2'].map((p) => [p, rows.filter((r) => r.priority === p).length])),
    configurationsWithActiveTier1Facts: rows.filter((r) => r.activeTier1FactCount > 0).length,
    publicConfigurationsWithActiveTier1Facts: publicRows.filter((r) => r.activeTier1FactCount > 0).length,
    publicConfigurationsWithoutActiveTier1Facts: publicRows.filter((r) => r.activeTier1FactCount === 0).length,
    activeTier1FactCount: rows.reduce((sum, r) => sum + r.activeTier1FactCount, 0),
    invalidatedFactCount: rows.reduce((sum, r) => sum + r.invalidatedFactCount, 0),
    configurationsWithRecordedTier12BuyingClaims: rows.filter((r) => r.tier12BuyingClaims.length > 0).length,
    publicConfigurationsWithRecordedTier12BuyingClaims: publicRows.filter((r) => r.tier12BuyingClaims.length > 0).length,
    configurationsWithRecordedTier12DeBuyingClaim: rows.filter((r) => r.hasRecordedTier12DeBuyingClaim).length,
    publicConfigurationsWithRecordedTier12DeBuyingClaim: publicRows.filter((r) => r.hasRecordedTier12DeBuyingClaim).length,
    taskCapabilitiesActiveFactCount: rows.reduce((sum, r) => sum + r.taskCapabilitiesActiveFactCount, 0),
    deploymentEvidenceActiveFactCount: rows.reduce((sum, r) => sum + r.deploymentEvidenceActiveFactCount, 0),
    configurationsWithTaskCapabilitiesFacts: rows.filter((r) => r.taskCapabilitiesActiveFactCount > 0).length,
    configurationsWithDeploymentEvidenceFacts: rows.filter((r) => r.deploymentEvidenceActiveFactCount > 0).length,
    recordedIssueCounts: Object.fromEntries(unique(input.issues.map((i) => i.kind)).map((kind) => [kind, input.issues.filter((i) => i.kind === kind).length])),
    priorityZeroIssueKinds: [...PRIORITY_ZERO_ISSUES], limitations: LIMITATIONS,
  };
  return { rows, summary };
}
export type ReviewRow = ReturnType<typeof buildReviewQueue>['rows'][number];

/** Quoting alone does not stop spreadsheet formulas, including whitespace-prefixed payloads. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function queueCsv(rows: ReviewRow[]): string {
  const columns: (keyof ReviewRow)[] = [
    'priority', 'reviewStatus', 'robotId', 'key', 'manufacturer', 'model', 'variant', 'name', 'formFactor',
    'recordedLifecycle', 'visibility', 'reviewAsOf', 'manufacturerWebsite', 'activeFactCount',
    'invalidatedFactCount', 'activeTier1FactCount', 'latestTier1Observation', 'factFields', 'activeTier1Fields',
    'taskCapabilitiesActiveFactCount', 'deploymentEvidenceActiveFactCount',
    'issueKinds', 'priorityReasons', 'sourceUrls', 'activeTier1SourceUrls', 'tier12BuyingRegions',
    'hasRecordedTier12DeBuyingClaim', 'reportedTier3BuyingClaimCount', 'tier12BuyingClaims', 'nextActions',
  ];
  return '\uFEFF' + [columns.map(csvCell).join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\r\n') + '\r\n';
}

export function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new Error('--as-of must be a real date in YYYY-MM-DD format');
  }
}
export function parseArgs(args: string[]) {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!['--input', '--output', '--as-of'].includes(flag) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Expected --input, --output or --as-of with a value; got ${flag}`);
    if (options[flag]) throw new Error(`Repeated option: ${flag}`);
    options[flag] = args[i + 1];
  }
  const asOf = options['--as-of'] ?? new Date().toISOString().slice(0, 10);
  validateDate(asOf);
  return { input: options['--input'] ?? '.out/catalogue-audit', output: options['--output'] ?? `docs/reviews/${asOf}`, asOf };
}

export function runReviewQueue(args: string[], root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const options = parseArgs(args);
  const inputDir = resolve(root, options.input);
  const outputDir = resolve(root, options.output);
  const within = relative(inputDir, outputDir);
  if (within === '' || (!within.startsWith('..') && !isAbsolute(within))) throw new Error('Output must be outside the source audit directory');
  const files = ['catalogue', 'facts', 'issues', 'availability', 'summary'] as const;
  const input: Record<string, unknown> = {};
  const hashes: Record<string, string> = {};
  for (const name of files) {
    const body = readFileSync(join(inputDir, `${name}.json`));
    hashes[`${name}.json`] = createHash('sha256').update(body).digest('hex');
    input[name] = JSON.parse(body.toString('utf8'));
  }
  const { rows, summary } = buildReviewQueue(input, options.asOf);
  const baselineHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const snapshotPath = 'data/snapshot/pglite.tar.gz';
  const snapshotSha256 = createHash('sha256').update(readFileSync(join(root, snapshotPath))).digest('hex');
  const pinnedSummary = {
    ...summary, baselineHead, snapshotPath, snapshotSha256,
    inputPath: relative(root, inputDir).replaceAll('\\', '/'), inputSha256: hashes,
    baselineNote: 'HEAD and snapshot checksum identify the local repository baseline; input checksums identify the audit used. They do not attest that source data is correct or current.',
  };
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'queue.json'), JSON.stringify(rows, null, 2) + '\n');
  writeFileSync(join(outputDir, 'queue.csv'), queueCsv(rows));
  writeFileSync(join(outputDir, 'summary.json'), JSON.stringify(pinnedSummary, null, 2) + '\n');
  return pinnedSummary;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(runReviewQueue(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
