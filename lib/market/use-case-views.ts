import geography from '@/data/manufacturers/countries.json';
import type { Lang } from '@/lib/i18n/config';
import { loadMarket, type MarketRobot, type Picture } from './load';
import { loadPlaces, townLabel } from './places';
import { SETTINGS, countryName, settingText, usePlace, type SettingId, type UseCase, type UseStage } from './use-cases';

// Server-side only. What the use-case pictures need: a photo of each robot at work where we have one,
// the uses as dots on a world map, and the uses grouped per robot and per setting.

export type StageCounts = Record<UseStage, number>;
export type ScenePicture = { src: string; alt: string; width: number; height: number; credit: string; scene: boolean };

// Words in a picture's description that say the robot is shown at work, not on a plain background.
const SCENE = /\b(site|building|construction|tunnel|floors?|walls?|ceiling|deck|bridge|workers?|road|solar|factory|warehouse|plant|project|install|drill|spray|laying|placing|working|at work|in use|concrete|façade|facade|room|apartment|interior|outdoor|field|mine|street|mounting|printing|tying|painting|scanning|carrying|lifting)/i;
const STUDIO = /white background|studio|render|isolated|product shot|cut-?out|transparent|on white|plain (wall|background)|grey background|gray background|side view|front view|full body/i;

function score(picture: Picture): number {
  const alt = picture.alt ?? '';
  // "…, picture from example.com" says nothing about what it shows, so a described picture goes first.
  return (SCENE.test(alt) ? 3 : 0) - (STUDIO.test(alt) ? 3 : 0) - (/picture from /i.test(alt) ? 1 : 0) + (picture.width / picture.height >= 1.3 ? 1 : 0);
}

/** The robot's best picture for a photo card: one that shows it at work if the gallery has one. `avoid` skips pictures already on the page. */
export function scenePicture(robot: Pick<MarketRobot, 'picture' | 'gallery'>, avoid?: Set<string>): ScenePicture | null {
  const all = [robot.picture, ...robot.gallery].filter((p): p is Picture => Boolean(p?.src));
  if (!all.length) return null;
  const ranked = all.map((p, i) => ({ p, s: score(p) - i * 0.01 })).sort((a, b) => b.s - a.s);
  const best = ranked.find(({ p }) => !avoid?.has(p.src)) ?? ranked[0];
  return { src: best.p.src, alt: best.p.alt, width: best.p.width, height: best.p.height, credit: best.p.credit, scene: best.s >= 2 };
}

let robots: Map<string, MarketRobot> | null = null;
const robotById = (id: string) => (robots ??= new Map(loadMarket().map((r) => [r.id, r]))).get(id);

export const stageCounts = (list: readonly UseCase[]): StageCounts => {
  const out: StageCounts = { deployment: 0, pilot: 0, demo: 0 };
  for (const use of list) out[use.stage]++;
  return out;
};
const best = (c: StageCounts): UseStage => c.deployment ? 'deployment' : c.pilot ? 'pilot' : 'demo';

// ---- Map -------------------------------------------------------------------------------------------------

/** Equirectangular, 900 × 450 for the whole world, the same projection as the company map. */
export const project = (lon: number, lat: number) => ({ x: (lon + 180) * 2.5, y: (90 - lat) * 2.5 });
const EXTRA_CENTRES: Record<string, [number, number]> = { HK: [114.17, 22.32], SG: [103.82, 1.35] };
const centre = (code: string): [number, number] | null => {
  const c = geography.countries.find((x) => x.code === code);
  return c ? [c.longitude, c.latitude] : EXTRA_CENTRES[code] ?? null;
};

export type UsePoint = {
  id: string; label: string; country: string; x: number; y: number; count: number; stages: StageCounts; best: UseStage; town: boolean;
  /** The town's own name, so a map in another language can name the point again (see pointLabel). */
  townName: string | null;
};

/** "Erlangen, Germany" or the country alone, in the page's language. */
export const pointLabel = (p: Pick<UsePoint, 'townName' | 'country'>, lang: Lang = 'en') => p.townName ? townLabel(p.townName, lang) + ', ' + countryName(p.country, lang) : countryName(p.country, lang);

