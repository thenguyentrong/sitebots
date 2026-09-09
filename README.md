# sitebots

Which robot can work on a construction site. Humanoids, quadrupeds and mobile
manipulators in one database, compared on what a site manager asks first —
payload, reach, stairs, ingress protection, runtime, price by region, delivery
— with the source of every value next to it.

The public humanoid databases copy each other and merge product variants;
manufacturers publish specs as images, gated PDFs or not at all; nobody
publishes an IP rating or an operating temperature for a humanoid. So the
data model is a ledger, not a table: every value is a fact with a source URL,
a tier, an observation date and a confidence, and the pages read a projection
that is rebuilt from the ledger.

```
sources (manufacturer pages, stores, distributors, aggregator DBs)
   │  scripts/scrape/*        one adapter per source, one polite fetch layer
   ▼
raw records ──normalize──▶ facts + prices + availability   (lib/ingest)
   │                          ▲
   │  data/curated/*.yaml ────┘  the construction layer, authored by hand
   ▼
robot_facts / price_observations   ──merge──▶  robot_current / price_current
                                                    │
                                                    ▼
                                            app/ (Next.js on Vercel)
```

| | |
|---|---|
| `app/`, `components/`, `lib/` | Next.js 16 · Neon Postgres, plain SQL · Vercel `fra1` |
| `db/schema.sql`, `db/views.sql` | idempotent; runs unchanged on Neon and on PGlite |
| `scripts/` | scrapers, normaliser, loaders — TypeScript, run with `node --import tsx` |
| `data/` | seed robots, alias tables, source registry, curated construction facts |

## Running it

```
npm install
cp .env.example .env.local        # USE_LOCAL_DB=1 is enough to start
npm run dev
```

With `USE_LOCAL_DB=1` the app boots an in-process Postgres (PGlite — WASM, no
Docker, no server), applies the schema and seeds it from `data/seed/robots.json`,
so a fresh clone shows real robot pages. It is opt-in and refuses to engage
when `NODE_ENV=production`, so a deploy missing `DATABASE_URL` fails loudly
instead of quietly serving a database nobody can update.

Against Neon: set `DATABASE_URL`, then `npm run db:migrate` and
`npm run seed:local -- --commit`.

## Scraping

```
npm run scrape -- --adapter unitree-shop            # fetch + parse, no database
npm run pipeline -- --adapter unitree-shop          # dry run: prints what it would write
npm run pipeline -- --adapter unitree-shop --commit # writes
```

Every request goes through `scripts/scrape/_lib/fetch.ts`: a declared user
agent with a contact URL, robots.txt honoured for that agent, one request per
two seconds per host, an on-disk cache with ETag revalidation, a denylist of
the AI-content farms that cite each other, and a hard-coded guard for the one
honeypot we know of. A 403 stops the adapter and marks the source; it is not
retried.

Writes are blocked unless a script is started with `--commit`. Development,
preview and production may share one Neon database, and a dry run that looks
like a successful write is the failure mode this prevents.

Identity is two files. `data/aliases.yaml` is curated by hand and carries the
variants that matter (G1 base vs EDU, H2 vs H2 Plus); it wins every conflict.
`data/aliases.generated.yaml` is written by `npm run aliases:generate` from
the (maker, model) pairs the aggregators publish, so the catalogue can grow
past what one person types — review it as a diff, correct mistakes in the
curated file, never in the generated one. Resolution is exact alias matching
against the curated file first, then the generated one. Whatever still does
not resolve lands in `.cache/unresolved.jsonl`.

```
npm run scrape -- --adapter all       # records to .cache/records
npm run aliases:generate              # propose entries for the unresolved
npm run pipeline -- --adapter all --commit
npm run report                        # what the projection looks like now
```

## Trust labels

A value is **verified** when a manufacturer-domain source states it,
**assessed** when we curated it from evidence and no manufacturer source
exists, **reported** when only third-party databases carry it, and
**unknown** when nobody publishes it. Unknown is shown, not hidden: for a
construction buyer "IP rating: not published" is the finding.

Prices are never a bare number. Each carries region, evidence tier
(manufacturer store, distributor listing, reported estimate), configuration
and the date it was seen, and goes stale after 90 days. The Unitree store
lists every quote-only product at exactly $100,000; the adapter records that
as "enterprise only", not as a price.

## Running it without Neon

There is no Neon database yet. Development runs on an in-process PGlite under
`.pglite/`, and the deployed site runs the same engine, booted read-only in
memory from `data/snapshot/pglite.tar.gz`. That file is committed on purpose:
the catalogue is the site, and a deploy that seeds eleven robots is not a
deploy. Regenerate it after any `--commit` that should go live:

```
node --import tsx scripts/db-snapshot.ts        # stop next dev first
```

Set `DATABASE_URL` and the snapshot is ignored. PGlite holds its directory
alone: never point a second process at `.pglite/` while `next dev` is
running — copy it and use `LOCAL_DB_DIR` for read-only scripts. The 3D models
live in `public/models/` with `data/models/index.json`; the licence of every
one is under `public/licenses/` and in the viewer's credits panel.

## Tests

```
npm test            # vitest: units, entity resolution, merge
npm run test:e2e    # playwright, against the dev server on PGlite
npm run shot -- http://localhost:3000/robots/unitree/g1 .out/g1.png
```

No Python anywhere in this repository. App Control on the build machine
blocks virtual environments, so the scrapers, the converters and the
screenshot harness are TypeScript.
