import { expect, test } from '@playwright/test';

test('a robot page carries the construction profile with both views', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  const profile = page.locator('[data-profile]');
  await expect(profile).toBeVisible();
  // Folded under its header line until opened.
  await profile.locator('summary').first().click();
  await expect(profile.locator('[data-profile-view="site"] [data-radar] [data-spoke]')).toHaveCount(10);
  await expect(profile.getByText('Carry', { exact: true }).first()).toBeVisible();
  await profile.getByRole('tab', { name: 'Tasks' }).click();
  await expect(profile.locator('[data-profile-view="tasks"] [data-radar] [data-spoke]')).toHaveCount(21);
  await expect(profile.locator('[data-profile-view="tasks"]').getByText('Site inspection', { exact: true }).last()).toBeVisible();
});

test('unknown axes read as not published, never as zero', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  await page.locator('[data-profile] summary').first().click();
  const list = page.locator('[data-profile-view="site"] ol').first();
  await expect(list.getByText('not published').first()).toBeVisible();
});

test('the parts and equipment panels are on the page', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  await expect(page.locator('[data-parts-panel]')).toBeVisible();
  await expect(page.locator('[data-equipment-panel]')).toBeVisible();
});

test('the compare page overlays one polygon per robot', async ({ page }) => {
  await page.goto('/robots?view=list&q=unitree');
  const ids: string[] = [];
  for (const b of await page.locator('button[data-robot-id]').all()) {
    ids.push((await b.getAttribute('data-robot-id'))!);
    if (ids.length === 2) break;
  }
  await page.goto(`/compare?ids=${ids.join(',')}`);
  await expect(page.locator('[data-compare-radar] [data-polygon]')).toHaveCount(2);
  await expect(page.locator('[data-compare-radar] li')).toHaveCount(2);
});

test('configuration evidence preserves seller scope and explains missing working runtime', async ({ page }) => {
  await page.goto('/robots/booster/t2');
  const profile = page.locator('[data-profile]');
  await expect(profile).toContainText('Profile scope: Catalogue model');
  await profile.locator('summary').first().click();
  const endurance = profile.locator('[data-profile-axis="endurance"]');
  await endurance.locator('summary').click();
  await expect(endurance).toContainText('Loaded working runtime with workload stated');
  const edu = page.locator('[data-configuration="booster-t2-edu"]');
  await edu.locator('summary').first().click();
  const payload = edu.locator('[data-spec-field="arm_payload_kg"]');
  await expect(payload).toContainText('5 kg');
  await expect(payload).toContainText('Reported · seller');
  await expect(payload).toContainText('horizontal');
  await payload.getByText('Exact source text', { exact: true }).click();
  await expect(payload.locator('blockquote')).toBeVisible();
  await expect(payload.getByRole('link')).toHaveAttribute('href', /T2-Edu/);
  const pro = page.locator('[data-configuration="booster-t2-pro"]');
  await expect(pro.locator('summary').first()).toContainText('3 kg');
});

test('profile tabs support keyboard selection and identify their panels', async ({ page }) => {
  await page.goto('/robots/booster/t2');
  await page.locator('[data-profile] summary').first().click();
  const site = page.getByRole('tab', { name: 'Site conditions' });
  const tasks = page.getByRole('tab', { name: 'Tasks', exact: true });
  await site.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tasks).toBeFocused();
  await expect(tasks).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Tasks' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(site).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Site conditions' })).toBeVisible();
});

test('a market-only robot shows evidence stages, source dates and missing data', async ({ page }) => {
  await page.goto('/market/acr-ironbot');
  await expect(page.getByRole('heading', { name: 'Robot evidence profile' })).toBeVisible();
  const evidence = page.locator('[data-configuration-evidence]');
  await expect(evidence).toContainText('What is still missing');
  await expect(evidence).toContainText('checked');
  await expect(page.getByRole('heading', { name: 'Specifications by configuration' })).toBeVisible();
});
