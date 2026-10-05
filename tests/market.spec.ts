import { expect, test } from '@playwright/test';

// The landing job map, the robot choices under it and the Germany robot pages.

test.describe('job map', () => {
  test('shows every job as a dot and opens robots for the one you pick', async ({ page }) => {
    await page.goto('/');
    const count = Number(await page.getByTestId('job-count').textContent());
    expect(count).toBeGreaterThan(200);
    await expect(page.locator('[data-job]')).toHaveCount(count);
    const dot = page.locator('[data-job="facility_operation/plant-room-rounds"]');
    await dot.click();
    await expect(page.getByTestId('selected-job')).toContainText('plant rooms');
    const cards = page.getByTestId('robot-grid').locator('[data-robot]');
    await expect(cards.first()).toBeVisible();
    await expect(page.getByTestId('robot-choices').getByText(/Not sold in Germany/)).toHaveCount(0);
    await expect(page).toHaveURL(/usecase=facility_operation%2Fplant-room-rounds/);
  });

  test('filters jobs by robot type, place and search', async ({ page }) => {
    await page.goto('/');
    const total = Number(await page.getByTestId('job-count').textContent());
    await page.getByRole('combobox').filter({ hasText: 'Everywhere' }).selectOption('site');
    const onSite = Number(await page.getByTestId('job-count').textContent());
    expect(onSite).toBeGreaterThan(0);
    expect(onSite).toBeLessThan(total);
    await page.getByRole('searchbox').fill('drywall');
    await expect(page.locator('[data-job]').first()).toBeVisible();
    expect(Number(await page.getByTestId('job-count').textContent())).toBeLessThan(onSite);
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.getByTestId('job-count')).toHaveText(String(total));
    await page.getByRole('group', { name: 'Filter the jobs' }).getByRole('button', { name: 'Robot dogs' }).click();
    await expect(page).toHaveURL(/robot=quadruped/);
  });

  test('lists jobs and swaps the map axes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Horizontal axis' }).selectOption('robots');
    await expect(page.getByTestId('job-map')).toContainText('Robots you can buy');
    await page.getByRole('button', { name: 'List' }).click();
    await expect(page.getByTestId('job-list').locator('li').first()).toBeVisible();
    await expect(page).toHaveURL(/view=list/);
  });

  test('compares robots and shows where to buy them', async ({ page }) => {
    await page.goto('/?usecase=facility_operation%2Fplant-room-rounds');
    const grid = page.getByTestId('robot-grid');
    const boxes = grid.getByRole('checkbox');
    // The prebuilt page opens on the default job and switches to the one in the address after load;
    // count the robots only once this job's own robots are in.
    await expect(page.getByTestId('selected-job')).toContainText('plant rooms');
    await expect(boxes.first()).toBeVisible();
    test.skip((await boxes.count()) < 2, 'fewer than two robots for this job');
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await expect(page.getByTestId('robot-comparison').locator('thead th')).toHaveCount(3);
    await grid.getByRole('button', { name: /Where to buy/ }).first().click();
    await expect(page.getByTestId('sellers').first()).toBeVisible();
  });
});

