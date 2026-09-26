// render-lineup.mjs — the landing's lineup image.
//
//   node scripts/assets/render-lineup.mjs        (dev server running on :3000)
//
// Screenshots the dev-only /render/lineup scene with a transparent background,
// trims it to the robots and their shadows, names it by content hash so no
// image cache serves an old version, and points the landing at the new file.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const DIR = join('public', 'branding');
const PAGE = join('components', 'journey', 'JourneyStart.tsx');

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1648, height: 1000 }, colorScheme: 'dark', deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/render/lineup', { waitUntil: 'load', timeout: 120_000 });
await page.waitForFunction(() => document.querySelector('[data-lineup]')?.getAttribute('data-ready') === 'true', null, { timeout: 120_000 });
await page.waitForTimeout(2500);
const shot = await page.locator('[data-lineup] canvas').screenshot({ omitBackground: true });
await browser.close();

const trimmed = await sharp(shot).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const { width, height } = trimmed.info;
const out = await sharp(trimmed.data)
  .extend({ top: Math.round(height * 0.08), bottom: Math.round(height * 0.1), left: Math.round(width * 0.02), right: Math.round(width * 0.02), background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toBuffer({ resolveWithObject: true });
const name = `lineup-at-scale.${createHash('sha256').update(out.data).digest('hex').slice(0, 10)}.png`;
for (const old of readdirSync(DIR)) if (old.startsWith('lineup-at-scale.') && old !== name) rmSync(join(DIR, old));
writeFileSync(join(DIR, name), out.data);

const src = readFileSync(PAGE, 'utf8').replace(/src="\/branding\/lineup-at-scale[^"]*" width=\{\d+\} height=\{\d+\}/, `src="/branding/${name}" width={${out.info.width}} height={${out.info.height}}`);
writeFileSync(PAGE, src);
console.log(`${name}: ${out.info.width} x ${out.info.height}, ${Math.round(out.data.length / 1024)} KB`);
