import { expect, test } from '@playwright/test';

test('explore a factory job, compare a setup, calculate costs and retain the pilot brief', async ({ page }) => {
  await page.goto('/plan?mode=explore');
  await page.getByRole('button', { name: 'Factory', exact: true }).click();
  await page.getByRole('button', { name: 'Explore job: Deliver loaded materials', exact: true }).click();
  await expect(page.getByLabel('Work setting', { exact: true })).toHaveValue('factory');
  await expect(page.getByLabel('Ground', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Exposure', { exact: true })).toHaveValue('');
  await page.getByLabel('Opportunity name').fill('Assembly tote deliveries');
  await page.getByText('Add goals and current process', { exact: false }).click();
  await page.getByLabel('What should improve?').fill('Reduce repeated carrying between assembly stations.');
  await page.getByLabel('How is it done today?').fill('Operators move loaded carts between two stations.');
  await page.getByText('Add working requirements', { exact: true }).click();
  await page.getByLabel('Carried load (kg)', { exact: false }).fill('12');
  await page.getByLabel('How much does the task vary?').selectOption('medium');
  await expect(page.getByRole('img', { name: /12 kg and medium/ })).toBeVisible();
  const response = page.waitForResponse((res) => res.url().endsWith('/api/plan') && res.request().method() === 'POST');
  await page.getByRole('button', { name: 'Explore solutions', exact: true }).click();
  expect((await response).ok()).toBe(true);
  await page.getByLabel('Add another solution').fill('AMR with carts');
  await page.getByRole('button', { name: 'Add custom solution', exact: true }).click();
  await page.getByLabel('Complete setup for AMR with carts').fill('AMR, carts, route software, charging and integration.');
  await page.getByLabel('What does a person still do?').fill('Load carts and handle exceptions.');
  await expect(page.getByRole('region', { name: 'Comparison for your job' })).toContainText('Current process');
  await page.getByRole('button', { name: 'Estimate costs →' }).click();
  await expect(page.getByText('Complete all five cost inputs', { exact: false })).toBeVisible();
  await page.getByLabel('Total initial spend (€)', { exact: false }).fill('120000');
  await page.getByLabel('Net hours released per year', { exact: false }).fill('1800');
  await page.getByLabel('Loaded labor cost (€/hour)', { exact: false }).fill('40');
  await page.getByLabel('Hours converted to cash savings (%)', { exact: false }).fill('50');
  await page.getByLabel('Additional operating cost (€/year)', { exact: false }).fill('12000');
  await expect(page.getByTestId('plan-net')).toHaveText('€24,000');
  await expect(page.getByTestId('plan-payback')).toHaveText('5.0 years');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: '.out/plan-costs.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Prepare pilot brief →' }).click();
  await page.getByLabel('Pilot scope', { exact: true }).fill('Two stations over five representative shifts.');
  await page.getByLabel('Success criteria', { exact: true }).fill('Agreed delivery completion and intervention thresholds.');
  await page.getByLabel('Decision owner').fill('Operations lead');
  await expect(page.getByTestId('plan-next-action')).toContainText('Confirm critical requirements');
  await page.reload();
  await expect(page.getByLabel('Opportunity name')).toHaveValue('Assembly tote deliveries');
  await page.getByRole('button', { name: '4. Pilot brief', exact: true }).click();
  await expect(page.getByLabel('Pilot scope', { exact: true })).toHaveValue('Two stations over five representative shifts.');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-plan-brief]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print decision brief' })).toBeHidden();
  await expect(page.locator('[data-plan-brief]')).toContainText('€24,000');
  await page.pdf({ path: '.out/plan-brief.pdf', format: 'A4', printBackground: true });
});

test('saved assessments remain accessible without taking over profiles or comparison', async ({ page }) => {
  await page.goto('/plan?mode=assess');
  await page.getByLabel('Opportunity name').fill('Inspect the production area');
  await page.getByLabel('Job to explore').selectOption('inspection');
  await page.goto('/robots/unitree/b2');
  await expect(page.getByRole('region', { name: 'Fit for your job' })).toHaveCount(0);
  const id = await page.locator('button[data-robot-id]').first().getAttribute('data-robot-id');
  await page.goto('/compare?ids=' + id);
  await expect(page.locator('[data-compare-table]')).toBeVisible();
  await page.goto('/plan');
  await expect(page.getByLabel('Opportunity name')).toHaveValue('Inspect the production area');
});
test('multiple opportunities have editable priorities and remain usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan?mode=assess');
  await page.getByLabel('Opportunity name').fill('First opportunity');
  await page.getByRole('button', { name: 'New opportunity' }).click();
  await page.getByRole('button', { name: 'Assess my job', exact: true }).click();
  await page.getByLabel('Opportunity name').fill('Second opportunity');
  await page.getByRole('button', { name: 'Project priorities', exact: true }).click();
  await page.getByLabel('Business value', { exact: true }).selectOption('high');
  await page.getByLabel('Deployment readiness', { exact: true }).selectOption('medium');
  await page.getByLabel('Why this position?').fill('Important bottleneck; integration still needs evidence.');
  await expect(page.getByRole('button', { name: 'Second opportunity Evidence open', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: '.out/plan-priorities-mobile.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await page.getByRole('button', { name: 'Project priorities', exact: true }).click();
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

test('an unavailable catalogue can be retried without losing the assessment', async ({ page }) => {
  await page.route('**/api/plan', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'The catalogue could not be checked.' }) }));
  await page.goto('/plan?mode=assess');
  await page.getByLabel('Opportunity name').fill('Retain my inquiry');
  await page.getByLabel('Job to explore').selectOption('inspection');
  await page.getByRole('button', { name: 'Explore solutions', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The catalogue could not be checked.' })).toBeVisible();
  await page.unroute('**/api/plan');
  const response = page.waitForResponse((res) => res.url().endsWith('/api/plan'));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  expect((await response).ok()).toBe(true);
  await page.getByRole('button', { name: '1. Your job', exact: true }).click();
  await expect(page.getByLabel('Opportunity name')).toHaveValue('Retain my inquiry');
});


test('job discovery fits mobile and a changed draft is refreshed across tabs', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/plan?mode=explore');
  await expect(page.getByRole('button', { name: 'Explore job: Capture construction progress' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Explore job: Capture construction progress' }).click();
  await page.getByLabel('Opportunity name').fill('Original draft');
  await page.goto('/brands');
  const other = await context.newPage();
  await other.goto('/plan');
  await other.getByLabel('Opportunity name').fill('Updated in another tab');
  await page.goto('/plan');
  await expect(page.getByLabel('Opportunity name')).toHaveValue('Updated in another tab');
  await other.close();
});

test('an unavailable browser store is shown honestly and the draft remains editable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/plan?mode=assess');
  await page.getByLabel('Opportunity name').fill('Unsaved working draft');
  await expect(page.getByText('Not saved — browser storage unavailable', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '4. Pilot brief', exact: true }).click();
  await expect(page.locator('[data-plan-brief]')).toContainText('Unsaved working draft');
});
