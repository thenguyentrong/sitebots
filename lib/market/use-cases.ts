import { LOCALE, type Lang } from '@/lib/i18n/config';
import { MARKET_TEXT } from '@/lib/i18n/market';
import { robotHref } from './links';
import { loadMarket } from './load';
import { countryLabel, loadPlaces, placeLabel } from './places';
import type { RobotType } from './schema';

// Server-side only. Every documented use of a robot, from the evidence in the market records, sorted into the
// settings a builder thinks in (high-rise, underground, roads ...) and counted for the use-case page.

export type UseStage = 'deployment' | 'pilot' | 'demo';
export const USE_STAGES: readonly UseStage[] = ['deployment', 'pilot', 'demo'];
export const STAGE_LABEL: Record<UseStage, string> = MARKET_TEXT.en.useStage;
export const useStageLabel = (stage: UseStage, lang: Lang = 'en'): string => MARKET_TEXT[lang].useStage[stage];
/** A setting's name and its one-line description in the page's language (SETTINGS keeps the English). */
export const settingText = (id: string, lang: Lang = 'en'): { label: string; intro: string } => MARKET_TEXT[lang].setting[id] ?? MARKET_TEXT.en.setting[id] ?? { label: id, intro: '' };
export const regionLabel = (id: string, lang: Lang = 'en'): string => MARKET_TEXT[lang].region[id] ?? id;

export const SETTINGS = [
  { id: 'high_rise', label: 'High-rise and multi-storey', intro: 'Towers, apartment blocks and multi-storey buildings: lifts, façades, floors and the work between them.' },
  { id: 'underground', label: 'Underground and tunnels', intro: 'Tunnels, mines, metro and shafts: spraying, drilling, inspection and repair below ground.' },
  { id: 'civil', label: 'Roads, bridges and civil works', intro: 'Roads, motorways, airports, ports, bridges and earthworks.' },
  { id: 'energy', label: 'Solar, wind and data centres', intro: 'Solar parks, wind farms and data-centre builds.' },
  { id: 'interior', label: 'Interior finishing', intro: 'Drywall, painting, plaster, tiles, floors, glazing and installation inside buildings.' },
  { id: 'structure', label: 'Structure, concrete and demolition', intro: 'Concrete, masonry, 3D printing, rebar, demolition and concrete repair.' },
  { id: 'prefab', label: 'Prefab and factories', intro: 'Timber-frame, precast and steel plants that build parts of buildings.' },
  { id: 'logistics', label: 'Site logistics, survey and inspection', intro: 'Moving material, layout and survey, progress scans and plant inspection.' },
  { id: 'industry', label: 'Factories, warehouses and plants', intro: 'General-purpose robots at work in car plants, warehouses and industrial sites.' },
  { id: 'research', label: 'Labs and research', intro: 'Humanoids and other general-purpose robots tested in labs and pilot cells.' },
] as const;
export type SettingId = (typeof SETTINGS)[number]['id'];

const BY_JOB: Record<string, SettingId> = {
  site_tunnelling: 'underground',
  site_roads_paving: 'civil', site_earthworks: 'civil', asset_inspection_infrastructure: 'civil',
  site_lifts: 'high_rise',
  site_drywall: 'interior', site_painting: 'interior', site_tiling: 'interior', site_plaster: 'interior', site_flooring: 'interior',
  site_screed: 'interior', site_windows_doors: 'interior', site_electrical: 'interior',
  'research:prepare-hardened-concrete-floors': 'interior', 'research:polish-concrete-terrazzo-floors': 'interior',
  site_concrete: 'structure', site_concrete_repair: 'structure', site_masonry: 'structure', site_demolition: 'structure',
  prefab_timber: 'prefab', precast_concrete: 'prefab', steel_fabrication: 'prefab', site_timber_frame: 'prefab',
  site_setup_logistics: 'logistics', construction_logistics_hub: 'logistics', material_yard_warehouse: 'logistics',
  site_survey_documentation: 'logistics', facility_operation: 'logistics', site_cleaning_waste: 'logistics',
};
// The words of the source decide first: a drywall robot in a tower counts for high-rise.
const BY_WORDS: [SettingId, RegExp][] = [
  ['underground', /tunnel|underground|\bmine\b|mining|metro|subway|sewer|shaft|cavern|hydropower/i],
  ['high_rise', /high-?rise|skyscraper|\btower\b|storey|stories|multi-?stor|\bfloors?\b \d|apartment block|residential tower|façade|facade|curtain wall/i],
  ['energy', /solar|photovoltaic|\bpv\b|wind farm|wind turbine|data cent(er|re)/i],
  ['civil', /road|highway|motorway|expressway|bridge|airport|runway|\bport\b|harbour|harbor|railway|\brail\b|\bdam\b|quarry|gravel pit/i],
];

