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

const nextConfig: NextConfig = {
  devIndicators: false,
  // The in-app preview connects through the loopback IP.
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    const models = ['02', 'w1'].map(model => ({ source: `/robots/zerith/${model}`, destination: `/robots/casbot/${model}`, permanent: true }));
    // The site became one chat. Old pages go to it instead of ending in a 404.
    const gone = ['/chat', '/graph', '/steps', '/costs', '/search', '/methodology', '/plan/:path*', '/use-cases/:path*', '/workflows/:path*', '/solutions/:path*']
      .map(source => ({ source, destination: '/', permanent: false }));
    return [...models, ...gone];
  },
  // PGlite loads its WASM and data files with `new URL(...)` checks that fail
  // once Turbopack has bundled it (the bundler's URL is not Node's URL). Keep
  // it external so the local database works under `next dev`.
  serverExternalPackages: ['@electric-sql/pglite', '@react-pdf/renderer'],
  // Only database-backed routes need the prepared catalogue. Runtime scraper
  // caches must never be copied into deployment functions.
  outputFileTracingIncludes: {
    '/market{,/**}': CONTENT,
    '/api/market{,/**}': CONTENT,
    '/robots{,/**}': ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    '/brands{,/**}': ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
    '/compare': ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
    '/api/compare{,/**}': ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
    '/api/models': ['./data/models/index.json', './data/models/poses.json'],
    '/api/chat': ['./data/graph/*.json', './data/costs/*.json', ...CONTENT],
    '/api/report': ['./data/fonts/*.ttf'],
    '/admin/graph': ['./data/graph/*.json'],
    '/sitemap.xml': ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    '/api/admin/refresh': ['./data/aliases*.yaml', './data/specifications/pages.json', './data/sources.json'],
  },
  outputFileTracingExcludes: {
    '/*': ['./.cache/**/*', './.out/**/*', './.pglite/**/*', './.git/**/*', './.env*', './tests/**/*'],
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
    // Each size of each picture is one paid transformation, so fewer sizes and a long life keep them few.
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [128, 256, 384],
  },
  // Every catalogue page boots the database in a function. The catalogue only changes with a deploy, and a
  // deploy empties this cache, so one visitor's page can serve everyone for a week.
  async headers() {
    return ['/robots/:path*', '/brands/:path*', '/market/:path*', '/compare', '/sitemap.xml'].map(source => ({
      source,
      headers: [{ key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=604800' }],
    }));
  },
};

export default nextConfig;