test.describe('robots page', () => {
  test('shows only the robots you can buy or order in Germany, by type', async ({ page }) => {
    await page.goto('/robots');
    await expect(page.getByRole('heading', { level: 1, name: 'Robots you can buy in Germany' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Where the robots are sold' }).getByRole('link', { name: 'In Germany' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: /Humanoids/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Not sold in Germany/ })).toHaveCount(0);
    await expect(page.getByText('Not sold in Germany')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Robot type' }).getByRole('link', { name: 'Robot dogs' }).click();
    await expect(page).toHaveURL(/type=quadruped/);
    await expect(page.getByRole('heading', { name: /Humanoids/ })).toHaveCount(0);
  });

  test('finds a robot that is not sold in Germany only worldwide', async ({ page }) => {
    await page.goto('/robots?q=' + encodeURIComponent('1X NEO'));
    await expect(page.getByText(/No robot sold in Germany matches/)).toBeVisible();
    await page.getByRole('link', { name: 'Search all robots worldwide' }).click();
    await expect(page).toHaveURL(/scope=world/);
    await expect(page.getByRole('heading', { level: 1, name: 'All robots worldwide' })).toBeVisible();
    await expect(page.locator('[data-robot]').first()).toContainText('NEO');
  });

  test('searches the German list and switches to every robot worldwide', async ({ page }) => {
    await page.goto('/robots');
    await page.getByRole('searchbox', { name: 'Search robots' }).fill('booster');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/q=booster/);
    await expect(page.locator('[data-robot]').first()).toContainText('Booster');
    await page.getByRole('navigation', { name: 'Where the robots are sold' }).getByRole('link', { name: 'Worldwide' }).click();
    await expect(page).toHaveURL(/scope=world/);
    await expect(page.getByRole('heading', { level: 1, name: 'All robots worldwide' })).toBeVisible();
    await expect(page.getByTestId('catalogue-count')).toContainText('booster');
  });

  test('the old Germany list and its robot pages lead to the one robot page', async ({ page }) => {
    await page.goto('/market?type=quadruped');
    await expect(page).toHaveURL(/[/]robots[?]type=quadruped$/);
    await page.goto('/market/boston-dynamics-spot');
    await expect(page).toHaveURL(/[/]robots[/]boston-dynamics[/]spot#germany$/);
    const germany = page.getByRole('region', { name: 'Buy in Germany', exact: true });
    await expect(germany.locator('.mk-buybox .mk-status').first()).toBeVisible();
    const jobs = page.getByRole('region', { name: /Jobs on the map/ });
    await expect(jobs).toBeVisible();
    await jobs.locator('.mk-job-columns a').first().click();
    await expect(page).toHaveURL(/usecase=/);
    await expect(page.getByTestId('selected-job')).toBeVisible();
  });

  test('a job-specific machine the catalogue does not carry keeps its own page', async ({ page }) => {
    await page.goto('/robots?type=specialised');
    await page.locator('.mk-maker-row').first().click();
    await expect(page).toHaveURL(/[/]market[/][a-z0-9-]+$/);
    await expect(page.locator('.mk-crumbs').getByRole('link', { name: 'Robots' })).toHaveAttribute('href', '/robots');
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  });
});

test.describe('robot cards', () => {
  test('page through the pictures of a robot', async ({ page }) => {
    await page.goto('/robots?type=quadruped');
    const card = page.locator('.mk-tile:not([data-pictures="0"]):not([data-pictures="1"])').first();
    await card.hover();
    await expect(card.locator('[data-tile-count]')).toHaveText(/^1 [/] /);
    await card.getByRole('button', { name: /Next picture/ }).click();
    await expect(card.locator('[data-tile-count]')).toHaveText(/^2 [/] /);
    await card.getByRole('button', { name: /Previous picture/ }).click();
    await expect(card.locator('[data-tile-count]')).toHaveText(/^1 [/] /);
  });

  test('a card opens its 3D model, one card at a time', async ({ page }) => {
    await page.goto('/robots?type=quadruped');
    const cards = page.locator('.mk-tile[data-model="yes"]');
    const first = cards.nth(0);
    const second = cards.nth(1);
    await first.getByRole('button', { name: '3D', exact: true }).click();
    await expect(first.locator('[data-robot-viewer]')).toHaveAttribute('data-ready', 'true', { timeout: 60000 });
    await second.getByRole('button', { name: '3D', exact: true }).click();
    await expect(second.locator('[data-robot-viewer]')).toBeVisible({ timeout: 60000 });
    await expect(first.locator('[data-robot-viewer]')).toHaveCount(0);
    await expect(first.getByRole('button', { name: 'Photos', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('the worldwide view uses the same cards, with the German status', async ({ page }) => {
    await page.goto('/robots?scope=world&q=g1');
    const card = page.locator('.mk-tile').filter({ has: page.getByRole('link', { name: 'Unitree G1', exact: true }) });
    await expect(card.locator('.mk-status')).toHaveText('Buy in Germany');
    await expect(card.getByRole('button', { name: /Compare/ })).toBeVisible();
    await expect(page.locator('[data-cluster]')).toHaveCount(0);
  });
});

test.describe('catalogue robot pages', () => {
  test('a catalogue robot page shows how each version is sold in Germany', async ({ page }) => {
    await page.goto('/robots/unitree/g1');
    const box = page.getByRole('region', { name: 'In Germany', exact: true });
    await expect(box).toBeVisible();
    await box.getByRole('link').first().click();
    await expect(page).toHaveURL(/[/]robots[/]unitree[/]g1#germany$/);
    const germany = page.getByRole('region', { name: 'Buy in Germany', exact: true });
    await expect(germany.locator('.mk-buybox')).not.toHaveCount(0);
    await expect(germany.locator('.mk-buybox-title').first()).toBeVisible();
  });
});

test.describe('the answer on the landing', () => {
  test('says which site jobs robots do today, with the proof and where to buy the robot', async ({ page }) => {
    await page.goto('/');
    const today = page.locator('#today');
    await expect(today.getByRole('heading', { level: 2 })).toHaveText(/Robots are in daily use on \d+ of \d+ construction-site jobs/);
    const rows = today.getByTestId('today-in-use').locator('li');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first().locator('.mk-status')).toHaveText(/Buy in Germany|Order on request/);
    await expect(rows.first().getByRole('link', { name: 'source ↗' })).toHaveAttribute('href', /^https:/);
    await page.getByRole('link', { name: /See what robots do today/ }).click();
    await expect(page).toHaveURL(/#today$/);
  });

  test('colours the map by proof and shows the proof for the chosen job', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('list', { name: 'Colour key' })).toContainText('In daily use');
    expect(await page.locator('[data-job][data-proof="deployment"]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('job-proof')).toBeVisible();
    await expect(page.getByTestId('job-proofs')).toContainText('Where robots have done it');
  });
});
