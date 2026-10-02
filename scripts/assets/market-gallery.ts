// More pictures per market record. Renders each record's product pages (the maker's and the
// sellers'), keeps the large pictures, downloads them to .cache/gallery and draws contact sheets,
// so every picture is checked by eye before it is used. Approved picks go into the record's
// `images`; `npm run market:pictures` then stores them under public/market.
//
//   node --import tsx scripts/assets/market-gallery.ts collect [id ...]   find candidates
//   node --import tsx scripts/assets/market-gallery.ts sheets             contact sheets for review
//   node --import tsx scripts/assets/market-gallery.ts apply <file.json> [--replace]  add approved picks to the records
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { DossierSchema, type Dossier } from '@/lib/market/schema';

const root = process.cwd();
const recordsDir = join(root, 'data/market/de');
const cacheDir = join(root, '.cache/gallery');
const storeFile = join(cacheDir, 'candidates.json');
const AGENTS = ['sitebots-research/1.0 (+https://sitebots.vercel.app)', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'];
const MAX_PAGES = 5;
const MAX_PER_PAGE = 24;
const MAX_KEEP = 12;
const PARALLEL = 6;
const BAD = /logo|icon|sprite|avatar|flag|qrcode|badge|payment|placeholder|blank|pixel|favicon|spinner|loader|cookie/i;

type Candidate = { n: number; url: string; page: string; width: number; height: number; hash: string; file: string };
type Entry = { name: string; maker: string; type: string; pages: string[]; candidates: Candidate[]; collectedAt: string };
type Store = Record<string, Entry>;

const store: Store = existsSync(storeFile) ? JSON.parse(readFileSync(storeFile, 'utf8')) : {};
const save = () => writeFileSync(storeFile, JSON.stringify(store, null, 1) + '\n');

function records(): { record: Dossier; file: string }[] {
  return readdirSync(recordsDir).filter((name) => name.endsWith('.json')).sort().flatMap((name) => {
    const parsed = DossierSchema.safeParse(JSON.parse(readFileSync(join(recordsDir, name), 'utf8').replace(/^﻿/, '')));
    return parsed.success ? [{ record: parsed.data, file: join(recordsDir, name) }] : [];
  });
}

function pagesOf(record: Dossier): string[] {
  const list = [record.officialUrl, ...record.images.map((image) => image.pageUrl), ...record.germany.sellers.map((seller) => seller.productUrl)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of list) {
    if (!url || !/^https?:/.test(url)) continue;
    const key = url.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.slice(0, MAX_PAGES);
}

let browserPromise: Promise<import('@playwright/test').Browser> | null = null;
const browser = () => (browserPromise ??= import('@playwright/test').then((m) => m.chromium.launch()));

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

// Runs inside the page, as a string so the bundler adds no helpers. Gathers every picture a
// product page offers: meta tags, JSON-LD product images, gallery attributes, lightbox links and
// large CSS backgrounds.
const PAGE_SCRIPT = `(() => {
  const out = [];
  const push = (src, via, w, h) => { if (src && typeof src === 'string') out.push({ src, via, w: w || 0, h: h || 0 }); };
  const meta = (sel) => { const m = document.querySelector(sel); return m ? m.getAttribute('content') : null; };
  push(meta('meta[property="og:image"]'), 'og');
  push(meta('meta[name="twitter:image"]'), 'og');
  for (const s of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        for (const i of [].concat(node.image || [])) push(typeof i === 'string' ? i : i && (i.url || i.contentUrl), 'jsonld');
        for (const k of Object.keys(node)) if (k !== 'image' && node[k] && typeof node[k] === 'object') walk(node[k]);
      };
      walk(JSON.parse(s.textContent || 'null'));
    } catch (e) {}
  }
  const largest = (set) => { if (!set) return null; let best = null, bw = -1; for (const part of set.split(',')) { const bits = part.trim().split(/ +/); const w = parseInt(bits[1] || '1', 10) || 1; if (w >= bw) { bw = w; best = bits[0]; } } return best; };
  for (const img of Array.from(document.images)) {
    const r = img.getBoundingClientRect();
    const w = img.naturalWidth || 0, h = img.naturalHeight || 0;
    const attrs = ['data-large_image', 'data-zoom-image', 'data-zoom', 'data-full', 'data-original', 'data-src', 'data-lazy-src'].map((a) => img.getAttribute(a)).filter(Boolean);
    const best = attrs[0] || largest(img.getAttribute('srcset')) || largest(img.getAttribute('data-srcset')) || img.currentSrc || img.src;
    if (Math.max(w, h) >= 500 || r.width >= 300 || attrs.length) push(best, 'img', w, h);
  }
  for (const source of Array.from(document.querySelectorAll('picture source[srcset]'))) push(largest(source.getAttribute('srcset')), 'img');
  for (const a of Array.from(document.querySelectorAll('a[href]'))) { const href = a.getAttribute('href'); if (href && /[.](jpe?g|png|webp)([?#]|$)/i.test(href)) push(href, 'link'); }
  for (const el of Array.from(document.querySelectorAll('div,section,header,figure'))) {
    const r = el.getBoundingClientRect();
    if (r.width < 400 || r.height < 250) continue;
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && /url[(]["']?([^"')]+)["']?[)]/.exec(bg);
    if (m && !/gradient/.test(bg)) push(m[1], 'bg');
  }
  return out;
})()`;

async function pictureUrls(page: string): Promise<string[]> {
  const b = await browser();
  const ctx = await b.newContext({ userAgent: AGENTS[1], viewport: { width: 1366, height: 900 }, locale: 'en-GB' });
  const p = await ctx.newPage();
  try {
    await p.goto(page, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await p.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
    await withTimeout(p.evaluate(`(async () => { for (let y = 0; y < 5400; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); } window.scrollTo(0, 0); })()`), 15_000, undefined);
    await p.waitForTimeout(1200);
    const found = (await withTimeout(p.evaluate(PAGE_SCRIPT), 20_000, [])) as { src: string; via: string }[];
    const seen = new Set<string>();
    const urls: string[] = [];
    for (const item of found) {
      let url: string;
      try { url = new URL(item.src.trim(), page).toString(); } catch { continue; }
      if (!/^https?:/.test(url) || /[.](svg|gif)([?#]|$)/i.test(url) || BAD.test(url)) continue;
      const key = url.split('#')[0].split('?')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(url);
    }
    return urls.slice(0, MAX_PER_PAGE);
  } catch (error) {
    console.log('  page failed ' + page + ' ' + (error as Error).message.split('\n')[0]);
    return [];
  } finally {
    await ctx.close();
  }
}

async function download(url: string, referer: string): Promise<Buffer | null> {
  for (const agent of AGENTS) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': agent, accept: 'image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5', referer }, signal: AbortSignal.timeout(25_000) });
      const type = response.headers.get('content-type') ?? '';
      if (response.ok && type.startsWith('image/') && !type.includes('svg') && !type.includes('gif')) return Buffer.from(await response.arrayBuffer());
    } catch {
      // Try the next user agent.
    }
  }
  return null;
}

async function dhash(input: Buffer | string): Promise<string> {
  const { data } = await sharp(input, { failOn: 'none' }).flatten({ background: '#ffffff' }).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
  return BigInt('0b' + bits).toString(16).padStart(16, '0');
}

function distance(a: string, b: string): number {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b);
  let n = 0;
  while (x) { n += Number(x & BigInt(1)); x >>= BigInt(1); }
  return n;
}

function storedPicture(id: string): string | null {
  const file = join(root, 'data/market/pictures.json');
  if (!existsSync(file)) return null;
  const src = JSON.parse(readFileSync(file, 'utf8')).pictures[id]?.src;
  return src ? join(root, 'public', src) : null;
}

async function collect(record: Dossier) {
  const pages = pagesOf(record);
  const dir = join(cacheDir, record.id);
  mkdirSync(dir, { recursive: true });
  const ref = storedPicture(record.id);
  const hashes: string[] = ref && existsSync(ref) ? [await dhash(ref)] : [];
  const candidates: Candidate[] = [];
  const tried = new Set<string>();
  // Pictures the research already named come first, then each page in order: maker, then sellers.
  const queue: { url: string; page: string }[] = record.images.map((image) => ({ url: image.url, page: image.pageUrl }));
  for (const page of pages) for (const url of await pictureUrls(page)) queue.push({ url, page });
  for (const { url, page } of queue) {
    if (candidates.length >= MAX_KEEP) break;
    const key = url.split('?')[0];
    if (tried.has(key)) continue;
    tried.add(key);
    const buffer = await download(url, page);
    if (!buffer) continue;
    try {
      const meta = await sharp(buffer, { failOn: 'none' }).rotate().metadata();
      const width = meta.autoOrient?.width ?? meta.width ?? 0;
      const height = meta.autoOrient?.height ?? meta.height ?? 0;
      if (Math.min(width, height) < 300 || Math.max(width, height) < 500) continue;
      const stats = await sharp(buffer, { failOn: 'none' }).stats();
      if (stats.channels.slice(0, 3).every((channel) => channel.stdev < 10)) continue;
      const hash = await dhash(buffer);
      if (hashes.some((other) => distance(hash, other) <= 10)) continue;
      hashes.push(hash);
      const n = candidates.length + 1;
      await sharp(buffer, { failOn: 'none' }).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(dir, n + '.webp'));
      candidates.push({ n, url, page, width, height, hash, file: record.id + '/' + n + '.webp' });
    } catch {
      // Not a picture sharp can read.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  store[record.id] = { name: record.name, maker: record.maker, type: record.robotType, pages, candidates, collectedAt: new Date().toISOString().slice(0, 10) };
  save();
  console.log(record.id.padEnd(44) + String(candidates.length).padStart(3) + ' candidates from ' + pages.length + ' pages');
}

async function runCollect(only: string[]) {
  mkdirSync(cacheDir, { recursive: true });
  const targets = records().map(({ record }) => record).filter((record) => record.germany.status !== 'not_sold')
    .filter((record) => (only.length ? only.includes(record.id) : !store[record.id]));
  console.log(targets.length + ' records to collect');
  let next = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < targets.length) {
      const record = targets[next++];
      try {
        await collect(record);
      } catch (error) {
        console.log('fail ' + record.id + ' ' + (error as Error).message);
      }
    }
  }));
  if (browserPromise) await (await browserPromise).close();
}

