// render-lineup.mjs — the landing hero's stills, rendered from the live job site.
//
//   node scripts/assets/render-lineup.mjs        (dev server running on :3000, or set LINEUP_ORIGIN)
//
// The desktop poster is the landing's own hero at 1920 x 1080 with the copy, the scrims and the labels
// hidden; it shows until the live scene stands. The phone strip is the dev-only /render/lineup page, the
// row alone with its labels, which phones scroll sideways. Both are taken at the same moment of the
// jobs, named by content hash so no image cache serves an old version, and the landing is pointed at
// the new files.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ORIGIN = process.env.LINEUP_ORIGIN ?? 'http://localhost:3000';
const DIR = join('public', 'branding');
const PAGE = join('components', 'journey', 'JourneyStart.tsx');
/** Seconds into the jobs: the H1-2 holds its crate, the G1-D reaches the top shelf, Spot scans. */
const AT = 3.6;

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function settle(page, ready) {
  await page.waitForFunction(ready, null, { timeout: 120_000 });
  await page.evaluate((at) => { window.__lineupAt = at; }, AT);
  await page.waitForTimeout(2500);
}

const hero = await browser.newPage({ viewport: { width: 1920, height: 1080 }, colorScheme: 'dark' });
await hero.goto(ORIGIN + '/', { waitUntil: 'load', timeout: 120_000 });
await settle(hero, () => document.querySelector('.home-hero')?.getAttribute('data-live') === 'ready');
await hero.addStyleTag({ content: '.home-hero-copy, .home-hud, .home-swipe, .lineup-label, .lineup-scale, .lineup-tag { visibility: hidden !important; } .home-stage::after { display: none !important; }' });
await hero.waitForTimeout(300);
const poster = await sharp(await hero.locator('.home-stage').screenshot()).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });

const row = await browser.newPage({ viewport: { width: 1200, height: 320 }, colorScheme: 'dark', deviceScaleFactor: 2 });
await row.goto(ORIGIN + '/render/lineup', { waitUntil: 'load', timeout: 120_000 });
await settle(row, () => document.querySelector('[data-lineup-live]')?.getAttribute('data-ready') === 'true');
const strip = await sharp(await row.locator('[data-lineup-strip]').screenshot()).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
await browser.close();

let source = readFileSync(PAGE, 'utf8');
for (const [stem, constant, out] of [['lineup-hero', 'POSTER', poster], ['lineup-strip', 'STRIP', strip]]) {
  const name = `${stem}.${createHash('sha256').update(out.data).digest('hex').slice(0, 10)}.webp`;
  for (const old of readdirSync(DIR)) if (old.startsWith(stem + '.') && old !== name) rmSync(join(DIR, old));
  writeFileSync(join(DIR, name), out.data);
  source = source.replace(new RegExp(`const ${constant} = \\{ src: '[^']*', width: \\d+, height: \\d+ \\};`), `const ${constant} = { src: '/branding/${name}', width: ${out.info.width}, height: ${out.info.height} };`);
  console.log(`${name}: ${out.info.width} x ${out.info.height}, ${Math.round(out.data.length / 1024)} KB`);
}
writeFileSync(PAGE, source);
