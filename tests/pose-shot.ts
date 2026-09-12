// pose-shot.ts — one screenshot of the 3D viewer per pose preset, for tuning
// data/models/poses.json.
//
//   node --import tsx tests/pose-shot.ts http://localhost:3000/robots/booster/t2 .out/pose-t2
//
// Writes .out/pose-t2-standing.png, -reach_up.png … Same SwiftShader flags as
// shot.ts; waits for the viewer's `animating` flag to drop after each click.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';

type ViewerState = { ready: boolean; pose: string; animating: boolean; heightM?: number };

async function main() {
  const [url, prefix = '.out/pose'] = process.argv.slice(2);
  if (!url) throw new Error('usage: pose-shot.ts <robot page url> [out prefix]');
  mkdirSync(dirname(prefix), { recursive: true });

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[browser ${m.type()}] ${m.text().slice(0, 300)}`); });
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
  await page.goto(url, { waitUntil: 'load', timeout: 120_000 });
  const viewer = page.locator('[data-robot-viewer]').first();
  await page.locator('[data-robot-viewer][data-ready="true"]').first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);

  const buttons = viewer.locator('button[data-pose-preset]');
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const label = (await buttons.nth(i).textContent())?.trim() ?? `pose${i}`;
    const key = label.toLowerCase().replace(/\s+/g, '_'); // button labels are the preset keys with spaces
    await buttons.nth(i).click();
    // Poll rather than waitForFunction: under software WebGL a frame can take a second.
    const started = Date.now();
    for (;;) {
      const s = await page.evaluate(() => (window as unknown as { __robotViewer?: ViewerState }).__robotViewer);
      if (s?.ready && s.pose === key && !s.animating) break;
      if (Date.now() - started > 60_000) { console.log(`  still animating after 60 s: ${JSON.stringify(s)}`); break; }
      if ((Date.now() - started) % 5000 < 600) console.log(`  … ${JSON.stringify(s)}`);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(600);
    const state = await page.evaluate(() => (window as unknown as { __robotViewer?: ViewerState }).__robotViewer);
    const out = `${prefix}-${label.toLowerCase().replace(/\s+/g, '_')}.png`;
    await viewer.screenshot({ path: out });
    console.log(`${out}  pose=${state?.pose} animating=${state?.animating} height=${state?.heightM?.toFixed(2)} m`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
