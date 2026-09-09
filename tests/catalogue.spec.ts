import { expect, test } from '@playwright/test';

test('the catalogue lists only robots with a real picture unless asked otherwise', async ({ page }) => {
  await page.goto('/robots');
  const cards = page.locator('article.card');
  const shown = await cards.count();
  expect(shown).toBeGreaterThan(0);
  // Every card on the default page carries a picture; no stand-in glyphs anywhere.
  expect(await cards.locator('img').count()).toBe(shown);
  const toggle = page.getByRole('link', { name: /without a picture/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page).toHaveURL(/pictures=all/);
  await expect(page.getByText(/robots,/)).toBeVisible();
});
