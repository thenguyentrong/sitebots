import { test, expect } from '@playwright/test';

test('manufacturer browsing distinguishes suppliers from upcoming companies', async ({ page }) => {
  await page.goto('/brands');
  await expect(page.getByRole('heading', { name: 'Manufacturers', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Unitree Robotics', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'MIT', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'NASA', exact: true })).toHaveCount(0);
  await page.getByLabel('Search manufacturers').fill('Tesla');
  await page.getByRole('combobox', { name: /Commercial status/ }).selectOption('commercial');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.getByText('No manufacturers match these filters.')).toBeVisible();
  await expect(page.getByRole('search', { name: 'Find a manufacturer' })).toHaveCount(1);
  await page.getByRole('combobox', { name: /Commercial status/ }).selectOption('developing');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await expect(page.locator('tbody').getByRole('link', { name: 'Tesla', exact: true })).toBeVisible();
});

test('research records remain reference pages while aliases lead to one supplier', async ({ page }) => {
  await page.goto('/brands/mit');
  await expect(page.getByText(/Reference only/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/brands/hric');
  await expect(page).toHaveURL(/\/brands\/x-humanoid$/);
  await expect(page.getByRole('heading', { name: 'X-Humanoid', exact: true })).toBeVisible();
});

test('robot browsing excludes academic manufacturer entries even with all pictures selected', async ({ page }) => {
  await page.goto('/robots?pictures=all&q=MIT');
  await expect(page.locator('a[href^="/robots/mit/"]')).toHaveCount(0);
});

test('the manufacturer map zooms and filters the list by country', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/brands');
  await page.getByRole('button', { name: 'Manufacturer locations', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in map' }).click();
  await expect(page.getByText('150%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset map' }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /^China: \d+ manufacturers$/ }).click();
  await expect(page).toHaveURL(/country=CN/);
  await expect(page.getByRole('combobox', { name: 'Country', exact: true })).toHaveValue('CN');
  const countries = await page.locator('tbody tr td:nth-child(3)').allTextContents();
  expect(countries.length).toBeGreaterThan(0);
  expect(countries.every(c => c.trim() === 'CN')).toBe(true);
  expect(errors).toEqual([]);
});

test('manufacturer suggestions prepare an explicit GitHub draft without claiming submission', async ({ page }) => {
  await page.goto('/brands');
  await page.locator('#submit-manufacturer summary').click();
  await page.getByLabel('Company name', { exact: true }).fill('Example Robotics');
  await page.getByLabel('Official website', { exact: true }).fill('https://example.com/robots');
  await page.getByLabel('Robot products and evidence').fill('Example Robot — https://example.com/robot-one');
  await page.getByRole('button', { name: 'Prepare submission' }).click();
  await expect(page.getByRole('status')).toContainText('It has not been submitted yet.');
  const draft = new URL((await page.getByRole('link', { name: 'Review and submit on GitHub' }).getAttribute('href'))!);
  expect(draft.origin).toBe('https://github.com');
  expect(draft.pathname).toBe('/thenguyentrong/sitebots/issues/new');
  expect(draft.searchParams.get('title')).toBe('Manufacturer submission: Example Robotics');
  expect(draft.searchParams.get('body')).toContain('https://example.com/robot-one');
  await page.getByLabel('Company name', { exact: true }).fill('Changed name');
  await expect(page.getByRole('link', { name: 'Review and submit on GitHub' })).toHaveCount(0);
});

test('unnamed TBD records stay out of product lists and indexing', async ({ page }) => {
  await page.goto('/robots?pictures=all&q=TBD');
  await expect(page.locator('a[href="/robots/simplexity/tbd"]')).toHaveCount(0);
  await expect(page.locator('a[href="/robots/simplexity/tbd-2"]')).toHaveCount(0);
  await page.goto('/robots/simplexity/tbd');
  await expect(page.getByText(/Reference only/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
