import { expect, test } from '@playwright/test';

test('the catalogue map opens a cluster with evidence, profiles and working comparison controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/robots');
  const map = page.getByRole('region', { name: 'Explore robot clusters', exact: true });
  await expect(map.locator('[data-cluster]')).toHaveCount(9);
  await expect(map.locator('[data-cluster="humanoid:unconfirmed"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plan automation' })).toHaveCount(0);
  await expect(page.locator('article.card')).not.toHaveCount(0);
  await map.getByRole('button', { name: 'Use cases', exact: true }).click();
  await map.locator('[data-cluster="inspection:commercial"]').click();
  await expect(map.getByRole('heading', { name: 'Inspection / Commercial', exact: true })).toBeVisible();
  const first = map.locator('.landscape-robot-list > li').first();
  await first.getByText('Why this placement?', { exact: true }).click();
  await expect(first.locator('.landscape-sources')).toContainText('Tasks:');
  await expect(first.locator('.landscape-sources')).toContainText('Stage:');
  await first.getByRole('button', { name: /Compare/ }).click();
  await expect(page.getByRole('link', { name: 'Open comparison (1)' })).toBeVisible();
  const href = await first.locator('h4 a').getAttribute('href');
  await first.locator('h4 a').click();
  await expect(page).toHaveURL('http://localhost:3000' + href);
  expect(errors).toEqual([]);
});

test('maker filtering and manufacturer evidence filtering apply to the whole map', async ({ page }) => {
  await page.goto('/robots?all=1');
  const map = page.getByRole('region', { name: 'Explore robot clusters', exact: true });
  await map.getByLabel('Map manufacturer').selectOption('unitree');
  await map.getByRole('button', { name: 'Use cases', exact: true }).click();
  await map.locator('[data-cluster="logistics:commercial"]').click();
  await expect(map.locator('.landscape-robot-list > li')).not.toHaveCount(0);
  for (const name of await map.locator('.landscape-robot-heading > div > p').allTextContents()) expect(name).toBe('Unitree Robotics');
  await map.getByLabel('Manufacturer task evidence only').check();
  for (const label of await map.locator('.landscape-trust').allTextContents()) expect(label).toBe('Manufacturer states it');
  await map.getByRole('button', { name: /Not yet mapped \/ reference/ }).click();
  await expect(map.getByRole('heading', { name: 'Needs evidence or kept for reference' })).toBeVisible();
  await map.getByRole('button', { name: 'Hide map −' }).click();
  await expect(map.locator('[data-cluster]').first()).toBeHidden();
  await map.getByRole('button', { name: 'Show map +' }).click();
  await expect(map.locator('[data-cluster]').first()).toBeVisible();
});

test('maker pages show their own clusters and preserve the manufacturer location map', async ({ page }) => {
  await page.goto('/brands');
  const map = page.getByRole('region', { name: 'Explore robot clusters', exact: true });
  await expect(map).toBeVisible();
  await page.getByRole('button', { name: 'Manufacturer locations', exact: true }).click();
  await expect(page.getByRole('group', { name: 'World map of robot manufacturers' })).toBeVisible();
  await expect(map).toBeHidden();
  await page.getByRole('button', { name: 'Robot clusters', exact: true }).click();
  await expect(map).toBeVisible();
  await page.goto('/brands/unitree');
  const makerMap = page.getByRole('region', { name: 'Unitree Robotics robot clusters' });
  await expect(makerMap).toBeVisible();
  await makerMap.locator('[data-cluster="quadruped:commercial"]').click();
  for (const name of await makerMap.locator('.landscape-robot-heading > div > p').allTextContents()) expect(name).toBe('Unitree Robotics');
});

test('the complete matrix and cluster list fit mobile and desktop', async ({ page }) => {
  await page.goto('/robots');
  const map = page.getByRole('region', { name: 'Explore robot clusters', exact: true });
  await page.screenshot({ path: '.out/robot-landscape-desktop.png', fullPage: false, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(map.locator('[data-cluster]')).toHaveCount(9);
  await expect(map.locator('[data-cluster="humanoid:unconfirmed"]')).toBeVisible();
  await map.getByRole('button', { name: 'Use cases', exact: true }).click();
  await map.locator('[data-cluster="inspection:commercial"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await map.scrollIntoViewIfNeeded();
  await map.screenshot({ path: '.out/robot-landscape-mobile.png', animations: 'disabled' });
});