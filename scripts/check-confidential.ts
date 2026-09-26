// Scan the content and code directories for terms that must not be published.
//
//   node --import tsx scripts/check-confidential.ts
//
// The terms come from a git-ignored .confidential-terms file (one per line,
// `#` comments). `npm run content -- --check` runs the same scan; this entry
// point exists for a quick check before a commit.

import { scanConfidential } from '@/lib/content/confidential';

const { terms, hits } = scanConfidential();
if (terms === null) {
  console.log('no .confidential-terms file; nothing to scan against');
  process.exit(0);
}
if (!hits.length) {
  console.log(`${terms.length} term(s), no hits`);
  process.exit(0);
}
console.error(`${hits.length} hit(s):`);
for (const h of hits) console.error(`  ${h.file}:${h.line} contains "${h.term}"`);
process.exit(1);
