// maker-previews.ts — the maker's own product-page preview image, for robots
// that have no free-licence photograph.
//
//   node --import tsx scripts/assets/maker-previews.ts --review --limit 300     propose
//   node --import tsx scripts/assets/maker-previews.ts --commit                 apply
//
// A product page's og:image is published so that other sites can show it as
// a preview with a link back. That is exactly what we do: the image is
// hotlinked, never copied, credited "Image: <maker>", and linked to the page
// it came from. Nothing is attached that a person has not looked at: --review
// writes candidates and contact sheets to .out/review-previews, and only
// data/assets/previews.json is ever applied.
//
// Finding the page: the ledger's tier-1 URL when we have one; else the maker's
// sitemap.xml scored by the model's name tokens; else links on the homepage.
// A homepage's own og:image is the company's generic picture, so any candidate
// equal to it is rejected — Figure's "generic-page-image.jpeg" is the case.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { COMMIT, db, done, preflight } from '../_guard';
import { FetchRefused, politeFetch } from '../scrape/_lib/fetch';
import { args, num, str } from '../scrape/_lib/args';

const REVIEW = '.out/review-previews';
const APPROVED = 'data/assets/previews.json';
const UA = 'SitebotsBot/0.1 (+https://sitebots.dev/bot)';
const SKIP_PATH = /\/(news|blog|press|media|posts?|articles?|careers|jobs|case[-_]?stud|events?|support|docs?|legal|privacy|terms|about|contact|investors?|tag|category|wp-content|feed)(\/|$|\.)/i;

type Row = { id: string; maker: string; maker_slug: string; model_slug: string; name: string; website: string | null; known: string | null };
type Cand = { page: string; image: string; width: number | null; height: number | null; title: string; extras?: string[]; how: 'ledger' | 'sitemap' | 'homepage' | 'listing' | 'search'; via: 'meta' | 'rendered-meta' | 'hero' };

/**
 * Client-rendered product pages (Unitree, Booster) carry no og:image in the
 * HTML the server sends. After politeFetch has shown the page is allowed and
 * reachable, render it once in a browser and read either the meta tag the
 * script injected or, failing that, the largest image on the page — the
 * product hero. The candidate records which of the two it was.
 */
let browserPromise: Promise<import('@playwright/test').Browser> | null = null;
async function browser() {
  if (!browserPromise) browserPromise = import('@playwright/test').then((m) => m.chromium.launch());
  return browserPromise;
}

async function renderedPreview(page: string, generic: (img: string) => boolean = () => false, genericImage: string | null = null): Promise<Omit<Cand, 'how' | 'page'> | null> {
  const b = await browser();
  const ctx = await b.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  try {
    await p.goto(page, { waitUntil: 'networkidle', timeout: 25_000 }).catch(() => {});
    // Lazy heroes load on scroll; walk the first screens, then come back up.
    await p.evaluate(`(async () => { for (let y = 0; y < 3600; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); } window.scrollTo(0, 0); })()`).catch(() => {});
    await p.waitForTimeout(1500);
    // A string, not a function: esbuild would otherwise inject its __name
    // helper into code that runs inside the page, where it does not exist.
    // The site-wide og:image is passed in so the page script can skip it and
    // look for the hero instead; heroes may be <img> or a CSS background.
    const found = (await p.evaluate(`((GENERIC) => {
      const meta = (sel) => { const m = document.querySelector(sel); return m ? m.content : null; };
      const og = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
      const title = meta('meta[property="og:title"]') || document.title;
      const same = (u) => GENERIC && u && u.split('?')[0] === GENERIC.split('?')[0];
      if (og && !same(og)) return { image: og, via: 'rendered-meta', width: null, height: null, title };
      const bad = /logo|icon|sprite|avatar|flag|qr|badge|payment|placeholder|blank|pixel/i;
      const seen = new Set();
      const all = [];
      const consider = (src, r, w, h) => {
        if (!src || r.width < 400 || r.height < 250 || bad.test(src) || same(src)) return;
        const key = src.split('?')[0];
        if (seen.has(key)) return;
        seen.add(key);
        all.push({ src, area: r.width * r.height, w, h });
      };
      for (const img of Array.from(document.images)) {
        const r = img.getBoundingClientRect();
        consider(img.currentSrc || img.src, r, Math.round(img.naturalWidth || r.width), Math.round(img.naturalHeight || r.height));
      }
      for (const el of Array.from(document.querySelectorAll('div,section,header,a,figure,span'))) {
        const bg = getComputedStyle(el).backgroundImage;
        const m = bg && /url[(]["']?([^"')]+)["']?[)]/.exec(bg);
        if (!m || /gradient/.test(bg)) continue;
        const r = el.getBoundingClientRect();
        consider(m[1], r, Math.round(r.width), Math.round(r.height));
      }
      all.sort((a, b) => b.area - a.area);
      const best = all[0];
      return best ? { image: best.src, via: 'hero', width: best.w, height: best.h, title, extras: all.slice(1, 3).map((x) => x.src) } : null;
    })(${JSON.stringify(genericImage)})`)) as { image: string; via: string; width: number | null; height: number | null; title: string; extras?: string[] } | null;
    if (!found) return null;
    if (/^data:/i.test(found.image) || /[.](svg|gif)([?]|$)/i.test(found.image)) return null;
    if (generic(found.image)) return null;
    const extras = (found.extras ?? []).map((u) => { try { return new URL(u, page).toString(); } catch { return ''; } }).filter((u) => u && !/^data:/i.test(u) && !/[.](svg|gif)([?]|$)/i.test(u));
    return { image: new URL(found.image, page).toString(), width: found.width, height: found.height, title: (found.title ?? '').trim(), via: found.via as 'rendered-meta' | 'hero', extras };
  } finally {
    await ctx.close();
  }
}

