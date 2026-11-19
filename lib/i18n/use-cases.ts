import type { Lang } from './config';
import { formatNumber } from './format';
import { bilingual } from './text';

// The use-case page and the pieces it shares with the start page and the company pages (robot cards,
// setting tiles, map). Settings, stages, regions and countries come from MARKET_TEXT and the lib getters.

const n = (value: number, lang: Lang) => formatNumber(value, lang);

export const USE_CASES_TEXT = bilingual({
  en: {
    metaTitle: 'Where construction robots already work',
    metaDescription: 'Every documented use of a construction or general-purpose robot we track: daily use, pilots and demonstrations by setting, country and robot, each with its source.',
    kicker: 'Use cases',
    title: 'Where robots already work',
    lead: 'German building sites, tunnels in Sweden, towers in Tokyo, solar parks in Texas. Every job here was shown on a real project or in a demonstration, and links to the page it was read from.',
    totalLabel: 'Documented uses', totalHint: 'each with a source',
    dailyLabel: 'In daily use', dailyHint: 'on real projects',
    robotsLabel: 'Robots', robotsHint: (makers: number) => `from ${n(makers, 'en')} makers`,
    countriesLabel: 'Countries', countriesHint: 'named in the sources',
    claims: (count: number) => `${n(count, 'en')} more maker claims name a job but show no project. They are not counted.`,
    regionNav: 'Region', worldwide: 'Worldwide',
    stageNav: 'How far', everyStage: 'Every stage',
    removeCountry: (country: string) => `Remove the ${country} filter`,
    shownCount: (count: number, filtered: boolean) => `${n(count, 'en')} ${count === 1 ? 'use' : 'uses'}${filtered ? ' shown' : ''}`,
    noMatch: 'No documented use matches this filter.', showAll: 'Show all',
    mapTitle: 'On the map',
    mapCount: (places: number, countries: number, unplaced: number) =>
      `${n(places, 'en')} ${places === 1 ? 'place' : 'places'} in ${n(countries, 'en')} ${countries === 1 ? 'country' : 'countries'}${unplaced ? ` · ${n(unplaced, 'en')} ${unplaced === 1 ? 'use names' : 'uses name'} no place` : ''}`,
    countryFilter: 'Filter by country',
    settingsTitle: (count: number) => `${n(count, 'en')} ${count === 1 ? 'kind' : 'kinds'} of work`,
    settingsLead: 'Sorted by the number of uses. Pick one to see its robots.',
    topTitle: 'The most proven robots',
    topLead: 'Most days in real use first, then the most projects and demonstrations.',
    usesBy: (count: number): string => count === 1 ? 'use by' : 'uses by',
    robotWord: (count: number): string => count === 1 ? 'robot' : 'robots',
    showAllFor: (count: number, setting: string) => `Show all ${n(count, 'en')} robots for ${setting.toLowerCase()}`,
    backToAll: 'Back to every kind of work',
  },
  de: {
    metaTitle: 'Wo Bauroboter schon arbeiten',
    metaDescription: 'Jeder belegte Einsatz eines Bau- oder Universalroboters, den wir verfolgen: täglicher Einsatz, Pilotprojekte und Vorführungen nach Einsatzbereich, Land und Roboter, jeweils mit Quelle.',
    kicker: 'Einsatzbeispiele',
    title: 'Wo Roboter schon arbeiten',
    lead: 'Deutsche Baustellen, Tunnel in Schweden, Hochhäuser in Tokio, Solarparks in Texas. Jeder Einsatz hier wurde auf einem echten Projekt oder in einer Vorführung gezeigt und verweist auf seine Quelle.',
    totalLabel: 'Belegte Einsätze', totalHint: 'jeweils mit Quelle',
    dailyLabel: 'Im täglichen Einsatz', dailyHint: 'auf echten Projekten',
    robotsLabel: 'Roboter', robotsHint: (makers) => `von ${n(makers, 'de')} ${makers === 1 ? 'Hersteller' : 'Herstellern'}`,
    countriesLabel: 'Länder', countriesHint: 'in den Quellen genannt',
    claims: (count) => `${n(count, 'de')} weitere Herstellerangaben nennen eine Arbeit, zeigen aber kein Projekt. Sie zählen nicht mit.`,
    regionNav: 'Region', worldwide: 'Weltweit',
    stageNav: 'Wie weit erprobt', everyStage: 'Alle Stufen',
    removeCountry: (country) => `Filter ${country} entfernen`,
    shownCount: (count, filtered) => `${n(count, 'de')} ${count === 1 ? 'Einsatz' : 'Einsätze'}${filtered ? ' angezeigt' : ''}`,
    noMatch: 'Kein belegter Einsatz passt zu diesem Filter.', showAll: 'Alle anzeigen',
    mapTitle: 'Auf der Karte',
    mapCount: (places, countries, unplaced) =>
      `${n(places, 'de')} ${places === 1 ? 'Ort' : 'Orte'} in ${n(countries, 'de')} ${countries === 1 ? 'Land' : 'Ländern'}${unplaced ? ` · ${n(unplaced, 'de')} ${unplaced === 1 ? 'Einsatz' : 'Einsätze'} ohne Ortsangabe` : ''}`,
    countryFilter: 'Nach Land filtern',
    settingsTitle: (count) => `${n(count, 'de')} ${count === 1 ? 'Einsatzbereich' : 'Einsatzbereiche'}`,
    settingsLead: 'Sortiert nach der Zahl der Einsätze. Wählen Sie einen Bereich, um seine Roboter zu sehen.',
    topTitle: 'Die am besten belegten Roboter',
    topLead: 'Zuerst die meisten Einsätze im täglichen Betrieb, dann die meisten Projekte und Vorführungen.',
    usesBy: (count) => count === 1 ? 'Einsatz von' : 'Einsätze von',
    robotWord: (count) => count === 1 ? 'Roboter' : 'Robotern',
    showAllFor: (count, setting) => `Alle ${n(count, 'de')} Roboter für ${setting} anzeigen`,
    backToAll: 'Zurück zu allen Einsatzbereichen',
  },
});

