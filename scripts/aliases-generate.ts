// Propose alias entries for every (maker, model) the scraped records name
// that the curated file cannot resolve, and write them to
// data/aliases.generated.yaml. Review the diff, then run the pipeline.
//
//   npm run scrape -- --adapter all            (records land in .cache/records)
//   node --import tsx scripts/aliases-generate.ts [--dry-run]
//
// Nothing here matches strings fuzzily at resolve time; the generator only
// decides which spellings belong to the same maker and the same model so
// that exact alias matching can work at scale.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { curatedAliases, type AliasFile } from '@/lib/ingest/aliases';
import type { FormFactor } from '@/lib/spec/enums';
import { resolveManufacturer, resolveSubjectIn } from './normalize/entity';
import type { RawRecord } from './scrape/_lib/types';

const STOP = new Set([
  'robotics', 'robotic', 'robot', 'robots', 'inc', 'ltd', 'co', 'corp', 'corporation', 'company', 'gmbh', 'ag',
  'llc', 'limited', 'technology', 'technologies', 'tech', 'ai', 'labs', 'lab', 'group', 'holdings', 'intelligence',
  'se', 'sa', 'srl', 'bv', 'oy', 'ab', 'kk', 'plc', 'pte', 'pty', 'sl', 'spa', 'nv', 'aps', 'as',
  'beijing', 'shanghai', 'shenzhen', 'hangzhou', 'suzhou', 'guangzhou', 'nanjing', 'wuhan', 'chengdu', 'tianjin',
  'the', 'of', 'and', 'com', 'cn', 'io',
]);

const COUNTRY: Record<string, string> = {
  china: 'CN', prc: 'CN', 'hong kong': 'HK', taiwan: 'TW', japan: 'JP', korea: 'KR', 'south korea': 'KR',
  singapore: 'SG', india: 'IN', israel: 'IL', uae: 'AE', 'united arab emirates': 'AE', turkey: 'TR',
  usa: 'US', us: 'US', 'united states': 'US', 'united states of america': 'US', america: 'US', canada: 'CA', mexico: 'MX', brazil: 'BR',
  germany: 'DE', france: 'FR', uk: 'GB', 'united kingdom': 'GB', england: 'GB', norway: 'NO', sweden: 'SE', denmark: 'DK',
  finland: 'FI', netherlands: 'NL', belgium: 'BE', switzerland: 'CH', austria: 'AT', italy: 'IT', spain: 'ES',
  portugal: 'PT', poland: 'PL', czechia: 'CZ', 'czech republic': 'CZ', ireland: 'IE', russia: 'RU', australia: 'AU',
  'new zealand': 'NZ', estonia: 'EE', lithuania: 'LT', hungary: 'HU', greece: 'GR', slovenia: 'SI', slovakia: 'SK',
};

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function tokens(s: string): string[] {
  return slug(s).split('-').filter(Boolean);
}

/**
 * "Beijing Galbot AI Co., Ltd." → "galbot"; "Boston Dynamics" → "boston-dynamics";
 * "Agibot (Zhiyuan Robotics)" → "agibot". The bracketed part is an alternative
 * name, kept as an alias, never part of the key. A key that would collapse to
 * nothing useful ("Robot.com") falls back to the full slug.
 */
function makerKey(name: string): string {
  const main = name.replace(/\s*[（(][^)）]*[)）]\s*/g, ' ').trim();
  const t = tokens(main);
  const kept = t.filter((x) => !STOP.has(x));
  const key = kept.join('-');
  if (key.length >= 2) return key;
  const full = tokens(name).join('-');
  return full || key || 'unknown';
}

function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes('.') ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function host(url: string | undefined): string | null {
  const n = normalizeUrl(url);
  if (!n) return null;
  return new URL(n).hostname.replace(/^www\./, '').toLowerCase();
}

function iso(country: string | undefined): string | undefined {
  if (!country) return undefined;
  const k = country.trim().toLowerCase();
  if (/^[A-Z]{2}$/.test(country.trim())) return country.trim();
  return COUNTRY[k];
}

type MakerGroup = {
  key: string;
  slug: string;
  names: Map<string, number>;
  websites: Map<string, number>;
  countries: Map<string, number>;
  models: Map<string, ModelGroup>;
  curated: boolean;
};

type ModelGroup = {
  slug: string;
  names: Map<string, number>;
  formFactors: Map<FormFactor, number>;
};

function top<T>(m: Map<T, number>): T | undefined {
  let best: T | undefined;
  let n = -1;
  for (const [k, v] of m) if (v > n) [best, n] = [k, v];
  return best;
}

function bump<T>(m: Map<T, number>, k: T | undefined | null) {
  if (k === undefined || k === null || k === '') return;
  m.set(k, (m.get(k) ?? 0) + 1);
}

