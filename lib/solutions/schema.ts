import { INDUSTRY_IDS } from '@/lib/content/industries';
import { z } from 'zod';
import { FORM_FACTORS } from '@/lib/spec/enums';
import { WORKFLOW_IDS } from './workflows';

const text = z.string().trim().min(1);
const url = z.url().refine((value) => value.startsWith('https://'), 'HTTPS source expected');
const date = z.iso.date();
export const EVIDENCE_STAGES = ['unknown', 'manufacturer_claim', 'demonstration', 'pilot', 'routine_operation'] as const;
export const STAGE_LABELS: Record<(typeof EVIDENCE_STAGES)[number], string> = {
  unknown: 'No task evidence reviewed', manufacturer_claim: 'Supplier application claim', demonstration: 'Demonstration', pilot: 'Site pilot', routine_operation: 'Reported routine operation',
};
export const SourceSchema = z.object({
  id: text, url, title: text, publisher: text,
  kind: z.enum(['manufacturer', 'seller', 'customer', 'integrator', 'other']),
  retrievalMode: z.enum(['direct', 'indexed_only', 'blocked', 'unavailable']), checkedAt: date, tier: z.number().int().min(1).max(3).optional(),
});
export const SolutionReviewSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: text, manufacturer: text, robotClass: z.enum(FORM_FACTORS),
  workflowId: z.enum(WORKFLOW_IDS), industries: z.array(z.enum(INDUSTRY_IDS)).min(1), exactConfiguration: text, checkedAt: date,
  reviewStatus: z.enum(['reviewed_with_gaps', 'needs_follow_up']),
  description: text, operatingMode: z.object({ value: text, sourceIds: z.array(text), caveats: z.array(text) }),
  specs: z.array(z.object({ key: text, value: z.union([z.number().finite(), z.string(), z.boolean(), z.null()]), unit: z.string().nullable(), semanticLabel: text, conditions: z.array(text), sourceIds: z.array(text), verification: z.enum(['manufacturer_supported', 'reported', 'unknown']) })),
  taskEvidence: z.array(z.object({ stage: z.enum(EVIDENCE_STAGES), task: text, configuration: text, operatingMode: text, sourceIds: z.array(text), limitations: z.array(text) })),
  buyingRoutes: z.array(z.object({ organization: text, market: text, routeType: z.enum(['manufacturer', 'reseller', 'integrator', 'service']), contact: z.object({ url: url.optional(), email: z.email().optional(), phone: text.optional() }), sourceIds: z.array(text).min(1), checkedAt: date, deliveryStatus: text, authorizationStatus: text, caveats: z.array(text) })),
  conflicts: z.array(text), unknowns: z.array(text).min(1), sourceURLs: z.array(url), sources: z.array(SourceSchema).min(1),
}).superRefine((record, ctx) => {
  const ids = new Set<string>();
  for (const source of record.sources) {
    if (ids.has(source.id)) ctx.addIssue({ code: 'custom', message: 'Duplicate source id: ' + source.id });
    ids.add(source.id);
  }
  const ledgerURLs = new Set(record.sources.map((source) => source.url));
  if (record.sourceURLs.some((sourceURL) => !ledgerURLs.has(sourceURL)) || [...ledgerURLs].some((sourceURL) => !record.sourceURLs.includes(sourceURL))) ctx.addIssue({ code: 'custom', message: 'Source URL index must agree with the source ledger' });
  if (new Set(record.specs.map((spec) => spec.key)).size !== record.specs.length) ctx.addIssue({ code: 'custom', message: 'Specification keys must be unique per exact configuration' });
  const groups = [record.operatingMode, ...record.specs, ...record.taskEvidence, ...record.buyingRoutes];
  for (const group of groups) for (const id of group.sourceIds) if (!ids.has(id)) ctx.addIssue({ code: 'custom', message: 'Unknown source reference: ' + id });
  for (const spec of record.specs) {
    if (spec.verification === 'unknown' && spec.value !== null) ctx.addIssue({ code: 'custom', message: 'Unknown specifications must retain a null value: ' + spec.key });
    if (spec.verification !== 'unknown' && (!spec.sourceIds.length || spec.value === null)) ctx.addIssue({ code: 'custom', message: 'Supported/reported specs require a value and source: ' + spec.key });
    if (spec.verification === 'manufacturer_supported' && !record.sources.some((s) => spec.sourceIds.includes(s.id) && s.kind === 'manufacturer' && s.retrievalMode === 'direct')) ctx.addIssue({ code: 'custom', message: 'Manufacturer support requires directly read manufacturer evidence: ' + spec.key });
  }
  for (const evidence of record.taskEvidence) if (evidence.stage !== 'unknown' && !evidence.sourceIds.length) ctx.addIssue({ code: 'custom', message: 'Task evidence stage requires a source' });
  for (const route of record.buyingRoutes) if (!Object.values(route.contact).some(Boolean)) ctx.addIssue({ code: 'custom', message: 'Buying route needs a published contact route' });
});
export const ReviewBatchSchema = z.object({ schemaVersion: z.literal(1), checkedAt: date, scope: text, records: z.array(SolutionReviewSchema) });
export type SolutionReview = z.infer<typeof SolutionReviewSchema>;

