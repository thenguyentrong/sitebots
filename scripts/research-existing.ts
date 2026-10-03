import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';
import { missingFields, pageHasQuote, quoteHasValue, type Field } from '../lib/market/research';
import type { Dossier } from '../lib/market/schema';
import { FetchRefused, politeFetch } from './scrape/_lib/fetch';

// A finite inventory of already-recorded sources. It stages evidence for review and never
// creates robots or changes dossier values; the quote-checking importer remains the writer.
const OUT = join(process.cwd(), '.cache/research/existing-refresh');
const RECORDS = join(process.cwd(), 'data/market/de');
const VERSION = 1;
const compact = (value: string) => value.replace(/\s+/g, ' ').trim();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const json = <T,>(file: string): T => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const save = (file: string, value: unknown) => writeFileSync(join(OUT, file), JSON.stringify(value, null, 2) + '\n');
const date = () => new Date().toISOString();
const csv = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};
type SourceRef = { robotId: string; sourceId: string | null; kind: string; publisher: string; title: string; role: 'official' | 'source' | 'seller_product' };
type Source = { url: string; hostname: string; priority: number; references: SourceRef[]; selection: 'selected' | 'excluded' | 'delegated'; reason: string | null };
type Manifest = { version: number; createdAt: string; robotIds: string[]; robotIdSha256: string; sources: Source[] };
type Outcome = { url: string; status: string; checkedAt: string; fetchedAt?: string; fromCache?: boolean; title?: string; finalUrl?: string; reason?: string; httpStatus?: number; pageFile?: string; characters?: number; tableRows?: number; labelledFacts?: number; excerpts?: number; modelMentionRobotIds?: string[] };
type TableRow = { table: number; row: number; caption: string; headers: string[]; cells: string[]; quote: string };
type LabelledFact = { label: string; value: string; quote: string; context: string; origin: 'table' | 'definition' | 'block' };
type Excerpt = { topics: string[]; quote: string; context: string };
type Candidate = { id: string; field: Field; value: string | number; unit: string; basis: string; quote: string; url: string; publisher: string; source_kind: string; checked_at: string; reviewReason: string };
type Page = { url: string; title: string; meta: string; text: string; headings: string[]; tableRows: TableRow[]; labelledFacts: LabelledFact[]; excerpts: Excerpt[]; documentLinks: { text: string; url: string }[]; fetchedAt: string; checkedAt: string; finalUrl: string; fromCache: boolean; sha256: string; contentType: string | null };

