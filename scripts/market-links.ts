// Links Germany market records to catalogue robot pages (/robots/<maker>/<model>).
// Reads the catalogue paths from a sitemap dump: node --import tsx scripts/market-links.ts .cache/catalogue-paths.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { separateRecords } from '@/lib/market/links';
import { loadMarket } from '@/lib/market/load';

const slug = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\+/g, '-plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SUFFIX = /-(robotics|robots|robot|dynamics|technologies|technology|ai|inc|gmbh|co|ltd|systems)$/;
const paths = readFileSync(process.argv[2] ?? '.cache/catalogue-paths.txt', 'utf8').split(/\r?\n/).filter(Boolean);
const byMaker = new Map<string, string[]>();
for (const path of paths) {
  const [, , maker, model] = path.split('/');
  byMaker.set(maker, [...(byMaker.get(maker) ?? []), model]);
}
const links: Record<string, string> = {};
const missing: string[] = [];
const separate = separateRecords();
for (const robot of loadMarket({ strict: false })) {
  if (robot.robotType === 'specialised' || separate.has(robot.id)) continue;
  const makerSlug = slug(robot.maker);
  const makers = [makerSlug, makerSlug.replace(SUFFIX, ''), makerSlug.split('-')[0]].filter((value, index, all) => byMaker.has(value) && all.indexOf(value) === index);
  const model = slug(robot.model);
  let found: string | null = null;
  for (const maker of makers) {
    const models = byMaker.get(maker)!;
    const exact = models.find((candidate) => candidate === model) ?? models.find((candidate) => candidate === model.replace(/-/g, ''));
    const loose = models.filter((candidate) => candidate.startsWith(model + '-') || model.startsWith(candidate + '-')).sort((a, b) => a.length - b.length)[0];
    const pick = exact ?? loose;
    if (pick) { found = '/robots/' + maker + '/' + pick; break; }
  }
  if (found) links[robot.id] = found; else missing.push(robot.id + ' (' + robot.maker + ' / ' + robot.model + ')');
}
writeFileSync(join(process.cwd(), 'data/market/catalogue-links.json'), JSON.stringify({ generated: 'npm run market:links', links }, null, 1) + '\n');
console.log(Object.keys(links).length + ' linked');
for (const [id, path] of Object.entries(links)) console.log('  ' + id.padEnd(40) + path);
console.log('unlinked: ' + missing.join(', '));
