import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { politeAsset } from '../scrape/_lib/fetch';

// Cache only galleries already approved in the review manifest. Source URLs and credits remain intact.
// This handles public image hosts whose locale redirects return HTML to browsers.
const commit = process.argv.includes('--commit');
const keys = process.argv.flatMap((arg, i) => arg === '--key' ? [process.argv[i + 1]] : []);
const reasonIndex = process.argv.indexOf('--reason');
const reason = reasonIndex >= 0 ? process.argv[reasonIndex + 1] : '';
if (!keys.length || !reason) throw Error('Specify --key manufacturer/model and --reason; add --commit to write');
const manifestPath = 'data/assets/previews.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const key of keys) {
  const gallery = manifest.images[key];
  if (!gallery) throw Error('No approved gallery: ' + key);
  const urls: string[] = [gallery.image, ...(gallery.more ?? [])];
  const replacements = new Map<string, string>();
  for (const url of urls) {
    if (!/^https?:\/\//.test(url)) continue;
    const name = createHash('sha256').update(url).digest('hex').slice(0, 24) + '.webp';
    const local = '/previews/official/' + name;
    console.log(commit ? 'CACHE' : 'DRY RUN', key, url, '->', local);
    if (!commit) continue;
    const bytes = await politeAsset(url);
    const encoded = await sharp(bytes).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
    mkdirSync('public/previews/official', { recursive: true });
    writeFileSync('public' + local, encoded.data);
    gallery.details ??= {};
    gallery.details[local] = { ...gallery.details[url], page: gallery.details[url]?.page ?? gallery.page, assetUrl: url, cacheReason: reason, width: encoded.info.width, height: encoded.info.height };
    delete gallery.details[url];
    replacements.set(url, local);
  }
  if (commit) {
    gallery.image = replacements.get(gallery.image) ?? gallery.image;
    gallery.more = (gallery.more ?? []).map((url: string) => replacements.get(url) ?? url);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}