function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function inventory(robots: Dossier[]): Manifest {
  const map = new Map<string, Source>();
  const add = (raw: string | null, reference: SourceRef, priority: number) => {
    if (!raw) return;
    const url = normalizeUrl(raw);
    if (!url) return;
    const entry = map.get(url) ?? { url, hostname: new URL(url).hostname, priority, references: [], selection: 'selected', reason: null };
    entry.priority = Math.min(entry.priority, priority);
    if (!entry.references.some((ref) => ref.robotId === reference.robotId && ref.sourceId === reference.sourceId && ref.role === reference.role)) entry.references.push(reference);
    map.set(url, entry);
  };
  for (const robot of robots) {
    add(robot.officialUrl, { robotId: robot.id, sourceId: null, kind: 'manufacturer', publisher: robot.maker, title: robot.name + ' official page', role: 'official' }, 0);
    for (const source of robot.sources) add(source.url, { robotId: robot.id, sourceId: source.id, kind: source.kind, publisher: source.publisher, title: source.title, role: 'source' }, source.kind === 'manufacturer' ? 1 : source.kind === 'seller' ? 2 : 3);
    for (const seller of robot.germany.sellers) add(seller.productUrl, { robotId: robot.id, sourceId: seller.sourceId, kind: seller.role === 'manufacturer' ? 'manufacturer' : 'seller', publisher: seller.name, title: robot.name + ' product listing', role: 'seller_product' }, 2);
  }
  const sources = [...map.values()];
  for (const source of sources) {
    const parsed = new URL(source.url);
    const boilerplatePath = /(?:^|\/)(?:contact(?:-us)?|kontakt(?:ieren-sie-uns)?|impressum|legal|privacy|terms|shipping|delivery|versand|agb|datenschutz|about(?:-us)?|company|cart|checkout|login|search|sitemap)(?:[/.?-]|$)/i.test(parsed.pathname);
    const primary = source.references.some((ref) => ref.role === 'official' || ref.kind === 'manufacturer');
    const uniqueRobots = new Set(source.references.map((ref) => ref.robotId)).size;
    const generic = /^(?:\/(?:en|de|fr|shop|store))?\/?$/i.test(parsed.pathname);
    if (/(?:^|\.)unitree\.(?:com|cn|ai)$/i.test(source.hostname)) {
      source.selection = 'delegated'; source.reason = 'Unitree manufacturer, documentation and shop hosts are being reviewed in a separate task.';
    } else if (!primary && (boilerplatePath || generic || uniqueRobots > 18)) {
      source.selection = 'excluded'; source.reason = boilerplatePath ? 'Existing non-product contact, policy or company page.' : generic ? 'Existing non-manufacturer homepage, not an exact product source.' : 'Shared catalogue/boilerplate source linked to more than 18 robot records.';
    }
  }
  const ids = robots.map((robot) => robot.id).sort();
  return { version: VERSION, createdAt: date(), robotIds: ids, robotIdSha256: hash(ids.join('\n')), sources: sources.sort((a, b) => a.priority - b.priority || a.url.localeCompare(b.url)) };
}

const TOPICS: Record<string, RegExp> = {
  payload: /payload|traglast|nutzlast|load capacity|carrying capacity|per.arm|arm load|负载|载重/i,
  runtime: /runtime|battery life|operating time|working time|endurance|laufzeit|betriebsdauer|续航/i,
  protection: /\bIP[0-9X][0-9X]\b|ingress|protection rating|schutzart|防护/i,
  terrain: /stairs?|steps? climbing|rough|uneven|terrain|outdoor|indoor.only|treppen|gelände|außen|越障|楼梯|户外/i,
  manipulation: /gripper|dexterous|end.effector|hands?|greifer|灵巧手/i,
  software: /\bSDK\b|\bROS[12]?\b|API|python|programming|open.source|compute|processor|TOPS|NVIDIA|开发/i,
  deployment: /deploy|pilot|customer|factory|factories|warehouse|case study|production|logistics|einsatz|工厂|部署/i,
  safety: /certifi|ISO [0-9]|CE marking|emergency stop|collision|safety|sicherheit/i,
  dimensions: /height|width|length|weight|speed|degrees of freedom|\bDOF\b|höhe|breite|gewicht|尺寸|重量/i,
};

