import { expect, test } from '@playwright/test';
import { newProject } from '../lib/plan/model';

test('corrupt saved comparisons cannot crash the page and valid items survive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('sitebots.compare', JSON.stringify([
    null, 4, {}, { id: 12, name: 'bad' }, { id: 'a', name: 'Saved robot' }, { id: 'a', name: 'Duplicate' },
  ])));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open comparison (1)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved robot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicate' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the compare navigation restores the browser selection', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.goto('/compare');
  await expect(page.locator('[data-compare-table] thead')).toContainText('Unitree G1');
  await expect(page).toHaveURL(/compare\?ids=/);
});

test('comparison still works within a visit when browser storage is disabled', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('Storage disabled'); } });
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Storage disabled'); } });
  });
  await page.goto('/robots/unitree/g1');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open comparison (1)' })).toBeVisible();
  await page.getByRole('link', { name: 'Open comparison (1)' }).click();
  await expect(page.locator('[data-compare-table] thead')).toContainText('Unitree G1');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('link', { name: /Open comparison/ })).toHaveCount(0);
});

test('comparison changes synchronize between tabs', async ({ page, context }) => {
  await page.goto('/robots/unitree/g1');
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(other.getByRole('link', { name: 'Open comparison (1)' })).toBeVisible();
  await other.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeVisible();
});

test('robot profiles load a still preview without downloading a model', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (/\.glb(?:\?|$)/.test(request.url())) models.push(request.url()); });
  await page.goto('/robots/unitree/g1');
  await expect(page.locator('[data-robot-poster]')).toBeVisible();
  await expect(page.locator('[data-robot-poster] img').first()).toHaveJSProperty('complete', true);
  expect(models).toEqual([]);
  await expect(page.locator('[data-robot-viewer]')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '3D model' })).toBeVisible();
});

test('compact render URLs still activate the model automatically', async ({ page }) => {
  await page.goto('/robots/unitree/g1?render=1');
  await expect(page.locator('[data-robot-viewer]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
});

test('catalogue thumbnails request small optimized images', async ({ page }) => {
  await page.goto('/robots');
  const photo = page.locator('img[sizes="64px"]').first();
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toHaveJSProperty('complete', true);
  const src = await photo.evaluate((image: HTMLImageElement) => image.currentSrc);
  const url = new URL(src);
  expect(url.pathname).toBe('/_next/image');
  expect(Number(url.searchParams.get('w'))).toBeLessThanOrEqual(128);
  expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('search preserves the option to include robots without pictures', async ({ page }) => {
  await page.goto('/robots?pictures=all&form=quadruped');
  await page.getByRole('searchbox', { name: 'Search robots' }).fill('Unitree');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/pictures=all/);
  expect(new URL(page.url()).searchParams.get('form')).toBe('quadruped');
});

test('a full plan from the old finder is carried over and can free a slot without losing other tasks', async ({ page }) => {
  // Version-one drafts: the old key, the old shape (extra version-two fields are stripped by the old schema).
  const projects = Array.from({ length: 12 }, (_, i) => ({ ...newProject(crypto.randomUUID(), 'transport', 'factory'), title: 'Saved job ' + i }));
  await page.addInitScript(projects => localStorage.setItem('sitebots.plan.v1', JSON.stringify({ version: 1, activeId: projects[0].id, projects })), projects);
  await page.goto('/plan');
  const rows = page.locator('.shortlist > li');
  await expect(rows).toHaveCount(12);
  await page.goto('/use-cases/prefab_timber/fittings-kitting');
  await expect(page.getByRole('button', { name: 'Shortlist is full (12)' })).toBeDisabled();
  await page.goto('/plan');
  await rows.filter({ hasText: 'Saved job 0' }).getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(rows).toHaveCount(11);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sitebots.plan.v2')!).projects.length)).toBe(11);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sitebots.plan.v1')!).projects.length)).toBe(12);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sitebots.plan.v2')!).context.group)).toBe('factory');
});


test('large galleries load at most five thumbnails while keeping every photo reachable', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  await page.getByRole('tab', { name: /^Photos/ }).click();
  expect(await page.locator('[data-photo-strip] img').count()).toBeLessThanOrEqual(5);
  const count = Number(await page.locator('[data-robot-media]').getAttribute('data-photos'));
  await page.getByRole('button', { name: 'Previous photo', exact: true }).click();
  await expect(page.locator('[data-photo-count]')).toHaveText(count + ' / ' + count);
  await expect(page.locator('[data-photo-strip] button[aria-current="true"]')).toHaveAttribute('aria-label', 'Photo ' + count);
});

test('an unavailable image optimizer falls back to the original image', async ({ page }) => {
  await page.route('**/_next/image?**', route => route.fulfill({ status: 502, body: 'Temporarily unavailable' }));
  await page.goto('/robots/unitree/g1');
  const image = page.locator('[data-robot-poster] img');
  await expect(image).toHaveAttribute('src', /^\/renders\//);
  await expect(image).toHaveJSProperty('complete', true);
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
});
