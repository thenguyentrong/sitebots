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
import { tokens, scorePath } from './model-matching';
import * as cheerio from 'cheerio';
import { COMMIT, db, done, preflight } from '../_guard';
import { FetchRefused, politeFetch, politeAsset } from '../scrape/_lib/fetch';
import { args, num, str } from '../scrape/_lib/args';

const SKIP_PATH = /\/(news|blog|press|media|posts?|articles?|careers|jobs|case[-_]?stud|events?|support|docs?|legal|privacy|terms|about|contact|investors?|tag|category|wp-content|feed)(\/|$|\.)/i;

const REVIEW = process.env.PREVIEW_REVIEW_DIR ?? '.out/review-previews';
const APPROVED = 'data/assets/previews.json';
const UA = 'SitebotsBot/0.1 (+https://sitebots.dev/bot)';


type Row = { id: string; maker: string; maker_slug: string; model_slug: string; name: string; website: string | null; known: string | null };
type Cand = { page: string; image: string; width: number | null; height: number | null; title: string; extras?: string[]; how: 'ledger' | 'sitemap' | 'homepage' | 'listing' | 'search' | 'named'; via: 'meta' | 'rendered-meta' | 'hero' };

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
    await withTimeout(p.evaluate(`(async () => { for (let y = 0; y < 3600; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); } window.scrollTo(0, 0); })()`), 15_000, undefined);
    await p.waitForTimeout(1500);
    // A string, not a function: esbuild would otherwise inject its __name
    // helper into code that runs inside the page, where it does not exist.
    // The site-wide og:image is passed in so the page script can skip it and
    // look for the hero instead; heroes may be <img> or a CSS background.
    const found = (await withTimeout(p.evaluate(`((GENERIC) => {
      const meta = (sel) => { const m = document.querySelector(sel); return m ? m.content : null; };
      const og = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
      const title = meta('meta[property="og:title"]') || document.title;
      const same = (u) => GENERIC && u && u.split('?')[0] === GENERIC.split('?')[0];
      if (og && !same(og) && !/logo|icon|placeholder/i.test(og)) return { image: og, via: 'rendered-meta', width: null, height: null, title };
      const bad = /logo|icon|sprite|avatar|flag|qr|badge|payment|placeholder|blank|pixel/i;
      const seen = new Set();
      const all = [];
      const consider = (src, r, w, h) => {
        if (!src || r.width < 400 || r.height < 250 || w < 160 || h < 160 || bad.test(src) || same(src)) return;
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
      return best ? { image: best.src, via: 'hero', width: best.w, height: best.h, title, extras: all.slice(1, 13).map((x) => x.src) } : null;
    })(${JSON.stringify(genericImage)})`), 20_000, null)) as { image: string; via: string; width: number | null; height: number | null; title: string; extras?: string[] } | null;
    if (!found) return null;
    if (/^data:/i.test(found.image) || /[.](svg|gif)([?]|$)/i.test(found.image)) return null;
    if (generic(found.image)) return null;
    const extras = (found.extras ?? []).map((u) => { try { return new URL(u, page).toString(); } catch { return ''; } }).filter((u) => u && !/^data:/i.test(u) && !/[.](svg|gif)([?]|$)/i.test(u));
    return { image: new URL(found.image, page).toString(), width: found.width, height: found.height, title: (found.title ?? '').trim(), via: found.via as 'rendered-meta' | 'hero', extras };
  } finally {
    await ctx.close();
  }
}

type Approved = {
  images: Record<string, { page: string; image: string; reviewed: string; licence?: string; attribution?: string; more?: string[]; pages?: string[] }>;
  _rejected?: Record<string, string>;
  /** Pictures turned down by eye, per robot, so a later pass does not propose them again. */
  _rejected_images?: Record<string, string[]>;
};

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
const LISTING = /[/](products?|robots?|humanoids?|solutions?|portfolio|catalog(ue)?|models?|lineup|series)[/]?$/i;

