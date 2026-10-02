import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ReviewBatchSchema, type SolutionReview } from './schema';

/** Fail closed on invalid evidence instead of silently dropping source references. */
export function loadSolutionReviews(): SolutionReview[] {
  const root = join(process.cwd(), 'data', 'solutions');
  const records = readdirSync(root).filter((name) => name.startsWith('research-') && name.endsWith('.json')).sort()
    .flatMap((name) => ReviewBatchSchema.parse(JSON.parse(readFileSync(join(root, name), 'utf8').replace(/^\uFEFF/, ''))).records);
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error('Duplicate reviewed configuration: ' + record.id);
    ids.add(record.id);
  }
  return records;
}

