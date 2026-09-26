# The decision journey

Working note, 24 September 2026. Where the site is going after the launch audit, and
what the first milestone put in place.

## Why

The finder starts at "describe a job" and jumps to robots. That is the wrong first
question. A company exploring humanoids does not need a shortlist first; it needs to
know which of its own work is a candidate at all, under its own conditions, and what
the better answer is where it is not. The research behind the first worked case (a
timber prefab plant) shows the pattern: the heavy, repetitive, valuable work is already
automated by dedicated machines, the dust zones are out, and what survives is the
unglamorous work between the machines. Kitting, fetching, checking, tidying.

So the site becomes six stations, mirroring a consulting kickoff:

| # | Station | Question |
|---|---|---|
| 0 | Context | Where do we start from: setting, conditions, what is already automated, goals |
| 1 | Use cases | Which of our work could be automated, what has been tried elsewhere |
| 2 | Screen | Does this task survive the five tests; if not, what is the better answer |
| 3 | Priorities | Which surviving task first |
| 4 | Systems | Which complete solution, humanoid or not, with what evidence |
| 5 | Implementation | Cost blocks, roadmap, RFI questions, compliance dates, partners, pilot brief |

Stations 3 and 4 already exist (the 3×3 matrix, the catalogue, compare). Stations 0–2
are new and are the first part. Station 5 extends the pilot brief.

The audience is the construction industry as a whole. Wood is the first worked case
because its screen was done; nothing in the taxonomy, the engine or the copy assumes
timber.

## The screen

Five hard tests decide whether a task is a humanoid or mobile-manipulator candidate:

1. Object under 15 kg (the payload ceiling of the 2025/26 generation is 20–25 kg).
2. Dust is controlled: the workroom is not a classified zone.
3. No dedicated machine does this step already.
4. Too variable for a fixed cell.
5. A 1 % failure rate is tolerable: nothing structural, nothing safety-critical.

Five advisory tests attach warnings and compliance flags: reach, outdoor and wet
(hard for the humanoid class, which publishes no usable ingress rating), personal data,
runtime, ATEX. Any hard fail rules the task out and names the better answer (fixed
cobot cell, vacuum lifter, gantry, AMR, the dedicated machine, keep the process, change
the process). Any hard unknown leaves the task unscreened and asks the question.
Unknown never passes. That is a unit test, not a convention.

Facts come from three places with a fixed precedence. The visitor's own answers win.
Object facts (mass, variability, tolerance, safety, reach, data, runtime) travel with a
task record into any setting. Environment and process facts (dust, wet, floor, exposure,
existing automation) come from the visitor's context, and from the record only when
the record was written for the visitor's own sub-setting. That guard is what keeps a
timber record honest for a precast or site visitor.

Every rule is a plain object in `lib/screen/rules.ts`, so the methodology page can
render it and a test can drive it through pass, marginal, fail and unknown. Thresholds
carry their basis in `lib/screen/thresholds.ts`; change one, bump the version, and the
content check recomputes every pinned verdict.

## The content

Everything the journey reads lives in `data/` as bilingual YAML with provenance on
every attribute, the same discipline as the curated robot layer:

```
data/tasks/<setting>/<task>.yaml     one record per task and setting, verdict pinned
data/settings/<setting>.yaml         24 sub-settings in four groups, 1 screened, 23 scaffold
data/taxonomy/                       families, trades, machine classes, solution classes
data/compliance/<id>.yaml            regulations, standards, guidelines, with dates and sources
data/costs/blocks.yaml               cost blocks A–D, scenario presets, rules of thumb
data/reference/                      roadmap, RFI criteria, pilot metrics, humanoid limits
data/partners.yaml                   who to talk to, only what the source page states
```

A task record carries thirteen attributes, each a value (or null for a documented
gap), a confidence, a note that says where the value comes from, and an evidence URL
wherever there is one. `confirmed` needs the URL. Variability is always marked as an
analyst judgement. A candidate needs at least one evidence entry; a ruled-out task
names its better answer. The verdict is authored and pinned, and
`npm run content -- --check` recomputes it with the engine: the two must agree.

The first 21 records cover the timber plant: four candidates (fittings kitting,
intralogistics between stations, inspection and documentation, replenishment and
housekeeping), three marginal (machine tending, insulation batts, packaging at stable
volumes), fourteen ruled out with the number behind each exclusion (elements, beams,
boards, windows, facade, truck loading, and every step a joinery centre, bridge, saw,
stud robot, turning table or gluing cell already owns, plus anything in the dust zone).

The other 23 settings ship as scaffold: a coverage note, typical machines, dust and
floor profile, process steps. Their task records follow in seeding rounds, site trades
first.

Engagement figures (the 4–5 € of surroundings per euro of robot, the personnel line,
the abort threshold) appear only as "Sitebots assessment from one industry engagement,
2025/26", tier 0, confidence assumed, and are never prefilled into a visitor's numbers.
Client names and figures never appear. A git-ignored `.confidential-terms` file feeds
`scripts/check-confidential.ts`; without the file the scan is empty and says so.

Fact-checks that changed the content against the engagement notes: the AI Act
high-risk dates are being amended (stored as pending, with both dates to watch); the
customs rate is not published as a number, only the tariff heading; KMUmanoid is a
Fraunhofer IPA project, not Mittelstand-Digital, and the source does not say a first
call is free; ISO 25785-1 is a committee draft and its dust exclusion is not cited;
wood dust cites TRGS 553 and DGUV 209-044, mineral dust TRGS 559; § 26 BDSG is cited
together with Article 88 GDPR and the ruling that limited it.

