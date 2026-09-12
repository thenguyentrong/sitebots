import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });
async function viewer(page: Page, url = '/robots/deep-robotics/lite3') {
  await page.addInitScript(() => localStorage.setItem('sitebots.scale', '0'));
  await page.goto(url);
  const view = page.locator('[data-robot-viewer]');
  await expect(view).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
  await expect(view.locator('canvas')).toHaveAttribute('data-camera-ready', 'true');
  return view;
}

test('camera zoom, pan, rotation, reset and expand work through the UI', async ({ page }) => {
  const view = await viewer(page);
  const canvas = view.locator('canvas');
  const camera = async () => JSON.parse((await canvas.getAttribute('data-camera'))!);
  const home = await camera();
  await view.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(async () => (await camera()).distance).toBeLessThan(home.distance * 0.9);
  await view.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect.poll(async () => (await camera()).distance).toBeGreaterThan(home.distance * 0.95);
  await view.getByRole('button', { name: 'Pan', exact: true }).click();
  const bounds = (await canvas.boundingBox())!;
  const start = { x: bounds.x + bounds.width * 0.4, y: bounds.y + bounds.height * 0.5 };
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 70, start.y + 30, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await camera()).target).not.toEqual(home.target);
  await view.getByRole('button', { name: 'Rotate', exact: true }).click();
  const beforeRotate = await camera();
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x - 60, start.y, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await camera()).position).not.toEqual(beforeRotate.position);
  await view.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect.poll(async () => Math.abs((await camera()).distance - home.distance)).toBeLessThan(0.01);
  for (const name of ['Front', 'Side', 'Top']) {
    await view.getByRole('button', { name, exact: true }).click();
    await expect.poll(async () => (await camera()).position.every(Number.isFinite)).toBe(true);
  }
  await view.getByRole('button', { name: 'Expand 3D view', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Close expanded view' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(view.getByRole('button', { name: 'Expand 3D view' })).toBeVisible();
});

test('joint slider changes the model, survives scale and photo toggles, and resets', async ({ page }) => {
  const view = await viewer(page, '/robots/unitree/g1');
  await view.getByText('Joint controls', { exact: false }).click();
  await view.getByRole('combobox', { name: 'Joint', exact: true }).selectOption('left_elbow_joint');
  const slider = view.getByRole('slider', { name: 'left elbow position' });
  const original = JSON.parse((await view.getAttribute('data-joint-values'))!);
  await slider.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(view).toHaveAttribute('data-pose', 'custom');
  await expect(view).toHaveAttribute('data-animating', 'false');
  const edited = JSON.parse((await view.getAttribute('data-joint-values'))!);
  expect(edited.left_elbow_joint).toBeGreaterThan(original.left_elbow_joint);
  await view.getByRole('checkbox', { name: 'Show 1.80 m person' }).check();
  await expect(view).toHaveAttribute('data-pose', 'custom');
  await page.getByRole('tab', { name: /^Photos/ }).click();
  await page.getByRole('tab', { name: '3D model' }).click();
  expect(JSON.parse((await view.getAttribute('data-joint-values'))!).left_elbow_joint).toBe(edited.left_elbow_joint);
  await view.getByRole('button', { name: 'Reset all joints' }).click();
  await expect(view).toHaveAttribute('data-pose', 'standing');
  await expect(view).toHaveAttribute('data-animating', 'false');
  expect(JSON.parse((await view.getAttribute('data-joint-values'))!).left_elbow_joint).toBe(original.left_elbow_joint);
});

test('a failed model can be retried without losing the robot page', async ({ page }) => {
  let fail = true;
  await page.route(/\.glb(?:\?.*)?$/, (route) => fail ? route.abort() : route.continue());
  await page.goto('/robots/deep-robotics/lite3');
  const retry = page.getByRole('button', { name: 'Retry 3D model' });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('heading', { name: /Lite3/ }).first()).toBeVisible();
  fail = false;
  await retry.click();
  await expect(page.locator('[data-robot-viewer]')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
});

test('mobile viewer fits the viewport and exposes touch-friendly controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const view = await viewer(page);
  await expect(view.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await view.getByRole('button', { name: 'Pan', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Pan', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await view.screenshot({ path: '.out/model-audit/mobile.png' });
});
