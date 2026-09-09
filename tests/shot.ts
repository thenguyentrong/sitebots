// shot.ts — quick visual check of a page during development.
//
//   npm run shot -- http://localhost:3000 .out/home.png [width]
//
// Width matters: the robot page is two columns only from the `lg` breakpoint
// up, so a 900px shot silently shows the stacked mobile layout.
//
// Not the test suite; that is tests/*.spec.ts (`npx playwright test`).

import { mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

async function main() {
  const [url = 'http://localhost:3000', out = '.out/home.png', widthArg = '1440', mode = 'full'] = process.argv.slice(2);
  const width = Number(widthArg) || 1440;
  const fullPage = mode !== 'viewport';
  mkdirSync(dirname(out), { recursive: true });

  // Headless Chromium has no GPU; the 3D viewer needs the software WebGL path.
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width, height: 1200 }, colorScheme: process.env.SHOT_DARK === '1' ? 'dark' : 'light' });
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  // A page with the 3D viewer is done when the viewer says so; a multi-MB
  // model under software WebGL takes a while and never quite goes network-idle.
  if ((await page.locator('[data-robot-viewer]').count()) > 0) {
    await page.locator('[data-robot-viewer][data-ready="true"]').first().waitFor({ timeout: 90_000 }).catch(() => console.log('viewer did not report ready'));
    await page.waitForTimeout(1500);
  } else {
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  // A full-page screenshot does not scroll, so scroll-triggered work would
  // never fire and the shot would show a half-empty page. Walk down first.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  await page.screenshot({ path: out, fullPage });
  await browser.close();

  console.log(`${out} (${Math.round(statSync(out).size / 1024)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
