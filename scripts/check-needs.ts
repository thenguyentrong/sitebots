// Validates use-case needs batches. Usage: node --import tsx scripts/check-needs.ts [file ...]
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { NeedsBatchSchema } from '@/lib/market/requirements';

const root = join(process.cwd(), 'data/market/requirements');
const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(root).filter((name) => name.endsWith('.json')).map((name) => join(root, name));
const known = new Set<string>(JSON.parse(readFileSync(join(process.cwd(), 'data/market/use-case-index.json'), 'utf8')).useCases.map((row: { id: string }) => row.id));
const seen = new Map<string, string>();
let failed = 0;
for (const file of files) {
  const parsed = NeedsBatchSchema.safeParse(JSON.parse(readFileSync(file, 'utf8').replace(/^﻿/, '')));
  if (!parsed.success) { failed++; console.log('FAIL ' + basename(file)); for (const issue of parsed.error.issues.slice(0, 30)) console.log('  - ' + issue.path.join('.') + ': ' + issue.message); continue; }
  for (const row of parsed.data.useCases) {
    if (!known.has(row.id)) { failed++; console.log('Unknown use-case id ' + row.id + ' in ' + basename(file)); }
    if (seen.has(row.id)) { failed++; console.log('Duplicate ' + row.id + ' in ' + basename(file) + ' and ' + seen.get(row.id)); }
    seen.set(row.id, basename(file));
  }
}
console.log(seen.size + '/' + known.size + ' use cases covered, ' + failed + ' problems');
if (failed) process.exitCode = 1;
