import { expect, test } from '@playwright/test';

test('the costs page answers shell or finishing from the official weights', async ({ page }) => {
  await page.goto('/costs');
  await expect(page.getByRole('heading', { level: 1, name: 'Where the money goes' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Costs' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('img', { name: /^Residential buildings: Shell 44/ })).toBeVisible();
  await page.getByRole('navigation', { name: 'Building type' }).getByRole('link', { name: 'Office' }).click();
  await expect(page).toHaveURL(/type=buero/);
  await expect(page.getByRole('link', { name: 'Concrete works', exact: true }).first()).toHaveAttribute('href', '/use-cases?setting=site_concrete');
  await expect(page.getByRole('link', { name: /Wägungsschemata 2021/ })).toHaveAttribute('href', /destatis[.]de/);
});
