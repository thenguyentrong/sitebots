import { test, expect } from '@playwright/test';

test('manufacturer browsing distinguishes suppliers from upcoming companies', async ({ page }) => {
  await page.goto('/brands');
  await expect(page.getByRole('heading', { name: 'Manufacturers', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unitree Robotics', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'MIT', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'NASA', exact: true })).toHaveCount(0);
  await page.getByLabel('Search manufacturers').fill('Tesla');
  await page.getByLabel('Commercial status').selectOption('commercial');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByText('No manufacturers match these filters.')).toBeVisible();
  await page.getByLabel('Commercial status').selectOption('developing');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('tbody').getByRole('link', { name: 'Tesla', exact: true })).toBeVisible();
});

test('research records remain reference pages while aliases lead to one supplier', async ({ page }) => {
  await page.goto('/brands/mit');
  await expect(page.getByText(/Reference only/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/brands/hric');
  await expect(page).toHaveURL(/\/brands\/x-humanoid$/);
  await expect(page.getByRole('heading', { name: 'X-Humanoid', exact: true })).toBeVisible();
});

test('robot browsing excludes academic manufacturer entries even with all pictures selected', async ({ page }) => {
  await page.goto('/robots?pictures=all&q=MIT');
  await expect(page.locator('a[href^="/robots/mit/"]')).toHaveCount(0);
});
