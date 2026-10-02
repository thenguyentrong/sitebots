import { expect, test } from '@playwright/test';

test('a task page shows the work step by step, each frame linked to its moment in the video', async ({ page }) => {
  await page.goto('/use-cases/site_concrete/wall-formwork-panels');
  const steps = page.locator('#steps .wf-step');
  expect(await steps.count()).toBeGreaterThanOrEqual(4);
  const first = steps.first();
  await expect(first.locator('img')).toBeVisible();
  await expect(first.locator('a')).toHaveAttribute('href', /^https:[/][/]www[.]youtube[.]com[/]watch[?]v=[A-Za-z0-9_-]{11}&t=[0-9]+s$/);
  await expect(page.locator('#steps').getByText(/Pictures: frames from/)).toBeVisible();
});

test('the job map shows the steps of the selected job and links to the step sheet', async ({ page }) => {
  await page.goto('/?usecase=site_concrete%2Fwall-formwork-panels');
  const strip = page.locator('.wf-strip');
  await expect(strip.locator('li').first()).toBeVisible();
  await expect(strip.getByRole('link', { name: /Open the step sheet/ })).toHaveAttribute('href', '/use-cases/site_concrete/wall-formwork-panels#steps');
});

test('the steps page lists every step sheet by trade', async ({ page }) => {
  await page.goto('/steps');
  await expect(page.getByRole('heading', { level: 1, name: 'How the work is done' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Steps' }).first()).toHaveAttribute('aria-current', 'page');
  const sheet = page.getByRole('link', { name: /Set, tie and strike framed wall formwork/ });
  await expect(sheet).toHaveAttribute('href', '/use-cases/site_concrete/wall-formwork-panels#steps');
});
