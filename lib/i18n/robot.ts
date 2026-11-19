import type { Lang } from './config';
import { formatDate } from './format';
import { bilingual } from './text';

// The words of the robot pages (/robots/[maker]/[model] and /market/[id]) and their sections. Server
// components only: the client parts of the page (3D viewer, photo gallery, visitor reviews) carry their
// own small blocks so the browser does not download this file. Free text from the robot records stays as
// the sources wrote it and is marked lang="en" on German pages (recordLang).

const plural = (n: number, one: string, many: string) => n + ' ' + (n === 1 ? one : many);

/** A full ISO day in the page's language; on English pages exactly as stored (2026-11-18), as before. */
export function recordDay(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  if (lang === 'en' || !/^\d{4}-\d{2}-\d{2}$/.test(iso.slice(0, 10))) return iso;
  return formatDate(iso.slice(0, 10), lang, 'short');
}

export const ROBOT_TEXT = bilingual({
  en: {
    breadcrumb: 'Breadcrumb', robots: 'Robots', by: 'by', configuration: 'Configuration:',
    makerCard: (name: string) => `About ${name}: what the company does, strengths, weak points and reviews`,
    makerCardLink: 'Company profile, strengths and reviews →',
    keyFacts: 'Key facts', allSpecs: 'All specifications',
    nav: { label: 'On this page', jobs: 'Jobs', trackRecord: 'Where it has worked', specs: 'Specifications', conflicts: 'Sources disagree', reviews: 'Reviews', more: 'More detail', sources: 'Sources' },
    noPicture: 'No picture published', specsEmpty: 'No specifications recorded yet.', show: 'Show', hide: 'Hide',
    // Catalogue page
    metaTitle: (name: string) => `${name} specs, price and site suitability`,
    metaDescription: (maker: string, name: string, bits: string) => `${maker} ${name}: ${bits || 'specifications'}, with the source of every value, regional prices and delivery status.`,
    payloadBit: (value: string, basis: string) => value + ' payload (' + basis + ')',
    catalogueSpecs: 'Catalogue specifications',
    catalogueValuesFor: (variant: string | null) => `Catalogue values for ${variant ?? 'the base record'}.`,
    referenceOnly: 'Reference only · This record has no named, reviewed current or upcoming commercial product offering. This robot is hidden from the supplier catalogue and matcher.',
    referenceLink: 'View manufacturer review',
    priceOutside: 'Price and delivery outside Germany',
    reportedByDatabases: (n: number) => n + ' reported by databases, not by a seller',
    nothingPublished: 'nothing published',
    catalogueValueCount: (total: number, verified: number) => `${total} catalogue value${total === 1 ? '' : 's'} · ${verified} verified`,
    moreCatalogue: 'Parts, equipment and evidence profile', catalogueModel: 'Catalogue model',
    // Market page
    marketTitle: (name: string) => name + ' in Germany', notFound: 'Robot not found',
    valueCount: (n: number) => `${n} value${n === 1 ? '' : 's'}`,
    moreMarket: 'Evidence profile', evidenceProfile: 'Robot evidence profile', checked: 'Checked',
  },
  de: {
    breadcrumb: 'Navigationspfad', robots: 'Roboter', by: 'von', configuration: 'Konfiguration:',
    makerCard: (name: string) => `Über ${name}: was das Unternehmen macht, Stärken, Schwächen und Bewertungen`,
    makerCardLink: 'Firmenprofil, Stärken und Bewertungen →',
    keyFacts: 'Eckdaten', allSpecs: 'Alle technischen Daten',
    nav: { label: 'Auf dieser Seite', jobs: 'Arbeiten', trackRecord: 'Bisherige Einsätze', specs: 'Technische Daten', conflicts: 'Quellen widersprechen sich', reviews: 'Bewertungen', more: 'Weitere Details', sources: 'Quellen' },
    noPicture: 'Kein Bild veröffentlicht', specsEmpty: 'Noch keine technischen Daten erfasst.', show: 'Anzeigen', hide: 'Ausblenden',
    metaTitle: (name: string) => `${name}: technische Daten, Preis und Eignung für die Baustelle`,
    metaDescription: (maker: string, name: string, bits: string) => `${maker} ${name}: ${bits || 'technische Daten'}, mit der Quelle jedes Werts, regionalen Preisen und Lieferstatus.`,
    payloadBit: (value: string, basis: string) => 'Traglast ' + value + ' (' + basis + ')',
    catalogueSpecs: 'Technische Daten aus dem Katalog',
    catalogueValuesFor: (variant: string | null) => `Katalogwerte für ${variant ?? 'das Basismodell'}.`,
    referenceOnly: 'Nur zur Information · Für diesen Datensatz gibt es kein benanntes, geprüftes aktuelles oder angekündigtes kommerzielles Angebot. Der Roboter ist im Anbieterkatalog und im Roboter-Abgleich ausgeblendet.',
    referenceLink: 'Prüfung des Herstellers ansehen',
    priceOutside: 'Preis und Lieferung außerhalb Deutschlands',
    reportedByDatabases: (n: number) => n + ' von Datenbanken berichtet, nicht von einem Händler',
    nothingPublished: 'nichts veröffentlicht',
    catalogueValueCount: (total: number, verified: number) => `${plural(total, 'Katalogwert', 'Katalogwerte')} · ${verified} bestätigt`,
    moreCatalogue: 'Bauteile, Ausstattung und Nachweisprofil', catalogueModel: 'Katalogmodell',
    marketTitle: (name: string) => name + ' in Deutschland', notFound: 'Roboter nicht gefunden',
    valueCount: (n: number) => plural(n, 'Wert', 'Werte'),
    moreMarket: 'Nachweisprofil', evidenceProfile: 'Nachweisprofil des Roboters', checked: 'Geprüft am',
  },
});

