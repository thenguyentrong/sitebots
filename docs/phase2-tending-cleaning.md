# Machine-tending and floor-cleaning evidence review

Checked 1 October 2026 (Europe/Berlin). The [registry](../data/solutions/research-tending-cleaning.json) contains **10 reviewed configurations, all with unresolved gaps**. A reviewed record is not an approval of a robot for a particular workplace, a stock check or an independently measured performance result.

## Exact configurations and evidence

| Configuration | Reviewed task evidence | Main unresolved point |
| --- | --- | --- |
| UR5e, 5 kg / 850 mm | Manufacturer reports Schaeffler routine assembly feeding with ActiNav | The complete vision/tooling system is essential; this does not establish every CNC application. |
| UR10e, 12.5 kg / 1300 mm | Manufacturer reports Endutec CNC tending | The deployed UR10e payload generation is unspecified. |
| UR20 / UR20-1750 | Manufacturer machine-tending application claim | Exact tending deployment evidence and conditional 25 kg envelope remain open. |
| UR30 / UR30-1300 | Manufacturer machine-tending application claim | Exact tending deployment evidence and conditional 35 kg envelope remain open. |
| FANUC CRX-10iA, 1249 mm | Famar vertical-lathe integration demonstration | No end-user production window or recovery denominator; /L evidence is not interchangeable. |
| ABB GoFa 5 / CRB 15000-5/0.95 | Exact-model application claim; German GoFa-family customer story | The METEC case does not identify its payload variant. |
| Kärcher KIRA B 50, 1.533-002.0 | Manufacturer reports DEUTZ routine operation in Germany | Route-completion claims omit route counts and observation windows. |
| Tennant X4 ROVR | Manufacturer reports Frankfurt Airport operation | Fleet totals combine X4 ROVR and T16AMR and cannot establish X4-only output. |
| Nilfisk Liberty SC50, 56104508 | Manufacturer reports school operation | Case SKU equivalence is unconfirmed; exact German width and tank figures remain unknown. |
| Pudu CC1 standard | University describes a German care-setting pilot/evaluation | Published results do not quantify cleaning quality, reliability or operator effort. |

Each task entry identifies its configuration, operating mode, source and limitations. The evidence stage describes what the reviewed source establishes. A manufacturer customer story remains a reported result, even when it describes routine operation. No unreported success rate, cycle time or autonomy duration has been inferred.

## Corrections preserved in the data

- Older UR5e/UR10e identities are kept separate from the [current naming and generation scheme](https://www.universal-robots.com/de/einblicke/faq/). Payload upgrades and revised reach conventions are not silently backfilled.
- UR20 and UR30 baseline payloads remain separate from conditional higher payloads. The UR20 [datasheet](https://www.universal-robots.com/manuals/EN/TechSheets/UR20_techsheet_pdf_online/UR20_techsheet_en.pdf) and [product page](https://www.universal-robots.com/products/ur20-1750/) disagree on pose repeatability; the registry records the discrepancy rather than selecting an unsupported precise value.
- The requested “GoFa 6” was replaced by the confirmed [GoFa 5](https://www.abb.com/global/en/areas/robotics/products/robots/collaborative-robots/gofa). Six axes and payload are different attributes. Wrist reach and flange reach also remain distinct.
- X4 ROVR's estimated area per solution tank is retained as **m² per tank**, not m²/h. Its [German brochure](https://www.tennantco.com/content/dam/tennant/tennantco/products/machines/scrubber%20walk-behinds/x4-rovr/x4-rovr-brochure-de-de.pdf) and current product page also disagree on machine length.
- The current [Pudu manufacturer page](https://www.pudurobotics.com/de/products/puduCC1) and [German seller listing](https://www.energiereich-consulting.com/wisch-saugroboter-pudu-cc1/) disagree on waste-water tank capacity and charging time. Mode-specific battery duration is preserved.
- Nilfisk's German product body supports an up-to runtime claim but did not expose exact-SKU cleaning-head width or tank capacities. Those values remain null instead of being copied from another SC50 configuration.

## German buying and support routes

All ten records include a public German manufacturer, seller or support route with its checked date. These are enquiry routes, not confirmation of stock, orderability, delivery lead time, authorized-partner status or complete installed price.

Direct German seller/integrator cross-checks cover [ETU in Schopfheim](https://etu-robotik.com/cobots.php) for the listed UR models, [Kärcher Center Benne in Berlin](https://kaercher-center-benne.de/autonome-scheuersaugmaschine/) and [EnergieReich Consulting in Mainz](https://www.energiereich-consulting.com/wisch-saugroboter-pudu-cc1/). Seller claims do not promote technical values to manufacturer-supported status. Manufacturer authorization was not independently established for these sellers. Public manufacturer sales and service contacts cover UR, FANUC, ABB, Kärcher, Tennant and Nilfisk. No emails, enquiries or other external messages were sent.

## Retrieval and scope limits

Sources were read as actual page/PDF bodies through web browsing or the repository's approved fetch wrapper. Registry source entries distinguish retrieval mode, publisher, kind, date and URL. The Kärcher technical PDF is hosted on its product-information CDN and linked from the official product page; its publisher is Kärcher.

The automated fetch pass used `scripts/scrape/_lib/fetch.ts` with robots checks, declared identification, rate limits and cache. Five permitted responses were cached: Nilfisk's exact product and German contact pages, ETU, Kärcher Center Benne and EnergieReich. The Pudu automated attempt stopped when robots.txt was unavailable. It was not bypassed; the manufacturer body had separately been readable through web browsing. The local ignored audit is `.out/tending-cleaning-fetch-audit.json`; UTC fetch times late on 30 September correspond to 1 October in Berlin.

This pass did not validate every catalogue robot. It did not inspect physical hardware, obtain quotations, verify seller authorization, establish current stock or run a site trial. The remaining work for each candidate is a configuration-matched quotation and representative application evaluation, including successful/failed cycles or cleaning runs, observation duration, human interventions, recovery effort and output quality.

