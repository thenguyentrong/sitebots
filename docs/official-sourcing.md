# Official sources and buying information

Use the manufacturer's exact product page, configuration-specific datasheet, manual, documentation or official product repository to verify technical values. A comparison website is a discovery lead, not proof of a specification or purchase status. Existing third-party claims retain their Reported labels until official evidence replaces them; unknown values remain unknown.

For each buying route, distinguish:

- Manufacturer contact or official store.
- Authorized dealer, only when the manufacturer or another reviewed authorization document confirms the relationship.
- Other seller listing, with authorization left unconfirmed.

A seller can establish its own price, contact details and stated delivery terms. That does not make the seller an authoritative source for the robot's technical specifications. A price estimate, global listing, product announcement or contact form alone does not prove German stock. Record the exact configuration, region, VAT basis, buyer restrictions, source URL and checked date wherever published.

The site now includes a Buying in Germany panel, using directly read German/EU seller listings already in the catalogue and separately reviewed purchase routes. Published email/phone details are held in `data/purchasing/contacts.json`; the data records whether an item was read directly or only checked against an indexed official seller page.

Initial contact coverage includes LimX, Unitree, QUADRUPED Robotics, Génération Robots Deutschland and reichelt. Reichelt's TRON 2 2-in-1 listing is for business, institutional and government buyers; its indexed page states approximately two-week delivery. A direct crawler refresh was refused because robots.txt returned 503, so the site does not import a live Reichelt price or claim current stock. Users get the exact listing and contact page to confirm the quotation.

TRON 2's older Prototype classification was corrected to Shipping (commercially orderable hardware in the current lifecycle vocabulary). The official page links to ordering, and named hardware configurations are offered by retailers. This status does not assert that a particular kit is in stock. The correction and supporting sources are in `data/robots/status-reviews.json`; future imports preserve exact reviewed statuses instead of retaining stale initial hints. `scripts/sync-reviewed-robot-statuses.ts` applies those records through the guarded database handle and adds the manufacturer availability evidence.

Full public-source verification needs no additional access from the project owner. Supplier quotes, dealer-only stock systems and non-public documentation require a supplier response or documents provided by the owner. Never invent contact details, infer authorization from a reseller logo or send an inquiry without user authorization.


### Browser image verification

A successful scraper download is insufficient: decode each newly approved image in the site browser and open every newly illustrated product page. Preserve exact model identity; shared galleries require evidence for each alias.

If a public official image returns valid image bytes through the polite fetcher but redirects normal browser image requests to HTML, `scripts/assets/cache-reviewed-previews.mts --key manufacturer/model --reason "Observed browser redirect failure" --commit` can cache an already approved gallery as bounded-size WebP previews. It preserves original asset URLs and manufacturer page credits in the manifest. It uses the existing robots/access rules and cannot fetch a denied source. Re-import approved previews and regenerate the database snapshot after changing URLs.