/** Buy in Germany, Jobs, Where it has worked, the proof timeline (components/market/GermanyBuy.tsx). */
export const GERMANY_TEXT = bilingual({
  en: {
    leadTime: 'Lead time', productPage: 'Product page ↗', contact: 'Contact ↗',
    role: { manufacturer: 'manufacturer', distributor: 'distributor', reseller: 'reseller', integrator: 'integrator', rental: 'rental' } as Record<string, string>,
    whereToBuy: (n: number) => 'Where to buy (' + n + ' seller' + (n > 1 ? 's' : '') + ')', howToBuy: 'How to buy',
    checkedAt: (day: string) => 'Checked ' + day + '.', makerPage: 'Maker’s page ↗',
    did: 'Did: ', shown: 'Shown: ', similar: 'Did similar work', specsFit: 'Specs fit', stretch: 'Needs add-ons or a trial',
    noJob: 'No job on the map fits this robot yet.', byFit: 'Jobs by how well it fits',
    moreJobs: (n: number) => 'Show ' + n + ' more jobs', fewer: 'Show fewer',
    buy: 'Buy in Germany', noSeller: 'No German seller recorded yet.',
    versions: (n: number) => n + ' versions · ', checked: (day: string) => 'checked ' + day,
    sellersIntro: 'Sellers, prices and stock as their pages showed them. No enquiry is sent from this site.',
    jobs: 'Jobs', noJobs: 'No jobs are linked to this robot yet.', forThe: (name: string) => 'For the ' + name,
    trackRecord: 'Where it has worked', noWork: 'No real-world work recorded yet.', siteNotNamed: 'Site not named',
    timeline: (from: string, to: string) => `Proof over time, ${from} to ${to}: `,
    timelineCount: (n: number, label: string) => n + ' ' + label.toLowerCase(),
    undated: (n: number) => n + ' more without a date',
  },
  de: {
    leadTime: 'Lieferzeit', productPage: 'Produktseite ↗', contact: 'Kontakt ↗',
    role: { manufacturer: 'Hersteller', distributor: 'Distributor', reseller: 'Händler', integrator: 'Integrator', rental: 'Vermietung' },
    whereToBuy: (n: number) => 'Bezugsquellen (' + n + ' Händler)', howToBuy: 'So kaufen Sie',
    checkedAt: (day: string) => 'Geprüft am ' + day + '.', makerPage: 'Seite des Herstellers ↗',
    did: 'Erledigt: ', shown: 'Im Bild: ', similar: 'Ähnliche Arbeit erledigt', specsFit: 'Technische Daten passen', stretch: 'Braucht Zubehör oder einen Test',
    noJob: 'Noch passt keine Arbeit auf der Karte zu diesem Roboter.', byFit: 'Arbeiten nach Eignung',
    moreJobs: (n: number) => n + ' weitere Arbeiten anzeigen', fewer: 'Weniger anzeigen',
    buy: 'In Deutschland kaufen', noSeller: 'Noch kein Händler in Deutschland erfasst.',
    versions: (n: number) => n + ' Versionen · ', checked: (day: string) => 'geprüft am ' + day,
    sellersIntro: 'Händler, Preise und Bestand, wie ihre Seiten sie zeigten. Diese Website sendet keine Anfrage.',
    jobs: 'Arbeiten', noJobs: 'Mit diesem Roboter sind noch keine Arbeiten verknüpft.', forThe: (name: string) => 'Für ' + name,
    trackRecord: 'Bisherige Einsätze', noWork: 'Noch kein realer Einsatz erfasst.', siteNotNamed: 'Einsatzort nicht genannt',
    timeline: (from: string, to: string) => `Nachweise im Zeitverlauf, ${from} bis ${to}: `,
    timelineCount: (n: number, label: string) => n + ' × ' + label,
    undated: (n: number) => n + ' weitere ohne Datum',
  },
});

