# Official gallery review — 12 September 2026

Scanned all 560 base robot models (572 database records including variants). Added 676 distinct, visually reviewed official images across 111 robot records. The approved manifest now contains 987 images in 151 galleries; 32 robots gained their first official gallery.

NEO increased from 1 to 38 photos. Its new pictures come from the official product, order, announcement, factory and company pages. Beta, Gamma and EVE photos were excluded from NEO. Examples after this update: LimX Luna 20 photos, Boston Dynamics Spot 36, Gento Luna 19, and EngineAI PM01 21 official/repository photos plus its existing render.

Reviewed 2,094 new candidate images from public manufacturers. Of 701 approved candidates, 22 were duplicates and three remained unavailable in the browser. The three unavailable images (LG CLOiD, UBTech Walker C and Walker S) were excluded. Official product photos, renders, useful detail views and video posters were retained; wrong models, stock images and near-identical crops or animation frames were excluded.

Every new image has its own official source page, maker-preview attribution and measured dimensions in [previews.json](../data/assets/previews.json). Existing licensed repository images keep their original licence. Images remain hotlinked to their official hosts; those hosts can change or remove them. The importer preserves unrelated locally rendered thumbnails even when they share a licence with repository photos.

The [record-level audit](../data/assets/gallery-audit-2026-09-12.json) records every base model, checked pages, discovery status, candidates and gallery additions. A scan does not guarantee a usable public image exists. Unavailable or unverified images stay absent. Photo availability does not imply a downloadable 3D model or a robot that can be bought or trained.

## Verification

- All 676 new URLs decoded in the browser before import.
- Database checks matched every added URL, source page, licence and dimensions; 572 robots, 5,012 facts and 823 prices were preserved.
- NEO gallery navigation, wraparound, photo source links and image loading passed at 1440px and 390px. LimX Luna, Spot, Gento Luna and PM01 navigation passed.
- Corrected the 127.0.0.1 development origin so the in-app preview hydrates and its controls work.
- Manufacturer logos now use explicit contained dimensions inside fixed frames. All 117 local logos were visually reviewed together; tall and square marks no longer overflow their frames.
- TypeScript, 142 unit tests and the production build passed. Five focused gallery/manufacturer browser tests passed. The required G1 screenshot was rendered and visually checked; all 117 manufacturer logos decoded and passed browser bounds checks.

## Deferred at the user's request

The manufacturer map and missing-company submission form were requested, then work was stopped for the day. Neither feature is included in this checkpoint. Country-map research is saved locally in .out/manufacturer-map-countries.json for the next session. The map should use country locations, clearly distinguished from company addresses, and preserve catalogue filters. Submissions need a review queue and durable storage; the deployed catalogue currently boots an in-memory snapshot when no DATABASE_URL is configured, so it must not report submissions saved to that ephemeral database.
