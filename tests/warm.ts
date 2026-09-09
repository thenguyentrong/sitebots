import type { FullConfig } from '@playwright/test';

/**
 * Compile every route once before the suite starts.
 *
 * `next dev` builds a route the first time it is requested. With several
 * workers hitting fresh routes at once, requests queue behind the same
 * compile and time out — the suite ends up measuring Turbopack's cold start
 * and reporting it as the app being broken. Warming serially costs a few
 * seconds once and makes the timings mean something.
 */
const ROUTES = [
  '/',
  '/?payload_kg=12&stairs=required&environment=outdoor',
  '/robots',
  '/robots?form=quadruped',
  '/brands',
  '/robots/unitree/g1',
  '/robots/boston-dynamics/spot',
  '/sitemap.xml',
];

export default async function warm(config: FullConfig) {
  const base = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000';
  for (const route of ROUTES) {
    try {
      await fetch(base + route, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    } catch {
      // The webServer is already up by now; a failure here is not worth
      // blocking the run for.
    }
  }
}