/** Specifications by configuration (components/market/MarketSpecifications.tsx). */
export const MARKET_SPEC_TEXT = bilingual({
  en: {
    checked: 'checked', noFieldSource: 'Field-level source not recorded', exact: 'Exact source text', quoteContext: 'Quote context: ',
    further: (n: number) => `Further source evidence for this value (${n})`, conditions: "This source's conditions: ",
    title: 'Specifications by configuration', configurations: (n: number) => `${n} configuration${n === 1 ? '' : 's'}`,
    intro: "What each version's maker or seller states, with the exact source text. A source label says who makes the claim, not that it is proven; unknown means not published.",
    line: (specs: number, gaps: number) => `${specs} specifications · ${gaps} research gap${gaps === 1 ? '' : 's'} · reviewed `,
    fieldSourceMissing: 'Field source not recorded', showAll: (n: number) => `Show all ${n} specifications and capabilities`, hide: 'Hide',
    noSpecs: 'No sourced specifications recorded.', capabilities: 'Capabilities and equipment', notes: 'Operating conditions and configuration notes',
    stillMissing: (name: string) => 'Still missing for ' + name, background: 'Background sources for the capability record',
    backgroundNote: 'These sources are attached to the record as a whole. Only a source displayed beside a value is linked to that field.',
  },
  de: {
    checked: 'geprüft am', noFieldSource: 'Keine Quelle für diesen Wert erfasst', exact: 'Wortlaut der Quelle', quoteContext: 'Zusammenhang des Zitats: ',
    further: (n: number) => `Weitere Quellenbelege für diesen Wert (${n})`, conditions: 'Bedingungen dieser Quelle: ',
    title: 'Technische Daten nach Konfiguration', configurations: (n: number) => plural(n, 'Konfiguration', 'Konfigurationen'),
    intro: 'Was Hersteller oder Händler zu jeder Version angeben, mit dem Wortlaut der Quelle. Die Quellenangabe sagt, wer die Angabe macht, nicht, dass sie belegt ist. Unbekannt heißt: nicht veröffentlicht.',
    line: (specs: number, gaps: number) => `${plural(specs, 'technische Angabe', 'technische Angaben')} · ${plural(gaps, 'Recherchelücke', 'Recherchelücken')} · geprüft am `,
    fieldSourceMissing: 'Quelle des Werts nicht erfasst', showAll: (n: number) => `Alle ${n} Angaben und Fähigkeiten anzeigen`, hide: 'Ausblenden',
    noSpecs: 'Keine technischen Daten mit Quelle erfasst.', capabilities: 'Fähigkeiten und Ausstattung', notes: 'Einsatzbedingungen und Hinweise zur Konfiguration',
    stillMissing: (name: string) => 'Was bei ' + name + ' noch fehlt', background: 'Hintergrundquellen zum Fähigkeitsprofil',
    backgroundNote: 'Diese Quellen gehören zum Datensatz als Ganzes. Nur eine Quelle, die neben einem Wert steht, belegt diesen Wert.',
  },
});