/** The robot card (RobotUseCard), also shown on the company pages. */
export const USE_CARD_TEXT = bilingual({
  en: {
    noPicture: 'No picture published',
    sold: 'Sold in Germany',
    uses: (count: number) => `${n(count, 'en')} ${count === 1 ? 'use' : 'uses'}`,
    sameProjects: 'Same projects: ',
    more: (count: number) => `+${n(count, 'en')} more`,
    noPlace: 'The sources name no place.',
    projects: (count: number) => count === 1 ? 'The project and its source' : `All ${n(count, 'en')} projects and sources`,
    source: 'Source',
  },
  de: {
    noPicture: 'Kein Bild veröffentlicht',
    sold: 'In Deutschland erhältlich',
    uses: (count) => `${n(count, 'de')} ${count === 1 ? 'Einsatz' : 'Einsätze'}`,
    sameProjects: 'Gleiche Projekte: ',
    more: (count) => `+${n(count, 'de')} weitere`,
    noPlace: 'Die Quellen nennen keinen Ort.',
    projects: (count) => count === 1 ? 'Das Projekt und seine Quelle' : `Alle ${n(count, 'de')} Projekte und Quellen`,
    source: 'Quelle',
  },
});

/** The setting tiles (SettingTiles), on the start page and the use-case page. */
export const TILE_TEXT = bilingual({
  en: {
    uses: (count: number): string => count === 1 ? 'use' : 'uses',
    facts: (daily: string, robots: number, countries: number) =>
      `${daily} in daily use · ${n(robots, 'en')} robot${robots === 1 ? '' : 's'} · ${n(countries, 'en')} countr${countries === 1 ? 'y' : 'ies'}`,
  },
  de: {
    uses: (count) => count === 1 ? 'Einsatz' : 'Einsätze',
    facts: (daily, robots, countries) =>
      `${daily} im täglichen Einsatz · ${n(robots, 'de')} Roboter · ${n(countries, 'de')} ${countries === 1 ? 'Land' : 'Länder'}`,
  },
});

/** The world map (UseMap), on the use-case page and the company pages. */
export const MAP_TEXT = bilingual({
  en: {
    worldAria: 'World map of documented robot uses',
    world: 'World',
    europeAria: 'Close-up of Europe',
    europe: 'Europe close-up',
    note: 'Dot size: number of uses. Towns where the source names one, else the country.',
    dot: (place: string, count: number) => `${place}: ${n(count, 'en')} use${count === 1 ? '' : 's'}`,
  },
  de: {
    worldAria: 'Weltkarte der belegten Robotereinsätze',
    world: 'Welt',
    europeAria: 'Europa im Ausschnitt',
    europe: 'Europa im Ausschnitt',
    note: 'Punktgröße: Zahl der Einsätze. Der Ort, wenn die Quelle einen nennt, sonst das Land.',
    dot: (place, count) => `${place}: ${n(count, 'de')} ${count === 1 ? 'Einsatz' : 'Einsätze'}`,
  },
});