/** One dot per town (or per country when the source names no town), sized later by its number of uses. */
export function usePoints(list: readonly UseCase[], lang: Lang = 'en'): { points: UsePoint[]; unplaced: number; countries: { code: string; name: string; count: number; stages: StageCounts }[] } {
  const points = new Map<string, Omit<UsePoint, 'best'>>();
  const countries = new Map<string, StageCounts>();
  let unplaced = 0;
  for (const use of list) {
    const listed = use.where ? loadPlaces()[use.where] ?? [] : [];
    const spots = listed.length ? listed.map((p) => ({ town: p.town ?? null, country: p.country, lat: p.lat, lon: p.lon })) : use.countries.map((country) => ({ town: null, country, lat: undefined, lon: undefined }));
    if (!spots.length) { unplaced++; continue; }
    for (const country of new Set(spots.map((s) => s.country))) {
      const c = countries.get(country) ?? { deployment: 0, pilot: 0, demo: 0 };
      c[use.stage]++;
      countries.set(country, c);
    }
    for (const spot of spots) {
      const at = spot.lat != null && spot.lon != null ? [spot.lon, spot.lat] as [number, number] : centre(spot.country);
      if (!at) continue;
      const id = spot.town && spot.lat != null ? spot.country + ':' + spot.town : spot.country;
      const townName = spot.town && spot.lat != null ? spot.town : null;
      const known = points.get(id) ?? { id, label: pointLabel({ townName, country: spot.country }, lang), country: spot.country, ...project(at[0], at[1]), count: 0, stages: { deployment: 0, pilot: 0, demo: 0 }, town: Boolean(townName), townName };
      known.count++;
      known.stages[use.stage]++;
      points.set(id, known);
    }
  }
  return {
    points: [...points.values()].map((p) => ({ ...p, best: best(p.stages) })).sort((a, b) => b.count - a.count),
    unplaced,
    countries: [...countries].map(([code, stages]) => ({ code, name: countryName(code, lang), stages, count: stages.deployment + stages.pilot + stages.demo })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

// ---- Robots and settings ---------------------------------------------------------------------------------

export type RobotUses = {
  robotId: string; robot: string; maker: string; href: string; sold: boolean;
  /** Sister models with the same projects, shown on this robot's card. */
  variants: { robot: string; href: string }[];
  picture: ScenePicture | null; uses: UseCase[]; stages: StageCounts;
  /** Places with their country, most used first. */
  places: { label: string; country: string | null }[];
  countries: string[];
};

/** A robot's places with their country, most used first, named in the page's language. */
export function robotPlaces(uses: readonly UseCase[], lang: Lang = 'en'): { label: string; country: string | null }[] {
  const places = new Map<string, { label: string; country: string | null; n: number }>();
  for (const use of uses) {
    const label = usePlace(use, lang);
    if (!label) continue;
    const known = places.get(label) ?? { label, country: use.countries[0] ?? null, n: 0 };
    known.n++;
    places.set(label, known);
  }
  return [...places.values()].sort((a, b) => b.n - a.n).map(({ label, country }) => ({ label, country }));
}

/** The uses grouped per robot, most daily use first. Sister models of one maker with the very same projects
 * (one record per size, say) share one card; the others are named on it as `variants`. */
export function groupByRobot(list: readonly UseCase[], avoid?: Set<string>, lang: Lang = 'en'): RobotUses[] {
  const byRobot = new Map<string, UseCase[]>();
  for (const use of list) byRobot.set(use.robotId, [...(byRobot.get(use.robotId) ?? []), use]);
  const bySignature = new Map<string, { robotId: string; uses: UseCase[]; variants: { robot: string; href: string }[] }>();
  for (const [robotId, uses] of byRobot) {
    const signature = uses[0].maker + '|' + uses.map((use) => use.task + '@' + (use.where ?? '')).sort().join('|');
    const known = bySignature.get(signature);
    if (known) known.variants.push({ robot: uses[0].robot, href: uses[0].href });
    else bySignature.set(signature, { robotId, uses, variants: [] });
  }
  return [...bySignature.values()].map(({ robotId, uses, variants }) => {
    const first = uses[0];
    const record = robotById(robotId);
    const picture = record ? scenePicture(record, avoid) : null;
    if (picture) avoid?.add(picture.src);
    return {
      robotId, robot: first.robot, maker: first.maker, href: first.href, sold: first.sold, variants, picture, uses, stages: stageCounts(uses),
      places: robotPlaces(uses, lang),
      countries: [...new Set(uses.flatMap((use) => use.countries))],
    };
  }).sort((a, b) => b.stages.deployment - a.stages.deployment || b.uses.length - a.uses.length || a.robot.localeCompare(b.robot));
}

export type SettingTile = { id: SettingId; label: string; intro: string; count: number; stages: StageCounts; robots: number; countries: string[]; picture: ScenePicture | null };

/** One picture tile per setting that has a use, biggest first; each tile takes a different robot's photo of work. */
export function settingTiles(list: readonly UseCase[], lang: Lang = 'en'): SettingTile[] {
  const used = new Set<string>();
  return SETTINGS.map((s) => ({ s, uses: list.filter((use) => use.setting === s.id) })).filter(({ uses }) => uses.length)
    .sort((a, b) => b.uses.length - a.uses.length)
    .map(({ s, uses }) => {
      const ranked = groupByRobot(uses);
      let picture: ScenePicture | null = null;
      // A photo of work beats a plain product shot; a robot already on another tile is skipped.
      for (const pass of [true, false]) {
        for (const group of ranked) {
          const record = robotById(group.robotId);
          const p = record ? scenePicture(record, used) : null;
          if (p && !used.has(p.src) && (!pass || p.scene)) { picture = p; break; }
        }
        if (picture) break;
      }
      if (picture) used.add(picture.src);
      return { id: s.id, ...settingText(s.id, lang), count: uses.length, stages: stageCounts(uses), robots: ranked.length, countries: [...new Set(uses.flatMap((use) => use.countries))], picture };
    });
}