/** Evidence for each configuration (components/robot/ConfigurationEvidence.tsx). */
export const EVIDENCE_TEXT = bilingual({
  en: {
    stage: { claim: 'Published claim', demo: 'Demonstration', pilot: 'Pilot', deployment: 'Deployment' } as Record<string, string>,
    count: (stage: string, n: number) => `${n} ${({ claim: 'published claim', demo: 'demonstration', pilot: 'pilot', deployment: 'deployment' } as Record<string, string>)[stage]}${n === 1 ? '' : 's'}`,
    title: 'Evidence for each configuration',
    intro: 'Claims, demonstrations, pilots and deployments describe different levels of evidence. A demonstration does not establish working-site readiness.',
    noEvidence: 'No task evidence recorded', missingFields: (n: number) => `${n} missing capability fields`, configuration: 'Configuration: ',
    noPlace: 'Location not recorded', noDate: 'Event date not recorded', checked: 'checked',
    none: 'No task claim, demonstration, pilot or deployment has been recorded for this configuration.',
    stillMissing: 'What is still missing', complete: 'All tracked capability fields have values. Conditions and task suitability still need checking.',
    view: 'View configuration specifications and source text',
  },
  de: {
    stage: { claim: 'Veröffentlichte Angabe', demo: 'Vorführung', pilot: 'Pilotprojekt', deployment: 'Einsatz' },
    count: (stage: string, n: number) => ({
      claim: plural(n, 'veröffentlichte Angabe', 'veröffentlichte Angaben'), demo: plural(n, 'Vorführung', 'Vorführungen'),
      pilot: plural(n, 'Pilotprojekt', 'Pilotprojekte'), deployment: plural(n, 'Einsatz', 'Einsätze'),
    } as Record<string, string>)[stage] ?? n + ' ' + stage,
    title: 'Nachweise je Konfiguration',
    intro: 'Angaben, Vorführungen, Pilotprojekte und Einsätze sind unterschiedlich starke Nachweise. Eine Vorführung belegt nicht, dass der Roboter für die Baustelle bereit ist.',
    noEvidence: 'Keine Nachweise für Aufgaben erfasst', missingFields: (n: number) => plural(n, 'fehlende Fähigkeitsangabe', 'fehlende Fähigkeitsangaben'), configuration: 'Konfiguration: ',
    noPlace: 'Ort nicht erfasst', noDate: 'Datum nicht erfasst', checked: 'geprüft am',
    none: 'Für diese Konfiguration ist keine Angabe, keine Vorführung, kein Pilotprojekt und kein Einsatz erfasst.',
    stillMissing: 'Was noch fehlt', complete: 'Alle erfassten Fähigkeitsfelder haben Werte. Bedingungen und Eignung für die Aufgabe müssen noch geprüft werden.',
    view: 'Technische Daten und Quelltext der Konfiguration ansehen',
  },
});

