import { expect, test } from '@playwright/test';

const KITTING = '/use-cases/prefab_timber/fittings-kitting';
const TRANSPORT = 'Fetch tools, consumables and kit boxes to the line';

test('saved tasks do not take over robot profiles or comparison', async ({ page }) => {
  await page.goto('/use-cases/prefab_timber/qa-inspection-documentation');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.goto('/robots/unitree/b2');
  await expect(page.getByRole('region', { name: 'Fit for your job' })).toHaveCount(0);
  const id = await page.locator('button[data-robot-id]').first().getAttribute('data-robot-id');
  await page.goto('/compare?ids=' + id);
  await expect(page.locator('[data-compare-table]')).toBeVisible();
  await page.goto('/plan');
  await expect(page.locator('.shortlist')).toContainText('Inspect and document');
});

test('several tasks have editable priorities and stay usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(KITTING);
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.goto('/use-cases/prefab_timber/intralogistics-between-stations');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.goto('/plan/priorities');
  await page.getByLabel('Task', { exact: true }).selectOption({ label: TRANSPORT });
  await page.getByLabel('Business value', { exact: true }).selectOption('high');
  await page.getByLabel('Deployment readiness', { exact: true }).selectOption('medium');
  await page.getByLabel('Why this position?').fill('Important bottleneck; integration still needs evidence.');
  await expect(page.getByRole('button', { name: TRANSPORT + ' Evidence open', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.out/plan-priorities-mobile.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await expect(page.getByLabel('Business value', { exact: true })).toHaveValue('high');
  await expect(page.getByLabel('Deployment readiness', { exact: true })).toHaveValue('medium');
});

test('catalogue assessment validates requests and returns reasons with primary-source links', async ({ request }) => {
  expect((await request.post('/api/plan', { data: { requirements: { payload_kg: -1 } } })).status()).toBe(400);
  expect((await request.post('/api/plan', { data: { requirements: {} } })).status()).toBe(400);
  expect((await request.post('/api/plan', { data: { requirements: { tasks: ['site_inspection'] }, ids: ['bad-id'] } })).status()).toBe(400);
  const response = await request.post('/api/plan', { data: { requirements: { tasks: ['site_inspection'], terrain: 'rubble' } } });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.results.length).toBeGreaterThan(0);
  expect(body.results.length).toBeLessThanOrEqual(12);
  for (const result of body.results) expect(result.criteria.find((row: { id: string }) => row.id === 'terrain').status).toBe('unknown');
  expect(body.results.some((result: { sources: unknown[] }) => result.sources.length > 0)).toBe(true);
});

test('an unavailable catalogue can be retried without losing the plan', async ({ page }) => {
  await page.route('**/api/plan', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'The catalogue could not be checked.' }) }));
  await page.goto(KITTING);
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.goto('/plan/systems');
  await expect(page.getByRole('alert').filter({ hasText: 'The catalogue could not be checked.' })).toBeVisible();
  await page.unroute('**/api/plan');
  const response = page.waitForResponse((res) => res.url().endsWith('/api/plan'));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  expect((await response).ok()).toBe(true);
  await page.goto('/plan');
  await expect(page.locator('.shortlist')).toContainText('Kit fittings and hardware for element assembly');
});

test('the old plan URLs still lead somewhere useful', async ({ page }) => {
  await page.goto('/plan?mode=explore');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your shortlist');
  await page.goto('/plan/context');
  await expect(page).toHaveURL(/\/use-cases$/);
  await page.goto('/plan/screen');
  await expect(page).toHaveURL(/\/plan$/);
});
