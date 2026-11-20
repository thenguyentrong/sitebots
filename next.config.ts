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
// The route path of app/[lang], as a picomatch glob.
const LANG = String.raw`/\[lang\]`;

const nextConfig: NextConfig = {
  devIndicators: false,
  // Public pages have their root layout in app/[lang], the admin pages their own, so an address no route
  // answers needs app/global-not-found.tsx for a real 404.
  experimental: { globalNotFound: true },
  // The in-app preview connects through the loopback IP.
  allowedDevOrigins: ['127.0.0.1'],
  async redirects() {
    const models = ['02', 'w1'].map(model => ({ source: `/robots/zerith/${model}`, destination: `/robots/casbot/${model}`, permanent: true }));
    // Spot Arm is an optional payload, not a separate robot (Boston Dynamics, 20 Nov 2026): one page for Spot.
    models.push(...['', '/de'].map(prefix => ({ source: `${prefix}/market/boston-dynamics-spot-arm`, destination: `${prefix}/market/boston-dynamics-spot`, permanent: true })));
    // The site became one chat. Old pages go to it instead of ending in a 404.
    const gone = ['/graph', '/steps', '/costs', '/search', '/methodology', '/plan/:path*', '/workflows/:path*', '/solutions/:path*']
      .map(source => ({ source, destination: '/', permanent: false }));
    // The site lives on sitebots.org since 18 Nov 2026. Old links on the Vercel address follow it, so a
    // sign-in always starts on the one host the Google and Microsoft apps accept. API routes stay
    // reachable on both, for the cron job and anything else that calls the old address.
    const home = { source: '/:path((?!api/).*)', has: [{ type: 'host' as const, value: 'sitebots.vercel.app' }], destination: 'https://sitebots.org/:path', permanent: true };
    // The old per-use-case pages fold into the one use-case page.
    const useCases = { source: '/use-cases/:path+', destination: '/use-cases', permanent: false };
    // The adviser moved from the start page to its own page on 19 Nov 2026.
    const chat = { source: '/chat', destination: '/advisor', permanent: false };
    // The same moves for the German pages under /de (proxy.ts), so old German links land in German.
    const german = [...models, useCases, chat, ...gone].map(rule => ({ ...rule, source: '/de' + rule.source, destination: rule.destination === '/' ? '/de' : '/de' + rule.destination }));
    return [home, ...models, useCases, chat, ...gone, ...german];
  },
  // PGlite loads its WASM and data files with `new URL(...)` checks that fail
  // once Turbopack has bundled it (the bundler's URL is not Node's URL). Keep
  // it external so the local database works under `next dev`.
  serverExternalPackages: ['@electric-sql/pglite', '@react-pdf/renderer'],
  // Only database-backed routes need the prepared catalogue. Runtime scraper
  // caches must never be copied into deployment functions.
  // The keys are route paths, and every public page sits under app/[lang] (one route serves /robots and
  // /de/robots), so they start with LANG: the segment with its brackets escaped, since a bare [lang] is a
  // picomatch character class and would match nothing.
  outputFileTracingIncludes: {
    [`${LANG}/market{,/**}`]: CONTENT,
    [`${LANG}/use-cases`]: CONTENT,
    // The start page reads the use cases, the robots and the cost data.
    [LANG]: ['./data/costs/*.json', ...CONTENT],
    '/api/market{,/**}': CONTENT,
    '/api/reviews': CONTENT,
    [`${LANG}/robots{,/**}`]: ['./data/snapshot/pglite.tar.gz', ...CONTENT],
    [`${LANG}/brands{,/**}`]: ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
    [`${LANG}/compare`]: ['./data/snapshot/pglite.tar.gz', './data/market/**/*.json'],
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
  // deploy empties this cache, so one visitor's page can serve everyone for a week. The cache key is the
  // URL, which is why German has its own (/de/...) and the HTML never depends on a cookie or on
  // Accept-Language: proxy.ts sends a German browser to /de before the cache is asked.
  async headers() {
    const catalogue = ['/', '/robots/:path*', '/brands/:path*', '/market/:path*', '/compare', '/use-cases'];
    const german = catalogue.map(source => source === '/' ? '/de' : '/de' + source);
    return [...catalogue, ...german, '/sitemap.xml'].map(source => ({
      source,
      headers: [{ key: 'Vercel-CDN-Cache-Control', value: 'public, max-age=604800' }],
    }));
  },
};

export default nextConfig;
