import { expect, test, type Locator, type Page } from '@playwright/test';

const RUNS = 'Bring fittings, fixings and tools to the installers';
const DRILL = 'Drill anchor holes overhead for the installations';
const OWN = 'Clear packaging waste from the floors';

async function reveal(page: Page, input: Locator) {
  const disclosure = page.locator('details').filter({ has: input });
  if (await disclosure.count() && !(await input.isVisible())) await disclosure.locator('summary').click();
}

test('discover, review and rank tasks without class-wide exclusions', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Which jobs can robots do today?');
  await expect(page.getByRole('region', { name: 'Explore use cases', exact: true })).toBeVisible();
  await page.screenshot({ path: '.out/journey-home-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('combobox').filter({ hasText: 'Everywhere' }).selectOption('site');
  await page.locator('[data-job="site_setup_logistics/material-runs-to-installers"]').click();
  await expect(page.getByTestId('selected-job')).toContainText(RUNS);
  await page.getByTestId('selected-job').getByRole('link', { name: /Check it for your site/ }).click();

  await expect(page).toHaveURL(/\/use-cases\/site_setup_logistics\/material-runs-to-installers#check$/);
  await expect(page.getByRole('navigation', { name: 'Journey stations' }).getByRole('link', { name: /Check/ })).toHaveAttribute('aria-current', 'step');
  const result = page.getByTestId('opportunity-result');
  await expect(result).toHaveAttribute('data-status', 'needs_information');
  await expect(result.locator('[data-requirement]')).toHaveCount(12);
  await expect(result.locator('[data-requirement="runtime_continuous_min"]')).toHaveAttribute('data-status', 'missing');
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'Classified dust area' }).click();
  await expect(result.locator('[data-requirement="dust"]')).toHaveAttribute('data-status', 'known');
  await expect(result).toHaveAttribute('data-status', 'needs_information');
  await expect(page.getByRole('button', { name: 'Add to my shortlist' })).toBeEnabled();
  await page.screenshot({ path: '.out/journey-check.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page.getByTestId('task-added')).toBeVisible();

  await page.goto('/use-cases/site_electrical/overhead-drilling-anchors');
  await expect(result).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to my shortlist' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.getByRole('link', { name: 'Go to my shortlist' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  const rows = page.locator('.shortlist > li');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: RUNS })).toBeVisible();
  await expect(rows.filter({ hasText: DRILL })).toBeVisible();
  await expect(page.getByRole('link', { name: /My shortlist/ })).toContainText('2');
  await page.screenshot({ path: '.out/journey-shortlist.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Rank them' }).click();

  await expect(page).toHaveURL(/\/plan\/priorities$/);
  await page.getByLabel('Task', { exact: true }).selectOption({ label: DRILL });
  await page.getByLabel('Business value', { exact: true }).selectOption('high');
  await page.getByLabel('Deployment readiness', { exact: true }).selectOption('low');
  await expect(page.locator('[data-priority-cell="high:low"]')).toContainText('Drill anchor holes');
  await page.getByLabel('Task', { exact: true }).selectOption({ label: RUNS });
  await page.getByLabel('Business value', { exact: true }).selectOption('high');
  await page.getByLabel('Deployment readiness', { exact: true }).selectOption('medium');
  await expect(page.locator('[data-priority-cell="high:medium"]')).toContainText('Bring fittings');
  await page.reload();
  await expect(page.locator('[data-priority-cell="high:low"]')).toContainText('Drill anchor holes');
  await expect(page.locator('[data-priority-cell="high:medium"]')).toContainText('Bring fittings');
  expect(errors).toEqual([]);
});

test('all twelve task requirements can be captured without claiming robot suitability', async ({ page }) => {
  await page.goto('/use-cases/custom');
  const result = page.getByTestId('opportunity-result');
  await expect(result).toHaveAttribute('data-status', 'needs_information');
  await expect(result.locator('[data-requirement][data-status="missing"]')).toHaveCount(12);
  await page.getByLabel('Task name').fill(OWN);
  await page.getByLabel('Kind of work').selectOption('cleaning_housekeeping_replenishment');
  await page.getByRole('spinbutton', { name: 'Heaviest object handled (kg)' }).fill('80');
  await page.getByRole('group', { name: 'How much the task varies' }).getByRole('button', { name: 'High: different every time' }).click();
  await page.getByRole('group', { name: 'What an error costs' }).getByRole('button', { name: 'Caught and corrected' }).click();
  await page.getByRole('group', { name: 'Safety relevance' }).getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('group', { name: 'Does a machine already do this?' }).getByRole('button', { name: 'No machine does it' }).click();
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'No relevant dust' }).click();
  await page.getByRole('group', { name: 'Indoors or outdoors?' }).getByRole('button', { name: 'Indoor', exact: true }).click();
  await page.getByRole('group', { name: 'Wet conditions' }).getByRole('button', { name: 'Dry', exact: true }).click();

  const reach = page.getByLabel('Working height (m)', { exact: true });
  await reveal(page, reach);
  await reach.fill('2');
  const floor = page.getByRole('group', { name: 'Floor', exact: true });
  await reveal(page, floor);
  await floor.getByRole('button', { name: 'Level floor' }).click();
  await page.getByRole('group', { name: 'Cameras and data' }).getByRole('button', { name: 'No people in view' }).click();
  await expect(result).toHaveAttribute('data-status', 'needs_information');
  await expect(result.locator('[data-requirement][data-status="missing"]')).toHaveCount(1);
  await page.getByRole('spinbutton', { name: 'Longest unbroken run (minutes)' }).fill('480');
  await expect(result).toHaveAttribute('data-status', 'ready_to_compare');
  await expect(result.locator('[data-requirement][data-status="known"]')).toHaveCount(12);
  await expect(result).toContainText('Knowing the requirements does not show that any robot');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page).toHaveURL(/\/use-cases\/custom\?project=/);
  await page.reload();
  await expect(result).toHaveAttribute('data-status', 'ready_to_compare');
  await expect(page.getByRole('spinbutton', { name: 'Heaviest object handled (kg)' })).toHaveValue('80');
});

