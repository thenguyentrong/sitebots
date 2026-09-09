import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite loads its WASM and data files with `new URL(...)` checks that fail
  // once Turbopack has bundled it (the bundler's URL is not Node's URL). Keep
  // it external so the local database works under `next dev`.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Files the server reads with fs at request time. Vercel only ships what the
  // tracer sees imported, so name them: the database snapshot, the model index
  // and poses, the curated YAML applied at boot, the seed and the source list.
  outputFileTracingIncludes: {
    '/**/*': ['./data/snapshot/**', './data/models/*.json', './data/curated/**', './data/seed/**', './data/sources.json', './data/aliases*.yaml', './db/*.sql'],
  },
  images: {
    // Assets are copied into our own Blob store with the licence recorded, so
    // this is the only host the image optimiser ever has to trust.
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default nextConfig;
