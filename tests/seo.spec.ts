import { expect, test } from '@playwright/test';

type Ld = { '@type': string; [k: string]: unknown };

async function jsonLd(page: import('@playwright/test').Page): Promise<Ld[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as Ld);
}

test('robot page: canonical, Product JSON-LD with verified properties, offers only from stores', async ({ page }) => {
  await page.goto('/robots/unitree/g1');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/robots\/unitree\/g1$/);

  const ld = await jsonLd(page);
  const product = ld.find((x) => x['@type'] === 'Product')!;
  expect(product).toBeDefined();
  expect(product.name).toBe('Unitree G1');
  expect((product.brand as { name: string }).name).toBe('Unitree Robotics');
  expect(product.aggregateRating).toBeUndefined();

  const props = product.additionalProperty as { name: string; value: string }[];
  expect(props.some((p) => p.name === 'weight_kg' && p.value === '35')).toBe(true);

  // The G1 has a store price (tier 1) → an offer exists and it is the store's, not an estimate.
  const offers = product.offers as { price: number; priceCurrency: string; seller: { name: string } } | { price: number }[];
  const list = Array.isArray(offers) ? offers : [offers];
  expect(list.length).toBeGreaterThan(0);
  expect(list.every((o) => 'seller' in o)).toBe(true);

  const crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList')!;
  expect((crumbs.itemListElement as unknown[]).length).toBe(3);
});

test('a quote-only robot has no offers in its JSON-LD', async ({ page }) => {
  await page.goto('/robots/boston-dynamics/spot');
  const product = (await jsonLd(page)).find((x) => x['@type'] === 'Product')!;
  expect(product.offers).toBeUndefined();
});

test('sitemap lists robots and makers, robots.txt keeps compare out', async ({ request }) => {
  const sm = await (await request.get('/sitemap.xml')).text();
  expect(sm).toContain('/robots/unitree/g1');
  expect(sm).toContain('/brands/unitree');
  expect(sm).not.toContain('/compare');
  const rt = await (await request.get('/robots.txt')).text();
  expect(rt).toMatch(/Disallow: \/compare/);
});
