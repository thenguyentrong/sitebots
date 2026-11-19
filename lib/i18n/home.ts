import { formatNumber } from './format';
import { bilingual } from './text';

// The start page's own words. The figures, series and film labels live with their data in
// data/industry/germany.json and data/media/videos.json (a `de` block next to the English).

export const HOME_TEXT = bilingual({
  en: {
    heroKicker: 'Robots for German building sites',
    heroLine1: 'The site needs more hands.',
    heroLine2: 'See what robots already do.',
    heroLead: 'Checked figures on the German building trade, real footage and records of robots at work, and the robots you can order in Germany today. Every number links to where it was read.',
    ctaUses: 'See where robots work',
    ctaBuy: 'Robots you can buy',
    statJobs: 'Documented robot jobs',
    statCountries: 'Countries',
    statOrderable: 'Robots to order in Germany',
    heroCredit: 'Footage: building site from above, Pexels.',
    strip: 'Robots at work',

    gapKicker: 'The labour gap',
    gapTitle: 'Fewer hands, the same work',
    gapLead: 'The workforce peaked in 2023 and is shrinking, more people retire than start, and output per worker has fallen since 2010.',
    workforceTitle: 'People working in German construction',
    workforceUnit: 'thousands, 2016–2025',
    workforceChart: 'People working in German construction, thousands',
    peak2023: 'Peak, 2023',
    million: 'million',
    perWorker: 'Output per worker since 2010',
    leaveTitle: 'More leave than start',
    retiringRow: 'Retiring each year, on average',
    apprenticesRow: 'New apprentices in 2025',
    leaveNote: 'More than 200,000 workers retire in the next ten years, over 20,000 a year on average (our division).',
    fatalTitle: 'Deaths at work on building sites',
    fatalChart: 'Fatal work accidents, BG BAU members',

    numbersKicker: 'In numbers',
    numbersTitle: 'German construction today',
    numbersLead: 'From Destatis, SOKA-BAU, BG BAU, DIW Berlin and the construction industry federation. Each figure links to its page.',

    growthKicker: 'Robots on real projects',
    growthTitle: 'Robot jobs are taking off',
    growthLead: (last: { count: string; year: number } | null, firstReal: number | null) =>
      `Documented robot jobs per year, by the date of their source${last ? `, ${last.count} so far in ${last.year}` : ''}${firstReal ? `; the first in daily use dates from ${firstReal}` : ''}. Maker claims without a shown job are not counted.`,
    growthLink: 'Every job with its source',

    filmsKicker: 'Real footage',
    filmsTitle: 'Watch them work',
    filmsLead: 'Films by the makers and their customers, from sites and factories. They load from YouTube only when you press play.',
    filmRobot: 'The robot, its price and its jobs',

    labourTitle: 'Where labour is most of the price',
    labourLead: 'Personnel costs as a share of production value, firms with 20 or more staff, 2024. The higher the share, the more a robot that saves hours is worth.',
    labourList: 'Labour share by trade',
    forScale: (trade: string) => `${trade}, for scale`,
    hourlyLabel: 'Labour cost per hour worked in construction',
    hourlyChart: 'Labour cost per hour, euro',
    ecklohnLabel: "Skilled worker's standard wage per hour, gross",
    ecklohnNote: (group: string) => `${group} of the main construction wage agreement, from April 2026, before employer costs.`,
    ecklohnSource: 'TV Lohn Bauhauptgewerbe of 14 June 2024',

    workKicker: 'Where',
    workTitle: 'Robots already at work',
    workLead: (n: { deployment: string; pilot: string; demo: string; robots: string; countries: string }) =>
      `${n.deployment} in daily use, ${n.pilot} pilots on real projects and ${n.demo} demonstrations, by ${n.robots} robots in ${n.countries} countries.`,
    workAll: 'All use cases, map and sources',

    buyKicker: 'Buy',
    buyTitle: 'Robots you can order in Germany',
    buyLead: 'From a German or EU seller, in a shop or on request. Prices as the sellers publish them.',
    pricesFrom: (price: string) => 'Prices from ' + price,
    pricesOnRequest: 'Prices on request',
    priced: (n: string) => ` · ${n} with a published price`,
    seeThem: 'See them',

    askTitle: 'Which robot fits your job?',
    askLead: 'Describe the job, the site and the load. The advisor matches it against these records and shows its sources. Sign in for the free allowance, or use your own API key.',
    askLabel: 'Your job',
    askPlaceholder: 'e.g. drilling 2,000 ceiling holes in an office block',
    askButton: 'Ask the advisor',
  },
  de: {
    heroKicker: 'Roboter für deutsche Baustellen',
    heroLine1: 'Die Baustelle braucht mehr Hände.',
    heroLine2: 'Sehen Sie, was Roboter schon leisten.',
    heroLead: 'Geprüfte Zahlen zur deutschen Bauwirtschaft, echte Aufnahmen und Belege von Robotern im Einsatz und die Roboter, die Sie heute in Deutschland bestellen können. Jede Zahl verweist auf ihre Quelle.',
    ctaUses: 'Wo Roboter arbeiten',
    ctaBuy: 'Roboter zum Kaufen',
    statJobs: 'Belegte Robotereinsätze',
    statCountries: 'Länder',
    statOrderable: 'Roboter in Deutschland bestellbar',
    heroCredit: 'Aufnahmen: Baustelle von oben, Pexels.',
    strip: 'Roboter im Einsatz',

    gapKicker: 'Die Fachkräftelücke',
    gapTitle: 'Weniger Hände, gleich viel Arbeit',
    gapLead: 'Die Zahl der Erwerbstätigen war 2023 am höchsten und sinkt seitdem. Mehr Menschen gehen in Rente, als neu anfangen, und die Leistung je Erwerbstätigen ist seit 2010 gesunken.',
    workforceTitle: 'Erwerbstätige im deutschen Baugewerbe',
    workforceUnit: 'in Tausend, 2016–2025',
    workforceChart: 'Erwerbstätige im deutschen Baugewerbe, in Tausend',
    peak2023: 'Höchststand 2023',
    million: 'Mio.',
    perWorker: 'Leistung je Erwerbstätigen seit 2010',
    leaveTitle: 'Mehr gehen als kommen',
    retiringRow: 'Gehen jedes Jahr in Rente, im Schnitt',
    apprenticesRow: 'Neue Auszubildende 2025',
    leaveNote: 'Mehr als 200.000 Beschäftigte gehen in den nächsten zehn Jahren in Rente, im Schnitt über 20.000 pro Jahr (eigene Rechnung).',
    fatalTitle: 'Tödliche Arbeitsunfälle am Bau',
    fatalChart: 'Tödliche Arbeitsunfälle, Mitglieder der BG BAU',

    numbersKicker: 'In Zahlen',
    numbersTitle: 'Die deutsche Bauwirtschaft heute',
    numbersLead: 'Von Destatis, SOKA-BAU, BG BAU, DIW Berlin und dem Hauptverband der Deutschen Bauindustrie. Jede Zahl verweist auf ihre Quelle.',

    growthKicker: 'Roboter auf echten Projekten',
    growthTitle: 'Robotereinsätze nehmen stark zu',
    growthLead: (last, firstReal) =>
      `Belegte Robotereinsätze pro Jahr, nach dem Datum ihrer Quelle${last ? `, ${last.count} bisher im Jahr ${last.year}` : ''}${firstReal ? `; der erste im täglichen Einsatz stammt aus dem Jahr ${firstReal}` : ''}. Herstellerangaben ohne gezeigten Einsatz zählen nicht mit.`,
    growthLink: 'Jeder Einsatz mit seiner Quelle',

    filmsKicker: 'Echte Aufnahmen',
    filmsTitle: 'Roboter bei der Arbeit',
    filmsLead: 'Filme der Hersteller und ihrer Kunden, von Baustellen und aus Werken. Sie laden erst von YouTube, wenn Sie auf Abspielen drücken.',
    filmRobot: 'Der Roboter, sein Preis und seine Einsätze',

    labourTitle: 'Wo die Arbeit den größten Teil des Preises ausmacht',
    labourLead: 'Personalaufwand als Anteil am Produktionswert, Unternehmen mit 20 und mehr Beschäftigten, 2024. Je höher der Anteil, desto mehr ist ein Roboter wert, der Arbeitsstunden spart.',
    labourList: 'Personalkostenanteil nach Gewerk',
    forScale: (trade) => `${trade}, zum Vergleich`,
    hourlyLabel: 'Arbeitskosten je geleistete Arbeitsstunde am Bau',
    hourlyChart: 'Arbeitskosten je Stunde, Euro',
    ecklohnLabel: 'Ecklohn je Stunde mit Bauzuschlag, brutto',
    ecklohnNote: (group) => `${group} des Lohntarifvertrags im Bauhauptgewerbe, ab April 2026, ohne Lohnnebenkosten des Arbeitgebers.`,
    ecklohnSource: 'TV Lohn Bauhauptgewerbe vom 14. Juni 2024',

    workKicker: 'Wo',
    workTitle: 'Roboter bereits im Einsatz',
    workLead: (n) =>
      `${n.deployment} im täglichen Einsatz, ${n.pilot} Pilotprojekte und ${n.demo} Vorführungen, von ${n.robots} Robotern in ${n.countries} Ländern.`,
    workAll: 'Alle Einsatzbeispiele, Karte und Quellen',

    buyKicker: 'Kaufen',
    buyTitle: 'Roboter, die Sie in Deutschland bestellen können',
    buyLead: 'Von Händlern in Deutschland oder der EU, im Shop oder auf Anfrage. Preise so, wie die Händler sie veröffentlichen.',
    pricesFrom: (price) => 'Preise ab ' + price,
    pricesOnRequest: 'Preise auf Anfrage',
    priced: (n) => ` · ${n} mit veröffentlichtem Preis`,
    seeThem: 'Ansehen',

    askTitle: 'Welcher Roboter passt zu Ihrer Arbeit?',
    askLead: 'Beschreiben Sie die Arbeit, die Baustelle und die Last. Der Berater gleicht sie mit diesen Daten ab und zeigt seine Quellen. Melden Sie sich für das kostenlose Kontingent an oder nutzen Sie Ihren eigenen API-Schlüssel.',
    askLabel: 'Ihre Arbeit',
    askPlaceholder: 'z. B. 2.000 Deckenbohrungen in einem Bürogebäude',
    askButton: 'Berater fragen',
  },
});

/** The words inside the start-page charts (server-drawn SVG). */
export const CHART_TEXT = bilingual({
  en: {
    growthAria: 'Documented robot jobs per year: ',
    growthTitle: (year: number, total: number, stages: string) => `${year}: ${formatNumber(total, 'en')} documented ${total === 1 ? 'job' : 'jobs'} (${stages})`,
    peak: (value: string) => `${value} peak`,
  },
  de: {
    growthAria: 'Belegte Robotereinsätze pro Jahr: ',
    growthTitle: (year, total, stages) => `${year}: ${formatNumber(total, 'de')} ${total === 1 ? 'belegter Einsatz' : 'belegte Einsätze'} (${stages})`,
    peak: (value) => `Höchststand ${value}`,
  },
});
