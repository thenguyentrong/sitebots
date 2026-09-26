# Sitebots launch audit — 15 September 2026

The fixes below are in the local working tree. They have not been pushed or deployed.

## Existing public deployment

- Website: https://sitebots.vercel.app
- Repository: https://github.com/thenguyentrong/sitebots — production branch `master`.
- Vercel deployment: `dpl_EkmXUcLVQeozYJmRb25GKiDBw6G5`, Ready, commit `6fee9e7`.
- GitHub reports a successful Vercel deployment. No GitHub Actions workflow is configured.
- Sampled public pages and the assessment API returned 200. The API returned 12 candidates. Same-origin image checks on the catalogue, makers and sampled profiles found no failed URLs; this is not a re-verification of every remote manufacturer image.
- The live site's canonical URLs and sitemap incorrectly reference `localhost`. Fixed in the local build.
- A first public catalogue request took 5,857 ms; the next took 441 ms. A first sitemap request took 5,571 ms. These are individual observations, not percentile measurements.

## Changes

- Validate and deduplicate saved comparisons so malformed local storage cannot crash the application.
- Use one shared comparison subscription; retain an in-memory selection when storage is blocked, synchronize tabs, and restore the saved selection when opening `/compare`.
- Preserve the no-picture option and form-factor filter when searching the catalogue.
- Allow removing a saved assessment, with confirmation, so a full 12-job workspace can free a slot. The four-step finder and final-step 3×3 matrix remain intact.
- Show a small still preview before loading interactive 3D. Load the model on request and keep its state when switching to photos. Automated `?render=1` still starts 3D automatically.
- Serve correctly sized local/Blob thumbnails through Next Image, with original-image fallback. Keep manufacturer hotlinks direct: some servers time out through a server-side image proxy.
- Limit a gallery to five nearby thumbnail images, with previous/next navigation through the complete gallery. Keyboard navigation is scoped to the gallery.
- Deduplicate profile/metadata database reads per request.
- Load prepared production snapshots read-only, without schema migration, seeding or rewriting evidence at cold start. Recover from failed initialization on a later attempt. Snapshot deployments reject admin refresh writes.
- Validate refresh options and authenticate before loading scrapers. Use temporary runtime caches on Vercel, exclude local caches from deployment, and scope manufacturer file reads explicitly.
- Provide a retryable page error screen while preserving actual HTTP 404 responses for missing robots.
- Resolve production metadata to the configured public origin, Vercel production domain, or the verified `sitebots.vercel.app` fallback. Never publish a localhost production canonical.

## Measurements and verification

Measurements use local `next build` + `next start`, the same machine and catalogue. They are not live Vercel after-deployment results.

| Check | Before | After |
| --- | ---: | ---: |
| First local catalogue response | 925 ms | 639 ms |
| Warm local catalogue response | 99 ms | 98 ms |
| B2 thumbnail, original versus 128px WebP | 254,706 bytes | 2,432 bytes |
| Admin refresh traced server bundle | 1,898 MB | 46 MB |
| Scraper cache files traced into admin function | 8,743 | 0 |
| G1 model download before interaction | 549 KB + viewer JavaScript | 0 |

The bundle measurements describe local output file tracing; the existing Vercel deployment did not contain the local scraper cache. Removing this trace defect makes deployments reproducible and prevents cache-dependent package inflation.

- Production build and TypeScript: pass, with no bundling warnings.
- Unit tests: 196 passed.
- Browser tests: 64 passed, including the full finder, costs, brief, final matrix, comparison, manufacturers, search, provenance, 404s, model poses/joints/camera, mobile controls, image fallback and damaged/blocked browser storage.
- Desktop profile, mobile profile and finder screenshots inspected during verification.
- Local diagnostic artifacts: `.out/performance-before.json`, `.out/performance-after.json`, `.out/browser-before.json`, `.out/browser-final.json`, `.out/live-before.json`, `.out/live-browser-audit.json` and `.out/launch-*.png`.

## Before rollout

1. Publish the verified changes through the existing GitHub/Vercel project, then recheck public canonicals, sitemap, first catalogue request, images and `/api/plan` on the resulting deployment.
2. Confirm the operator/contact details intended for public display. `lib/site.ts` still has empty operator, postal-address and contact fields; GitHub and Vercel identify the deployment but do not supply these business details.
3. Manufacturer suggestions currently prepare a GitHub issue draft and require the visitor to submit it on GitHub. They are not a hosted submission inbox. Assessments and comparisons are saved in the visitor's browser, not an account or shared team workspace.

For a snapshot deployment, regenerate `data/snapshot/pglite.tar.gz` after catalogue or schema changes. A persistent `DATABASE_URL` is needed for durable online data refreshes. No external source facts, prices or lifecycle statuses were changed by this performance pass.