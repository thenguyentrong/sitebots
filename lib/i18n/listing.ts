import type { Lang } from './config';
import { formatNumber } from './format';
import { bilingual } from './text';
import type { RobotType } from '@/lib/market/schema';
import type { RobotJobStats } from '@/lib/market/jobs';
import { jobsLine } from '@/lib/market/proof';

// The words of the robots page: the German market list (MarketListing, MarketFilters, the toolbar), the
// worldwide catalogue view and the lines the server writes on each robot card (lib/market/tiles.ts).
// Server side only: the client card (RobotTile) carries its own few words.

type FocusedForm = 'humanoid' | 'quadruped' | 'mobile_manipulator';

export const LISTING_TEXT = bilingual({
  en: {
    // Metadata of the two views.
    germanyTitle: 'Robots you can buy in Germany',
    germanyDescription: 'Humanoids, robot dogs, mobile manipulators and job-specific construction robots, with their German sellers, prices where published, and the jobs they fit.',
    worldTitle: 'All robots worldwide',
    worldDescription: 'Every humanoid, robot dog and mobile manipulator we track, prototypes included, with pictures, 3D models and sourced specifications.',

    // The German view.
    soldInGermany: 'Sold in Germany',
    lead: (robots: string, machines: string, preorder: string) => `${robots} robots and ${machines} job-specific machines you can buy or order here, ${preorder} more on pre-order. Every price and seller links to the page it was read from.`,
    worldNoteBefore: 'Robots that are not sold here are under ',
    worldNoteLink: 'Worldwide',
    worldNoteAfter: '.',
    intro: {
      humanoid: 'Two arms and a head, on legs or on a wheeled base.',
      quadruped: 'Four legs, some with wheels or an arm, mostly for inspection rounds.',
      mobile_manipulator: 'One or two arms on a wheeled base.',
      specialised: 'Machines built for one construction job, grouped by job and maker.',
    } as Record<RobotType, string>,
    typeNav: 'Robot type',
    all: 'All',
    /** "Show all 23 humanoids" under a type's first rows. */
    showAll: (type: RobotType, n: string) => `Show all ${n} ${{ humanoid: 'humanoids', quadruped: 'robot dogs', mobile_manipulator: 'mobile manipulators', specialised: 'job-specific robots' }[type]}`,
    models: (n: string) => `${n} models`,
    showModels: (n: string) => `Show the ${n} models`,
    matching: (n: number, count: string) => `${count} robot${n === 1 ? '' : 's'} matching`,
    quote: (q: string) => '“' + q + '”',
    clear: 'clear',
    filterCount: (n: number, count: string, unpriced: number, unpricedCount: string) => `${count} robot${n === 1 ? '' : 's'} match these filters${unpriced ? ', ' + unpricedCount + ' more without a published price are left out' : ''}.`,
    filterEmpty: 'No robot sold in Germany matches these filters.',
    filterEmptyUnpriced: (n: number, count: string) => ' ' + count + (n === 1 ? ' robot has' : ' robots have') + ' no published price; ask the seller for a quote.',
    clearFilters: 'Clear filters',
    searchEmpty: (q: string) => `No robot sold in Germany matches “${q}”.`,
    searchEmptyAbroad: (n: number, count: string) => ' ' + count + (n === 1 ? ' robot that is not sold here does.' : ' robots that are not sold here do.'),
    searchWorld: 'Search all robots worldwide',
    stillRunning: 'The market research is still running.',

    // The filters.
    filterLabel: 'Filter robots',
    maxPrice: 'Price up to (incl. VAT)',
    anyPrice: 'Any price',
    availability: 'Availability',
    any: 'Any',
    sellerIn: 'Seller based in',
    anywhere: 'Anywhere',
    sellerDe: 'Germany',
    sellerEu: 'The EU',
    payload: 'Payload per arm',
    payloadAtLeast: (kg: string) => `${kg} kg or more`,
    sort: 'Sort',
    sortProof: 'Best proof first',
    sortAsc: 'Price, low to high',
    sortDesc: 'Price, high to low',
    hands: 'Hands included',
    showRobots: 'Show robots',
    filterNote: 'Net prices are compared with 19% VAT added. Robots without a published price or payload drop out when you set one.',

    // The toolbar.
    scopeNav: 'Where the robots are sold',
    inGermany: 'In Germany',
    germany: 'Germany',
    worldwide: 'Worldwide',
    searchLabel: 'Search robots',
    searchPlaceholder: 'Maker or model',
    search: 'Search',

    // The worldwide view.
    worldLead: 'Every humanoid, robot dog and mobile manipulator we track, including prototypes and robots that are not sold in Germany. Choose robots to compare their specifications.',
    worldIntro: {
      humanoid: 'Two arms and a head, on legs or on a wheeled base.',
      quadruped: 'Four legs, some with wheels or an arm.',
      mobile_manipulator: 'One or two arms on a wheeled base.',
    } as Record<FocusedForm, string>,
    mapTitle: 'Robot companies around the world',
    mapLead: (companies: string, countries: number, countryCount: string) => `${companies} companies in ${countryCount} countr${countries === 1 ? 'y' : 'ies'}. Select a country to see its companies.`,
    configurations: (n: number, count: string) => `${count} configuration${n === 1 ? '' : 's'}`,
    configurationsMatching: (q: string) => ' matching “' + q + '”',
    bestFirst: ', best documented first',
    hidePictureless: 'Hide robots without a picture',
    showPictureless: (count: string) => `Show ${count} more without a picture`,
    catalogueEmpty: 'No robots match this selection.',

    // The lines on a card (lib/market/tiles.ts).
    sellers: (n: number, count: string) => `${count} seller${n === 1 ? '' : 's'}`,
    sellersInGermany: (n: number, count: string) => `${count} seller${n === 1 ? '' : 's'} in Germany`,
    noGermanSeller: 'No German seller found',
    render: 'Render of the published model',
    from: (host: string | null) => 'From ' + (host ?? 'the maker'),
  },
  de: {
    germanyTitle: 'Roboter, die Sie in Deutschland kaufen können',
    germanyDescription: 'Humanoide, Roboterhunde, mobile Manipulatoren und Spezialroboter für den Bau, mit ihren Händlern in Deutschland, Preisen, soweit veröffentlicht, und den Arbeiten, zu denen sie passen.',
    worldTitle: 'Alle Roboter weltweit',
    worldDescription: 'Alle Humanoiden, Roboterhunde und mobilen Manipulatoren, die wir erfassen, auch Prototypen, mit Bildern, 3D-Modellen und technischen Daten mit Quellen.',

    soldInGermany: 'In Deutschland im Verkauf',
    lead: (robots: string, machines: string, preorder: string) => `${robots} Roboter und ${machines} Spezialmaschinen, die Sie hier kaufen oder bestellen können, dazu ${preorder} zur Vorbestellung. Jeder Preis und jeder Händler verweist auf die Seite, von der er stammt.`,
    worldNoteBefore: 'Roboter, die hier nicht verkauft werden, finden Sie unter ',
    worldNoteLink: 'Weltweit',
    worldNoteAfter: '.',
    intro: {
      humanoid: 'Zwei Arme und ein Kopf, auf Beinen oder auf einer fahrbaren Basis.',
      quadruped: 'Vier Beine, manche mit Rädern oder einem Arm, meist für Kontrollgänge.',
      mobile_manipulator: 'Ein oder zwei Arme auf einer fahrbaren Basis.',
      specialised: 'Maschinen für eine bestimmte Bauarbeit, nach Arbeit und Hersteller geordnet.',
    },
    typeNav: 'Robotertyp',
    all: 'Alle',
    showAll: (type: RobotType, n: string) => `Alle ${n} ${{ humanoid: 'Humanoiden', quadruped: 'Roboterhunde', mobile_manipulator: 'mobilen Manipulatoren', specialised: 'Spezialroboter' }[type]} anzeigen`,
    models: (n: string) => `${n} Modelle`,
    showModels: (n: string) => `Die ${n} Modelle anzeigen`,
    matching: (n: number, count: string) => `${count} Roboter ${n === 1 ? 'passt' : 'passen'} zu`,
    quote: (q: string) => '„' + q + '“',
    clear: 'zurücksetzen',
    filterCount: (n: number, count: string, unpriced: number, unpricedCount: string) => `${count} Roboter ${n === 1 ? 'passt' : 'passen'} zu diesen Filtern${unpriced ? ', ' + unpricedCount + (unpriced === 1 ? ' weiterer ohne veröffentlichten Preis ist nicht enthalten' : ' weitere ohne veröffentlichten Preis sind nicht enthalten') : ''}.`,
    filterEmpty: 'Kein in Deutschland verkaufter Roboter passt zu diesen Filtern.',
    filterEmptyUnpriced: (n: number, count: string) => ' ' + count + (n === 1 ? ' Roboter hat' : ' Roboter haben') + ' keinen veröffentlichten Preis; fragen Sie beim Händler ein Angebot an.',
    clearFilters: 'Filter zurücksetzen',
    searchEmpty: (q: string) => `Kein in Deutschland verkaufter Roboter passt zu „${q}“.`,
    searchEmptyAbroad: (n: number, count: string) => ' ' + count + (n === 1 ? ' Roboter, der hier nicht verkauft wird, passt.' : ' Roboter, die hier nicht verkauft werden, passen.'),
    searchWorld: 'Alle Roboter weltweit durchsuchen',
    stillRunning: 'Die Marktrecherche läuft noch.',

    filterLabel: 'Roboter filtern',
    maxPrice: 'Preis bis (inkl. MwSt.)',
    anyPrice: 'Beliebiger Preis',
    availability: 'Verfügbarkeit',
    any: 'Beliebig',
    sellerIn: 'Sitz des Händlers',
    anywhere: 'Beliebig',
    sellerDe: 'Deutschland',
    sellerEu: 'EU',
    payload: 'Traglast pro Arm',
    payloadAtLeast: (kg: string) => `ab ${kg} kg`,
    sort: 'Sortierung',
    sortProof: 'Bester Nachweis zuerst',
    sortAsc: 'Preis aufsteigend',
    sortDesc: 'Preis absteigend',
    hands: 'Mit Händen',
    showRobots: 'Roboter anzeigen',
    filterNote: 'Nettopreise werden mit 19 % MwSt. verglichen. Roboter ohne veröffentlichten Preis oder ohne veröffentlichte Traglast fallen heraus, sobald Sie hier einen Wert wählen.',

    scopeNav: 'Wo die Roboter verkauft werden',
    inGermany: 'In Deutschland',
    germany: 'Deutschland',
    worldwide: 'Weltweit',
    searchLabel: 'Roboter suchen',
    searchPlaceholder: 'Hersteller oder Modell',
    search: 'Suchen',

    worldLead: 'Alle Humanoiden, Roboterhunde und mobilen Manipulatoren, die wir erfassen, auch Prototypen und Roboter, die in Deutschland nicht verkauft werden. Wählen Sie Roboter aus, um ihre technischen Daten zu vergleichen.',
    worldIntro: {
      humanoid: 'Zwei Arme und ein Kopf, auf Beinen oder auf einer fahrbaren Basis.',
      quadruped: 'Vier Beine, manche mit Rädern oder einem Arm.',
      mobile_manipulator: 'Ein oder zwei Arme auf einer fahrbaren Basis.',
    },
    mapTitle: 'Roboterunternehmen weltweit',
    mapLead: (companies: string, countries: number, countryCount: string) => `${companies} Unternehmen in ${countryCount} ${countries === 1 ? 'Land' : 'Ländern'}. Wählen Sie ein Land, um seine Unternehmen zu sehen.`,
    configurations: (n: number, count: string) => `${count} ${n === 1 ? 'Konfiguration' : 'Konfigurationen'}`,
    configurationsMatching: (q: string) => ' zu „' + q + '“',
    bestFirst: ', am besten dokumentierte zuerst',
    hidePictureless: 'Roboter ohne Bild ausblenden',
    showPictureless: (count: string) => `${count} weitere ohne Bild anzeigen`,
    catalogueEmpty: 'Keine Roboter passen zu dieser Auswahl.',

    sellers: (n: number, count: string) => `${count} Händler`,
    sellersInGermany: (n: number, count: string) => `${count} Händler in Deutschland`,
    noGermanSeller: 'Kein Händler in Deutschland gefunden',
    render: 'Rendering des veröffentlichten Modells',
    from: (host: string | null) => host ? 'Von ' + host : 'Vom Hersteller',
  },
});