function parsePage(body: string, meta: Omit<Page, 'title' | 'meta' | 'text' | 'headings' | 'tableRows' | 'labelledFacts' | 'excerpts' | 'documentLinks'>): Page {
  const $ = load(body);
  $('script,style,noscript,template,svg').remove();
  const text = compact($('body').text());
  const headings = $('h1,h2,h3,h4').map((_, el) => compact($(el).text())).get().filter(Boolean);
  const tableRows: TableRow[] = [];
  const labelledFacts: LabelledFact[] = [];
  const excerpts: Excerpt[] = [];
  $('table').each((table, el) => {
    const caption = compact($(el).find('caption').first().text());
    let headers: string[] = [];
    $(el).find('tr').each((row, tr) => {
      const cells = $(tr).children('th,td').map((_, cell) => compact($(cell).text())).get();
      if (!cells.some(Boolean)) return;
      if (($(tr).children('th').length && !$(tr).children('td').length) || (row === 0 && cells.some((cell) => /^(?:item|parameter details|parameter|specification|feature)$/i.test(cell)))) headers = cells;
      const quote = compact($(tr).text());
      tableRows.push({ table, row, caption, headers: [...headers], cells, quote });
      if (cells.length >= 2 && cells[0] && cells[0].length <= 140) labelledFacts.push({ label: cells[0], value: cells.slice(1).join(' | '), quote, context: caption || headers.join(' | '), origin: 'table' });
    });
  });
  $('dt').each((_, el) => {
    const dd = $(el).next('dd');
    const label = compact($(el).text());
    const value = compact(dd.text());
    if (label && value && value.length <= 1000) labelledFacts.push({ label, value, quote: label + ' ' + value, context: '', origin: 'definition' });
  });
  const seen = new Set<string>();
  $('p,li,dd,div,section,span').each((_, el) => {
    const block = $(el);
    // Preserve small leaf fact groups; do not repeat the entire page for nested divs.
    if (block.find('p,li,dd,div,section').length > 2) return;
    const quote = compact(block.text());
    if (quote.length < 12 || quote.length > 1100 || seen.has(quote)) return;
    const topics = Object.entries(TOPICS).filter(([, pattern]) => pattern.test(quote)).map(([topic]) => topic);
    if (!topics.length) return;
    seen.add(quote);
    const context = compact(block.prevAll('h1,h2,h3,h4').first().text());
    excerpts.push({ topics, quote, context });
    const match = quote.match(/^([^:：]{3,100})[:：]\s*(.{1,350})$/);
    if (match && Object.values(TOPICS).some((pattern) => pattern.test(match[1]))) labelledFacts.push({ label: match[1], value: match[2], quote, context, origin: 'block' });
  });
  const documentLinks = $('a[href]').map((_, el) => {
    // One malformed href must not discard an otherwise readable product page.
    try { return { text: compact($(el).text()), url: normalizeUrl(new URL($(el).attr('href')!, meta.finalUrl).href) ?? '' }; }
    catch { return { text: '', url: '' }; }
  }).get().filter((link) => link.url && /\.pdf(?:[?#]|$)|datasheet|manual|specification|documentation/i.test(link.text + ' ' + link.url));
  return { ...meta, title: compact($('title').first().text()), meta: $('meta[name="description"],meta[property="og:description"]').map((_, el) => $(el).attr('content') || '').get().map(compact).join(' '), text, headings, tableRows, labelledFacts, excerpts, documentLinks };
}

function modelMention(robot: Dossier, page: Page): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const model = normalize(robot.model);
  const identity = normalize(page.title + ' ' + page.headings.join(' '));
  return model.length >= 2 && identity.includes(model);
}

function candidates(robot: Dossier, source: Source, page: Page): Candidate[] {
  if (!modelMention(robot, page)) return [];
  // A shared family page cannot attach one unlabelled figure to several configurations.
  if (robot.variant && new Set(source.references.map((ref) => ref.robotId)).size > 1) return [];
  const missing = new Set(missingFields(robot));
  const reference = source.references.find((ref) => ref.robotId === robot.id && ref.kind === 'manufacturer') ?? source.references.find((ref) => ref.robotId === robot.id)!;
  if (!['manufacturer', 'seller', 'press', 'database'].includes(reference.kind)) return [];
  const rows: Candidate[] = [];
  const seen = new Set<string>();
  const add = (field: Field, value: number | string, unit: string, fact: LabelledFact) => {
    if (!missing.has(field) || !pageHasQuote(page.text, fact.quote) || !quoteHasValue(field, value, fact.quote)) return;
    const key = field + ':' + value + ':' + fact.quote;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ id: robot.id, field, value, unit, basis: fact.label + (fact.context ? '; ' + fact.context : ''), quote: fact.quote, url: source.url, publisher: reference.publisher, source_kind: reference.kind, checked_at: page.checkedAt.slice(0, 10), reviewReason: 'Unreviewed extraction. Confirm exact model/variant, column, load basis and units before using the quote-checking importer.' });
  };
  const explicitInlineFacts = page.excerpts.flatMap((excerpt): LabelledFact[] => {
    // A narrow, self-contained labelled statement can also be encoded in nested spans.
    const match = excerpt.quote.match(/^(Runtime|Battery life|Operating time|Working time|Endurance|Laufzeit|Betriebsdauer|Single[- ]arm payload|Per[- ]arm payload|Payload per arm|Both arms payload|Dual[- ]arm payload|Overall protection|IP rating|Ingress protection|Schutzart)\s*[:：]?\s*((?:\d+(?:[.,]\d+)?\s*(?:h|hours?|hrs?|kg|Stunden)|IP[0-9X][0-9X])(?:\s*\([^)]{1,100}\))?)$/i);
    return match ? [{ label: match[1], value: match[2], quote: excerpt.quote, context: excerpt.context, origin: 'block' }] : [];
  });
  for (const fact of [...page.labelledFacts, ...explicitInlineFacts]) {
    // Several values or an inequality/range cannot be collapsed into one robot specification.
    if (fact.value.includes('|') || /[<>≤≥~≈]|\d\s*[-–—/]\s*\d|up to|about|maximum|approx/i.test(fact.value)) continue;
    const numbers = [...fact.value.matchAll(/\d+(?:[.,]\d+)?/g)];
    if (/protection|ingress|schutzart|IP.rating|防护/i.test(fact.label) && !/arm|hand|gripper|motor|sensor|camera|actuator|joint|battery|leg|component|手|臂|电机|关节/i.test(fact.label + ' ' + fact.context)) {
      const codes = [...fact.value.matchAll(/\bIP[0-9X][0-9X]\b/gi)];
      if (codes.length === 1) add('ip_rating', codes[0][0].toUpperCase(), '', fact);
    }
    if (numbers.length !== 1 || /charging time|charge time|ladezeit|runtime not specified|runtime not stated/i.test(fact.quote)) continue;
    const value = Number(numbers[0][0].replace(',', '.'));
    if (!(value > 0)) continue;
    if (/runtime|battery life|operating time|working time|endurance|laufzeit|betriebsdauer|续航/i.test(fact.label) && /(?:\d\s*|\b)(?:h|hours?|hrs?)\b|stunden|小时/i.test(fact.value)) add('runtime_h', value, 'h', fact);
    if (!/(?:\d\s*|\b)kg\b|千克|公斤/i.test(fact.value)) continue;
    if (/both arms|dual.arm.*(?:load|payload)|双臂/i.test(fact.label)) add('both_arms_payload_kg', value, 'kg', fact);
    else if (/(?:single|each|per)[ -]?arm|^arm payload$|单臂|pro arm/i.test(fact.label)) add('arm_payload_kg', value, 'kg', fact);
    else if (/(?:back|body|base).*(?:load|payload)|(?:load|payload).*(?:back|body|base)|背部.*负载/i.test(fact.label) || (robot.capabilities.arms === 0 && /payload|carrying capacity|load capacity|nutzlast|载重/i.test(fact.label))) add('carry_payload_kg', value, 'kg', fact);
  }
  return rows;
}

