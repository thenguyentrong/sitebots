import { bilingual } from './text';

// The words of the company pages: the list (/brands), one company (/brands/<slug>) with its scorecard
// (components/company/CompanyInsights) and the plain lines lib/market/companies.ts counts from the records.
// Server side only. Numbers arrive formatted in the page's language; `n` is the raw count for the plural.

export const BRANDS_TEXT = bilingual({
  en: {
    // The list.
    title: 'Robot manufacturers',
    description: 'Commercial robot suppliers and companies developing upcoming robots, with official websites, logos and reviewed commercial status.',
    heading: 'Manufacturers',
    lead: 'Companies supplying robots today and building the next generation. Research projects and unverified suppliers are excluded.',
    commercialCount: 'commercial suppliers',
    developingCount: 'in development',
    reviewed: (date: string) => 'Reviewed ' + date,
    suggest: 'Suggest a manufacturer',
    find: 'Find a manufacturer',
    search: 'Search manufacturers',
    searchPlaceholder: 'Company or country',
    status: 'Commercial status',
    allCompanies: 'All companies',
    commercial: 'Commercial suppliers',
    developing: 'In development',
    country: 'Country',
    allCountries: 'All countries',
    filter: 'Filter',
    clear: 'Clear',
    companies: (n: number, count: string) => `${count} compan${n === 1 ? 'y' : 'ies'}`,
    regionNote: 'Supplier status does not guarantee that every model is available in your region.',
    colMaker: 'Manufacturer', colStatus: 'Status', colCountry: 'Country', colRobots: 'Robots', colVerified: 'Verified values',
    noMatch: 'No manufacturers match these filters.',

    // One company.
    pageTitle: (name: string) => `${name}: robots, strengths and reviews`,
    pageDescription: (name: string, n: number, count: string) => `${name}: ${count} robot${n === 1 ? '' : 's'}, where they work, what can be bought in Germany, strengths, weak points and reviews.`,
    breadcrumb: 'Breadcrumb', robots: 'Robots', companiesCrumb: 'Companies',
    noCountry: 'Country not recorded',
    modelsVariants: (models: number, modelCount: string, variants: number, variantCount: string) => `${modelCount} model${models === 1 ? '' : 's'} · ${variantCount} variant${variants === 1 ? '' : 's'}`,
    inGuide: (count: string) => `${count} in our buying guide`,
    verifiedValues: (n: number, count: string) => `${count} value${n === 1 ? '' : 's'} verified`,
    statusSection: 'Commercial status',
    notReviewed: 'Commercial status has not been verified. This record is kept for reference.',
    referenceOnly: 'Reference only · Hidden from the supplier catalogue and robot matcher.',
    officialSource: 'Official source',
    reviewSource: 'Review source',
    catalogueRobots: (name: string) => `All ${name} robots in the catalogue`,

    // The scorecard and the rest of a company page.
    strength: '(strength)', weakPoint: '(weak point)',
    whatTheyDo: 'What the company does',
    orderable: 'Can be ordered in Germany',
    withCart: (count: string) => `${count} with a shop cart`,
    onRequestSeller: 'on request from a seller',
    noRoute: 'no German or EU sales route found',
    priced: 'Published price',
    pricedAll: 'for every robot',
    pricedSome: (count: string) => `${count} on request`,
    pricedNone: 'every robot on request',
    onSale: 'On general sale',
    onSaleAll: 'no prototypes',
    onSaleSome: (count: string) => `${count} prototype, pilot or pre-order`,
    uses: 'Documented uses',
    usesHint: (daily: string, countries: number, countryCount: string) => `${daily} in daily use, ${countryCount} countr${countries === 1 ? 'y' : 'ies'}`,
    usesNone: 'only the maker’s own claims so far',
    reviews: 'Independent reviews and user reports',
    positive: (count: string) => `${count} positive`,
    mixed: (count: string) => `${count} mixed`,
    critical: (count: string) => `${count} critical`,
    readReviews: 'Read them',
    whereTheyWork: 'Where their robots work',
    allUseCases: 'All use cases',
    robotsHeading: 'Robots',
    moreRobots: 'More robots and configurations',
    noPicture: 'No picture published',
  },
  de: {
    title: 'Roboterhersteller',
    description: 'Kommerzielle Roboteranbieter und Unternehmen, die neue Roboter entwickeln, mit offiziellen Websites, Logos und geprüftem Geschäftsstatus.',
    heading: 'Hersteller',
    lead: 'Unternehmen, die heute Roboter liefern und die nächste Generation bauen. Forschungsprojekte und nicht geprüfte Anbieter sind nicht enthalten.',
    commercialCount: 'kommerzielle Anbieter',
    developingCount: 'in Entwicklung',
    reviewed: (date: string) => 'Geprüft am ' + date,
    suggest: 'Hersteller vorschlagen',
    find: 'Hersteller finden',
    search: 'Hersteller suchen',
    searchPlaceholder: 'Unternehmen oder Land',
    status: 'Geschäftsstatus',
    allCompanies: 'Alle Unternehmen',
    commercial: 'Kommerzielle Anbieter',
    developing: 'In Entwicklung',
    country: 'Land',
    allCountries: 'Alle Länder',
    filter: 'Filtern',
    clear: 'Zurücksetzen',
    companies: (_n: number, count: string) => `${count} Unternehmen`,
    regionNote: 'Der Anbieterstatus garantiert nicht, dass jedes Modell in Ihrer Region erhältlich ist.',
    colMaker: 'Hersteller', colStatus: 'Status', colCountry: 'Land', colRobots: 'Roboter', colVerified: 'Bestätigte Werte',
    noMatch: 'Keine Hersteller passen zu diesen Filtern.',

    pageTitle: (name: string) => `${name}: Roboter, Stärken und Bewertungen`,
    pageDescription: (name: string, _n: number, count: string) => `${name}: ${count} Roboter, wo sie arbeiten, was in Deutschland erhältlich ist, Stärken, Schwächen und Bewertungen.`,
    breadcrumb: 'Navigationspfad', robots: 'Roboter', companiesCrumb: 'Unternehmen',
    noCountry: 'Land nicht erfasst',
    modelsVariants: (models: number, modelCount: string, variants: number, variantCount: string) => `${modelCount} ${models === 1 ? 'Modell' : 'Modelle'} · ${variantCount} ${variants === 1 ? 'Variante' : 'Varianten'}`,
    inGuide: (count: string) => `${count} in unserem Kaufratgeber`,
    verifiedValues: (n: number, count: string) => `${count} ${n === 1 ? 'Wert' : 'Werte'} bestätigt`,
    statusSection: 'Geschäftsstatus',
    notReviewed: 'Der Geschäftsstatus ist nicht geprüft. Dieser Eintrag dient nur als Referenz.',
    referenceOnly: 'Nur als Referenz · Nicht im Anbieterkatalog und nicht in der Roboterauswahl.',
    officialSource: 'Offizielle Quelle',
    reviewSource: 'Quelle der Prüfung',
    catalogueRobots: (name: string) => `Alle Roboter von ${name} im Katalog`,

    strength: '(Stärke)', weakPoint: '(Schwäche)',
    whatTheyDo: 'Was das Unternehmen macht',
    orderable: 'In Deutschland bestellbar',
    withCart: (count: string) => `${count} mit Warenkorb`,
    onRequestSeller: 'auf Anfrage beim Händler',
    noRoute: 'kein Vertriebsweg in Deutschland oder der EU gefunden',
    priced: 'Veröffentlichter Preis',
    pricedAll: 'für jeden Roboter',
    pricedSome: (count: string) => `${count} auf Anfrage`,
    pricedNone: 'jeder Roboter auf Anfrage',
    onSale: 'Frei im Verkauf',
    onSaleAll: 'keine Prototypen',
    onSaleSome: (count: string) => `${count} als Prototyp, im Pilotbetrieb oder in Vorbestellung`,
    uses: 'Dokumentierte Einsätze',
    usesHint: (daily: string, countries: number, countryCount: string) => `${daily} im täglichen Einsatz, ${countryCount} ${countries === 1 ? 'Land' : 'Länder'}`,
    usesNone: 'bisher nur Angaben des Herstellers',
    reviews: 'Unabhängige Bewertungen und Erfahrungsberichte',
    positive: (count: string) => `${count} positiv`,
    mixed: (count: string) => `${count} gemischt`,
    critical: (count: string) => `${count} kritisch`,
    readReviews: 'Zu den Bewertungen',
    whereTheyWork: 'Wo ihre Roboter arbeiten',
    allUseCases: 'Alle Einsatzbeispiele',
    robotsHeading: 'Roboter',
    moreRobots: 'Weitere Roboter und Konfigurationen',
    noPicture: 'Kein Bild veröffentlicht',
  },
});

