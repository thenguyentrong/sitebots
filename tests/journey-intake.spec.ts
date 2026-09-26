import { expect, test } from '@playwright/test';

const robot = { id: '00000000-0000-4000-8000-000000000011', name: 'Example handling platform', href: '/robots/example/platform', manufacturer: 'Example manufacturer', supplierHref: '/brands/example', variant: 'research', blocked: false, open: 1,
  criteria: [{ id: 'form_factor', label: 'Body type', kind: 'hard', weight: 0, status: 'pass', score: 1, text: 'Humanoid' }, { id: 'tasks', label: 'Task', kind: 'hard', weight: 0, status: 'unknown', score: 0, text: 'Carrying is not confirmed' }], sources: [],
  price: { amount_eur: 89000, original: { amount: 89000, currency: 'EUR', region: 'EU', config: 'research hardware', tier: 1, source_url: 'https://example.org/robot-price', observed_at: '2026-09-01' }, basis: 'listed' } };

test('a checked library task reaches the catalogue with its facts and flows into the brief', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/plan', (route) => {
    requests.push(route.request().postDataJSON().requirements);
    return route.fulfill({ json: { results: [robot], considered: 10, blocked: 3, missing: [] } });
  });
  await page.goto('/use-cases/prefab_timber/intralogistics-between-stations');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fetch tools');
  await expect(page.getByTestId('check-result')).toHaveAttribute('data-verdict', 'candidate');
  await expect(page.locator('#check [data-rule="T1_mass"]')).toHaveAttribute('data-status', 'pass');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.getByRole('link', { name: 'Go to my shortlist' }).click();
  await page.getByRole('link', { name: 'Solutions and cost' }).click();
  await expect(page).toHaveURL(/\/plan\/systems$/);
  await expect(page.getByRole('article')).toContainText('Performance for this task is unconfirmed');
  // The typical plant of the record reaches the matcher: dust, exposure and payload.
  expect(requests[0]).toMatchObject({ tasks: ['carry_payload', 'fetch_and_deliver', 'autonomous_nav_indoor'], payload_kg: 12, dust: 'low', environment: 'indoor' });
  await expect(page.getByTestId('price-reference')).toContainText('€89,000');
  await expect(page.getByRole('link', { name: 'View price source' })).toHaveAttribute('href', 'https://example.org/robot-price');
  await page.getByRole('button', { name: 'Add to assessment', exact: true }).click();
  await page.getByRole('button', { name: 'Estimate costs →' }).click();
  await expect(page.getByTestId('price-reference')).toContainText('€89,000');
  await page.getByLabel('Total initial spend (€)', { exact: false }).fill('120000');
  await page.getByLabel('Net hours released per year', { exact: false }).fill('1800');
  await page.getByLabel('Loaded labor cost (€/hour)', { exact: false }).fill('40');
  await page.getByLabel('Hours converted to cash savings (%)', { exact: false }).fill('50');
  await page.getByLabel('Additional operating cost (€/year)', { exact: false }).fill('12000');
  await page.getByRole('button', { name: 'Prepare pilot brief →' }).click();
  const answer = page.getByRole('region', { name: 'Your project answer' });
  await expect(answer).toContainText(robot.name);
  await expect(answer).toContainText('€120,000');
  await expect(answer).toContainText('5.0 years');
  await page.screenshot({ path: '.out/journey-answer.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await expect(answer).toContainText('€120,000');
});

test('an unavailable browser store is shown honestly and the check still works', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable'); };
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
  });
  await page.goto('/use-cases/prefab_timber/fittings-kitting');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page.getByTestId('task-added')).toBeVisible();
  await expect(page.getByText('Not saved: browser storage unavailable', { exact: true }).first()).toBeVisible();
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'Classified dust area' }).click();
  await expect(page.getByTestId('check-result')).toHaveAttribute('data-verdict', 'ruled_out');
});

test('a task added in another tab appears on the open shortlist', async ({ page, context }) => {
  await page.goto('/plan');
  await expect(page.getByRole('heading', { name: 'Nothing on your shortlist yet' })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/use-cases/prefab_timber/fittings-kitting');
  await other.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page.locator('.shortlist > li')).toHaveCount(1);
  await expect(page.locator('.shortlist > li')).toContainText('Kit fittings and hardware for element assembly');
  await other.close();
});