/** Catalogue panels: spec table, built-in parts, equipment, prices, buying routes, sources, conflicts. */
export const PANEL_TEXT = bilingual({
  en: {
    curated: 'curated', assessedBy: 'Assessed by sitebots', seen: 'seen', notPublished: 'not published', notPublishedTitle: 'Not published',
    notPublishedAnywhere: 'Not published anywhere we could find.', notPublishedList: 'Not published: ',
    parts: 'Built-in parts', nothing: 'nothing published', inside: 'what ships inside', peak: 'peak',
    noEquipment: 'No equipment options published. Payloads and accessories are listed only where the maker or a partner sells them.', included: 'included',
    price: 'Price and delivery', priceCounts: (seller: number, reported: number) => `${seller} seller prices · ${reported} reported`, noPrice: 'No published price',
    nothingPrice: 'Nothing published. ', quotation: 'Sold on quotation.',
    region: 'Region', config: 'Config', priceCol: 'Price', evidence: 'Evidence', tier: (n: number) => 'tier ' + n, direct: ' (read directly)', stale: 'stale',
    exVat: 'ex VAT', sellerLists: 'Seller lists: ', reported: 'Reported: ', inStock: 'in stock', days: (min: string, max: string) => `${min} to ${max} days`, manufacturer: 'Manufacturer · ',
    global: 'GLOBAL',
    contactPage: 'Contact page ↗', germanSeller: 'German seller', euSeller: 'EU seller',
    indexed: 'Indexed seller page; live stock and price unconfirmed', directListing: 'Direct seller listing', unauthorised: 'Manufacturer authorization unconfirmed.',
    noListing: 'No Germany-specific seller listing has been checked for this model yet.', askMaker: 'Ask the manufacturer',
    contactFrom: 'Contact from the ', officialSite: 'official website',
    askFor: 'Ask for the exact configuration, a German delivery quote and the local service partner.',
    sources: 'Sources', noSources: 'No sources recorded yet.', pages: (n: number) => `${n} page${n === 1 ? '' : 's'}`, checked: 'checked',
    assessedBySitebots: '(assessed by sitebots)', unregistered: 'unregistered', values: (n: number) => `${n} value${n === 1 ? '' : 's'}`,
    kind: { curated: 'curated', manufacturer: 'manufacturer', distributor: 'distributor', aggregator: 'database', index: 'index' } as Record<string, string>,
    marketKind: (kind: string) => kind.replaceAll('_', ' '),
    disagree: 'Sources disagree',
  },
  de: {
    curated: 'kuratiert', assessedBy: 'Von sitebots bewertet', seen: 'gesehen am', notPublished: 'nicht veröffentlicht', notPublishedTitle: 'Nicht veröffentlicht',
    notPublishedAnywhere: 'Nirgends veröffentlicht, soweit wir finden konnten.', notPublishedList: 'Nicht veröffentlicht: ',
    parts: 'Verbaute Teile', nothing: 'nichts veröffentlicht', inside: 'was ab Werk verbaut ist', peak: 'Spitze',
    noEquipment: 'Keine Ausstattungsoptionen veröffentlicht. Nutzlasten und Zubehör stehen hier nur, wenn der Hersteller oder ein Partner sie verkauft.', included: 'enthalten',
    price: 'Preis und Lieferung', priceCounts: (seller: number, reported: number) => `${plural(seller, 'Händlerpreis', 'Händlerpreise')} · ${reported} berichtet`, noPrice: 'Kein veröffentlichter Preis',
    nothingPrice: 'Nichts veröffentlicht. ', quotation: 'Verkauf nur auf Angebot.',
    region: 'Region', config: 'Konfiguration', priceCol: 'Preis', evidence: 'Nachweis', tier: (n: number) => 'Stufe ' + n, direct: ' (direkt abgelesen)', stale: 'veraltet',
    exVat: 'netto', sellerLists: 'Händler nennt: ', reported: 'Berichtet: ', inStock: 'auf Lager', days: (min: string, max: string) => `${min} bis ${max} Tage`, manufacturer: 'Hersteller · ',
    global: 'Weltweit',
    contactPage: 'Kontaktseite ↗', germanSeller: 'Händler in Deutschland', euSeller: 'Händler in der EU',
    indexed: 'Indexierte Händlerseite; aktueller Bestand und Preis unbestätigt', directListing: 'Direkt gelesenes Händlerangebot', unauthorised: 'Autorisierung durch den Hersteller unbestätigt.',
    noListing: 'Für dieses Modell wurde noch kein Händlerangebot für Deutschland geprüft.', askMaker: 'Beim Hersteller anfragen',
    contactFrom: 'Kontakt von der ', officialSite: 'offiziellen Website',
    askFor: 'Fragen Sie nach der genauen Konfiguration, einem Lieferangebot für Deutschland und dem Servicepartner vor Ort.',
    sources: 'Quellen', noSources: 'Noch keine Quellen erfasst.', pages: (n: number) => plural(n, 'Seite', 'Seiten'), checked: 'geprüft am',
    assessedBySitebots: '(von sitebots bewertet)', unregistered: 'nicht registriert', values: (n: number) => plural(n, 'Wert', 'Werte'),
    kind: { curated: 'kuratiert', manufacturer: 'Hersteller', distributor: 'Händler', aggregator: 'Datenbank', index: 'Index' },
    marketKind: (kind: string) => ({ manufacturer: 'Hersteller', seller: 'Händler', press: 'Presse', customer: 'Kunde', trade_fair: 'Messe', database: 'Datenbank', other: 'Sonstige' } as Record<string, string>)[kind] ?? kind.replaceAll('_', ' '),
    disagree: 'Quellen widersprechen sich',
  },
});

