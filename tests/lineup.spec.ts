import { expect, test } from '@playwright/test';

// The landing's hero: the live job site on a desktop with a mouse, the still strip on a phone.

test('on a desktop the job site comes alive; a robot pointed at says what it does and a click opens it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('.home-hero')).toHaveAttribute('data-live', 'ready', { timeout: 90_000 });
  await expect(page.getByText(/Drag to turn the row/)).toBeVisible();
  // Every robot is named under its feet, and the names link to their pages.
  await expect(page.locator('a.lineup-label')).toHaveCount(5);
  const label = (await page.locator('a.lineup-label[href="/robots/unitree/g1"]').boundingBox())!;
  await page.mouse.move(label.x + label.width / 2, label.y - 40, { steps: 4 });
  await expect(page.locator('.lineup-tag')).toContainText('Unitree G1', { timeout: 10_000 });
  await expect(page.locator('.lineup-tag')).toContainText('Picks fittings into a tote');
  await expect(page.locator('.home-hud li[data-active]')).toContainText('G1');
  await page.mouse.down();
  await page.mouse.up();
  // The robot page loads its own 3D viewer; with software WebGL under a full run that takes a while.
  await expect(page).toHaveURL(/[/]robots[/]unitree[/]g1$/, { timeout: 30_000 });
});

test('a phone keeps the still of the row, which scrolls sideways inside the hero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText(/Swipe sideways to see all 5 robots/)).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator('.home-hero')).toHaveAttribute('data-live', 'still');
  const strip = await page.locator('.home-stage').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(strip.scroll).toBeGreaterThan(strip.client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
