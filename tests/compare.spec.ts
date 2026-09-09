import { expect, test } from '@playwright/test';

/** Robot ids are read off the Compare button of each page; there is no id lookup API on purpose. */
async function idsFor(page: import('@playwright/test').Page, paths: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const p of paths) {
    await page.goto(p);
    ids.push((await page.locator('button[data-robot-id]').first().getAttribute('data-robot-id'))!);
  }
  return ids;
}

test('compare shows up to four robots side by side and rejects the fifth', async ({ page }) => {
  const ids = await idsFor(page, ['/robots/boston-dynamics/spot', '/robots/unitree/g1', '/robots/unitree/h2', '/robots/deep-robotics/x30', '/robots/agility/digit']);
  await page.goto(`/compare?ids=${ids.join(',')}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compare');
  await expect(page.getByText('Only the first 4 of 5 ids are shown.')).toBeVisible();
  const headers = page.locator('[data-compare-table] thead tr').first().locator('th').filter({ hasText: /\S/ });
  await expect(headers).toHaveCount(4);
  await expect(page.locator('[data-compare-table] thead')).toContainText('Spot');
  await expect(page.locator('[data-compare-table] thead')).not.toContainText('Digit');

  // Weight row: Spot's 33.8 kg is the lightest and highlighted; G1's row carries its badge.
  const weight = page.getByRole('row', { name: /^Weight/ }).first();
  await expect(weight).toContainText('33.8 kg');
  await expect(weight.locator('td.bg-safety-soft')).toHaveCount(1);
});

test('compare is not indexed and handles unknown ids', async ({ page }) => {
  await page.goto('/compare?ids=00000000-0000-0000-0000-000000000000');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByText('Nothing to compare yet')).toBeVisible();
});

test('the compare bar collects robots across pages', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  await page.getByRole('button', { name: 'Compare' }).click();
  await expect(page.getByRole('button', { name: 'In comparison' })).toBeVisible();
  await page.goto('/robots/unitree/g1');
  await page.getByRole('button', { name: 'Compare' }).click();
  const open = page.getByRole('link', { name: /Open comparison \(2\)/ });
  await expect(open).toBeVisible();
  await open.click();
  await expect(page).toHaveURL(/\/compare\?ids=/);
  await expect(page.locator('[data-compare-table] thead')).toContainText('Spot');
  await expect(page.locator('[data-compare-table] thead')).toContainText('Unitree G1');
});