/** Public reviews (components/robot/ReviewsSection.tsx). */
export const REVIEWS_TEXT = bilingual({
  en: {
    kind: {
      press: 'Press', hands_on: 'Hands-on test', owner: 'Owner', customer: 'Customer', forum: 'Forum', study: 'Study', maker_testimonial: 'Quoted by the maker',
      reddit: 'Reddit', github: 'GitHub', ros_community: 'ROS community', hacker_news: 'Hacker News', blog: 'Blog', video: 'Video',
    } as Record<string, string>,
    stance: { positive: 'Positive', mixed: 'Mixed', negative: 'Critical' } as Record<string, string>,
    open: '“', close: '”',
    series: 'This review covers the whole product family, not only this configuration.',
    title: 'Reviews and feedback', empty: 'No independent review found yet. We search press, forums, GitHub and customer reports.',
    found: (n: number) => n + ' found', more: (n: number) => 'Show ' + n + ' more',
  },
  de: {
    kind: {
      press: 'Presse', hands_on: 'Praxistest', owner: 'Eigentümer', customer: 'Kunde', forum: 'Forum', study: 'Studie', maker_testimonial: 'Vom Hersteller zitiert',
      reddit: 'Reddit', github: 'GitHub', ros_community: 'ROS-Community', hacker_news: 'Hacker News', blog: 'Blog', video: 'Video',
    },
    stance: { positive: 'Positiv', mixed: 'Gemischt', negative: 'Kritisch' },
    open: '„', close: '“',
    series: 'Diese Bewertung gilt für die ganze Produktfamilie, nicht nur für diese Konfiguration.',
    title: 'Bewertungen und Rückmeldungen', empty: 'Noch keine unabhängige Bewertung gefunden. Wir durchsuchen Presse, Foren, GitHub und Kundenberichte.',
    found: (n: number) => n + ' gefunden', more: (n: number) => n + ' weitere anzeigen',
  },
});

