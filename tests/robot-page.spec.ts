import { expect, test } from '@playwright/test';

test('the catalogue lists robots with a form-factor filter and search', async ({ page }) => {
  await page.goto('/robots');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robots');
  await expect(page.getByRole('link', { name: /Unitree G1/ }).first()).toBeVisible();

  await page.goto('/robots?form=quadruped');
  await expect(page.getByRole('link', { name: /Spot/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Unitree G1/ })).toHaveCount(0);

  await page.goto('/robots?q=booster');
  await expect(page.getByRole('link', { name: /Booster T2/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Spot/ })).toHaveCount(0);
});

test('a robot page shows every value with its trust badge and source', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unitree G1');

  // Manufacturer-sourced values are verified, and the source host is linked.
  const weight = page.getByRole('row', { name: /Weight/ }).first();
  await expect(weight).toContainText('35 kg');
  await expect(weight).toContainText('Verified');
  await expect(weight.getByRole('link', { name: 'unitree.com' })).toHaveAttribute('href', 'https://www.unitree.com/g1');

  // What nobody publishes is said so, not hidden.
  await expect(page.getByRole('row', { name: /IP rating/ }).first()).toContainText('not published');

  // The price carries its evidence: the store row says where it was read.
  const storeRow = page.getByRole('row').filter({ hasText: 'manufacturer store' }).first();
  await expect(storeRow).toContainText('US$13,500');
  await expect(storeRow).toContainText('shop.unitree.com');
});

test('variants are tabs on one URL', async ({ page }) => {
  await page.goto('/robots/unitree/g1?variant=edu');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unitree G1 EDU');
  await expect(page.getByRole('link', { name: 'Base' })).toHaveAttribute('href', '/robots/unitree/g1');
});

test('a quote-only robot never shows the placeholder price', async ({ page }) => {
  await page.goto('/robots/unitree/h2?variant=plus');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unitree H2 Plus');
  // The summary may explain the placeholder in words; no price row may carry it
  // as a store or distributor figure, and the store's own status must show.
  const panel = page.locator('section', { hasText: 'Price and delivery' });
  await expect(panel.getByRole('row').filter({ hasText: /manufacturer store|distributor listing/ }).filter({ hasText: '100,000' })).toHaveCount(0);
  await expect(panel.getByText('Enterprise only')).toBeVisible();
});

test('unknown robots 404', async ({ page }) => {
  const res = await page.goto('/robots/acme/nothing');
  expect(res?.status()).toBe(404);
});

test('the picture column is a 3D tab and a photo gallery you can page through', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  const media = page.locator('[data-robot-media]');
  await expect(media).toBeVisible();
  expect(Number(await media.getAttribute('data-photos'))).toBeGreaterThan(0);
  await expect(page.locator('[data-media-slide="3d"]')).toBeVisible();
  await expect(page.locator('[data-robot-photo]')).toHaveCount(0);
  await media.locator('[data-media-tab="photos"]').click();
  await expect(page.locator('[data-robot-photo]')).toBeVisible();
  await expect(page.locator('[data-media-slide="3d"]')).toBeHidden();
  await expect(page.locator('[data-robot-photo] figcaption a')).toHaveAttribute('href', /^https?:[/][/]/);
  const photos = Number(await media.getAttribute('data-photos'));
  if (photos > 1) {
    await expect(page.locator('[data-photo-count]')).toHaveText(`1 / ${photos}`);
    await page.locator('[data-photo-next]').click();
    await expect(page.locator('[data-robot-photo]')).toHaveAttribute('data-photo-index', '1');
  }
});

test('a variant without pictures of its own borrows the base model photograph', async ({ page }) => {
  await page.goto('/robots/unitree/g1?variant=edu');
  const media = page.locator('[data-robot-media]');
  await expect(media).toBeVisible();
  // The EDU shares the G1's model, so the page opens on 3D; the borrowed photograph sits behind the photos tab.
  await media.locator('[data-media-tab="photos"]').click();
  await expect(page.getByText('Base model').first()).toBeVisible();
});
