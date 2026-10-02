import { isFocusedReview, FOCUSED_FORM_FACTORS } from '../lib/browse-scope';
import { expect, test, type Page } from '@playwright/test';
import type { Project, Workspace } from '../lib/plan/model';
import { reviewSoldInGermany } from '../lib/market/links';
import { loadSolutionReviews } from '../lib/solutions/load';
import { WORKFLOWS } from '../lib/solutions/workflows';
import { STAGE_LABELS } from '../lib/solutions/schema';
import { FORM_FACTOR_LABEL } from '../lib/spec/display';

test.setTimeout(60_000);
const reviews = loadSolutionReviews().filter(isFocusedReview);
// The decide flow only offers configurations whose robot can be bought or ordered in Germany.
const offered = reviews.filter((review) => reviewSoldInGermany(review.id));

async function storedProject(page: Page): Promise<Project | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('sitebots.plan.v2');
    if (!raw) return null;
    const workspace = JSON.parse(raw) as Workspace;
    return workspace.projects.find((project) => project.id === workspace.activeId) ?? null;
  });
}
async function visibleIds(page: Page, attribute: string) {
  return page.locator('[' + attribute + ']').evaluateAll((elements, attr) => elements.map((element) => element.getAttribute(attr)).sort(), attribute);
}
async function noSideScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('reviewed listing retains mobile manipulators alongside robot dogs and excludes mobile transport', async ({ page }) => {
  await page.goto('/solutions');
  await expect(page.locator('[data-review-id]')).toHaveCount(reviews.length);
  for (const review of reviews) await expect(page.locator('[data-review-id="'+review.id+'"]')).toBeVisible();
  for (const form of ['mobile_manipulator'] as const) {
    expect(reviews.some((review) => review.robotClass === form)).toBe(true);
    await page.goto('/solutions?robotClass=' + form);
    // Spot with Arm stays a robot dog in the listing.
    await expect.poll(() => visibleIds(page, 'data-review-id')).toEqual(reviews.filter((review) => review.robotClass === form && review.id !== 'boston-dynamics-spot-arm-inspection').map((review) => review.id).sort());
  }
  await page.goto('/solutions?robotClass=amr_agv');
  await expect(page.locator('[data-review-id]')).toHaveCount(0);
  await page.goto('/solutions?robotClass=dedicated_robot');
  await expect(page.locator('[data-review-id]')).toHaveCount(0);
});