function readRecords(): RawRecord[] {
  const root = join(process.cwd(), '.cache', 'records');
  if (!existsSync(root)) return [];
  const out: RawRecord[] = [];
  for (const adapter of readdirSync(root)) {
    const dir = join(root, adapter);
    const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
    const latest = files[files.length - 1];
    if (!latest) continue;
    for (const line of readFileSync(join(dir, latest), 'utf8').split('\n')) {
      if (line.trim()) out.push(JSON.parse(line) as RawRecord);
    }
  }
  return out;
}

function modelSlugFor(modelName: string, makerNames: string[], makerKey: string): string {
  const drop = new Set<string>([...makerKey.split('-'), ...makerNames.flatMap(tokens)]);
  const t = tokens(modelName);
  const kept = t.filter((x) => !drop.has(x));
  const s = (kept.length ? kept : t).join('-').slice(0, 48);
  return s || slug(modelName).slice(0, 48) || 'model';
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const curated = curatedAliases();
  const records = readRecords();
  console.log(`${records.length} records from .cache/records`);

  const groups = new Map<string, MakerGroup>();
  const byHost = new Map<string, string>();
  let resolvedCurated = 0;

  for (const r of records) {
    if (!r.subject.model_raw?.trim()) continue;
    if (resolveSubjectIn(curated, r.subject)) {
      resolvedCurated++;
      continue;
    }
    const curatedMaker = resolveManufacturer(curated, r.subject);
    const makerName = r.subject.manufacturer_raw?.trim() || '';
    if (!curatedMaker && !makerName) continue;

    let key = curatedMaker ?? makerKey(makerName);
    const h = host(r.subject.website_hint);
    if (!curatedMaker && h && byHost.has(h)) key = byHost.get(h)!;
    if (h && !byHost.has(h)) byHost.set(h, key);

    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        slug: key,
        names: new Map(),
        websites: new Map(),
        countries: new Map(),
        models: new Map(),
        curated: Boolean(curatedMaker),
      };
      groups.set(key, g);
    }
    bump(g.names, makerName);
    // "Agibot (Zhiyuan Robotics)" is two spellings of one maker.
    const bracketed = /[（(]([^)）]+)[)）]/.exec(makerName)?.[1]?.trim();
    if (bracketed && !/^[A-Z][a-z]+,?\s|china|usa|korea|japan/i.test(bracketed)) bump(g.names, bracketed);
    bump(g.websites, normalizeUrl(r.subject.website_hint));
    bump(g.countries, iso(r.subject.country_hint));

    const makerNames = [makerName, ...(curatedMaker ? [curated.manufacturers[curatedMaker].name, ...curated.manufacturers[curatedMaker].aliases] : [])];
    const ms = modelSlugFor(r.subject.model_raw, makerNames, key);
    let mg = g.models.get(ms);
    if (!mg) {
      mg = { slug: ms, names: new Map(), formFactors: new Map() };
      g.models.set(ms, mg);
    }
    bump(mg.names, r.subject.model_raw.trim());
    bump(mg.formFactors, r.subject.form_factor_hint);
  }

  const out: AliasFile = { manufacturers: {}, robots: {} };
  let robots = 0;
  for (const g of [...groups.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!g.curated) {
      // Prefer the plain spelling over one with a bracketed alternative.
      const plain = [...g.names.entries()].filter(([n]) => !/[（(]/.test(n)).sort((a, b) => b[1] - a[1])[0]?.[0];
      const name = plain ?? top(g.names) ?? g.slug;
      out.manufacturers[g.slug] = {
        name,
        country: top(g.countries),
        website: top(g.websites),
        aliases: [...g.names.keys()].filter((n) => n !== name),
      };
    }
    out.robots[g.slug] = {};
    for (const m of [...g.models.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
      const name = top(m.names) ?? m.slug;
      const ff = top(m.formFactors);
      out.robots[g.slug][m.slug] = {
        name,
        form_factor: ff ?? 'humanoid',
        aliases: [...m.names.keys()].filter((n) => n !== name),
        note: ff ? undefined : 'form factor not stated by any source; defaulted to humanoid',
      };
      robots++;
    }
  }

  const header =
    '# GENERATED by scripts/aliases-generate.ts from the scraped records. Review as a diff.\n' +
    '# data/aliases.yaml (curated) wins every conflict; edit that file to correct a model,\n' +
    '# never this one. Regenerating overwrites it.\n';
  const yaml = header + stringify(out, { lineWidth: 0 });
  console.log(`resolved by curated: ${resolvedCurated} · makers: ${groups.size} (${[...groups.values()].filter((g) => !g.curated).length} new) · models: ${robots}`);
  if (dryRun) {
    console.log(yaml.slice(0, 3000));
    return;
  }
  writeFileSync(join(process.cwd(), 'data', 'aliases.generated.yaml'), yaml);
  console.log('wrote data/aliases.generated.yaml');
}

main();