## What the stations look like now

Same day, second and third milestone. The workspace is version two: one company
context per browser, one project per task, up to twelve. An old finder draft is carried
over into a custom task on first load; the old key stays untouched so an older build
still finds it (`lib/plan/migrate.ts`). The old finder pages are gone; `/plan` is the
overview and each station is its own route:

| Route | What it does |
|---|---|
| `/` | Construction-wide landing: the question, the six stations, the four limits, resume card |
| `/plan/context` | Station 0: setting group and sub-setting, conditions, people and data, goals and timing |
| `/use-cases` | Station 1, public: the library with setting, family and verdict filters; add a task to the plan |
| `/use-cases/<setting>/<task>` | One record in full: tests, attributes with provenance, evidence, pilot |
| `/plan/screen` | Station 2: every task screened with the visitor's context; open inputs asked inline; a form for a task the library lacks |
| `/plan/priorities` | Station 3: the existing matrix over the tasks that survived |
| `/plan/systems` | Station 4: the existing shortlist, entered from the verdict |
| `/plan/implementation` | Station 5, first cut: the existing business case and brief |

A record added to the plan keeps a snapshot of its facts and reference verdict. When the
visitor's sub-setting is not the record's, its dust, floor and automation facts do not
travel; the screen asks instead. A custom task is the visitor's own answers throughout.
The matcher now receives what the screen knows: payload from the record, dust from the
context, floor as terrain, exposure.

Nothing in the journey is a dropdown any more. Every question is a row of chips with
"not sure" as a chip of its own; the settings are tiles; the ten tests are a strip of
tiles per task, the hard five large and the advisory five small, reason on hover and the
non-passes listed underneath. Library and screen share one map, mass on a log axis
against variability, with the 15 kg line and the 20–25 kg band drawn in. The landing
shows the four limits as figures, not sentences.

Same evening, a read-through as someone who has never seen the site: the stations are
numbered 1 to 6 and called steps, the screening is called screening, a task is added "to
my plan", the rail says "3 in your plan" instead of a bare count, and nothing on the site
says scaffold or sub-setting any more. The rail lost its number column. `<html>` carries
`data-scroll-behavior="smooth"` because the router did not scroll to the top on
navigation while the stylesheet asks for smooth scrolling. Later that night the sticky bits went:
the "continue" bar floated over the content and the rail was pinned, which on a 1874 px window
read as three layers of chrome; both are in the normal flow now, the page column sits on the
header grid (1152 px), the map is centred in its card and the Next dev button is hidden in dev.

That was not enough. The stylesheets had grown to some 25 font sizes and as many paddings,
the side rail drew a line that stopped halfway down the page, and every chip that was a
checkbox came out at 10 px. The journey pages are now rebuilt on one system: the six steps
as a row under the header, one question per row (label and hint on the left, the answer on
the right, a line between rows), spacing only 4/8/12/16/24/32/48/64 px, type only
12/14/16/18/24/40 px, one chip size, no coloured side borders, no truncated text, and the
header is no longer sticky either. The library opens with one row per work area instead of
a wall of cards from one setting.

On 25.09 the construction-site group was rebuilt around the Leistungsverzeichnis. The old
sub-settings (structural works, TGA installation, interior finishing and so on) are gone;
each site setting is now one trade, an STLB-Bau Leistungsbereich (list as of April 2024)
with the VOB/C ATV that governs it, grouped into seven sections in LV order. Every site
task names its LV position and unit, and every task can carry a requirement profile
(object size, tolerance, force) next to the screen inputs, each value with its source.
The rules are in `docs/task-criteria.md` and on `/use-cases/criteria`. The number next to
a trade is the number of screened tasks and now says so.

On 25.09 the six stations became three steps: Find (the library), Check (a task page) and
Decide (the shortlist under `/plan`, then priorities, solutions and cost). The company
questionnaire is gone. A library task is checked against its own record, which stands for a
typical site of its trade, and the visitor changes only what differs on their site: an
existing machine, dust, indoor or outdoor, wet. Tasks the library does not hold are checked
on `/use-cases/custom` with nothing assumed. `/plan/context` and `/plan/screen` redirect.
A machine the visitor says they already run now makes keeping the process the better
answer, not buying the dedicated machine, and the matcher receives the same facts the check
reads.

On 26.09 the pages got a visual pass. Small labels are in sentence case and only where they
add something, the step heads lose the "Step 1 of 3" line the step bar already shows, the
task page keeps one box (the check) and reads as open sections below it, the check shows
the five hard tests as tiles and lists the rest only when it matters, and icons are grey
so the orange keeps its meaning. The landing opens on a render of five catalogue robots at
true scale next to a 1.80 m site worker (`public/branding/lineup-at-scale.<hash>.png`, made from the
dev-only `/render/lineup` page), followed by the four limits, the five tests, the library
and the three steps. The 3D models were rebuilt with about four times the triangles (a
detail factor in `scripts/models/build-glb.ts`, capped near 3 MB a model; 83 MB for all 35
instead of 26 MB), and the viewer got studio lighting, a contact shadow and a stage that
follows the page theme.

## What is next

- Stations 3 and 4 wired further: CE and the needed-by date to the matcher, solution
  classes next to catalogue robots, "quote only" and "unobtainable for Germany" badges,
  the task context on robot pages and in compare.
- Station 5: cost blocks, roadmap, RFI checklist, compliance calendar, partners, export.
- German UI (cookie switch first, `/de` URLs once the library must be indexable).
- Seeding rounds: site structural, TGA installation, interior finishing, then the factory
  siblings, then yards and operations.
