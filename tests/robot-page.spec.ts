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
  await expect(page.locator('[data-robot-viewer]')).toHaveCount(0);
  await expect(page.locator('[data-robot-poster]')).toBeVisible();
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
  // The EDU keeps the borrowed base photograph available in its gallery.
  await media.locator('[data-media-tab="photos"]').click();
  await expect(page.getByText('Base model').first()).toBeVisible();
});

test('TRON 2 has reviewed commercial status and Germany buying contacts', async ({ page }) => {
  await page.goto('/robots/limx-dynamics/tron-2');
  await expect(page.getByText('Available to order', { exact: true })).toBeVisible();
  await expect(page.getByText('Prototype', { exact: true })).toHaveCount(0);
  const availability = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Price and delivery', exact: true }) });
  await expect(availability).toContainText('Available to order through LimX sales');
  await expect(availability.getByRole('link', { name: 'limxdynamics.com', exact: true })).toHaveAttribute('href', 'https://www.limxdynamics.com/en/products/tron2');
  const buying = page.getByRole('region', { name: 'Buying in Germany' });
  await expect(buying.getByRole('link', { name: 'reichelt elektronik' })).toHaveAttribute('href', /reichelt.com.*tron2/);
  await expect(buying).toContainText('Businesses, institutions and government agencies only');
  await expect(buying).toContainText('live stock and price unconfirmed');
  await expect(buying.getByRole('link', { name: 'bd@limxdynamics.com', exact: true })).toHaveAttribute('href', 'mailto:bd@limxdynamics.com');
  await expect(buying.getByRole('link', { name: 'info@reichelt.de', exact: true })).toHaveAttribute('href', 'mailto:info@reichelt.de');
});

test('B2 has commercial status backed by manufacturer availability', async ({ page }) => {
  await page.goto('/robots/unitree/b2');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Unitree B2');
  await expect(page.getByText('Available to order', { exact: true })).toBeVisible();
  await expect(page.getByText('Status unknown', { exact: true })).toHaveCount(0);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Price and delivery', exact: true }) });
  await expect(panel).toContainText('Manufacturer');
  await expect(panel.getByRole('link', { name: 'shop.unitree.com', exact: true })).toHaveAttribute('href', 'https://shop.unitree.com/products/unitree-b2');
  await expect(panel).toContainText('Reported: For sale');
});

test('NEO distinguishes preorders and refundable deposits from the robot price', async ({ page }) => {
  await page.goto('/robots/1x/neo');
  const header = page.locator('header').filter({ has: page.getByRole('heading', { level: 1, name: '1X NEO' }) });
  await expect(header.getByText('Pre-order', { exact: true })).toBeVisible();
  await expect(header.getByText('Prototype', { exact: true })).toHaveCount(0);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Price and delivery', exact: true }) });
  await expect(panel).toContainText('US deliveries start 2026');
  await expect(panel.getByRole('row').filter({ hasText: 'early-access-ownership' })).toContainText('US$20,000');
  await expect(panel).toContainText('$200 refundable reservation deposit');
});
