import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Next loads .env.local for the dev server, but not for this process. Specs
// that call into `lib/` directly — rather than through the browser — need the
// same environment the app would have. Never overwrite a real one.
try {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
} catch {
  // No .env.local: browser-driven specs still run, against PGlite.
}

const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  // Compiles every route once before the workers start; see tests/warm.ts.
  globalSetup: './tests/warm.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: { timeout: 10_000 },
  workers: 2,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // Headless Chromium has no GPU. The 3D viewer needs the software WebGL
    // path, which is opt-in.
    launchOptions: {
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { USE_LOCAL_DB: process.env.DATABASE_URL ? '' : '1' },
  },
});