const LAB = /universit|laborator|\blab\b|research|institute|hochschule|academ|campus|competition|hackathon/i;
const INDUSTRY = /factory|plant|assembly|warehouse|logistic|automotive|\bcar\b|production line|manufactur|\bbmw\b|mercedes|\bnio\b|zeekr|byd|foxconn|amazon|gxo|schaeffler|audi|volkswagen|\bvw\b/i;

/** The setting of one documented use. `fallback` is the robot's own job list, for entries that name no job. */
export function settingOf(taskIds: readonly string[], text: string, type: RobotType = 'specialised', fallback: readonly string[] = []): SettingId {
  for (const [id, words] of BY_WORDS) if (words.test(text)) return id;
  for (const task of taskIds.length ? taskIds : fallback) { const id = BY_JOB[task] ?? BY_JOB[task.split('/')[0]]; if (id) return id; }
  if (taskIds.some((task) => task.startsWith('research:')) || LAB.test(text)) return 'research';
  if (type !== 'specialised' && INDUSTRY.test(text)) return 'industry';
  if (type === 'humanoid') return 'industry';
  return 'logistics';
}

export const REGIONS = [
  { id: 'DE', label: 'Germany' },
  { id: 'EU', label: 'Rest of Europe' },
  { id: 'CN', label: 'China and Hong Kong' },
  { id: 'JP', label: 'Japan' },
  { id: 'KR', label: 'South Korea' },
  { id: 'US', label: 'USA' },
  { id: 'OTHER', label: 'Rest of the world' },
  { id: 'NONE', label: 'Place not named' },
] as const;
export type RegionId = (typeof REGIONS)[number]['id'];
const EUROPE = new Set(['AT', 'CH', 'CZ', 'DK', 'SE', 'NO', 'GB', 'FR', 'ES', 'NL', 'PL', 'SK', 'HU', 'BG', 'FI', 'IT', 'BE', 'PT', 'IE', 'LU', 'SI', 'HR', 'RO', 'EE', 'LV', 'LT', 'GR']);
const NAMES: [string, RegExp][] = [
  ['DE', /germany|deutschland/i], ['US', /\busa\b|united states|\bu\.s\.|texas|california|new york|nevada|arizona|colorado|kansas|florida/i], ['CN', /china|beijing|shanghai|shenzhen|guangzhou|hong kong/i],
  ['JP', /japan|tokyo|osaka/i], ['KR', /korea|seoul|busan|incheon/i], ['GB', /\buk\b|united kingdom|england|scotland|london/i], ['FR', /france|paris/i],
  ['CH', /switzerland|zurich|zürich/i], ['AT', /austria|vienna|wien/i], ['NL', /netherlands|amsterdam|rotterdam/i], ['DK', /denmark|copenhagen/i], ['SE', /sweden|stockholm/i],
  ['NO', /norway|oslo/i], ['FI', /finland|helsinki/i], ['ES', /spain|madrid|barcelona/i], ['IT', /italy|milan|rome/i], ['PL', /poland|warsaw/i], ['CZ', /czech/i],
  ['SG', /singapore/i], ['AE', /\buae\b|emirates|dubai|abu dhabi/i], ['SA', /saudi/i], ['AU', /australia/i], ['CA', /canada|toronto/i], ['IN', /india/i], ['MY', /malaysia/i],
];

/** The countries a `where` text names: the hand-set place list first, then country and city names in the text. */
export function countriesOf(where: string | null): string[] {
  if (!where) return [];
  const listed = loadPlaces()[where];
  if (listed?.length) return [...new Set(listed.map((place) => place.country))];
  return [...new Set(NAMES.filter(([, words]) => words.test(where)).map(([code]) => code))];
}
export function regionOf(countries: readonly string[]): RegionId {
  if (!countries.length) return 'NONE';
  const c = countries[0];
  if (c === 'DE') return 'DE';
  if (EUROPE.has(c)) return 'EU';
  if (c === 'CN' || c === 'HK') return 'CN';
  if (c === 'JP' || c === 'KR' || c === 'US') return c;
  return 'OTHER';
}
export const countryName = (code: string, lang: Lang = 'en') => countryLabel(code, lang);

/**
 * A use's place in the page's language. `place` is computed once, in English, when loadUseCases() fills
 * its cache; German pages name it again here at render time so the cache stays one list for both languages.
 */
export function usePlace(use: Pick<UseCase, 'where' | 'place' | 'countries'>, lang: Lang = 'en'): string {
  if (lang === 'en') return use.place;
  return placeLabel(use.where, lang) || (use.countries[0] ? countryName(use.countries[0], lang) : '');
}