async function renderedLinks(url: string): Promise<[string, string][]> {
  const b = await browser();
  const ctx = await b.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  try {
    // Navigation, not pixels: the DOM after scripts have run is enough, and a 20 s cap keeps a slow site from costing minutes per maker.
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const found = (await withTimeout(pg.evaluate(`Array.from(document.querySelectorAll('a[href]')).map((a) => [a.href, (a.textContent || '').trim().slice(0, 80)])`), 15_000, null)) as [string, string][] | null;
    return found ?? [];
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

type SiteImage = { src: string; alt: string; w: number; h: number };
const siteImagesCache = new Map<string, Promise<SiteImage[]>>();

function siteImages(site: string): Promise<SiteImage[]> {
  const cached = siteImagesCache.get(site);
  if (cached) return cached;
  const p = (async () => {
    const out = new Map<string, SiteImage>();
    const b = await browser();
    const links = await siteLinks(site);
    const listings = [...links.keys()].filter((u) => LISTING.test(new URL(u).pathname)).slice(0, 3);
    for (const url of [site, ...listings]) {
      if (!(await html(url))) continue;
      const ctx = await b.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
      const pg = await ctx.newPage();
      try {
        await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => {});
        await withTimeout(pg.evaluate(`(async () => { for (let y = 0; y < 6000; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } })()`), 15_000, undefined);
        await pg.waitForTimeout(1200);
        const found = (await withTimeout(pg.evaluate(`Array.from(document.images).map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || '', w: i.naturalWidth || 0, h: i.naturalHeight || 0 }))`), 15_000, null)) as SiteImage[] | null;
        for (const im of found ?? []) if (im.src && !out.has(im.src.split('?')[0])) out.set(im.src.split('?')[0], im);
      } catch {
        // a site that will not render simply contributes nothing
      } finally {
        await ctx.close();
      }
    }
    say(`site images ${new URL(site).host}: ${out.size}`);
    return [...out.values()];
  })();
  siteImagesCache.set(site, p);
  return p;
}

/** Playwright's evaluate() waits forever on a page whose script never settles; this gives up instead. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
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
    if (!p || generic(p.image) || /logo|icon|placeholder/i.test(p.image)) {
      const $ = cheerio.load(body);
      const candidates = $('img').toArray().map(el=>({ image: $(el).attr('src') || $(el).attr('data-src') || '', alt: $(el).attr('alt') || '' })).filter(im=>im.image && !/logo|icon|sprite|qr/i.test(im.image) && modelTok.every(t=>tokens(im.alt+' '+im.image.split('/').pop()).includes(t)));
      if(candidates.length) p={image:new URL(candidates[0].image,page).toString(),width:null,height:null,title:$('title').text(),via:'hero'};
      else p=await renderedPreview(page,generic,homepageImage);
    }
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

  // No page names the robot; a picture might. An image called "a2-hero.jpg" or
  // captioned "Unitree A2" on the maker's own site is that robot, even when the
  // page it sits on covers the whole range.
  const named = (await siteImages(site))
    .filter((im) => {
      if (im.w < 400 || im.h < 250) return false;
      if (/logo|icon|sprite|avatar|flag|qr|badge|payment|placeholder|banner-bg/i.test(im.src)) return false;
      if (homepageImage && im.src.split('?')[0] === homepageImage.split('?')[0]) return false;
      const hay = ` ${tokens(`${decodeURIComponent(im.src.split('/').pop() ?? '')} ${im.alt}`).join(' ')} `;
      return modelTok.every((t) => hay.includes(` ${t} `));
    })
    .sort((a, b) => b.w * b.h - a.w * a.h);
  if (named.length) {
    const im = named[0];
    say(`named image ${im.src.slice(0, 90)}`);
    return { page: site, how: 'named', via: 'hero', image: im.src, width: im.w, height: im.h, title: im.alt || new URL(site).host, extras: named.slice(1, 6).map((x) => x.src) };
  }
  return null;
}

/** --makers a,b,c restricts a pass to those maker slugs — the second pass after new websites arrived. */
const MAKERS = (() => { const i = process.argv.indexOf('--makers'); return i > 0 ? process.argv[i + 1].split(',').map((x) => x.trim()).filter(Boolean) : null; })();

async function robotsWithout(sql: Awaited<ReturnType<typeof db>> | null, limit: number, only?: string): Promise<Row[]> {
  if (process.env.CATALOGUE_SCAN_INPUT) {
    const rows = JSON.parse(readFileSync(process.env.CATALOGUE_SCAN_INPUT, 'utf8')) as (Row & {variant: string; key: string; sourceUrls?: string[]})[];
    return rows.filter(r=>r.variant==='base' && (!only || r.key===only) && (!MAKERS || MAKERS.includes(r.maker_slug))).slice(0,limit).map(r=>({...r,known:r.sourceUrls?.find((u:string)=>r.website && new URL(u).hostname.replace(/^www\./,'')===new URL(r.website).hostname.replace(/^www\./,'')) ?? null}));
  }
  if (!sql) throw new Error('Database or catalogue export required');
  return (await sql`
    select r.id, m.name as maker, m.slug as maker_slug, r.model_slug, r.name, m.website_url as website,
           (select rs.source_url from robot_sources rs join sources s on s.id = rs.source_id
             where rs.robot_id = r.id and s.tier = 1 and rs.source_url not like '%shop.unitree.com%' limit 1) as known
    from robots r join manufacturers m on m.id = r.manufacturer_id
    where r.variant = 'base'
      -- Robots without a picture from the maker. Having a free-licence photograph
      -- is no reason to skip one: the G1 had a Commons photo and nothing else,
      -- while unitree.com publishes a dozen.
      and not exists (select 1 from robot_assets x where x.robot_id = r.id and x.kind = 'image' and x.licence = 'maker-preview')
      and (${only ?? null}::text is null or m.slug || '/' || r.model_slug = ${only ?? null})
      and (${MAKERS}::text[] is null or m.slug = any(${MAKERS}::text[]))
    order by (select count(*) from robot_facts f where f.robot_id = r.id) desc
    limit ${limit}`) as unknown as Row[];
}

async function review(sql: Awaited<ReturnType<typeof db>> | null, limit: number, only?: string) {
  const rows = await robotsWithout(sql, limit, only);
  const approved = existsSync(APPROVED) ? (JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved) : { images: {}, _rejected: {} };
  mkdirSync(REVIEW, { recursive: true });
  console.log(`${rows.length} robots without a photograph\n`);
  const homepageImage = new Map<string, string | null>();
  const manifest: (Cand & { robot: string; name: string; maker: string })[] = [];
  const misses: Record<string, string[]> = {};
  const groups = new Map<string, Row[]>();
  for (const row of rows) { const host=row.website ? new URL(row.website).host : '(no website)'; groups.set(host,[...(groups.get(host)??[]),row]); }
  const queue=[...groups.values()];
  const scan = async (r: Row) => {
    const key = `${r.maker_slug}/${r.model_slug}`;
    if (approved.images[key] || (approved._rejected?.[key] && !process.argv.includes('--revisit'))) return;
    if (r.website && !homepageImage.has(r.website)) {
      const body = await html(r.website);
      homepageImage.set(r.website, body ? previewOf(r.website, body)?.image ?? null : null);
    }
    const c = await discover(r, r.website ? homepageImage.get(r.website) ?? null : null);
    if (!c) {
      console.log(`  –  ${key.padEnd(30)} ${r.website ? new URL(r.website).host : '(no website)'}`);
      (misses[r.website ? new URL(r.website).host : '(no website)'] ??= []).push(key);
      writeFileSync(join(REVIEW, 'misses.json'), JSON.stringify(misses, null, 2));
      return;
    }
    // One download for the reviewer's eyes; the site itself hotlinks.
    try {
      writeFileSync(join(REVIEW, `${r.maker_slug}__${r.model_slug}.img`), await politeAsset(c.image));
    } catch {
      // the sheet shows a broken tile, which is itself a finding
    }
    manifest.push({ robot: key, name: r.name, maker: r.maker, ...c });
    writeFileSync(join(REVIEW, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`  ?  ${key.padEnd(30)} ${c.how.padEnd(8)} ${c.via.padEnd(13)} ${c.page}`);
  }
  await Promise.all(Array.from({length:6},async()=>{ while(queue.length) { const group=queue.shift()!; for(const r of group) { try { await scan(r); } catch(e) { (misses['scan-error']??=[]).push(`${r.maker_slug}/${r.model_slug}: ${String(e)}`); } } } }));
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
const MORE_CAP = Number(process.env.MORE_CAP ?? 8);

/** Alphanumeric groups of a name, single characters kept: "R1-D" is r1 + d, and that d is the whole point. */
function segTokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

/**
 * Is this URL a page about exactly this model? One path segment must read as
 * precisely the model's name. "/products/spot/payload" is Spot's, but "/R1-D",
 * "/R1-ARM" and "/H2plus" are other products — and those variants are not in
 * the catalogue, so comparing against known models cannot catch them.
 */
function sameModelPath(u: string, model: string): boolean {
  let segs: string[];
  try {
    segs = decodeURIComponent(new URL(u).pathname).split('/').filter(Boolean);
  } catch {
    return false;
  }
  const want = segTokens(model).join(' ');
  return segs.some((seg) => segTokens(seg.replace(/[.](html?|php|aspx?|jsp)$/i, '')).join(' ') === want);
}

async function more() {
  const again = process.argv.includes('--again');
  const approved = JSON.parse(readFileSync(APPROVED, 'utf8')) as Approved;
  mkdirSync(MORE_DIR, { recursive: true });
  const manifest: { robot: string; page: string; image: string; n: number; title: string }[] = [];
  const homepageImage = new Map<string, string | null>();
  const strip = (u: string) => u.split('?')[0];
  for (const [key, a] of Object.entries(approved.images)) {
    if ((a.more && !again) || /github[.]com/.test(a.page)) continue;
    const site = origin(a.page);
    if (!homepageImage.has(site)) {
      const body = await html(site);
      homepageImage.set(site, body ? previewOf(site, body)?.image ?? null : null);
    }
    const generic = homepageImage.get(site) ?? null;
    const isGeneric = (img: string) => !!generic && strip(img) === strip(generic);
    // The maker's other pages about this robot: same host, model tokens in the path or the link text.
    const model = key.split('/')[1];
    const modelTok = tokens(model.replace(/-/g, ' '));
    const links = await siteLinks(site);
    const siblings = [...links]
      .map(([u, text]) => ({ u, s: scorePath(u, modelTok, site) + (modelTok.every((x) => ` ${tokens(text).join(' ')} `.includes(` ${x} `)) ? 2 : 0) }))
      .filter((x) => x.s > 0 && strip(x.u) !== strip(a.page) && sameModelPath(x.u, model))
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map((x) => x.u);
    const pages = [a.page, ...siblings];
    const have = new Set<string>([strip(a.image), ...(a.more ?? []).map(strip), ...(approved._rejected_images?.[key] ?? []).map(strip)]);
    const found: { image: string; page: string; title: string }[] = [];
    const usedPages: string[] = [];
    for (const page of pages) {
      if (found.length >= MORE_CAP) break;
      if (!(await html(page))) continue;
      const r = await renderedPreview(page, isGeneric, generic);
      if (!r) continue;
      let hit = false;
      for (const image of [r.image, ...(r.extras ?? [])]) {
        if (have.has(strip(image)) || found.length >= MORE_CAP) continue;
        have.add(strip(image));
        found.push({ image, page, title: r.title });
        hit = true;
      }
      if (hit && page !== a.page) usedPages.push(page);
    }
    if (!found.length) {
      console.log(`  –  ${key.padEnd(30)} nothing new on ${pages.length} page(s)`);
      a.more ??= [];
      continue;
    }
    a.pages = [...new Set([...(a.pages ?? []), ...usedPages])];
    for (const [i, f] of found.entries()) {
      const n = (a.more?.length ?? 0) + i + 2;
      try {
        const res = await fetch(f.image, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
        if (res.ok) writeFileSync(join(MORE_DIR, `${key.replace('/', '__')}__${n}.img`), Buffer.from(await res.arrayBuffer()));
      } catch {
        // the sheet shows a broken tile
      }
      manifest.push({ robot: key, page: f.page, image: f.image, n, title: f.title });
    }
    console.log(`  ?  ${key.padEnd(30)} +${found.length} from ${1 + usedPages.length} page(s)`);
  }
  // Pages are remembered even before the pictures are approved: the spec reader uses them too.
  writeFileSync(APPROVED, JSON.stringify(approved, null, 2) + '\n');
  writeFileSync(join(MORE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const per = 20;
  for (let i = 0; i < manifest.length; i += per) {
    const tiles = manifest.slice(i, i + per).map((m, j) => `<figure><img src="${m.image}" loading="eager"><figcaption><b>${i + j + 1}</b> ${m.robot} #${m.n}<br><small>${new URL(m.page).pathname.slice(0, 40)} · ${m.title.slice(0, 40)}</small></figcaption></figure>`).join('');
    writeFileSync(join(MORE_DIR, `sheet-${String(i / per + 1).padStart(2, '0')}.html`), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px system-ui}main{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px}figure{margin:0;border:1px solid #ddd;padding:4px}img{width:100%;height:160px;object-fit:contain;background:#f4f4f5}figcaption{margin-top:4px}</style><main>${tiles}</main>`);
  }
  console.log(`
${manifest.length} further pictures for review → ${MORE_DIR} (${Math.ceil(manifest.length / per)} sheets)`);
}

async function main() {
  if (process.argv.includes('--more')) {
    await more();
    await (await browser()).close().catch(() => {});
    return;
  }
  const a = args();
  const sql = process.env.CATALOGUE_SCAN_INPUT && a.review === true ? null : await db();
  if (sql) await preflight(sql, 'maker preview images');
  if (a.review === true) await review(sql, num(a.limit) ?? 300, str(a.only));
  else { if (!sql) throw new Error('Database required'); await apply(sql); }
  if (!COMMIT) console.log('(dry run — nothing was written)');
  if (browserPromise) await (await browserPromise).close();
  await done();
}

main().catch(async (e) => {
  console.error(e);
  await done(1);
});