type Approved = { images: Record<string, { page: string; image: string; reviewed: string; licence?: string; attribution?: string; more?: string[] }>; _rejected?: Record<string, string> };

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !['the', 'robot', 'robotics', 'inc', 'ltd', 'co', 'gmbh', 'technologies', 'series', 'humanoid'].includes(t));
}

async function html(url: string): Promise<string | null> {
  try {
    return (await politeFetch(url, { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' })).body;
  } catch (e) {
    if (e instanceof FetchRefused) return null;
    return null;
  }
}

function origin(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

/** og:image / twitter:image / image_src from a page, with dimensions when the page says. */
function previewOf(page: string, body: string): Omit<Cand, 'how' | 'page' | 'via'> | null {
  const $ = cheerio.load(body);
  const pick = (sel: string) => $(sel).first().attr('content') ?? $(sel).first().attr('href');
  const raw = pick('meta[property="og:image"]') ?? pick('meta[property="og:image:secure_url"]') ?? pick('meta[name="twitter:image"]') ?? pick('meta[name="twitter:image:src"]') ?? pick('link[rel="image_src"]');
  if (!raw) return null;
  let image: string;
  try {
    image = new URL(raw.trim(), page).toString();
  } catch {
    return null;
  }
  if (/^data:/i.test(image) || /\.(svg|gif)(\?|$)/i.test(image)) return null;
  const w = Number($('meta[property="og:image:width"]').attr('content') ?? NaN);
  const h = Number($('meta[property="og:image:height"]').attr('content') ?? NaN);
  const title = ($('meta[property="og:title"]').attr('content') ?? $('title').first().text() ?? '').trim();
  return { image, width: Number.isFinite(w) ? w : null, height: Number.isFinite(h) ? h : null, title };
}

/** Every <loc> in a sitemap, following one level of <sitemapindex>. */
async function sitemapUrls(site: string): Promise<string[]> {
  const first = await html(`${origin(site)}/sitemap.xml`);
  if (!first) return [];
  const locs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  if (!/<sitemapindex/i.test(first)) return locs(first);
  const subs = locs(first).filter((u) => !/(post|news|blog|tag|category|author|attachment)/i.test(u)).slice(0, 8);
  const out: string[] = [];
  for (const s of subs) {
    const body = await html(s);
    if (body) out.push(...locs(body));
  }
  return out;
}

/** Score a URL as the product page for a model: every model token in the path, shorter is better. */
function scorePath(url: string, modelTok: string[], site: string): number {
  let path: string;
  try {
    const u = new URL(url);
    if (u.host.replace(/^www\./, '') !== new URL(site).host.replace(/^www\./, '')) return 0;
    path = decodeURIComponent(u.pathname).toLowerCase();
  } catch {
    return 0;
  }
  if (SKIP_PATH.test(path)) return 0;
  const hay = ` ${path.replace(/[^a-z0-9]+/g, ' ')} `;
  if (!modelTok.every((t) => hay.includes(` ${t} `))) return 0;
  return 10 - Math.min(6, path.split('/').filter(Boolean).length) + (/(product|robot)s?\//.test(path) ? 1 : 0);
}

const LISTING = /[/](products?|robots?|humanoids?|solutions?|portfolio|catalog(ue)?|models?|lineup|series)[/]?$/i;

async function renderedLinks(url: string): Promise<[string, string][]> {
  const b = await browser();
  const ctx = await b.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  try {
    // Navigation, not pixels: the DOM after scripts have run is enough, and a 20 s cap keeps a slow site from costing minutes per maker.
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const found = (await pg.evaluate(`Array.from(document.querySelectorAll('a[href]')).map((a) => [a.href, (a.textContent || '').trim().slice(0, 80)])`)) as [string, string][];
    return found;
  } catch {
    return [];
  } finally {
    await ctx.close();
  }
}

/** Every same-host link a site offers from its front door and its product listings, with the link text. Cached per site: a maker with 17 robots is crawled once. */
const siteLinksCache = new Map<string, Promise<Map<string, string>>>();
function siteLinks(site: string): Promise<Map<string, string>> {
  const cached = siteLinksCache.get(site);
  if (cached) return cached;
  const p = (async () => {
    const host = new URL(site).host.replace(/^www[.]/, '');
    const out = new Map<string, string>();
    const add = (pairs: [string, string][]) => {
      for (const [href, text] of pairs) {
        let abs: URL;
        try {
          abs = new URL(href, site);
        } catch {
          continue;
        }
        if (abs.host.replace(/^www[.]/, '') !== host || SKIP_PATH.test(abs.pathname)) continue;
        const key = abs.toString().split('#')[0];
        const prev = out.get(key) ?? '';
        out.set(key, prev.length >= text.length ? prev : text);
      }
    };
    const staticLinks = (body: string, base: string): [string, string][] => {
      const $ = cheerio.load(body);
      const pairs: [string, string][] = [];
      $('a[href]').each((_, a) => {
        pairs.push([$(a).attr('href') ?? '', $(a).text().trim().slice(0, 80)]);
      });
      return pairs.map(([h, t]) => { try { return [new URL(h, base).toString(), t]; } catch { return [h, t]; } });
    };
    const home = await html(site);
    if (home) add(staticLinks(home, site));
    // A JS shell sends a handful of anchors; the real navigation only exists after rendering.
    // Rendering happens only after politeFetch has shown the page is allowed — robots.txt applies to the browser too.
    if (home && out.size < 8) add(await renderedLinks(site));
    const listings = [...out.keys()].filter((u) => LISTING.test(new URL(u).pathname) || /products?|robots?|humanoid/i.test(out.get(u) ?? '')).slice(0, 4);
    for (const l of listings) {
      const body = await html(l);
      const before = out.size;
      if (body) add(staticLinks(body, l));
      if (body && out.size - before < 3) add(await renderedLinks(l));
    }
    say(`site ${host}: ${out.size} links (${listings.length} listings)`);
    return out;
  })();
  siteLinksCache.set(site, p);
  return p;
}

const VERBOSE = process.argv.includes('--verbose');
const say = (m: string) => VERBOSE && console.log('       ' + m);

async function discover(r: Row, homepageImage: string | null): Promise<Cand | null> {
  const modelTok = tokens(r.name).filter((t) => !tokens(r.maker).includes(t));
  say(`tokens ${JSON.stringify(modelTok)} site ${r.website ?? '—'} known ${r.known ?? '—'}`);
  if (!modelTok.length) return null;
  const tryPage = async (page: string, how: Cand['how']): Promise<Cand | null> => {
    const body = await html(page);
    if (!body) return say(`${page}: not fetchable (robots.txt, blocked or empty)`), null;
    const meta = previewOf(page, body);
    const generic = (img: string) => !!homepageImage && img.split('?')[0] === homepageImage.split('?')[0];
    let p: Omit<Cand, 'how' | 'page'> | null = meta ? { ...meta, via: 'meta' } : null;
    // The site-wide og:image (the company's generic picture) says nothing about this page; the rendered hero might.
    if (!p || generic(p.image)) p = await renderedPreview(page, generic, homepageImage);
    if (!p) return say(`${page}: no og:image in the HTML and nothing usable after rendering`), null;
    if (generic(p.image)) return say(`${page}: same image as the homepage (generic)`), null;
    if (p.width !== null && p.height !== null && (p.width < 300 || p.height < 200)) return say(`${page}: image too small (${p.width}×${p.height})`), null;
    say(`${page}: ${p.via} → ${p.image.slice(0, 90)}`);
    return { page, how, ...p };
  };
  if (r.known) {
    const c = await tryPage(r.known, 'ledger');
    if (c) return c;
  }
  if (!r.website) return null;
  const site = r.website;
  const all = await sitemapUrls(site);
  const ranked = all.map((u) => ({ u, s: scorePath(u, modelTok, site) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  say(`sitemap ${all.length} urls, ${ranked.length} match: ${ranked.slice(0, 3).map((x) => x.u).join(' ')}`);
  for (const { u } of ranked.slice(0, 3)) {
    const c = await tryPage(u, 'sitemap');
    if (c) return c;
  }
  const links = await siteLinks(site);
  const scored = new Map<string, number>();
  const sameHost = (u: string) => { try { return new URL(u).host.replace(/^www[.]/, '') === new URL(site).host.replace(/^www[.]/, ''); } catch { return false; } };
  for (const [u, text] of links) {
    const t = ` ${tokens(text).join(' ')} `;
    const textHit = sameHost(u) && modelTok.every((x) => t.includes(` ${x} `)) ? 2 : 0;
    const sc = scorePath(u, modelTok, site) + textHit;
    if (sc > 0) scored.set(u, Math.max(scored.get(u) ?? 0, sc));
  }
  const top = [...scored].sort((a, b) => b[1] - a[1]).slice(0, 3);
  say(`site links matching: ${top.map(([u]) => u).join(' ') || 'none'}`);
  for (const [u] of top) {
    const c = await tryPage(u, 'listing');
    if (c) return c;
  }
  // WordPress sites answer ?s= with a results page whose links name the product.
  const home = await html(site);
  if (home && /wp-content|wp-json/i.test(home)) {
    const res = await html(`${origin(site)}/?s=${encodeURIComponent(modelTok.join(' '))}`);
    if (res) {
      const $ = cheerio.load(res);
      const hits = new Map<string, number>();
      $('a[href]').each((_, a) => {
        let abs: string;
        try {
          abs = new URL($(a).attr('href') ?? '', site).toString().split('#')[0];
        } catch {
          return;
        }
        const t = ` ${tokens($(a).text()).join(' ')} `;
        const sc = scorePath(abs, modelTok, site) + (sameHost(abs) && modelTok.every((x) => t.includes(` ${x} `)) ? 2 : 0);
        if (sc > 0) hits.set(abs, Math.max(hits.get(abs) ?? 0, sc));
      });
      for (const [u] of [...hits].sort((a, b) => b[1] - a[1]).slice(0, 2)) {
        const c = await tryPage(u, 'search');
        if (c) return c;
      }
    }
  }
  return null;
}

/** --makers a,b,c restricts a pass to those maker slugs — the second pass after new websites arrived. */
const MAKERS = (() => { const i = process.argv.indexOf('--makers'); return i > 0 ? process.argv[i + 1].split(',').map((x) => x.trim()).filter(Boolean) : null; })();

async function robotsWithout(sql: Awaited<ReturnType<typeof db>>, limit: number, only?: string): Promise<Row[]> {
  return (await sql`
    select r.id, m.name as maker, m.slug as maker_slug, r.model_slug, r.name, m.website_url as website,
           (select rs.source_url from robot_sources rs join sources s on s.id = rs.source_id
             where rs.robot_id = r.id and s.tier = 1 and rs.source_url not like '%shop.unitree.com%' limit 1) as known
    from robots r join manufacturers m on m.id = r.manufacturer_id
    where r.variant = 'base'
      and not exists (select 1 from robot_assets x where x.robot_id = r.id and x.kind = 'image' and x.url not like '/renders/%')
      and (${only ?? null}::text is null or m.slug || '/' || r.model_slug = ${only ?? null})
      and (${MAKERS}::text[] is null or m.slug = any(${MAKERS}::text[]))
    order by (select count(*) from robot_facts f where f.robot_id = r.id) desc
    limit ${limit}`) as unknown as Row[];
}

async function review(sql: Awaited<ReturnType<typeof db>>, limit: number, only?: string) {
  const rows = await robotsWithout(sql, limit, only);
  const approved = existsSync(APPROVED) ? (JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved) : { images: {}, _rejected: {} };
  mkdirSync(REVIEW, { recursive: true });
  console.log(`${rows.length} robots without a photograph\n`);
  const homepageImage = new Map<string, string | null>();
  const manifest: (Cand & { robot: string; name: string; maker: string })[] = [];
  const misses: Record<string, string[]> = {};
  for (const r of rows) {
    const key = `${r.maker_slug}/${r.model_slug}`;
    if (approved.images[key] || approved._rejected?.[key]) continue;
    if (r.website && !homepageImage.has(r.website)) {
      const body = await html(r.website);
      homepageImage.set(r.website, body ? previewOf(r.website, body)?.image ?? null : null);
    }
    const c = await discover(r, r.website ? homepageImage.get(r.website) ?? null : null);
    if (!c) {
      console.log(`  –  ${key.padEnd(30)} ${r.website ? new URL(r.website).host : '(no website)'}`);
      (misses[r.website ? new URL(r.website).host : '(no website)'] ??= []).push(key);
      continue;
    }
    // One download for the reviewer's eyes; the site itself hotlinks.
    try {
      const res = await fetch(c.image, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
      if (res.ok) writeFileSync(join(REVIEW, `${r.maker_slug}__${r.model_slug}.img`), Buffer.from(await res.arrayBuffer()));
    } catch {
      // the sheet shows a broken tile, which is itself a finding
    }
    manifest.push({ robot: key, name: r.name, maker: r.maker, ...c });
    console.log(`  ?  ${key.padEnd(30)} ${c.how.padEnd(8)} ${c.via.padEnd(13)} ${c.page}`);
  }
  writeFileSync(join(REVIEW, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(REVIEW, 'misses.json'), JSON.stringify(misses, null, 2));
  // Contact sheets: 20 per page, so a few hundred candidates are a dozen images.
  const per = 20;
  for (let i = 0; i < manifest.length; i += per) {
    const tiles = manifest.slice(i, i + per).map((m, j) => `<figure><img src="${m.image}" loading="eager"><figcaption><b>${i + j + 1}</b> ${m.robot}<br><small>${m.how} · ${m.via} · ${m.title.slice(0, 60)}</small></figcaption></figure>`).join('');
    writeFileSync(join(REVIEW, `sheet-${String(i / per + 1).padStart(2, '0')}.html`), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px system-ui}main{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px}figure{margin:0;border:1px solid #ddd;padding:4px}img{width:100%;height:160px;object-fit:contain;background:#f4f4f5}figcaption{margin-top:4px}</style><main>${tiles}</main>`);
  }
  console.log(`\n${manifest.length} candidates, ${Object.values(misses).flat().length} robots without a findable page → ${REVIEW}`);
  console.log(`Sheets: ${Math.ceil(manifest.length / per)} (render with tests/shot.ts file://…/sheet-NN.html). Copy approved entries into ${APPROVED}.`);
}

async function apply(sql: Awaited<ReturnType<typeof db>>) {
  const approved = JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved;
  let wrote = 0;
  for (const [key, a] of Object.entries(approved.images)) {
    const [maker_slug, model_slug] = key.split('/');
    const rows = (await sql`select r.id, r.name, m.name as maker from robots r join manufacturers m on m.id = r.manufacturer_id
      where m.slug = ${maker_slug} and r.model_slug = ${model_slug} and r.variant = 'base'`) as unknown as Row[];
    if (!rows.length) {
      console.log(`  !  ${key}: no such robot`);
      continue;
    }
    const robot = rows[0];
    const host = new URL(a.page).host.replace(/^www\./, '');
    const licence = a.licence ?? 'maker-preview';
    const attribution = a.attribution ?? `Image: ${robot.maker}, from ${host}`;
    await sql`delete from robot_assets where robot_id = ${robot.id} and kind = 'image' and licence = ${licence}`;
    await sql`insert into robot_assets (robot_id, kind, url, source_url, licence, attribution, alt, is_primary, sort)
      values (${robot.id}, 'image', ${a.image}, ${a.page}, ${licence}, ${attribution}, ${`${robot.name} by ${robot.maker}`}, false, 1)`;
    wrote++;
    for (const [i, extra] of (a.more ?? []).entries()) {
      await sql`insert into robot_assets (robot_id, kind, url, source_url, licence, attribution, alt, is_primary, sort)
        values (${robot.id}, 'image', ${extra}, ${a.page}, ${licence}, ${attribution}, ${`${robot.name} by ${robot.maker}, picture ${i + 2}`}, false, ${i + 2})`;
      wrote++;
    }
  }
  console.log(`${wrote} preview image(s) attached`);
}

const MORE_DIR = '.out/review-more';

/**
 * Second and third pictures, from the same product pages a person has already
 * approved: render each page once more and keep the largest pictures that are
 * not the approved one. Same review flow; approved URLs go into
 * previews.json under `more`.
 */
async function more() {
  const approved = JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved;
  mkdirSync(MORE_DIR, { recursive: true });
  const manifest: { robot: string; page: string; image: string; n: number; title: string }[] = [];
  const homepageImage = new Map<string, string | null>();
  for (const [key, a] of Object.entries(approved.images)) {
    if (a.more || /github[.]com/.test(a.page)) continue;
    const site = origin(a.page);
    if (!homepageImage.has(site)) {
      const body = await html(site);
      homepageImage.set(site, body ? previewOf(site, body)?.image ?? null : null);
    }
    const generic = homepageImage.get(site) ?? null;
    if (!(await html(a.page))) {
      console.log(`  –  ${key.padEnd(30)} page not fetchable now`);
      continue;
    }
    const r = await renderedPreview(a.page, (img) => !!generic && img.split('?')[0] === generic.split('?')[0], generic);
    const strip = (u: string) => u.split('?')[0];
    const pics = [...(r ? [r.image, ...(r.extras ?? [])] : [])].filter((u, i, arr) => strip(u) !== strip(a.image) && arr.findIndex((x) => strip(x) === strip(u)) === i).slice(0, 2);
    if (!pics.length) {
      console.log(`  –  ${key.padEnd(30)} no further pictures on the page`);
      continue;
    }
    for (const [i, image] of pics.entries()) {
      try {
        const res = await fetch(image, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
        if (res.ok) writeFileSync(join(MORE_DIR, `${key.replace('/', '__')}__${i + 2}.img`), Buffer.from(await res.arrayBuffer()));
      } catch {
        // the sheet shows a broken tile
      }
      manifest.push({ robot: key, page: a.page, image, n: i + 2, title: r?.title ?? '' });
      console.log(`  ?  ${key.padEnd(30)} #${i + 2} ${image.slice(0, 90)}`);
    }
  }
  writeFileSync(join(MORE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const per = 20;
  for (let i = 0; i < manifest.length; i += per) {
    const tiles = manifest.slice(i, i + per).map((m, j) => `<figure><img src="${m.image}" loading="eager"><figcaption><b>${i + j + 1}</b> ${m.robot} #${m.n}<br><small>${m.title.slice(0, 60)}</small></figcaption></figure>`).join('');
    writeFileSync(join(MORE_DIR, `sheet-${String(i / per + 1).padStart(2, '0')}.html`), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px system-ui}main{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px}figure{margin:0;border:1px solid #ddd;padding:4px}img{width:100%;height:160px;object-fit:contain;background:#f4f4f5}figcaption{margin-top:4px}</style><main>${tiles}</main>`);
  }
  console.log(`
${manifest.length} further pictures for review → ${MORE_DIR}`);
}

async function main() {
  if (process.argv.includes('--more')) {
    await more();
    await (await browser()).close().catch(() => {});
    return;
  }
  const a = args();
  const sql = await db();
  await preflight(sql, 'maker preview images');
  if (a.review === true) await review(sql, num(a.limit) ?? 300, str(a.only));
  else await apply(sql);
  if (!COMMIT) console.log('(dry run — nothing was written)');
  if (browserPromise) await (await browserPromise).close();
  await done();
}

main().catch(async (e) => {
  console.error(e);
  await done(1);
});