/**
 * The date of a use's source, which the records keep as "2024", "2024-06" or "2024-06-14". English pages
 * print it as stored; German pages write "Juni 2024" and "14.06.2024".
 */
export function useDate(date: string, lang: Lang = 'en'): string {
  if (lang === 'en') return date;
  const [year, month, day] = date.split('-').map(Number);
  if (!year || (date.length > 4 && !month)) return date;
  if (!month) return String(year);
  const at = new Date(Date.UTC(year, month - 1, day || 1));
  if (Number.isNaN(at.getTime())) return date;
  return new Intl.DateTimeFormat(LOCALE[lang], day ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
}

export type UseCase = {
  key: string; robotId: string; robot: string; maker: string; type: RobotType; href: string;
  task: string; where: string | null; place: string; countries: string[]; region: RegionId; date: string | null;
  stage: UseStage; setting: SettingId; sourceUrl: string | null; sold: boolean;
};

let cached: UseCase[] | null = null;
/** Every demonstration, pilot and daily use with its source. Maker claims without a shown job are left out. */
export function loadUseCases(): UseCase[] {
  if (cached) return cached;
  cached = loadMarket().flatMap((robot) => robot.evidence.flatMap((entry, i) => {
    if (!(USE_STAGES as readonly string[]).includes(entry.stage)) return [];
    const countries = countriesOf(entry.where);
    const text = [entry.task, entry.where ?? '', entry.note ?? ''].join(' ');
    return [{
      key: robot.id + ':' + i, robotId: robot.id, robot: robot.name, maker: robot.maker, type: robot.robotType, href: robotHref(robot.id),
      task: entry.task, where: entry.where, place: placeLabel(entry.where) || (countries[0] ? countryName(countries[0]) : ''), countries, region: regionOf(countries),
      date: entry.date, stage: entry.stage as UseStage, setting: settingOf(entry.taskIds, text, robot.robotType, robot.specialisedFor ?? []),
      sourceUrl: robot.sources.find((source) => source.id === entry.sourceId)?.url ?? null,
      sold: robot.germany.status !== 'not_sold',
    }];
  }));
  const rank: Record<UseStage, number> = { deployment: 0, pilot: 1, demo: 2 };
  cached.sort((a, b) => rank[a.stage] - rank[b.stage] || (b.date ?? '').localeCompare(a.date ?? '') || a.robot.localeCompare(b.robot));
  return cached;
}

export type UseCaseStats = {
  total: number; byStage: Record<UseStage, number>; robots: number; makers: number; countries: number; claims: number;
  byRegion: { id: RegionId; label: string; count: number }[];
  bySetting: { id: SettingId; label: string; count: number; deployments: number }[];
  topRobots: { robotId: string; robot: string; href: string; count: number; deployments: number }[];
  topCountries: { code: string; name: string; count: number }[];
};

export function useCaseStats(list: UseCase[] = loadUseCases()): UseCaseStats {
  const count = <T extends string>(keys: T[]) => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<T, number>());
  const byStage = { deployment: 0, pilot: 0, demo: 0 } as Record<UseStage, number>;
  for (const u of list) byStage[u.stage]++;
  const regions = count(list.map((u) => u.region));
  const settings = count(list.map((u) => u.setting));
  const settingDeploy = count(list.filter((u) => u.stage === 'deployment').map((u) => u.setting));
  const robotCount = count(list.map((u) => u.robotId));
  const robotDeploy = count(list.filter((u) => u.stage === 'deployment').map((u) => u.robotId));
  const countryCount = count(list.flatMap((u) => u.countries));
  const byId = new Map(list.map((u) => [u.robotId, u]));
  return {
    total: list.length, byStage,
    robots: robotCount.size, makers: new Set(list.map((u) => u.maker)).size, countries: countryCount.size,
    claims: loadMarket().reduce((sum, robot) => sum + robot.evidence.filter((entry) => entry.stage === 'claim').length, 0),
    byRegion: REGIONS.map((r) => ({ id: r.id, label: r.label, count: regions.get(r.id) ?? 0 })),
    bySetting: SETTINGS.map((s) => ({ id: s.id, label: s.label, count: settings.get(s.id) ?? 0, deployments: settingDeploy.get(s.id) ?? 0 })),
    topRobots: [...robotCount].sort((a, b) => (robotDeploy.get(b[0]) ?? 0) - (robotDeploy.get(a[0]) ?? 0) || b[1] - a[1]).slice(0, 8)
      .map(([id, n]) => ({ robotId: id, robot: byId.get(id)!.robot, href: byId.get(id)!.href, count: n, deployments: robotDeploy.get(id) ?? 0 })),
    topCountries: [...countryCount].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([code, n]) => ({ code, name: countryName(code), count: n })),
  };
}