// Four records per sheet: the stored picture (REF, red frame) and the numbered candidates of each.
async function runSheets() {
  const dir = join(cacheDir, 'sheets');
  mkdirSync(dir, { recursive: true });
  const ids = Object.keys(store).filter((id) => store[id].candidates.length).sort();
  const pictures = JSON.parse(readFileSync(join(root, 'data/market/pictures.json'), 'utf8')).pictures;
  const sheets: { sheet: string; ids: string[] }[] = [];
  const b = await browser();
  const page = await b.newPage({ viewport: { width: 1520, height: 900 } });
  const tile = (src: string, label: string) => '<figure><img src="' + src + '"><figcaption>' + label + '</figcaption></figure>';
  for (let i = 0; i < ids.length; i += 4) {
    const group = ids.slice(i, i + 4);
    const name = 'sheet-' + String(i / 4 + 1).padStart(3, '0');
    const html = '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;font:14px Arial,sans-serif;background:#fff;color:#111;width:1488px}section{margin-bottom:20px;border-top:3px solid #111;padding-top:8px}h2{font-size:18px;margin:0 0 8px}div{display:grid;grid-template-columns:repeat(7,204px);gap:8px}figure{margin:0}img{width:204px;height:170px;object-fit:contain;background:#e5e5e5;display:block}figcaption{font-size:13px;margin-top:2px}figure.ref img{outline:4px solid #e11}</style>'
      + group.map((id) => {
        const entry = store[id];
        const ref = pictures[id] ? tile(pathToFileURL(join(root, 'public', pictures[id].src)).toString(), 'REF (stored)').replace('<figure>', '<figure class="ref">') : '';
        return '<section><h2>' + id + ' : ' + entry.name + ' (' + entry.maker + ', ' + entry.type + ')</h2><div>' + ref
          + entry.candidates.map((c) => tile(pathToFileURL(join(cacheDir, c.file)).toString(), '#' + c.n + ' ' + c.width + 'x' + c.height + ' ' + new URL(c.page).host.replace(/^www[.]/, ''))).join('') + '</div></section>';
      }).join('');
    const htmlFile = join(dir, name + '.html');
    writeFileSync(htmlFile, html);
    await page.goto(pathToFileURL(htmlFile).toString());
    await page.waitForLoadState('load');
    await page.screenshot({ path: join(dir, name + '.png'), fullPage: true });
    sheets.push({ sheet: join(dir, name + '.png'), ids: group });
  }
  writeFileSync(join(dir, 'sheets.json'), JSON.stringify(sheets, null, 1) + '\n');
  console.log(sheets.length + ' sheets for ' + ids.length + ' records in ' + dir);
  await b.close();
}

