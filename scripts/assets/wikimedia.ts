// wikimedia.ts — attach real, freely licensed photographs to robots.
//
//   node --import tsx scripts/assets/wikimedia.ts --review --limit 250   propose
//   node --import tsx scripts/assets/wikimedia.ts --commit               apply
//
// Wikimedia Commons is the only image source that states a licence and an
// author in machine-readable form, so it is the only one we take. Nothing is
// generated and nothing is guessed.
//
// Two steps on purpose. --review searches Commons, keeps whatever survives a
// strict name match, and downloads it to .out/review so a person can look at
// it. Only files listed in data/assets/images.json are ever attached. That
// gate is not bureaucracy: the search offered a fatty-acid diagram for
// "Figure 03", stromatolites for "Figure 01" and a column of soldiers for
// "Honor", all of which passed the text rules and none of which are robots.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMIT, db, done, preflight } from '../_guard';
import { args, num, str } from '../scrape/_lib/args';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'SitebotsBot/0.1 (+https://sitebots.dev/bot) robot-catalogue';
const REVIEW = '.out/review';
const APPROVED = 'data/assets/images.json';

/** Licences that allow reuse on a public site with attribution. */
const FREE = [/^cc0/i, /^cc[- ]by(?![-\s]*nc)/i, /^public domain/i, /^pd/i, /^attribution$/i];
const NON_FREE = [/non[- ]free/i, /fair use/i, /\bnc\b/i, /noncommercial/i, /\bnd\b/i, /no ?derivative/i];

type Cand = {
  title: string;
  pageUrl: string;
  url: string;
  width: number;
  height: number;
  licence: string;
  author: string;
  description: string;
};

type Approved = { images: Record<string, { file: string; page: string; licence: string; author: string; reviewed: string }> };

