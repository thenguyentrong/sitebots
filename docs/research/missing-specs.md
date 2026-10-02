# Filling missing robot specifications

Many robots on the German market list have no published payload, runtime, IP rating or terrain
statement in their record, and the job map treats an unknown value as no. This is how a research
agent (Codex) or a person fills those gaps without letting a guess into the data.

## Loop, one batch at a time

1. `npm run market:gaps` writes `.cache/research/worklist.csv`: robots a buyer in Germany can get
   or pre-order, in batches of 20, with their official page, the sources the record already has
   and the fields still missing.
2. Research one batch on the web. For each robot, look only for the fields in `missing_fields`.
3. Write `.cache/research/found-batch-N.csv` and `.cache/research/not-found-batch-N.csv`
   (formats below).
4. `npm run market:import-specs -- .cache/research/found-batch-N.csv` checks every row without
   writing: the page must load through `scripts/scrape/_lib/fetch.ts`, contain the quoted words,
   and the quote must contain the value. Fix or drop what fails:
   - `quote not on page`: copy the exact words. Pages that build their text with script fail
     here; find the same statement on a page that has it in its HTML (a seller listing, a
     datasheet page) or move the row to not-found with a note.
   - `value not in quote`: the quote must state the number or code itself.
   - `conflict`: the record already holds a different value. Leave it and say so in the report.
   - `pdf, check by hand`: PDFs are not read here (no pdfjs-dist). List them in
     `.cache/research/pdf-batch-N.csv` with the page number for a person to check.
5. `npm run market:import-specs -- .cache/research/found-batch-N.csv --write`, then
   `npm run market:check`.
6. Never edit `data/market/de/*.json` by hand for these fields, and do not commit or push. Report
   per batch how many values were written and why the rest were not.

## Fields

| field | value | notes |
|---|---|---|
| arm_payload_kg | number | load one arm holds or lifts; `basis`: rated or peak, arm pose if given |
| both_arms_payload_kg | number | load both arms lift together |
| carry_payload_kg | number | load on the body, back or base, not in the hands |
| runtime_h | number (hours) | `basis`: walking, standing, standby, mixed or unstated |
| ip_rating | code, e.g. IP54 | as written |
| stairs | yes / no | yes only if the page says this robot climbs stairs |
| rough_ground | yes / no | yes only if the page says it handles rough, uneven or outdoor terrain |
| outdoor | yes / no | yes only if the page says it works outdoors; no only if it says indoor use only |
| hands_included | yes / no | whether the configuration as sold ships with hands or grippers |

## Rules

1. Only values written on a public page or datasheet. The quote is the exact words, in the page's
   language; an English translation may follow in square brackets.
2. Never estimate, average, read a value off a video, or take it from another version. EDU, Pro,
   Max, Ultra, wheeled (-W) and legged versions are different robots.
3. Maker's site or datasheet first, then an authorised seller in Germany or the EU, then press.
   Databases and aggregators (RobotHub, Robozaps and similar) only when nothing else exists,
   marked `database`; they stay Reported, never Verified.
4. No login, no paywall, no AI summaries without their own source.
5. Not found is a result: list it with the pages checked, so nobody checks them again.

## Files

`found-batch-N.csv`

```
id,field,value,unit,basis,quote,url,publisher,source_kind,checked_at
unitree-h1-2,arm_payload_kg,7,kg,"per arm, rated","Arm normal load / peak: about 21 kg; Rated: about 7 kg",https://www.unitree.com/h1,Unitree,manufacturer,2026-10-03
```

`source_kind` is manufacturer, seller, press or database. A value is only filled where the record
has none; a page already among the record's sources is reused, a new one is added with its title.

`not-found-batch-N.csv`

```
id,field,pages_checked
unitree-h1-2,ip_rating,https://www.unitree.com/h1 https://shop.unitree.com/products/unitree-h1-2
```
