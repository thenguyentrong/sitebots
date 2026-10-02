// Missing robot specifications, researched outside this repo's sessions (docs/research/missing-specs.md).
//
//   npm run market:gaps                                   worklist of what is missing, in batches of 20
//   npm run market:import-specs -- <found.csv>            check every row against its page
//   npm run market:import-specs -- <found.csv> --write    and write the rows that passed
//
// A row is written only when its page loads through the polite fetcher, the page contains the
// quoted words and the quote contains the value. PDFs cannot be read here (no pdfjs-dist), so PDF
// rows are listed for a check by hand. A value never overwrites a different one already in a
// record: that is reported as a conflict.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { load } from 'cheerio';
import { loadMarket } from '@/lib/market/load';
import { FIELDS, SOURCE_KINDS_IN, missingFields, normalizeText, pageHasQuote, parseCsv, parseValue, quoteHasValue, quoteOnPage, type Field, type Value } from '@/lib/market/research';
import { DossierSchema, type Dossier } from '@/lib/market/schema';
import { FetchRefused, politeFetch } from './scrape/_lib/fetch';

const DIR = join(process.cwd(), 'data/market/de');
const OUT = join(process.cwd(), '.cache/research');
const BATCH = 20;
const today = new Date().toISOString().slice(0, 10);

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
};

function gaps() {
  // Robots a buyer in Germany can get or pre-order; job-specific machines are matched by job, not by these values.
  const TYPE = { humanoid: 0, mobile_manipulator: 1, quadruped: 2, specialised: 3 } as const;
  const STATUS = { buy_now: 0, quote: 1, preorder: 2, not_sold: 3 } as const;
  const robots = loadMarket({ strict: false })
    .filter((robot) => robot.robotType !== 'specialised' && robot.germany.status !== 'not_sold')
    .map((robot) => ({ robot, missing: missingFields(robot) }))
    .filter((item) => item.missing.length)
    .sort((a, b) => TYPE[a.robot.robotType] - TYPE[b.robot.robotType] || STATUS[a.robot.germany.status] - STATUS[b.robot.germany.status] || a.robot.name.localeCompare(b.robot.name));
  const lines = [['batch', 'id', 'robot', 'maker', 'type', 'status_in_germany', 'official_page', 'missing_fields', 'sources_we_already_have'].join(',')];
  robots.forEach(({ robot, missing }, index) => lines.push([Math.floor(index / BATCH) + 1, robot.id, robot.name, robot.maker, robot.robotType, robot.germany.status, robot.officialUrl ?? '', missing.join('; '), robot.sources.map((source) => source.url).join(' ')].map(csvCell).join(',')));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'worklist.csv'), lines.join('\r\n') + '\r\n');
  const counts: Record<string, number> = {};
  for (const { missing } of robots) for (const field of missing) counts[field] = (counts[field] ?? 0) + 1;
  console.log(robots.length + ' robots, ' + Object.values(counts).reduce((a, b) => a + b, 0) + ' missing values, ' + Math.ceil(robots.length / BATCH) + ' batches -> .cache/research/worklist.csv');
  for (const [field, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log('  ' + field.padEnd(22) + count);
}

type Row = { line: number; id: string; field: Field; value: Value; unit: string; basis: string; quote: string; url: string; publisher: string; kind: (typeof SOURCE_KINDS_IN)[number]; checkedAt: string };
type Outcome = { line: number; id: string; field: string; status: string; detail?: string };

function readRows(file: string, outcomes: Outcome[]): Row[] {
  const rows: Row[] = [];
  parseCsv(readFileSync(file, 'utf8')).forEach((raw, index) => {
    const line = index + 2;
    const reject = (detail: string) => outcomes.push({ line, id: raw.id ?? '', field: raw.field ?? '', status: 'invalid', detail });
    if (!raw.id || !existsSync(join(DIR, raw.id + '.json'))) return reject('unknown robot id');
    if (!(raw.field in FIELDS)) return reject('unknown field');
    const field = raw.field as Field;
    const value = parseValue(field, raw.value ?? '');
    if (value === null) return reject('value does not fit ' + field + ': ' + raw.value);
    if (!/^https:[/][/]/.test(raw.url ?? '')) return reject('url must start with https://');
    if (!(SOURCE_KINDS_IN as readonly string[]).includes(raw.source_kind)) return reject('source_kind must be ' + SOURCE_KINDS_IN.join(', '));
    if (!quoteOnPage(raw.quote ?? '')) return reject('quote is empty');
    rows.push({ line, id: raw.id, field, value, unit: raw.unit ?? '', basis: raw.basis ?? '', quote: raw.quote, url: raw.url, publisher: raw.publisher || new URL(raw.url).hostname.replace(/^www[.]/, ''), kind: raw.source_kind as Row['kind'], checkedAt: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw.checked_at ?? '') ? raw.checked_at : today });
  });
  return rows;
}

const pages = new Map<string, { text: string; title: string } | { refused: string }>();

