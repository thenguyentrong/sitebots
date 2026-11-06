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
  await expect(page.getByText('Only the first 4 of 5 robots are shown.')).toBeVisible();
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(5);
  await expect(page.locator('[data-compare-table] thead')).toContainText('Spot');
  await expect(page.locator('[data-compare-table] thead')).not.toContainText('Digit');

  // Plain facts: no chart, no highlighted cell, no winner.
  await expect(page.locator('[data-fact="weight"] td')).toHaveCount(4);
  await expect(page.locator('[data-compare-table] .bg-safety-soft')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/\bbest\b/i);
  await expect(page.locator('main svg[role="img"]')).toHaveCount(0);
});

test('every kind of robot compares in one table, mixed ids, one robot once', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  const spot = await page.locator('button[data-robot-id]').first().getAttribute('data-robot-id');
  // The catalogue id and the market id of Spot are one robot; a job-specific machine and a humanoid join it.
  await page.goto('/compare?ids=' + [spot, 'boston-dynamics-spot', 'acr-ironbot', 'unitree-g1-plus'].join(','));
  await expect(page.locator('[data-compare-table] thead th')).toHaveCount(4);
  await expect(page.locator('[data-fact="job"]')).toContainText('Not applicable');
  await expect(page.locator('[data-fact="germany"]')).toBeVisible();
  // A value nobody published says so; no cell is blank.
  for (const cell of await page.locator('[data-compare-table] tbody td').all()) await expect(cell).not.toBeEmpty();
});

test('a robot is added by name on the compare page and removed again', async ({ page }) => {
  await page.goto('/compare?ids=acr-ironbot');
  await page.getByRole('combobox', { name: 'Add a robot' }).fill('unitree g1');
  await page.getByRole('option').first().click();
  await expect(page).toHaveURL(/ids=acr-ironbot%2C/);
  await expect(page.locator('[data-compare-table] thead')).toContainText('Unitree G1');
  await page.getByRole('button', { name: 'Remove Unitree G1 from comparison' }).click();
  await expect(page.locator('[data-compare-table] thead')).not.toContainText('Unitree G1');
});

test('the table scrolls inside its own box on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/compare?ids=acr-ironbot,boston-dynamics-spot,unitree-g1-plus');
  await expect(page.locator('[data-compare-table]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('compare is not indexed and handles unknown ids', async ({ page }) => {
  await page.goto('/compare?ids=00000000-0000-0000-0000-000000000000');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByText('Nothing to compare yet')).toBeVisible();
  await expect(page.getByText('1 robot not found.')).toBeVisible();
  await expect(page.getByText('1 robot not found.')).toBeVisible();
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
