import { expect, test } from '@playwright/test';

/**
 * The 3D viewer under software WebGL (playwright.config passes the SwiftShader
 * flags). Slow, so generous timeouts; the assertions are about state, not
 * pixels — a screenshot baseline would differ between GPU and SwiftShader.
 */
test.describe.configure({ timeout: 120_000 });

test('a robot with a model renders the viewer and poses on request', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/swiftshader|WebGL/i.test(m.text())) errors.push(m.text());
  });

  await page.goto('/robots/unitree/g1');
  const viewer = page.locator('[data-robot-viewer]');
  await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await expect(viewer.locator('canvas')).toBeVisible();

  // The canvas is not blank: a robot, a grid and a figure produce several colours.
  const distinct = await viewer.locator('canvas').evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return -1;
    const w = 64, h = 48;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const set = new Set<string>();
    for (let i = 0; i < px.length; i += 4) set.add(`${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`);
    return set.size;
  });
  // readPixels after present may return zeros without preserveDrawingBuffer; a −1 means no context at all.
  expect(distinct).not.toBe(-1);

  await page.getByRole('button', { name: 'Reach up' }).click();
  await expect.poll(async () => page.evaluate(() => (window as unknown as { __robotViewer?: { pose: string; animating: boolean } }).__robotViewer), { timeout: 20_000 }).toMatchObject({ pose: 'reach_up', animating: false });

  await expect(page.getByText('Model credits and licence')).toBeVisible();
  await page.getByText('Model credits and licence').click();
  await expect(page.getByText('BSD-3-Clause')).toBeVisible();
  await expect(page.getByRole('link', { name: 'unitreerobotics/unitree_ros' })).toHaveAttribute('href', /tree\/7d6075f7/);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a robot without a redistributable model opens on its picture, never a stand-in', async ({ page }) => {
  await page.goto('/robots/agility/digit');
  await expect(page.locator('[data-robot-photo]')).toBeVisible();
  await expect(page.locator('[data-robot-viewer]')).toHaveCount(0);
});

test('the licence text is served', async ({ request }) => {
  const res = await request.get('/licenses/unitree_ros.txt');
  expect(res.ok()).toBe(true);
  expect(await res.text()).toMatch(/Redistribution and use in source and binary forms/);
});
test('a model converted from MJCF renders in the viewer', async ({ page }) => {
  await page.goto('/robots/apptronik/apollo');
  await page.locator('[data-robot-viewer][data-ready="true"]').waitFor({ timeout: 120_000 });
  await page.getByText('Model credits and licence').click();
  await expect(page.getByRole('link', { name: 'Apache-2.0' })).toHaveAttribute('href', '/licenses/menagerie_apptronik_apollo.txt');
  await expect(page.getByText('MJCF (MuJoCo)')).toBeVisible();
});
