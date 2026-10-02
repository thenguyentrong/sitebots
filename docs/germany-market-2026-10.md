# Robots you can buy in Germany

Working note, 2 October 2026. What changed after the Codex pass of 1 October and why.

## Why

The use-case map from 1 October was the right direction: every job a dot, filters under
the chart, robots per job, then a seller. The robot side was not. Only about 20 reviewed
configurations fed the map, so most jobs showed the same few robots, and those included
Figure 02 and 03, Apptronik Apollo and Agility Digit, none of which a company in Germany
can buy. Booster T2, the UBTECH Walker line and AgiBot G2 were missing.

So the robots now come from a Germany market census, and the map only offers what can be
bought or ordered here.

## The data

`data/market/de/<id>.json`, one file per robot configuration a buyer chooses between
(G1 base vs G1 EDU, Spot vs Spot with Arm). Schema in `lib/market/schema.ts`. Every record
carries:

- Germany status: `buy_now` (a seller lists it for Germany), `quote` (sold here on
  request through the maker, a distributor or an integrator), `preorder`, `not_sold`
  (with the reason). Each with sources.
- Price in euros only where a German or EU seller shows one, net or gross as shown.
  Dollar and yuan list prices stay in their currency.
- Sellers with product page and public business contact.
- Specs with conditions (per arm, peak or rated), capabilities for matching (legs,
  wheels, stairs, outdoor, arms, hands, payload, runtime, IP), an official picture and
  where the robot has worked (claim, demo, pilot, deployment) tagged with use-case ids.

Researched by maker group, then re-checked record by record against the sources:
status, sellers, price, picture URL, height, weight, payload and runtime. The research
brief is `docs/research-loops/de-market/BRIEF.md`.

`data/market/requirements/*.json` says what each of the 224 use cases needs: movement
(one spot, level floors, rough ground, stairs and ladders), hand work (none, pick and
place, two arms, fine finger work, power tool), heaviest object, whether a general robot
is plausible at all, and which job-specific machine type exists for it. These are task
assumptions, written down so they can be argued with.

## Numbers, 2 October 2026

388 records. Humanoids 172 (99 buy or order in Germany, 13 pre-order, 60 not sold), robot dogs 60 (36, 2, 22), mobile manipulators 43 (36, 3, 4), job-specific construction machines 113 (80, 1, 32). 49 German sellers. Researched by 9 maker groups, each re-checked by a second agent (about 250 corrections), a German shop sweep (99 listings) and a gap check that added 63 records. Roboter Deutschland (Robots International, Las Vegas, no named company) is not counted as a seller.

## Matching

`lib/market/match.ts`, pure and tested.

- Evidence for the exact job ranks first (in daily use, pilot, demo, maker says), then
  proof on similar work (same family, same hand work, comparable ground), then a clean
  fit on paper, then robots that need hands or a tool added.
- Stairs, rough ground and outdoor work need a stated capability. Heavy parts, two-arm
  lifts and tool work need a stated payload. Unknown never passes.
- Power-tool work needs finger hands; a gripper is no option.
- Robots you cannot order in Germany never appear as options, and the Germany views (the
  job panel and "In Germany" on `/robots`) leave them out. They are only in the worldwide
  view, where each card carries its German status.
- Job-specific construction machines (layout printers, drilling robots, demolition and
  hydrodemolition, spray robots) show for their job and are grouped by maker, so 17 Brokk
  sizes are one card.

## Pages

- `/` the lineup, then the job map. Axes can be switched between what the job needs,
  how many robots you can buy and the best proof. Filters under the chart: robot type,
  where (site, factory, yard, buildings, lab), conditions, kind of work, search.
- `/robots` one robots page with two views. "In Germany" (the default) lists what can be
  bought or ordered here by type, the first nine per type with a tab for the rest,
  job-specific machines grouped by job and maker; robots that are not sold here are left
  out. "Worldwide" is the full catalogue, prototypes included. Both views use the
  same card (`components/market/RobotTile.tsx`, data from `lib/market/tiles.ts`). A Germany
  record lands on the catalogue configuration with its name (accents, hyphen characters and
  the maker prefix do not count); where the names differ for the same robot ("Kepler K2" is
  the Forerunner K2) `data/market/catalogue-aliases.json` says so, checked by hand. Wheeled,
  EDU or newer siblings are never aliases. Cards: pictures to
  page through, the 3D model where one is published (loaded on demand from `/api/models`, one
  card at a time), price, German status and compare. Maker pages use it too; the old cluster
  matrix is gone. `/market` redirects here.
- One page per robot. Where the catalogue has the robot, its catalogue page opens with the
  pictures, the German versions with price and status, and the key numbers that are
  published (the missing ones in one line). Links below lead to the sections in page
  order: "Buy in Germany" (every version with price, status and sellers, each with its own
  picture when there are several), price and delivery outside Germany (folded when only
  databases report it), the jobs it fits (five per list), where it has worked, the
  specifications (published values, then the unpublished fields named together), the
  evidence profile (folded) and the parts. `/market/<id>` redirects there. Machines the
  catalogue does not carry, mostly job-specific construction machines, keep
  `/market/<id>` as their page.
- Task pages show the robots you can buy for that task on top.

## Refresh

    npm run market:index      # use-case index for research
    npm run market:check      # validate all records
    npm run market:pictures   # download official pictures to public/market
    npm run market:links      # link records to catalogue pages (needs a sitemap dump)

More pictures per record: `scripts/assets/market-gallery.ts collect` renders the maker and seller
product pages and keeps up to twelve large candidates per record in `.cache/gallery`, `sheets`
draws contact sheets, every pick is checked by eye, `apply <approvals.json>` adds the picks to the
records' `images`, then `npm run market:pictures` stores up to eight per record.

## Open

- Prices and stock move; status and prices are dated per record (`checkedAt`).
- Wave-two models from the gap check still need their own verification round.
- A site contact address (`SCRAPER_CONTACT_EMAIL`) turns on the "write to us" line under
  the robot choices.