function clean(html: string | undefined): string {
  return (html ?? '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function api(params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params });
  const res = await fetch(`${API}?${qs}`, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!res.ok) throw new Error(`commons ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

type Page = { title: string; imageinfo?: Record<string, unknown>[] };

function toCand(p: Page): Cand | null {
  const ii = p.imageinfo?.[0] as
    | { thumburl?: string; url?: string; thumbwidth?: number; thumbheight?: number; extmetadata?: Record<string, { value?: string }> }
    | undefined;
  if (!ii) return null;
  const m = ii.extmetadata ?? {};
  return {
    title: p.title.replace(/^File:/, ''),
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
    url: (ii.thumburl ?? ii.url ?? '').split('?')[0],
    width: ii.thumbwidth ?? 0,
    height: ii.thumbheight ?? 0,
    licence: clean(m.LicenseShortName?.value) || clean(m.License?.value),
    author: clean(m.Artist?.value) || clean(m.Credit?.value),
    description: `${clean(m.ObjectName?.value)} ${clean(m.ImageDescription?.value)}`.trim(),
  };
}

const IMAGE_PROPS = {
  prop: 'imageinfo',
  iiprop: 'url|extmetadata|size',
  iiurlwidth: '1024',
  iiextmetadatafilter: 'LicenseShortName|License|Artist|Credit|ImageDescription|ObjectName',
};

async function search(query: string, limit: number): Promise<Cand[]> {
  const data = (await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    ...IMAGE_PROPS,
  })) as { query?: { pages?: Page[] } };
  return (data.query?.pages ?? []).map(toCand).filter((c): c is Cand => c !== null);
}

/** Current metadata for one exact file, so an approved entry re-checks its licence before it is used. */
async function byTitle(file: string): Promise<Cand | null> {
  const data = (await api({ action: 'query', titles: `File:${file}`, ...IMAGE_PROPS })) as { query?: { pages?: Page[] } };
  const p = (data.query?.pages ?? [])[0];
  return p ? toCand(p) : null;
}

function isFree(licence: string): boolean {
  if (!licence) return false;
  if (NON_FREE.some((re) => re.test(licence))) return false;
  return FREE.some((re) => re.test(licence));
}

/** Split a name into the tokens that actually identify it: "Unitree Go2 Pro" → ["unitree","go2","pro"]. */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !['the', 'robot', 'robotics', 'inc', 'ltd', 'co', 'gmbh', 'technologies'].includes(t));
}

function scoreCandidate(c: Cand, maker: string, model: string): number {
  const title = ' ' + tokens(c.title).join(' ') + ' ';
  const desc = ' ' + tokens(c.description).join(' ') + ' ';
  const both = title + desc;
  const makerTok = tokens(maker);
  const modelTok = tokens(model);
  if (!modelTok.length) return 0;

  // Model names are often ordinary words — Figure, Atlas, Iron, Neo, Spot — and
  // a bare number matches the date in a filename, so the title has to carry the
  // model and the maker has to appear somewhere.
  const modelInTitle = modelTok.every((t) => title.includes(' ' + t + ' '));
  if (!modelInTitle) return 0;
  const makerInTitle = makerTok.some((t) => title.includes(' ' + t + ' '));
  const makerInDesc = makerTok.some((t) => desc.includes(' ' + t + ' '));
  if (!makerInTitle && !makerInDesc) return 0;

  // Read the raw text here, not the tokens: tokens() drops "robot" as a stopword.
  const raw = (c.title + ' ' + c.description).toLowerCase();
  const saysRobot = /\b(robot|robots|robotic|robotics|humanoid|quadruped|droid|android)\b/.test(raw);
  if (!makerInTitle && !saysRobot) return 0;

  let s = makerInTitle ? 12 : 6;
  if (saysRobot) s += 3;
  if (c.width >= 800) s += 2;
  if (/\b(logo|diagram|chart|screenshot|patent|map|poster|sign|banner|statue|sculpture|painting|toy|lego|cosplay)\b/.test(both)) s -= 20;
  return s;
}

type Row = { id: string; maker: string; maker_slug: string; model_slug: string; name: string };

async function robotsNeedingImages(sql: Awaited<ReturnType<typeof db>>, limit: number, only?: string): Promise<Row[]> {
  return (await sql`
    select r.id, m.name as maker, m.slug as maker_slug, r.model_slug, r.name
    from robots r
    join manufacturers m on m.id = r.manufacturer_id
    where r.variant = 'base'
      and not exists (select 1 from robot_assets x where x.robot_id = r.id and x.kind = 'image')
      and (${only ?? null}::text is null or m.slug || '/' || r.model_slug = ${only ?? null})
    order by (select count(*) from robot_facts f where f.robot_id = r.id) desc
    limit ${limit}`) as unknown as Row[];
}

/** Search Commons and write every survivor to .out/review for a human to look at. Writes nothing to the database. */
async function review(sql: Awaited<ReturnType<typeof db>>, limit: number, only?: string) {
  const robots = await robotsNeedingImages(sql, limit, only);
  const approved = (JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved).images;
  const manifest: Record<string, unknown>[] = [];
  mkdirSync(REVIEW, { recursive: true });
  console.log(`${robots.length} robots without an image\n`);

  for (const r of robots) {
    const key = `${r.maker_slug}/${r.model_slug}`;
    if (approved[key]) continue;
    let cands: Cand[] = [];
    try {
      cands = await search(`${r.maker} ${r.name}`.replace(/\s+/g, ' '), 12);
    } catch (e) {
      console.log(`  !  ${key}: ${(e as Error).message}`);
      continue;
    }
    const best = cands
      .map((c) => ({ c, score: isFree(c.licence) ? scoreCandidate(c, r.maker, r.name) : 0 }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || y.c.width - x.c.width)[0];
    if (!best) continue;
    const file = join(REVIEW, `${r.maker_slug}__${r.model_slug}.jpg`);
    const buf = Buffer.from(await (await fetch(best.c.url, { headers: { 'user-agent': UA } })).arrayBuffer());
    writeFileSync(file, buf);
    manifest.push({ robot: key, name: r.name, maker: r.maker, file, title: best.c.title, licence: best.c.licence, author: best.c.author, page: best.c.pageUrl });
    console.log(`  ?  ${key.padEnd(28)} ${best.c.licence.padEnd(14)} ${best.c.title.slice(0, 60)}`);
    await new Promise((res) => setTimeout(res, 350));
  }

  writeFileSync(join(REVIEW, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.length} proposals in ${REVIEW}. Look at each one, then copy the good entries into ${APPROVED}.`);
}

/** Attach the reviewed files, re-checking the licence on Commons first. */
async function apply(sql: Awaited<ReturnType<typeof db>>) {
  const approved = (JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved).images;
  const keys = Object.keys(approved);
  console.log(`${keys.length} reviewed images\n`);
  let wrote = 0;

  for (const key of keys) {
    const [maker_slug, model_slug] = key.split('/');
    const rows = (await sql`
      select r.id, r.name, m.name as maker from robots r
      join manufacturers m on m.id = r.manufacturer_id
      where m.slug = ${maker_slug} and r.model_slug = ${model_slug} and r.variant = 'base'`) as unknown as Row[];
    if (!rows.length) {
      console.log(`  !  ${key}: no such robot`);
      continue;
    }
    const live = await byTitle(approved[key].file);
    if (!live || !live.url) {
      console.log(`  !  ${key}: file gone from Commons`);
      continue;
    }
    if (!isFree(live.licence)) {
      console.log(`  !  ${key}: licence is now ${live.licence || 'unstated'}, skipped`);
      continue;
    }
    const robot = rows[0];
    const attribution = `${live.author || approved[key].author || 'Unknown author'} · ${live.licence} · Wikimedia Commons`;
    await sql`delete from robot_assets where robot_id = ${robot.id} and kind = 'image'`;
    await sql`
      insert into robot_assets (robot_id, kind, url, source_url, licence, attribution, width, height, alt, is_primary, sort)
      values (${robot.id}, 'image', ${live.url}, ${live.pageUrl}, ${live.licence}, ${attribution},
              ${live.width}, ${live.height}, ${`${robot.name} by ${robot.maker}`}, true, 0)`;
    wrote++;
    console.log(`  ✓  ${key.padEnd(28)} ${live.licence.padEnd(14)} ${live.title.slice(0, 56)}`);
    await new Promise((res) => setTimeout(res, 250));
  }
  console.log(`\n${wrote} image(s) attached`);
}

async function main() {
  const a = args();
  const sql = await db();
  await preflight(sql, 'wikimedia images');
  if (a.review === true) await review(sql, num(a.limit) ?? 60, str(a.only));
  else await apply(sql);
  if (!COMMIT) console.log('(dry run — nothing was written)');
  await done();
}

main().catch(async (e) => {
  console.error(e);
  await done(1);
});