for (const workflow of WORKFLOWS.filter(workflow => offered.some(review => review.workflowId === workflow.id))) {
  test(`${workflow.id}: adapt an unknown task, compare reviewed evidence, estimate cost and preserve the brief`, async ({ page }) => {
    const review = offered.find((record) => record.workflowId === workflow.id);
    expect(review, 'The workflow must have at least one reviewed configuration').toBeDefined();
    if (!review) throw new Error('Missing configuration review for ' + workflow.id);
    const industry = review.industries[0];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // The reviewed configuration is a source-backed custom option. This flow must not
    // depend on a numeric catalogue match or promote it into a suitability approval.
    await page.route('**/api/plan', (route) => route.fulfill({ json: { results: [], considered: 0, blocked: 0, missing: [] } }));
    await page.goto('/workflows/' + workflow.id);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(workflow.title);
    await page.getByRole('link', { name: 'Make this task mine', exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/use-cases/custom\\?workflow=' + workflow.id + '$'));
    await expect(page.getByLabel('Task name', { exact: true })).toHaveValue(workflow.title);
    await expect(page.getByLabel('Kind of work', { exact: true })).toHaveValue(workflow.family);
    await expect(page.getByTestId('opportunity-result').locator('[data-requirement][data-status="missing"]')).toHaveCount(12);
    await page.getByLabel('Industry', { exact: true }).selectOption(industry);
    await page.getByRole('button', { name: 'Add to my shortlist', exact: true }).click();
    await expect(page).toHaveURL(/\/use-cases\/custom\?project=/);
    await expect.poll(async () => (await storedProject(page))?.task).toMatchObject({ kind: 'custom', family: workflow.family, industry: industry, workflowId: workflow.id });
    await page.reload();
    await expect(page.getByLabel('Industry', { exact: true })).toHaveValue(industry);
    await expect(page.getByTestId('opportunity-result').locator('[data-requirement][data-status="missing"]')).toHaveCount(12);
    await page.getByRole('link', { name: 'Go to my shortlist' }).click();
    await page.getByRole('link', { name: 'Solutions and cost', exact: true }).click();
    await expect(page).toHaveURL(/\/plan\/systems$/);
    const related = page.getByRole('region', { name: 'Configurations reviewed for related work', exact: true });
    await expect(related.locator('[data-review-id]')).toHaveCount(offered.filter((record) => record.workflowId === workflow.id && record.industries?.includes(industry)).length);
    if (workflow.id === 'transport') {
      await page.setViewportSize({ width: 390, height: 844 });
      await noSideScroll(page);
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await related.getByRole('button', { name: 'Compare ' + review.name, exact: true }).click();
    await expect(related.getByRole('button', { name: 'Added to comparison', exact: true })).toBeDisabled();
    await expect.poll(async () => (await storedProject(page))?.options[0]).toMatchObject({ solutionReviewId: review.id, href: '/solutions/' + review.id, kind: 'custom', package: review.exactConfiguration });
    const stored = await storedProject(page);
    expect(stored?.gate).toBe('unknown');
    expect(stored?.options[0].robotId).toBeUndefined();
    for (const source of review.sources) expect(stored?.options[0].evidence).toContain(source.url);
    await page.getByRole('button', { name: 'Estimate costs →', exact: true }).click();
    await page.getByLabel('Total initial spend (€)', { exact: false }).fill('120000');
    await page.getByLabel('Net hours released per year', { exact: false }).fill('1800');
    await page.getByLabel('Loaded labor cost (€/hour)', { exact: false }).fill('40');
    await page.getByLabel('Hours converted to cash savings (%)', { exact: false }).fill('50');
    await page.getByLabel('Additional operating cost (€/year)', { exact: false }).fill('12000');
    await page.getByRole('button', { name: 'Prepare pilot brief →', exact: true }).click();
    const answer = page.getByRole('region', { name: 'Your project answer', exact: true });
    await expect(answer).toContainText(review.name);
    await expect(answer).toContainText('€120,000');
    await expect(answer).toContainText('5.0 years');
    await page.locator('summary').filter({ hasText: 'Read the full decision brief' }).click();
    const brief = page.locator('[data-plan-brief]');
    await expect(brief.getByTestId('plan-next-action')).toContainText('Confirm critical requirements');
    await expect(brief.locator('[data-brief-requirement]')).toHaveCount(12);
    await expect(brief.getByRole('link', { name: review.name, exact: true })).toHaveAttribute('href', '/solutions/' + review.id);
    await expect(brief).toContainText(review.exactConfiguration);
    for (const source of review.sources) await expect(brief).toContainText(source.url);
    await page.reload();
    await expect(answer).toContainText('€120,000');
    await page.locator('summary').filter({ hasText: 'Read the full decision brief' }).click();
    await expect(brief.getByRole('link', { name: review.name, exact: true })).toHaveAttribute('href', '/solutions/' + review.id);
    await expect.poll(async () => (await storedProject(page))?.options[0].solutionReviewId).toBe(review.id);
    for (const source of review.sources) await expect(brief).toContainText(source.url);
    expect(errors).toEqual([]);
  });
}

test('review facets preserve workflow, robot class and evidence stage in the URL', async ({ page }) => {
  const review = reviews.find((record) => record.taskEvidence.length > 0);
  expect(review).toBeDefined();
  if (!review) throw new Error('No task evidence reviewed');
  const workflow = WORKFLOWS.find((item) => item.id === review.workflowId)!;
  const stage = review.taskEvidence[0].stage;
  await page.goto('/solutions');
  await expect(page.getByTestId('review-count')).toHaveText(reviews.length + ' configurations');
  await page.getByRole('group', { name: 'Workflow', exact: true }).getByRole('link', { name: workflow.title, exact: true }).click();
  await expect(page).toHaveURL(new RegExp('workflow=' + workflow.id));
  await page.getByRole('group', { name: 'Robot class', exact: true }).getByRole('link', { name: review.robotClass === 'quadruped' ? 'Robot dogs' : FORM_FACTOR_LABEL[review.robotClass], exact: true }).click();
  await expect(page).toHaveURL(new RegExp('robotClass=' + review.robotClass));
  await page.getByRole('group', { name: 'Task evidence', exact: true }).getByRole('link', { name: STAGE_LABELS[stage], exact: true }).click();
  const expected = reviews.filter((record) => record.workflowId === review.workflowId && (record.robotClass === review.robotClass || (review.robotClass === 'quadruped' && record.id === 'boston-dynamics-spot-arm-inspection')) && record.taskEvidence.some((evidence) => evidence.stage === stage)).map((record) => record.id).sort();
  await expect.poll(() => visibleIds(page, 'data-review-id')).toEqual(expected);
  await expect(page).toHaveURL(new RegExp('stage=' + stage));
  await page.reload();
  await expect.poll(() => visibleIds(page, 'data-review-id')).toEqual(expected);
  await page.goto('/solutions?workflow=not-a-real-workflow');
  await expect(page.getByTestId('review-count')).toHaveText('0 configurations');
  await expect(page.getByRole('heading', { name: 'No reviewed configurations for this selection yet' })).toBeVisible();
});

test('review details retain measurement conditions, contacts, conflicts and retrieval limitations', async ({ page }) => {
  const review = reviews.find((record) => record.conflicts.length > 0 && record.buyingRoutes.length > 0) ?? reviews[0];
  expect(review).toBeDefined();
  if (!review) throw new Error('No configuration reviews loaded');
  await page.goto('/solutions/' + review.id);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(review.name);
  await expect(page.getByRole('region', { name: 'Exact configuration and scope', exact: true })).toContainText(review.exactConfiguration);
  const specs = page.getByRole('region', { name: 'Published specifications', exact: true });
  for (const spec of review.specs) {
    const row = specs.locator('[data-spec-key]').filter({ hasText: spec.semanticLabel });
    await expect(row).toContainText(spec.semanticLabel);
    if (spec.value === null) await expect(row).toContainText('Not established');
    for (const condition of spec.conditions) await expect(row).toContainText(condition);
  }
  const routes = page.getByRole('region', { name: 'Buying, integration and support routes', exact: true });
  const contactLinks = await routes.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  for (const route of review.buyingRoutes) {
    await expect(routes).toContainText(route.organization);
    await expect(routes).toContainText(route.deliveryStatus);
    await expect(routes).toContainText(route.authorizationStatus);
    if (route.contact.url) expect(contactLinks).toContain(route.contact.url);
    if (route.contact.email) expect(contactLinks).toContain('mailto:' + route.contact.email);
    if (route.contact.phone) expect(contactLinks).toContain('tel:' + route.contact.phone.replace(/[^+\d]/g, ''));
  }
  for (const conflict of review.conflicts) await expect(page.getByRole('region', { name: 'Conflicts and identity checks', exact: true })).toContainText(conflict);
  for (const unknown of review.unknowns) await expect(page.getByRole('region', { name: 'Still to establish', exact: true })).toContainText(unknown);
  const ledger = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Full source ledger' }) });
  await ledger.locator('summary').click();
  const links = await ledger.getByRole('link').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  for (const source of review.sources) {
    expect(links).toContain(source.url);
    await expect(ledger).toContainText(source.retrievalMode.replaceAll('_', ' '));
    await expect(ledger).toContainText(source.checkedAt);
  }
});

test('new workflow, source review and catalogue class pages fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const review = [...reviews].sort((a, b) => b.exactConfiguration.length - a.exactConfiguration.length)[0];
  expect(review).toBeDefined();
  if (!review) throw new Error('No configuration reviews loaded');
  for (const path of ['/use-cases?industry=manufacturing', '/workflows/inspection', '/solutions', '/solutions/' + review.id, '/robots?form=quadruped&view=list']) {
    await page.goto(path);
    await noSideScroll(page);
    if (path === '/solutions') await page.screenshot({ path: '.out/phase2-solutions-mobile.png', fullPage: true, animations: 'disabled' });
  }
  const filters = page.getByRole('navigation', { name: 'Robot type', exact: true });
  for (const form of FOCUSED_FORM_FACTORS) await expect(filters.getByRole('link', { name: ({ humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators' } as const)[form], exact: true })).toBeVisible();
  await expect(filters.getByRole('link', { name: 'Robot dogs', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: '.out/phase2-catalogue-mobile.png', fullPage: true, animations: 'disabled' });
});
