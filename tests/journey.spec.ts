import { expect, test } from '@playwright/test';

const RUNS = 'Bring fittings, fixings and tools to the installers';
const DRILL = 'Drill anchor holes overhead for the installations';
const OWN = 'Clear packaging waste from the floors';

test('find, check and decide: from the landing to a brief that survives a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Landing: construction-wide, three steps, no matrix or finder form.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('candidate');
  await expect(page.getByRole('list', { name: 'The three steps' }).getByRole('link')).toHaveCount(3);
  await expect(page.getByRole('list', { name: 'The five hard tests' }).getByRole('listitem')).toHaveCount(5);
  await expect(page.locator('[data-priority-cell]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Find your work' }).click();

  // Find: the library by LV trade.
  await expect(page).toHaveURL(/\/use-cases$/);
  await page.getByRole('group', { name: 'Where' }).getByRole('link', { name: /Construction site/ }).click();
  await page.getByRole('link', { name: /Site setup and logistics/ }).click();
  await expect(page).toHaveURL(/setting=site_setup_logistics/);
  await expect(page.getByTestId('setting-note')).toContainText('LB 000/090');
  const runs = page.locator('[data-task="site_setup_logistics/material-runs-to-installers"]');
  await expect(runs).toHaveAttribute('data-verdict', 'candidate');
  await runs.getByRole('link', { name: 'Check for my site' }).click();

  // Check: the verdict starts from a typical site and moves with the answers.
  await expect(page).toHaveURL(/\/use-cases\/site_setup_logistics\/material-runs-to-installers#check$/);
  await expect(page.getByRole('navigation', { name: 'Journey stations' }).getByRole('link', { name: /Check/ })).toHaveAttribute('aria-current', 'step');
  const result = page.getByTestId('check-result');
  await expect(result).toHaveAttribute('data-verdict', 'candidate');
  await expect(page.locator('#check [data-rule="T1_mass"]')).toHaveAttribute('data-status', 'pass');
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'Classified dust area' }).click();
  await expect(result).toHaveAttribute('data-verdict', 'ruled_out');
  await expect(page.getByTestId('better-answer')).toContainText('process');
  await page.getByRole('button', { name: 'Back to typical' }).click();
  await expect(result).toHaveAttribute('data-verdict', 'candidate');
  await page.screenshot({ path: '.out/journey-check.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page.getByTestId('task-added')).toBeVisible();

  await page.goto('/use-cases/site_electrical/overhead-drilling-anchors');
  await expect(result).toHaveAttribute('data-verdict', 'ruled_out');
  await expect(page.locator('#check [data-rule="T5_failure_tolerance"]')).toHaveAttribute('data-status', 'fail');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();

  // A task of your own: nothing assumed, the verdict waits for the hard tests.
  await page.goto('/use-cases/custom');
  await expect(result).toHaveAttribute('data-verdict', 'unscreened');
  await page.getByLabel('Task name').fill(OWN);
  await page.getByLabel('Kind of work').selectOption('cleaning_housekeeping_replenishment');
  await page.getByRole('spinbutton', { name: 'Heaviest object handled (kg)' }).fill('3');
  await page.getByRole('group', { name: 'How much the task varies' }).getByRole('button', { name: 'High: different every time' }).click();
  await page.getByRole('group', { name: 'What an error costs' }).getByRole('button', { name: 'Caught and corrected' }).click();
  await page.getByRole('group', { name: 'Safety relevance' }).getByRole('button', { name: 'None', exact: true }).click();
  await page.getByRole('group', { name: 'Does a machine already do this?' }).getByRole('button', { name: 'No machine does it' }).click();
  await page.getByRole('group', { name: 'Dust where the work happens' }).getByRole('button', { name: 'No relevant dust' }).click();
  await page.getByRole('group', { name: 'Indoors or outdoors?' }).getByRole('button', { name: 'Indoor', exact: true }).click();
  await page.getByRole('group', { name: 'Wet conditions' }).getByRole('button', { name: 'Dry', exact: true }).click();
  await expect(result).toHaveAttribute('data-verdict', 'candidate');
  await page.getByRole('button', { name: 'Add to my shortlist' }).click();
  await expect(page).toHaveURL(/\/use-cases\/custom\?project=/);
  await page.getByRole('link', { name: 'Go to my shortlist' }).click();

  // Decide: the shortlist, best first, the ruled-out task with its better answer.
  await expect(page).toHaveURL(/\/plan$/);
  const rows = page.locator('.shortlist > li');
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: RUNS })).toHaveAttribute('data-verdict', 'candidate');
  await expect(rows.filter({ hasText: OWN })).toHaveAttribute('data-verdict', 'candidate');
  await expect(rows.filter({ hasText: DRILL })).toHaveAttribute('data-verdict', 'ruled_out');
  await expect(rows.filter({ hasText: DRILL })).toContainText('Better answer');
  await expect(page.getByRole('link', { name: /My shortlist/ })).toContainText('3');
  await page.screenshot({ path: '.out/journey-shortlist.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Rank them' }).click();

  // Which first: the matrix over the survivors; the ruled-out task is listed, not ranked.
  await expect(page).toHaveURL(/\/plan\/priorities$/);
  await expect(page.getByTestId('ruled-out-note')).toContainText('Drill anchor holes');
  await page.getByLabel('Task', { exact: true }).selectOption({ label: RUNS });
  await page.getByLabel('Business value', { exact: true }).selectOption('high');
  await page.getByLabel('Deployment readiness', { exact: true }).selectOption('medium');
  await expect(page.locator('[data-priority-cell="high:medium"]')).toContainText('Bring fittings');
  await expect(page.locator('[data-priority-cell] button', { hasText: 'Drill anchor holes' })).toHaveCount(0);

  // Solutions: the matcher receives the checked facts of the task.
  const response = page.waitForResponse((res) => res.url().endsWith('/api/plan') && res.request().method() === 'POST');
  await page.getByRole('link', { name: /Continue to solutions/ }).click();
  await expect(page).toHaveURL(/\/plan\/systems$/);
  const sent = (await response).request().postDataJSON();
  expect(sent.requirements).toMatchObject({ payload_kg: 12, environment: 'indoor', region: 'DE' });
  await expect(page.getByTestId('systems-verdict')).toContainText('Candidate');
  const candidate = page.getByRole('article').first();
  await expect(candidate).toBeVisible();
  const robotName = await candidate.getByRole('heading').innerText();
  await candidate.getByRole('button', { name: 'Add to assessment', exact: true }).click();
  await page.getByRole('button', { name: 'Estimate costs →' }).click();

  // Cost and pilot: the business case and the brief.
  await expect(page).toHaveURL(/\/plan\/implementation$/);
  await page.getByLabel('Total initial spend (€)', { exact: false }).fill('120000');
  await page.getByLabel('Net hours released per year', { exact: false }).fill('1800');
  await page.getByLabel('Loaded labor cost (€/hour)', { exact: false }).fill('40');
  await page.getByLabel('Hours converted to cash savings (%)', { exact: false }).fill('50');
  await page.getByLabel('Additional operating cost (€/year)', { exact: false }).fill('12000');
  await expect(page.getByTestId('plan-net')).toHaveText('€24,000');
  await page.getByRole('button', { name: 'Prepare pilot brief →' }).click();
  await page.locator('summary').filter({ hasText: 'Read the full decision brief' }).click();
  await expect(page.locator('[data-plan-brief]')).toContainText(robotName);
  await expect(page.locator('[data-plan-brief]')).toContainText(RUNS);

  // Everything survives a reload; the step bar counts the shortlist.
  await page.reload();
  await expect(page.getByTestId('plan-net')).toHaveText('€24,000');
  await expect(page.getByRole('navigation', { name: 'Journey stations' })).toContainText('3 in your shortlist');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-plan-brief]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print decision brief' })).toBeHidden();
  await page.pdf({ path: '.out/journey-brief.pdf', format: 'A4', printBackground: true });
  expect(errors).toEqual([]);
});

test('a machine the visitor already runs for the step keeps the process', async ({ page }) => {
  await page.goto('/use-cases/prefab_timber/fittings-kitting');
  const result = page.getByTestId('check-result');
  await expect(result).toHaveAttribute('data-verdict', 'candidate');
  await page.getByRole('group', { name: 'Does a machine already do this?' }).getByRole('button', { name: 'A dedicated machine does it' }).click();
  await expect(result).toHaveAttribute('data-verdict', 'ruled_out');
  await expect(page.getByTestId('better-answer')).toContainText('keep the existing process');
  await page.getByRole('button', { name: 'Back to typical' }).click();
  await expect(result).toHaveAttribute('data-verdict', 'candidate');
});

test('the landing, the check and the shortlist stay clean on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const noSideScroll = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