type Count = { n: number; text: string };
const word = (count: Count, one: string, many: string) => count.text + ' ' + (count.n === 1 ? one : many);

/**
 * The plain lines about a company (lib/market/companies.ts), counted from the records. Every number comes as
 * { n, text }: n decides the grammar, text is the number written the page's way. `list` joins names with
 * the language's "and"; the job and country names arrive translated.
 */
export const INSIGHT_TEXT = bilingual({
  en: {
    type: {
      humanoid: ['humanoid', 'humanoids'], quadruped: ['robot dog', 'robot dogs'], mobile_manipulator: ['mobile manipulator', 'mobile manipulators'],
      specialised: ['job-specific construction robot', 'job-specific construction robots'],
    } as Record<string, [string, string]>,
    and: ' and ',
    /** English writes the jobs in lower case inside the sentence. */
    jobWord: (label: string) => label.toLowerCase(),
    doesWhat: (types: string, jobs: string) => 'Makes ' + types + (jobs ? ', for ' + jobs : '') + '.',
    orderable: (sold: Count, total: Count, cart: Count | null, sellers: string, more: boolean) =>
      `${sold.text} of ${word(total, 'robot', 'robots')} can be ordered in Germany${cart ? `, ${cart.text} with a shop cart` : ''}${sellers ? `: ${sellers}${more ? ' and others' : ''}` : ''}.`,
    priced: (priced: Count, total: Count) => `Published price for ${priced.text} of ${word(total, 'robot', 'robots')}.`,
    uses: (uses: Count, daily: Count | null, countries: string, _places: number, more: boolean) =>
      `${word(uses, 'documented use', 'documented uses')} on real projects or demonstrations${daily ? `, ${daily.text} in daily use` : ''}${countries ? `, in ${countries}${more ? ' and more' : ''}` : ''}.`,
    positive: (positive: Count) => `${word(positive, 'positive independent review', 'positive independent reviews')} or user report${positive.n === 1 ? '' : 's'}.`,
    notSold: (notSold: Count, total: Count) => `${notSold.text} of ${total.text} robots have no German or EU sales route we could find.`,
    noPrice: 'No published price: every robot is on request.',
    somePrices: (missing: Count) => `${missing.text} robots without a published price.`,
    noUses: 'No named project or demonstration found yet: only the maker\'s own claims.',
    early: (early: Count, total: Count) => `${early.text} of ${total.text} robots are not yet on general sale (prototype, pilot or pre-order).`,
    critical: (critical: Count) => `${word(critical, 'critical review', 'critical reviews')} or bug report${critical.n === 1 ? '' : 's'} from users.`,
  },
  de: {
    // In the accusative, after "Baut": "Baut 1 mobilen Manipulator", "Baut 2 mobile Manipulatoren".
    type: {
      humanoid: ['Humanoiden', 'Humanoide'], quadruped: ['Roboterhund', 'Roboterhunde'], mobile_manipulator: ['mobilen Manipulator', 'mobile Manipulatoren'],
      specialised: ['Spezialroboter für den Bau', 'Spezialroboter für den Bau'],
    },
    and: ' und ',
    jobWord: (label: string) => label,
    doesWhat: (types: string, jobs: string) => 'Baut ' + types + (jobs ? ' – für ' + jobs : '') + '.',
    orderable: (sold: Count, total: Count, cart: Count | null, sellers: string, more: boolean) =>
      `${sold.text} von ${word(total, 'Roboter', 'Robotern')} ${sold.n === 1 ? 'ist' : 'sind'} in Deutschland bestellbar${cart ? `, ${cart.text} mit Warenkorb` : ''}${sellers ? `: ${sellers}${more ? ' und weitere' : ''}` : ''}.`,
    priced: (priced: Count, total: Count) => `Veröffentlichter Preis für ${priced.text} von ${word(total, 'Roboter', 'Robotern')}.`,
    // After a colon, because some countries take an article in a sentence ("in der Schweiz", "in den USA").
    uses: (uses: Count, daily: Count | null, countries: string, places: number, more: boolean) =>
      `${word(uses, 'dokumentierter Einsatz', 'dokumentierte Einsätze')} auf echten Projekten oder in Vorführungen${daily ? `, ${daily.text} im täglichen Einsatz` : ''}${countries ? `; ${places === 1 && !more ? 'Land' : 'Länder'}: ${countries}${more ? ' und weitere' : ''}` : ''}.`,
    positive: (positive: Count) => `${word(positive, 'positive unabhängige Bewertung', 'positive unabhängige Bewertungen')} oder ${positive.n === 1 ? 'Erfahrungsbericht' : 'Erfahrungsberichte'}.`,
    notSold: (notSold: Count, total: Count) => `Für ${notSold.text} von ${word(total, 'Roboter', 'Robotern')} haben wir keinen Vertriebsweg in Deutschland oder der EU gefunden.`,
    noPrice: 'Kein veröffentlichter Preis: Jeder Roboter ist nur auf Anfrage erhältlich.',
    somePrices: (missing: Count) => `${missing.text} Roboter ohne veröffentlichten Preis.`,
    noUses: 'Noch kein benanntes Projekt und keine Vorführung gefunden: nur die eigenen Angaben des Herstellers.',
    early: (early: Count, total: Count) => `${early.text} von ${word(total, 'Roboter', 'Robotern')} ${early.n === 1 ? 'ist' : 'sind'} noch nicht frei im Verkauf (Prototyp, Pilot oder Vorbestellung).`,
    critical: (critical: Count) => `${word(critical, 'kritische Bewertung', 'kritische Bewertungen')} oder ${critical.n === 1 ? 'Fehlermeldung' : 'Fehlermeldungen'} von Nutzern.`,
  },
});