type Approvals = { records: { id: string; picks: { n: number; kind: 'product' | 'in_use'; alt: string }[] }[] };

/** --replace: a reviewed record keeps only its stored first picture and the approved picks, so
 * pictures that were never reviewed (earlier research) leave the gallery. */
function runApply(file: string, replace: boolean) {
  const firstPictures = JSON.parse(readFileSync(join(root, 'data/market/pictures.json'), 'utf8')).pictures as Record<string, { sourceUrl?: string }>;
  const approvals = JSON.parse(readFileSync(file, 'utf8')) as Approvals;
  const byId = new Map(records().map((item) => [item.record.id, item.file]));
  const host = (url: string | null) => {
    try {
      return url ? new URL(url).host.replace(/^www[.]/, '') : '';
    } catch {
      return '';
    }
  };
  let added = 0;
  for (const { id, picks } of approvals.records) {
    const path = byId.get(id);
    const entry = store[id];
    if (!path || !entry) {
      console.log('skip ' + id);
      continue;
    }
    const raw = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
    if (replace) {
      const first = raw.images.find((image: { url: string }) => image.url === firstPictures[id]?.sourceUrl) ?? raw.images[0];
      const picked = new Set(picks.map((pick) => entry.candidates.find((c) => c.n === pick.n)?.url).filter(Boolean));
      raw.images = raw.images.filter((image: { url: string }) => image === first || picked.has(image.url));
    }
    for (const pick of picks) {
      const candidate = entry.candidates.find((c) => c.n === pick.n);
      if (!candidate || raw.images.some((image: { url: string }) => image.url === candidate.url)) continue;
      // Records only hold https addresses.
      if (!candidate.url.startsWith('https:') || !candidate.page.startsWith('https:')) {
        console.log('skip ' + id + ' #' + candidate.n + ': not https');
        continue;
      }
      const seller = raw.germany.sellers.find((s: { productUrl: string | null }) => host(s.productUrl) === host(candidate.page));
      const credit = host(candidate.page) === host(raw.officialUrl) ? raw.maker : seller ? seller.name.split(' (')[0] + ' / ' + raw.maker : host(candidate.page);
      raw.images.push({ url: candidate.url, pageUrl: candidate.page, credit, alt: pick.alt, kind: pick.kind });
      added++;
    }
    DossierSchema.parse(raw);
    writeFileSync(path, JSON.stringify(raw, null, 1) + '\n');
  }
  console.log(added + ' pictures added');
}

const [mode, ...rest] = process.argv.slice(2);
const run = mode === 'collect' ? runCollect(rest) : mode === 'sheets' ? runSheets() : mode === 'apply' ? Promise.resolve(runApply(rest[0], rest.includes('--replace'))) : Promise.reject(new Error('mode: collect | sheets | apply'));
run.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
