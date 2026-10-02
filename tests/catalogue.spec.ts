import { expect, test } from '@playwright/test';

test('the worldwide view lists only robots with a real picture unless asked otherwise', async ({ page }) => {
  await page.goto('/robots?scope=world');
  await expect(page.getByTestId('catalogue-list')).toBeVisible();
  const cards = page.locator('.mk-tile');
  await expect(cards).not.toHaveCount(0);
  // Every card in the default list carries a picture; no stand-in text anywhere.
  await expect(cards.locator('.mk-tile-photo')).toHaveCount(await cards.count());
  await expect(page.getByText('No picture published')).toHaveCount(0);
  const toggle = page.getByRole('link', { name: /without a picture/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page).toHaveURL(/pictures=all/);
  await expect(page).toHaveURL(/scope=world/);
  await expect(page.getByTestId('catalogue-count')).toHaveText(/[0-9]+ configurations/);
  await expect(page.getByTestId('catalogue-list')).toBeVisible();
});
