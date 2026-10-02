// Downloads the pictures of each market record: the first product picture, then up to seven
// more in the order of the record's images. Stores resized webps under public/market/ and
// records them in data/market/pictures.json (pictures: the first, gallery: the others).
// One request at a time.
// Usage: node --import tsx scripts/assets/market-pictures.ts [id ...]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { DossierSchema } from '@/lib/market/schema';

const root = process.cwd();
const records = join(root, 'data/market/de');
const out = join(root, 'public/market');
const manifestFile = join(root, 'data/market/pictures.json');
type Entry = { src: string; width: number; height: number; credit: string; pageUrl: string; alt: string; sourceUrl: string };
const manifest: { pictures: Record<string, Entry>; gallery: Record<string, Entry[]> } = { pictures: {}, gallery: {}, ...(existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {}) };
const GALLERY = 7;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fileFor = (id: string, url: string) => id + '.' + createHash('sha1').update(url).digest('hex').slice(0, 8) + '.webp';
mkdirSync(out, { recursive: true });
const only = process.argv.slice(2);
const AGENTS = ['sitebots-research/1.0 (+https://sitebots.vercel.app)', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'];

async function download(url: string, referer: string): Promise<Buffer> {
  let last = '';
  for (const agent of AGENTS) {
    const response = await fetch(url, { headers: { 'user-agent': agent, accept: 'image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.5', referer }, signal: AbortSignal.timeout(25000) });
    const type = response.headers.get('content-type') ?? '';
    if (response.ok && type.startsWith('image/')) return Buffer.from(await response.arrayBuffer());
    last = 'HTTP ' + response.status + ' ' + type;
  }
  throw new Error(last);
}

/** Every picture of the record other than the first, kept while its source stays listed. */
async function gallery(id: string, images: { url: string; pageUrl: string; credit: string; alt: string }[]) {
  const first = manifest.pictures[id]?.sourceUrl;
  const previous = new Map((manifest.gallery[id] ?? []).map((entry) => [entry.sourceUrl, entry]));
  const next: Entry[] = [];
  for (const image of images.filter((item) => item.url !== first)) {
    if (next.length >= GALLERY) break;
    const kept = previous.get(image.url);
    if (kept && existsSync(join(root, 'public', kept.src))) {
      next.push({ ...kept, credit: image.credit, pageUrl: image.pageUrl, alt: image.alt });
      continue;
    }
    try {
      const buffer = await download(image.url, image.pageUrl);
      const file = fileFor(id, image.url);
      const info = await sharp(buffer).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(out, file));
      next.push({ src: '/market/' + file, width: info.width, height: info.height, credit: image.credit, pageUrl: image.pageUrl, alt: image.alt, sourceUrl: image.url });
      console.log('more ' + id + ' ' + info.width + 'x' + info.height);
    } catch (error) {
      console.log('miss ' + id + ' ' + image.url + ' ' + (error as Error).message);
    }
    await sleep(300);
  }
  for (const entry of previous.values()) if (!next.some((item) => item.src === entry.src)) rmSync(join(root, 'public', entry.src), { force: true });
  manifest.gallery[id] = next;
}

async function main() {
let failed = 0;
const ids = new Set<string>();
for (const name of readdirSync(records).filter((file) => file.endsWith('.json')).sort()) {
  const record = DossierSchema.parse(JSON.parse(readFileSync(join(records, name), 'utf8').replace(/^﻿/, '')));
  ids.add(record.id);
  if (only.length && !only.includes(record.id)) continue;
  const candidates = [...record.images.filter((image) => image.kind === 'product'), ...record.images.filter((image) => image.kind !== 'product')];
  const current = manifest.pictures[record.id];
  // Keep the stored picture while it is still the first choice; a new first image replaces it.
  let done = Boolean(current && candidates[0]?.url === current.sourceUrl && existsSync(join(root, 'public', current.src)));
  for (const image of done ? [] : candidates) {
    try {
      const buffer = await download(image.url, image.pageUrl);
      const file = fileFor(record.id, image.url);
      const info = await sharp(buffer).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(out, file));
      if (current && current.src !== '/market/' + file) rmSync(join(root, 'public', current.src), { force: true });
      manifest.pictures[record.id] = { src: '/market/' + file, width: info.width, height: info.height, credit: image.credit, pageUrl: image.pageUrl, alt: image.alt, sourceUrl: image.url };
      console.log('ok   ' + record.id + ' ' + info.width + 'x' + info.height);
      done = true;
      break;
    } catch (error) {
      console.log('miss ' + record.id + ' ' + image.url + ' ' + (error as Error).message);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!done && candidates.length) failed++;
  await gallery(record.id, record.images);
  await sleep(300);
}
for (const id of Object.keys(manifest.pictures)) if (!ids.has(id)) delete manifest.pictures[id];
for (const id of Object.keys(manifest.gallery)) if (!ids.has(id)) delete manifest.gallery[id];
manifest.pictures = Object.fromEntries(Object.entries(manifest.pictures).sort(([a], [b]) => a.localeCompare(b)));
manifest.gallery = Object.fromEntries(Object.entries(manifest.gallery).filter(([, list]) => list.length).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
console.log(Object.keys(manifest.pictures).length + ' first pictures, ' + Object.values(manifest.gallery).reduce((sum, list) => sum + list.length, 0) + ' more, ' + failed + ' records without a usable picture');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