async function main() {
  mkdirSync(join(OUT, 'pages'), { recursive: true });
  const robots = readdirSync(RECORDS).filter((file) => file.endsWith('.json')).sort().map((file) => json<Dossier>(join(RECORDS, file)));
  const current = inventory(robots);
  const manifestFile = join(OUT, 'manifest.json');
  const manifest = existsSync(manifestFile) ? json<Manifest>(manifestFile) : current;
  if (manifest.robotIdSha256 !== current.robotIdSha256) throw new Error('Existing robot IDs changed. Preserve this run; review scope before starting another inventory.');
  if (manifest.version !== VERSION) throw new Error('Inventory version changed; review the saved manifest first.');
  if (!existsSync(manifestFile)) save('manifest.json', manifest);
  const observations: Record<string, Outcome> = existsSync(join(OUT, 'observations.json')) ? json(join(OUT, 'observations.json')) : {};
  // A parser fix may retry its cached HTML without retrying any network/access refusal.
  if (process.argv.includes('--retry-parse-errors')) for (const [url, outcome] of Object.entries(observations)) if (outcome.status === 'parse_error') delete observations[url];
  for (const source of manifest.sources) if (source.selection !== 'selected' && !observations[source.url]) observations[source.url] = { url: source.url, status: source.selection, checkedAt: date(), reason: source.reason! };
  save('observations.json', observations);
  const queue = manifest.sources.filter((source) => source.selection === 'selected' && !observations[source.url]);
  console.log(JSON.stringify({ event: 'start', robots: robots.length, sources: manifest.sources.length, selected: manifest.sources.filter((source) => source.selection === 'selected').length, remaining: queue.length }));
  if (process.argv.includes('--inventory-only')) { report(); return; }
  // One in-flight page per hostname also prevents parallel robots.txt checks. The shared
  // fetcher enforces its two-second host interval and handles its own cached responses.
  const activeHosts = new Set<string>();
  let completed = 0;
  async function worker() {
    while (queue.length) {
      const index = queue.findIndex((source) => !activeHosts.has(source.hostname));
      if (index < 0) { await new Promise((resolve) => setTimeout(resolve, 100)); continue; }
      const source = queue.splice(index, 1)[0];
      activeHosts.add(source.hostname);
      const checkedAt = date();
      let outcome: Outcome;
      try {
        if (/\.pdf(?:[?#]|$)/i.test(source.url)) outcome = { url: source.url, status: 'manual_pdf', checkedAt, reason: 'PDF source: manual reading required; not downloaded or parsed.' };
        else {
          const snap = await politeFetch(source.url);
          if (/pdf/i.test(snap.contentType ?? '')) outcome = { url: source.url, status: 'manual_pdf', checkedAt, fetchedAt: snap.fetchedAt, reason: 'Response is PDF; no PDF parsing performed.' };
          else if (!/html|xml|text/i.test(snap.contentType ?? 'text/html')) outcome = { url: source.url, status: 'unsupported_content', checkedAt, fetchedAt: snap.fetchedAt, reason: 'Unsupported response content type: ' + snap.contentType };
          else {
            const page = parsePage(snap.body, { url: source.url, finalUrl: snap.finalUrl, fetchedAt: snap.fetchedAt, checkedAt, fromCache: snap.fromCache, sha256: snap.sha256, contentType: snap.contentType });
            const pageFile = 'pages/' + hash(source.url).slice(0, 20) + '.json';
            save(pageFile, page);
            const matches = robots.filter((robot) => source.references.some((ref) => ref.robotId === robot.id) && modelMention(robot, page)).map((robot) => robot.id);
            const status = page.text.length < 180 ? 'no_readable_data' : page.excerpts.length || page.labelledFacts.length ? 'readable' : 'readable_no_spec_data';
            outcome = { url: source.url, status, checkedAt, fetchedAt: snap.fetchedAt, fromCache: snap.fromCache, finalUrl: snap.finalUrl, title: page.title, httpStatus: snap.status, pageFile, characters: page.text.length, tableRows: page.tableRows.length, labelledFacts: page.labelledFacts.length, excerpts: page.excerpts.length, modelMentionRobotIds: matches };
          }
        }
      } catch (error) {
        outcome = { url: source.url, status: error instanceof FetchRefused ? 'refused_' + error.code : 'parse_error', checkedAt, reason: String(error), ...(error instanceof FetchRefused && error.status ? { httpStatus: error.status } : {}) };
      } finally { activeHosts.delete(source.hostname); }
      observations[source.url] = outcome!;
      save('observations.json', observations);
      completed++;
      if (completed % 20 === 0 || queue.length === 0) { console.log(JSON.stringify({ event: 'progress', completedThisRun: completed, remaining: queue.length, latestStatus: outcome!.status, latestHost: source.hostname })); report(); }
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker));
  report();

  function report() {
    const pageCache = new Map<string, Page>();
    const allCandidates: Candidate[] = [];
    const robotReports = robots.map((robot) => {
      const sources = manifest.sources.filter((source) => source.references.some((ref) => ref.robotId === robot.id));
      const sourceOutcomes = sources.map((source) => {
        const outcome = observations[source.url] ?? { url: source.url, status: 'pending', checkedAt: null };
        if ('pageFile' in outcome && outcome.pageFile) {
          let page = pageCache.get(source.url);
          if (!page) { page = json<Page>(join(OUT, outcome.pageFile)); pageCache.set(source.url, page); }
          allCandidates.push(...candidates(robot, source, page));
        }
        return { ...outcome, sourceIds: [...new Set(source.references.filter((ref) => ref.robotId === robot.id).map((ref) => ref.sourceId).filter(Boolean))], kinds: [...new Set(source.references.filter((ref) => ref.robotId === robot.id).map((ref) => ref.kind))] };
      });
      return { id: robot.id, name: robot.name, model: robot.model, variant: robot.variant, robotType: robot.robotType, missingFields: missingFields(robot), openQuestions: robot.openQuestions, sourceOutcomes, note: 'Source retrieval is not specification verification. Extracted text can contain other models and variants; review before import.' };
    });
    const statuses: Record<string, number> = {};
    for (const outcome of Object.values(observations)) statuses[outcome.status] = (statuses[outcome.status] ?? 0) + 1;
    const selected = manifest.sources.filter((source) => source.selection === 'selected');
    const actual = selected.map((source) => observations[source.url]).filter(Boolean);
    const pending = selected.filter((source) => !observations[source.url]).length;
    const summary = { generatedAt: date(), startedAt: manifest.createdAt, robotCount: robots.length, robotIdSha256: manifest.robotIdSha256, sourceCount: manifest.sources.length, selectedSources: selected.length, processedSelectedSources: actual.length, pendingSelectedSources: pending, passComplete: pending === 0, readableSources: actual.filter((outcome) => outcome.status === 'readable').length, noDataSources: actual.filter((outcome) => ['readable_no_spec_data', 'no_readable_data'].includes(outcome.status)).length, failedSources: actual.filter((outcome) => outcome.status.startsWith('refused_') || outcome.status === 'parse_error').length, manualPdfSources: statuses.manual_pdf ?? 0, unsupportedContentSources: statuses.unsupported_content ?? 0, delegatedSources: statuses.delegated ?? 0, excludedSources: statuses.excluded ?? 0, candidateRows: allCandidates.length, savedPageSnapshots: pageCache.size, extractedTableRows: [...pageCache.values()].reduce((sum, page) => sum + page.tableRows.length, 0), extractedLabelledFacts: [...pageCache.values()].reduce((sum, page) => sum + page.labelledFacts.length, 0), extractedTopicalExcerpts: [...pageCache.values()].reduce((sum, page) => sum + page.excerpts.length, 0), cachedSourceOutcomes: actual.filter((outcome) => outcome.fromCache === true).length, candidatesByField: Object.fromEntries([...new Set(allCandidates.map((row) => row.field))].map((field) => [field, allCandidates.filter((row) => row.field === field).length])), robotsWithReadableSources: robotReports.filter((robot) => robot.sourceOutcomes.some((outcome) => outcome.status === 'readable')).length, statuses, caveats: ['Exhaustive only for selected URLs already present in the frozen existing-robot inventory; no new robot discovery or general web crawl.', 'Readable pages, labelled facts, excerpts and candidates are unreviewed observations, not verified robot specifications.', 'Access refusals, unreadable pages, PDFs, excluded boilerplate and delegated Unitree hosts remain explicitly unresolved.', 'Cached fetches retain their actual fetchedAt timestamp; checkedAt records this inventory assessment.', 'Candidates require exact variant and semantic review followed by market:import-specs; this script writes no robot data.'] };
    save('robots.json', robotReports);
    const writeRows = (file: string, keys: string[], rows: Record<string, unknown>[]) => writeFileSync(join(OUT, file), keys.join(',') + '\r\n' + rows.map((row) => keys.map((key) => csv(row[key])).join(',')).join('\r\n') + '\r\n');
    const inventoryRows = robotReports.map((robot) => ({ id: robot.id, name: robot.name, model: robot.model, variant: robot.variant, robot_type: robot.robotType, missing_count: robot.missingFields.length, missing_fields: robot.missingFields.join('; '), source_count: robot.sourceOutcomes.length, readable_sources: robot.sourceOutcomes.filter((source) => source.status === 'readable').length, failed_sources: robot.sourceOutcomes.filter((source) => source.status.startsWith('refused_')).length, manual_pdfs: robot.sourceOutcomes.filter((source) => source.status === 'manual_pdf').length, delegated_sources: robot.sourceOutcomes.filter((source) => source.status === 'delegated').length, source_outcomes: robot.sourceOutcomes.map((source) => source.status + ': ' + source.url).join(' | '), open_questions: robot.openQuestions.join(' | ') }));
    writeRows('robots.csv', ['id', 'name', 'model', 'variant', 'robot_type', 'missing_count', 'missing_fields', 'source_count', 'readable_sources', 'failed_sources', 'manual_pdfs', 'delegated_sources', 'source_outcomes', 'open_questions'], inventoryRows);
    const missingRows = inventoryRows.flatMap((robot) => (robot.missing_fields ? robot.missing_fields.split('; ') : []).map((field) => ({ ...robot, field })));
    writeRows('missing-fields.csv', ['id', 'name', 'field', 'readable_sources', 'failed_sources', 'manual_pdfs', 'delegated_sources', 'source_outcomes'], missingRows);
    const sourceRows = manifest.sources.map((source) => ({ ...observations[source.url], selection: source.selection, robot_ids: [...new Set(source.references.map((reference) => reference.robotId))].join('; '), source_kinds: [...new Set(source.references.map((reference) => reference.kind))].join('; ') }));
    writeRows('sources.csv', ['url', 'status', 'selection', 'robot_ids', 'source_kinds', 'checkedAt', 'fetchedAt', 'title', 'reason', 'pageFile'], sourceRows);
    const manualQueue = sourceRows.filter((source) => !['readable', 'excluded'].includes(source.status)).map((source) => ({ ...source, nextAction: source.status === 'manual_pdf' ? 'Read the PDF manually; confirm exact model, version, page and units. Do not use automated PDF parsing.' : source.status === 'delegated' ? 'Reconcile with the separately delegated Unitree review.' : source.status.startsWith('refused_') ? 'Respect refusal. Use a different already-known public source or an authorized manual review; do not bypass access controls.' : 'Review saved source outcome and exact model manually; a successful request without readable data does not establish a specification.' }));
    save('manual-review-queue.json', manualQueue);
    writeRows('manual-review-queue.csv', ['url', 'status', 'robot_ids', 'source_kinds', 'reason', 'nextAction'], manualQueue);
    save('candidates.json', allCandidates);
    const keys = ['id', 'field', 'value', 'unit', 'basis', 'quote', 'url', 'publisher', 'source_kind', 'checked_at', 'reviewReason'] as const;
    writeFileSync(join(OUT, 'candidates.csv'), keys.join(',') + '\r\n' + allCandidates.map((row) => keys.map((key) => csv(row[key])).join(',')).join('\r\n') + '\r\n');
    save('summary.json', summary);
    if (pending === 0) console.log(JSON.stringify({ event: 'complete', ...summary }));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
