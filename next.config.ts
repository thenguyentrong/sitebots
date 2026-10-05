import type { NextConfig } from 'next';

// The decision-journey content is read from disk at request time; every route
// that calls loadContent() must list it here or the deployed function will not
// find the files (a missing entry fails silently on Vercel, not locally).
const CONTENT = [
  './data/tasks/**/*.yaml',
  './data/solutions/*.json',
  './data/discovery-links/*.json',
  './data/discovery-opportunities/*.json',
  './data/market/**/*.json',
  './data/workflows/**/*.json',
  './data/settings/**/*.yaml',
  './data/taxonomy/**/*.yaml',
  './data/compliance/**/*.yaml',
  './data/costs/**/*.yaml',
  './data/reference/**/*.yaml',
  './data/partners.yaml',
];

/** The specification search's own parameters (lib/match/requirements.ts) plus `details`. */
const SEARCH_PARAMS = ['details', 'tasks', 'payload_kg', 'reach_height_m', 'terrain', 'stairs', 'slope_deg', 'environment', 'dust', 'wet', 'temp_min_c', 'temp_max_c', 'runtime_h_per_shift', 'hot_swap_acceptable', 'budget_eur', 'region', 'needed_by', 'form_factor', 'autonomy', 'certifications_required', 'noise_limit_db', 'strict_unknowns'];

const nextConfig: NextConfig = {
  devIndicators: false,
  // The in-app preview connects through the loopback IP.
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    const models = ['02', 'w1'].map(model => ({ source: `/robots/zerith/${model}`, destination: `/robots/casbot/${model}`, permanent: true }));
    // The specification search moved from the landing to /search so the landing can be built ahead
    // of time. Old links carry one of its parameters; the query string is passed on unchanged.
    const search = SEARCH_PARAMS.map(key => ({ source: '/', has: [{ type: 'query' as const, key }], destination: '/search', permanent: false }));
    return [...models, ...search];
  },
  // PGlite loads its WASM and data files with `new URL(...)` checks that fail
  // once Turbopack has bundled it (the bundler's URL is not Node's URL). Keep
  // it external so the local database works under `next dev`.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Only database-backed routes need the prepared catalogue. Runtime scraper
  // caches must never be copied into deployment functions.
  outputFileTracingIncludes: {
    '/': CONTENT,
    '/plan{,/**}': CONTENT,
    '/market{,/**}': CONTENT,
    '/api/market{,/**}': CONTENT,
    '/solutions{,/**}': ['./data/solutions/*.json'],
    '/workflows{,/**}': ['./data/solutions/*.json'],
    '/use-cases{,/**}': CONTENT,
    '/robots{,/**}': ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    '/brands{,/**}': ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
    '/steps': CONTENT,
    '/costs': ['./data/costs/*.json'],
    '/compare': ['./data/snapshot/pglite.tar.gz'],
    '/search': ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    '/api/match': ['./data/snapshot/pglite.tar.gz'],
    '/api/plan': ['./data/snapshot/pglite.tar.gz'],
    '/api/models': ['./data/models/index.json', './data/models/poses.json'],
    '/sitemap.xml': ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    '/api/admin/refresh': ['./data/aliases*.yaml', './data/specifications/pages.json', './data/sources.json'],
  },
  outputFileTracingExcludes: {
    '/*': ['./.cache/**/*', './.out/**/*', './.pglite/**/*', './.git/**/*', './.env*', './tests/**/*'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default nextConfig;
