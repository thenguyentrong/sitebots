import type { NextConfig } from 'next';

// The decision-journey content is read from disk at request time; every route
// that calls loadContent() must list it here or the deployed function will not
// find the files (a missing entry fails silently on Vercel, not locally).
const CONTENT = [
  './data/tasks/**/*.yaml',
  './data/settings/**/*.yaml',
  './data/taxonomy/**/*.yaml',
  './data/compliance/**/*.yaml',
  './data/costs/**/*.yaml',
  './data/reference/**/*.yaml',
  './data/partners.yaml',
];

const nextConfig: NextConfig = {
  devIndicators: false,
  // The in-app preview connects through the loopback IP.
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    return ['02', 'w1'].map(model => ({ source: `/robots/zerith/${model}`, destination: `/robots/casbot/${model}`, permanent: true }));
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
    '/use-cases{,/**}': CONTENT,
    '/robots{,/**}': ['./data/snapshot/pglite.tar.gz'],
    '/brands{,/**}': ['./data/snapshot/pglite.tar.gz'],
    '/compare': ['./data/snapshot/pglite.tar.gz'],
    '/api/match': ['./data/snapshot/pglite.tar.gz'],
    '/api/plan': ['./data/snapshot/pglite.tar.gz'],
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
