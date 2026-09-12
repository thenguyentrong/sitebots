import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { IndexFile } from '../lib/models/schemas';

async function main() {
  const index = IndexFile.parse(JSON.parse(readFileSync('data/models/index.json', 'utf8')));
  mkdirSync('.out/model-audit', { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const report: { key: string; status: string; [name: string]: unknown }[] = [];
  try {
    for (const [key, entry] of Object.entries(index.robots)) {
      const [robotKey, variant] = key.split('#');
      const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem('sitebots.scale', '0'));
      const url = `http://127.0.0.1:3000/robots/${robotKey}${variant ? `?variant=${variant}` : ''}`;
      try {
        const response = await page.goto(url, { timeout: 120_000 });
        expect(response?.status()).toBe(200);
        const viewer = page.locator('[data-robot-viewer]');
        await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
        await expect(viewer).toHaveAttribute('data-missing-joints', '');
        await expect(viewer.locator('canvas')).toHaveAttribute('data-camera-ready', 'true');
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        const names = await viewer.locator('[data-pose-preset]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-pose-preset')!));
        for (const name of names) {
          await viewer.locator(`[data-pose-preset="${name}"]`).click();
          await expect(viewer).toHaveAttribute('data-pose', name, { timeout: 20_000 });
          await expect(viewer).toHaveAttribute('data-animating', 'false', { timeout: 30_000 });
        }
        await viewer.locator('[data-pose-preset="standing"]').click();
        await expect(viewer).toHaveAttribute('data-pose', 'standing');
        await expect(viewer).toHaveAttribute('data-animating', 'false');
        await viewer.getByRole('button', { name: 'Reset view', exact: true }).click();
        const file = `.out/model-audit/${key.replaceAll('/', '__').replaceAll('#', '__')}.png`;
        await viewer.locator('canvas').screenshot({ path: file });
        expect(errors).toEqual([]);
        report.push({ key, status: 'passed', presets: names, file, source: entry.glbUrl });
        console.log(`PASS ${key} (${names.length} poses)`);
      } catch (error) {
        report.push({ key, status: 'failed', error: String(error), errors });
        console.log(`FAIL ${key}: ${String(error).slice(0, 200)}`);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  writeFileSync('.out/model-audit/report.json', JSON.stringify(report, null, 2));
  if (report.some((r) => r.status === 'failed')) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
