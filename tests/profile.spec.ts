import { expect, test } from '@playwright/test';

test('a robot page carries the construction profile with both views', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  const profile = page.locator('[data-profile]');
  await expect(profile).toBeVisible();
  await expect(profile.locator('[data-profile-view="site"] [data-radar] [data-spoke]')).toHaveCount(10);
  await expect(profile.getByText('Carry', { exact: true }).first()).toBeVisible();
  await profile.getByRole('tab', { name: 'Tasks' }).click();
  await expect(profile.locator('[data-profile-view="tasks"] [data-radar] [data-spoke]')).toHaveCount(17);
  await expect(profile.locator('[data-profile-view="tasks"]').getByText('Site inspection', { exact: true }).last()).toBeVisible();
});

test('unknown axes read as not published, never as zero', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  const list = page.locator('[data-profile] ol');
  await expect(list.getByText('not published').first()).toBeVisible();
});

test('the parts and equipment panels are on the page', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  await expect(page.locator('[data-parts-panel]')).toBeVisible();
  await expect(page.locator('[data-equipment-panel]')).toBeVisible();
});

test('the compare page overlays one polygon per robot', async ({ page }) => {
  await page.goto('/robots?q=unitree');
  const ids: string[] = [];
  for (const b of await page.locator('button[data-robot-id]').all()) {
    ids.push((await b.getAttribute('data-robot-id'))!);
    if (ids.length === 2) break;
  }
  await page.goto(`/compare?ids=${ids.join(',')}`);
  await expect(page.locator('[data-compare-radar] [data-polygon]')).toHaveCount(2);
  await expect(page.locator('[data-compare-radar] li')).toHaveCount(2);
});