/** The page as text, fetched once per URL through the polite fetcher. */
async function page(url: string) {
  if (!pages.has(url)) {
    try {
      const snapshot = await politeFetch(url.split('#')[0]);
      if ((snapshot.contentType ?? '').includes('pdf') || /[.]pdf([?#]|$)/i.test(url)) pages.set(url, { refused: 'pdf' });
      else {
        const $ = load(snapshot.body);
        $('script, style, noscript').remove();
        const meta = $('meta[name="description"], meta[property="og:description"]').map((_, el) => $(el).attr('content') ?? '').get().join(' ');
        pages.set(url, { text: normalizeText($('body').text() + ' ' + meta), title: $('title').first().text().trim() });
      }
    } catch (error) {
      pages.set(url, { refused: error instanceof FetchRefused ? error.code + ': ' + error.message : (error as Error).message });
    }
  }
  return pages.get(url)!;
}

async function importRows(file: string, write: boolean) {
  const outcomes: Outcome[] = [];
  const rows = readRows(file, outcomes);
  const passed: (Row & { title: string })[] = [];
  for (const row of rows) {
    if (!quoteHasValue(row.field, row.value, row.quote)) { outcomes.push({ line: row.line, id: row.id, field: row.field, status: 'value not in quote' }); continue; }
    const fetched = /[.]pdf([?#]|$)/i.test(row.url) ? { refused: 'pdf' } : await page(row.url);
    if ('refused' in fetched) { outcomes.push({ line: row.line, id: row.id, field: row.field, status: fetched.refused === 'pdf' ? 'pdf, check by hand' : 'page not read', detail: fetched.refused }); continue; }
    if (!pageHasQuote(fetched.text, row.quote)) { outcomes.push({ line: row.line, id: row.id, field: row.field, status: 'quote not on page', detail: 'the page may build its text with script; check by hand' }); continue; }
    passed.push({ ...row, title: fetched.title });
  }

  // Apply per record: reuse a source with the same address, fill only empty values, report the rest.
  const byId = new Map<string, typeof passed>();
  for (const row of passed) byId.set(row.id, [...(byId.get(row.id) ?? []), row]);
  for (const [id, list] of byId) {
    const path = join(DIR, id + '.json');
    const text = readFileSync(path, 'utf8');
    const record = JSON.parse(text.replace(/^\ufeff/, '')) as Dossier;
    const caps = record.capabilities as Record<string, unknown>;
    for (const row of list) {
      const def = FIELDS[row.field];
      const sameUrl = (a: string) => a.replace(/[/]$/, '') === row.url.replace(/[/]$/, '');
      let source = record.sources.find((item) => sameUrl(item.url));
      const add = () => {
        if (source) return source.id;
        const next = Math.max(0, ...record.sources.map((item) => Number(item.id.slice(1)))) + 1;
        source = { id: 's' + next, url: row.url, title: row.title || row.publisher, publisher: row.publisher, kind: row.kind, checkedAt: row.checkedAt };
        record.sources.push(source);
        return source.id;
      };
      if (def.capability) {
        const current = caps[def.capability];
        if (current !== null && current !== row.value) { outcomes.push({ line: row.line, id, field: row.field, status: 'conflict', detail: 'record has ' + String(current) + ', row says ' + String(row.value) }); continue; }
        caps[def.capability] = row.value;
        const sourceId = add();
        if (!record.capabilities.sourceIds.includes(sourceId)) record.capabilities.sourceIds.push(sourceId);
      }
      if (def.spec) {
        const existing = record.specs.find((spec) => spec.key === def.spec);
        if (existing && existing.value !== row.value) { outcomes.push({ line: row.line, id, field: row.field, status: 'conflict', detail: 'spec ' + def.spec + ' has ' + String(existing.value) }); continue; }
        if (!existing) record.specs.push({ key: def.spec, label: def.label, value: row.value, unit: def.unit, conditions: row.basis && row.basis !== 'unstated' ? row.basis : null, sourceId: add() });
      }
      outcomes.push({ line: row.line, id, field: row.field, status: write ? 'written' : 'passes' });
    }
    const checked = DossierSchema.safeParse(record);
    if (!checked.success) {
      for (const outcome of outcomes) if (outcome.id === id && (outcome.status === 'written' || outcome.status === 'passes')) { outcome.status = 'not written'; outcome.detail = checked.error.issues[0]?.message; }
      continue;
    }
    if (write) writeFileSync(path, (text.startsWith('\ufeff') ? '\ufeff' : '') + JSON.stringify(record, null, 1) + '\n');
  }

  outcomes.sort((a, b) => a.line - b.line);
  mkdirSync(OUT, { recursive: true });
  const report = join(OUT, 'import-' + basename(file, '.csv') + '.json');
  writeFileSync(report, JSON.stringify(outcomes, null, 1) + '\n');
  const counts: Record<string, number> = {};
  for (const outcome of outcomes) counts[outcome.status] = (counts[outcome.status] ?? 0) + 1;
  console.log(rows.length + ' rows read from ' + basename(file) + (write ? '' : ' (dry run, add --write to save)'));
  for (const [status, count] of Object.entries(counts)) console.log('  ' + status.padEnd(20) + count);
  for (const outcome of outcomes.filter((item) => !['written', 'passes'].includes(item.status))) console.log('  line ' + outcome.line + ' ' + outcome.id + ' ' + outcome.field + ': ' + outcome.status + (outcome.detail ? ' (' + outcome.detail + ')' : ''));
  console.log('report: ' + report);
}

const [command, file] = process.argv.slice(2);
if (command === 'gaps') gaps();
// The scripts compile to CommonJS, so no top-level await.
else if (command === 'import' && file && existsSync(file)) importRows(file, process.argv.includes('--write')).catch((error) => { console.error(error); process.exitCode = 1; });
else {
  console.log('usage: npm run market:gaps | npm run market:import-specs -- <found.csv> [--write]');
  if (command === 'import') console.log('files in .cache/research: ' + (existsSync(OUT) ? readdirSync(OUT).join(', ') : 'none'));
  process.exitCode = 1;
}