/** The evidence profile (components/robot/UseCaseProfile.tsx). */
export const PROFILE_TEXT = bilingual({
  en: {
    source: 'Source ↗', noSource: 'Source link missing', recorded: 'Recorded',
    siteTitle: (name: string) => `${name}: site-condition profile`,
    axisDesc: (label: string, s: number, r: number, u: number) => `${label}: ${s} supported, ${r} reported, ${u} unconfirmed`,
    unconfirmed: 'unconfirmed', ofHundred: (n: number | null) => `${n} of 100`,
    chartNote: 'Chart gaps mean evidence is missing. Scores describe the published data against fixed thresholds; they do not predict task success.',
    supported: (s: number, t: number) => `${s}/${t} supported`, incomplete: ' · incomplete evidence',
    counts: (facts: number, missing: number) => `${facts} recorded field${facts === 1 ? '' : 's'} · ${missing} follow-up${missing === 1 ? '' : 's'}`,
    evidenceLine: (v: number, a: number, r: number, u: number, s: number) => `${v} manufacturer-sourced · ${a} assessed · ${r} reported · ${u} with confidence unconfirmed. ${s} distinct source links.`,
    noAxisSpec: 'No supporting catalogue specification is recorded for this axis.', stillNeeded: 'Still needed', ask: 'Ask before use: ',
    tasksTitle: (name: string) => `${name}: site tasks`,
    tasksNote: 'A named task is a sourced capability claim. A task not listed remains unconfirmed.',
    noTaskEvidence: 'No field-level task evidence is recorded. Task, configuration, source and operating conditions are needed.',
    title: 'Robot evidence profile', axesWithData: (k: number, n: number) => `${k} of ${n} axes with data · tasks`,
    scope: (label: string) => `Profile scope: ${label}.`,
    scopeMarket: 'The chart uses this catalogue record. Configuration-specific findings are listed separately below.',
    scopeExpand: 'Expand an axis to see its sources, conditions and missing evidence.',
    populated: 'populated fields', makerSourced: 'manufacturer-sourced', assessed: 'assessed', reported: 'reported', sourceLinks: 'source links', latest: 'Latest record',
    footer: "Unweighted thresholds use the matcher's rules. Handling shows evidence coverage. Source labels describe provenance and do not certify performance.",
    show: 'Show', hide: 'Hide', view: 'Profile view', site: 'Site conditions', tasks: 'Tasks',
  },
  de: {
    source: 'Quelle ↗', noSource: 'Quellenlink fehlt', recorded: 'Erfasst am',
    siteTitle: (name: string) => `${name}: Profil der Baustellenbedingungen`,
    axisDesc: (label: string, s: number, r: number, u: number) => `${label}: ${s} belegt, ${r} berichtet, ${u} unbestätigt`,
    unconfirmed: 'unbestätigt', ofHundred: (n: number | null) => `${n} von 100`,
    chartNote: 'Lücken im Diagramm bedeuten fehlende Nachweise. Die Werte messen die veröffentlichten Daten an festen Schwellen; sie sagen keinen Erfolg bei der Aufgabe voraus.',
    supported: (s: number, t: number) => `${s}/${t} belegt`, incomplete: ' · Nachweise unvollständig',
    counts: (facts: number, missing: number) => `${plural(facts, 'erfasstes Feld', 'erfasste Felder')} · ${plural(missing, 'offener Punkt', 'offene Punkte')}`,
    evidenceLine: (v: number, a: number, r: number, u: number, s: number) => `${v} aus Herstellerquellen · ${a} bewertet · ${r} berichtet · ${u} mit unbestätigter Verlässlichkeit. ${s} verschiedene Quellenlinks.`,
    noAxisSpec: 'Für diese Achse sind keine technischen Daten aus dem Katalog erfasst.', stillNeeded: 'Noch benötigt', ask: 'Vor dem Einsatz klären: ',
    tasksTitle: (name: string) => `${name}: Aufgaben auf der Baustelle`,
    tasksNote: 'Eine genannte Aufgabe ist eine Fähigkeitsangabe mit Quelle. Eine nicht genannte Aufgabe bleibt unbestätigt.',
    noTaskEvidence: 'Es sind keine Nachweise zu einzelnen Aufgaben erfasst. Benötigt werden Aufgabe, Konfiguration, Quelle und Einsatzbedingungen.',
    title: 'Nachweisprofil des Roboters', axesWithData: (k: number, n: number) => `${k} von ${n} Achsen mit Daten · Aufgaben`,
    scope: (label: string) => `Umfang des Profils: ${label}.`,
    scopeMarket: 'Das Diagramm nutzt diesen Katalogdatensatz. Ergebnisse zu einzelnen Konfigurationen stehen gesondert darunter.',
    scopeExpand: 'Öffnen Sie eine Achse, um Quellen, Bedingungen und fehlende Nachweise zu sehen.',
    populated: 'ausgefüllte Felder', makerSourced: 'aus Herstellerquellen', assessed: 'bewertet', reported: 'berichtet', sourceLinks: 'Quellenlinks', latest: 'Letzter Eintrag',
    footer: 'Die ungewichteten Schwellen folgen den Regeln des Roboter-Abgleichs. Die Achse Handhabung zeigt, wie weit Nachweise vorliegen. Quellenangaben beschreiben die Herkunft und bescheinigen keine Leistung.',
    show: 'Anzeigen', hide: 'Ausblenden', view: 'Ansicht des Profils', site: 'Baustellenbedingungen', tasks: 'Aufgaben',
  },
});
