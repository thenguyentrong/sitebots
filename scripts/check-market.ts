// Validates Germany market records. Usage: node --import tsx scripts/check-market.ts [file ...]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { DossierSchema } from '@/lib/market/schema';

const root = join(process.cwd(), 'data/market/de');
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(root).filter((name) => name.endsWith('.json')).map((name) => join(root, name));
const indexFile = join(process.cwd(), 'data/market/use-case-index.json');
const known = new Set<string>(existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')).useCases.map((row: { id: string }) => row.id) : []);
const seen = new Map<string, string>();
let failed = 0;
const counts: Record<string, number> = {};
for (const file of files) {
  const problems: string[] = [];
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch (error) { problems.push('Invalid JSON: ' + (error as Error).message); }
  if (raw !== undefined) {
    const parsed = DossierSchema.safeParse(raw);
    if (!parsed.success) for (const issue of parsed.error.issues) problems.push((issue.path.join('.') || '(record)') + ': ' + issue.message);
    else {
      const record = parsed.data;
      if (basename(file) !== record.id + '.json') problems.push('File name must be ' + record.id + '.json');
      if (seen.has(record.id)) problems.push('Duplicate id, also in ' + seen.get(record.id));
      seen.set(record.id, basename(file));
      for (const item of record.evidence) for (const id of item.taskIds) if (known.size && !known.has(id)) problems.push('Unknown use-case id ' + id);
      for (const id of record.specialisedFor) if (known.size && id.includes('/') && !known.has(id)) problems.push('Unknown use-case id in specialisedFor ' + id);
      const key = record.robotType + ' · ' + record.germany.status;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  if (problems.length) {
    failed++;
    console.log('FAIL ' + basename(file));
    for (const problem of problems) console.log('  - ' + problem);
  }
}
console.log(files.length - failed + '/' + files.length + ' valid');
for (const [key, count] of Object.entries(counts).sort()) console.log('  ' + key + ': ' + count);
if (failed) process.exitCode = 1;