test('existing equipment remains a comparison baseline rather than excluding the task', async ({ page }) => {
  await page.goto('/use-cases/prefab_timber/fittings-kitting');
  const result = page.getByTestId('opportunity-result');
  await expect(result).toBeVisible();
  await page.getByRole('group', { name: 'Does a machine already do this?' }).getByRole('button', { name: 'A dedicated machine does it' }).click();
  await expect(result.locator('[data-requirement="incumbent_automation"]')).toHaveAttribute('data-status', 'known');
  await expect(result).toContainText('Existing equipment already covers');
  await expect(page.getByRole('button', { name: 'Add to my shortlist' })).toBeEnabled();
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Does a machine already do this?' }).getByRole('button', { name: 'A dedicated machine does it' })).toHaveAttribute('aria-pressed', 'true');
});

test('the landing, review and shortlist fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const noSideScroll = async () => {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  await page.goto('/');
  await noSideScroll();
  await page.screenshot({ path: '.out/journey-home-mobile.png', fullPage: true, animations: 'disabled' });
  await page.goto('/use-cases?setting=prefab_timber');
  await noSideScroll();
  await page.goto('/use-cases/prefab_timber/qa-inspection-documentation');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await noSideScroll();
  await page.screenshot({ path: '.out/journey-check-mobile.png', fullPage: true, animations: 'disabled' });
  await page.goto('/plan');
  await expect(page.locator('.shortlist > li')).toContainText('Inspect and document');
  await noSideScroll();
  await page.screenshot({ path: '.out/journey-shortlist-mobile.png', fullPage: true, animations: 'disabled' });
  await page.goto('/use-cases/custom');
  await noSideScroll();
});




test('an explicitly unknown site condition survives saving and can return to the task baseline', async ({ page }) => {
  await page.goto('/use-cases/prefab_timber/fittings-kitting');
  const dustRequirement = page.getByTestId('opportunity-result').locator('[data-requirement="dust"]');
  await expect(dustRequirement).toHaveAttribute('data-status', 'known');
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'Not sure', exact: true }).click();
  await expect(dustRequirement).toHaveAttribute('data-status', 'missing');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await page.reload();
  await expect(dustRequirement).toHaveAttribute('data-status', 'missing');
  await expect(page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'Not sure', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back to typical' }).click();
  await expect(dustRequirement).toHaveAttribute('data-status', 'known');
});
