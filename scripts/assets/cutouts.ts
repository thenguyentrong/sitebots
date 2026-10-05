// Turns cut-out robot photos (PNG with transparency, named <market id>.png) into the landing's
// "Working on sites today" row: trimmed, 360 px high, WebP with alpha under a content hash, plus
// lib/market/cutouts.json with the maker's credit from data/market/pictures.json.
//   node --import tsx scripts/assets/cutouts.ts <folder with the PNGs>
// The backgrounds were removed with Higgsfield's background remover from the product photos already on
// the site (one credit each); the photos stay the makers', credited as before.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const HEIGHT = 360;

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error('Pass the folder with <market id>.png cut-outs.');
  const pictures = JSON.parse(readFileSync(join(process.cwd(), 'data', 'market', 'pictures.json'), 'utf8')).pictures as Record<string, { credit: string; pageUrl: string }>;
  const out = join(process.cwd(), 'public', 'market', 'cutouts');
  mkdirSync(out, { recursive: true });
  const manifest: Record<string, { src: string; width: number; height: number; credit: string; pageUrl: string }> = {};
  for (const name of readdirSync(folder).filter((file) => file.endsWith('.png')).sort()) {
    const id = name.replace(/\.png$/, '');
    const picture = pictures[id];
    if (!picture) { console.log('skip ' + name + ': no market picture with this id'); continue; }
    const data = await sharp(join(folder, name)).trim({ threshold: 1 }).resize({ height: HEIGHT, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
    const { width, height } = await sharp(data).metadata();
    const file = id + '.' + createHash('sha256').update(data).digest('hex').slice(0, 8) + '.webp';
    writeFileSync(join(out, file), data);
    manifest[id] = { src: '/market/cutouts/' + file, width: width!, height: height!, credit: picture.credit, pageUrl: picture.pageUrl };
    console.log(file, width + 'x' + height, Math.round(data.length / 1024) + ' KB');
  }
  writeFileSync(join(process.cwd(), 'lib', 'market', 'cutouts.json'), JSON.stringify(manifest, null, 1) + '\n');
}
main();