// A card's proof line in German, by the robot's best proof on any job (STAGE_RANK). The word order differs
// from the English ("piloted on 2 jobs" / "bei 2 Arbeiten im Pilotprojekt erprobt"), so the German is its
// own sentence. English comes from lib/market/proof.ts unchanged.
const jobs = (n: number) => formatNumber(n, 'de') + (n === 1 ? ' Arbeit' : ' Arbeiten');
const PROVEN_ON_DE = ['', (n: number) => `für ${jobs(n)} gebaut`, (n: number) => `bei ${jobs(n)} in einer Demo gezeigt`, (n: number) => `bei ${jobs(n)} im Pilotprojekt erprobt`, (n: number) => `bei ${jobs(n)} im täglichen Einsatz`] as const;

/** What a robot's card says about its jobs: its best proof first, then what only fits on paper. */
export function cardJobsLine(stats: RobotJobStats | undefined, lang: Lang): string {
  if (lang === 'en') return jobsLine(stats);
  if (!stats || (!stats.best && !stats.strong)) return 'noch keine Arbeit auf der Karte';
  if (!stats.best) return 'passt zu ' + jobs(stats.strong);
  const more = stats.strong - stats.atBest;
  const proven = PROVEN_ON_DE[stats.best];
  return (typeof proven === 'function' ? proven(stats.atBest) : '') + (more > 0 ? ' · ' + formatNumber(more, 'de') + (more === 1 ? ' weitere passt' : ' weitere passen') : '');
}
