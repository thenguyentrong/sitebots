<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# House rules

- npm, never pnpm or bun. No `src/` — `app/`, `lib/`, `components/`, `db/`, `data/`, `scripts/`, `tests/` at the root.
- Plain SQL on Neon through `@neondatabase/serverless`. No ORM. The schema is `db/schema.sql` + `db/views.sql`, idempotent, applied by `npm run db:migrate` and by `lib/db.local.ts` (PGlite) unchanged. Additive changes go at the end of the file.
- Every script that writes to the database gets its handle from `scripts/_guard.ts`. Writes are blocked unless the script was started with `--commit`. Development, preview and production may share one Neon database.
- No Python. App Control on the build machine blocks virtual environments, so scrapers, converters and the screenshot harness are TypeScript run with `node --import tsx`.
- No `pdfjs-dist`. The few manufacturer datasheets that only exist as PDF are read by hand into `data/curated/`.
- Scraping etiquette is not optional: every request goes through `scripts/scrape/_lib/fetch.ts` (declared UA with contact URL, robots.txt, one request per two seconds per host, disk cache, denylist, honeypot guard). Never add a source to `data/sources.json` without a `kind`, `tier` and `attribution_text`.
- Every spec value carries provenance: source URL, tier, observed date, confidence. A field is `verified` only when a manufacturer-domain source agrees. Unknown is unknown — never guess a number to fill a cell.
- Route handlers declare `runtime`, `maxDuration` and `dynamic` explicitly.
- Comments explain why a thing is the way it is, and name the constraint that forced it.
- Render the UI before calling it done: `npm run shot http://localhost:3000/robots/unitree/g1 .out/g1.png`.

- The decision journey reads bilingual YAML under `data/` (tasks, settings, taxonomy, compliance, costs, reference, partners) with provenance on every attribute, like the curated layer. `npm run content -- --check` validates it and recomputes every pinned verdict; run it before committing content. Client names and figures never go in; a git-ignored `.confidential-terms` list feeds the scan.

## Evidence and purchasing workflow

- For technical data, prioritize the exact manufacturer's product page, datasheet, manual or official repository. Comparison sites are discovery leads; they do not verify a value.
- Keep existing third-party claims explicitly Reported until primary evidence replaces them. Do not promote an estimate or a seller's technical claim to manufacturer-verified status.
- Buying information must retain its source and checked date, exact configuration, market and published buyer restrictions. A price alone does not establish commercial availability or German delivery.
- Call a reseller authorized only with reviewed authorization evidence. Use published business contact details, and distinguish directly fetched listings from indexed pages whose live data could not be refreshed.
- Preserve lifecycle corrections in data/robots/status-reviews.json and sales contacts in data/purchasing/contacts.json. See docs/official-sourcing.md.
