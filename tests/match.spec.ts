import { expect, test } from '@playwright/test';

test('the matcher excludes on payload and ranks the quadruped for an outdoor stair job', async ({ page }) => {
  await page.goto('/?payload_kg=12&stairs=required&environment=outdoor');
  await expect(page.getByText(/robots? can do this/)).toBeVisible();

  // Spot: 14 kg on the back, stairs, IP54 — passes and appears as a result card.
  const spot = page.getByRole('article').filter({ hasText: 'Spot' }).first();
  await expect(spot).toBeVisible();
  await expect(spot).toContainText('climbs stairs');
  await expect(spot).toContainText('outdoor use (IP54)');

  // G1: 2 kg per arm — excluded with the payload sentence.
  const excluded = page.locator('details', { hasText: 'excluded' });
  await excluded.locator('summary').click();
  await expect(excluded).toContainText('fails: 2 kg rated < 12 kg needed');
});

test('unknown is unverified by default and excluded in strict mode', async ({ page }) => {
  await page.goto('/?stairs=required');
  const before = await page.getByRole('article').count();
  expect(before).toBeGreaterThan(5);
  await expect(page.getByRole('article').filter({ hasText: 'stair capability not published' }).first()).toBeVisible();

  await page.goto('/?stairs=required&strict_unknowns=1');
  const after = await page.getByRole('article').count();
  expect(after).toBeLessThan(before);
  await expect(page.getByRole('article').filter({ hasText: 'not published' })).toHaveCount(0);
});

test('the form keeps its values and the result is a link', async ({ page }) => {
  await page.goto('/');
  // The select sits inside its <label>, so its accessible name includes the
  // option texts; address the controls by name instead.
  await page.locator('input[name="payload_kg"]').fill('5');
  await page.locator('select[name="stairs"]').selectOption('required');
  await page.getByRole('button', { name: 'Find robots' }).click();
  await expect(page).toHaveURL(/payload_kg=5/);
  await expect(page.locator('input[name="payload_kg"]')).toHaveValue('5');
  await expect(page.locator('select[name="stairs"]')).toHaveValue('required');
});

test('the API ranks with the same reasons', async ({ request }) => {
  const res = await request.post('/api/match', { data: { payload_kg: 12, stairs: 'required', environment: 'outdoor' } });
  expect(res.ok()).toBe(true);
  const body = await res.json();
  // Spot passes every gate with everything known; which proven quadruped leads can change as makers publish more.
  expect(body.ranked.slice(0, 3).map((r: { name: string }) => r.name)).toContain('Spot');
  expect(body.excluded.some((e: { name: string; reasons: string[] }) => e.name === 'Unitree G1' && e.reasons.some((r) => r.includes('2 kg rated < 12 kg')))).toBe(true);

  const bad = await request.post('/api/match', { data: { payload_kg: -1 } });
  expect(bad.status()).toBe(400);
});
