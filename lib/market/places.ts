import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import europe from '@/lib/maps/europe.json';
import { project } from '@/lib/maps/project';
import { loadJobs } from './jobs';
import { robotHref } from './links';
import { loadMarket } from './load';
import { ORDERABLE, STAGE_RANK } from './match';
import type { EvidenceStage, GermanyStatus } from './schema';

// Server-side only. Where robots have done construction-site work: every pilot and daily use on a
// site job, placed by data/market/places.json. Pins merge the projects in one town; projects whose
// source names no town are listed by country.

type Place = { town?: string; country: string; lat?: number; lon?: number };
export type MapProject = {
  job: string; jobHref: string; robot: string; robotHref: string; stage: EvidenceStage; status: GermanyStatus;
  task: string; where: string; date: string | null; url: string | null;
};
/** `x`, `y` in map units (lib/maps/project.ts); `sold`: one of its robots can be ordered in Germany. */
export type MapPin = { id: string; town: string; country: string; x: number; y: number; stage: EvidenceStage; sold: boolean; projects: MapProject[] };
export type MapView = { viewBox: number[]; countries: { iso: string; name: string; d: string }[] };
export type ProjectMapData = {
  europe: MapView; germany: MapView; pins: MapPin[];
  /** Projects without a town on the map, by country, Europe first. */
  unpinned: { country: string; name: string; projects: MapProject[] }[];
  /** Projects whose source names no place at all. */
  unnamed: MapProject[];
  total: number;
};

export const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Germany', AT: 'Austria', CH: 'Switzerland', CZ: 'Czech Republic', DK: 'Denmark', SE: 'Sweden', NO: 'Norway', GB: 'United Kingdom', FR: 'France',
  ES: 'Spain', NL: 'Netherlands', PL: 'Poland', SK: 'Slovakia', HU: 'Hungary', BG: 'Bulgaria', US: 'USA', CN: 'China', HK: 'Hong Kong', SG: 'Singapore',
  AE: 'United Arab Emirates', KR: 'South Korea', JP: 'Japan', MY: 'Malaysia', AU: 'Australia',
};
const EUROPE = new Set(['DE', 'AT', 'CH', 'CZ', 'DK', 'SE', 'NO', 'GB', 'FR', 'ES', 'NL', 'PL', 'SK', 'HU', 'BG']);

let places: Record<string, Place[]> | null = null;
export function loadPlaces(): Record<string, Place[]> {
  places ??= JSON.parse(readFileSync(join(process.cwd(), 'data', 'market', 'places.json'), 'utf8')).places as Record<string, Place[]>;
  return places;
}

/** Every pilot and daily use on a construction-site job, one entry per robot and project. */
export function siteProjects(): MapProject[] {
  const { jobs } = loadJobs();
  const site = new Map(jobs.filter((job) => job.where === 'site').map((job) => [job.id, job]));
  return loadMarket().flatMap((robot) => robot.evidence.flatMap((entry) => {
    if (STAGE_RANK[entry.stage] < STAGE_RANK.pilot) return [];
    // One entry can prove several site jobs, for example a scan walk that also records progress.
    return entry.taskIds.flatMap((id) => site.get(id) ?? []).map((job) => ({
      job: job.title, jobHref: job.href, robot: robot.name, robotHref: robotHref(robot.id), stage: entry.stage, status: robot.germany.status,
      task: entry.task, where: entry.where ?? '', date: entry.date, url: robot.sources.find((source) => source.id === entry.sourceId)?.url ?? null,
    }));
  }));
}

export function loadProjectMap(): ProjectMapData {
  const projects = siteProjects();
  const known = loadPlaces();
  const pins = new Map<string, MapPin>();
  const unpinned = new Map<string, MapProject[]>();
  const unnamed: MapProject[] = [];
  for (const item of projects) {
    const at = known[item.where] ?? [];
    if (!at.length) { unnamed.push(item); continue; }
    for (const place of at) {
      if (place.lat === undefined || place.lon === undefined || !place.town) {
        unpinned.set(place.country, [...(unpinned.get(place.country) ?? []), item]);
        continue;
      }
      const id = place.country + ':' + place.town;
      const [x, y] = project(place.lat, place.lon);
      const pin = pins.get(id) ?? { id, town: place.town, country: place.country, x, y, stage: item.stage, sold: false, projects: [] };
      pin.projects.push(item);
      if (STAGE_RANK[item.stage] > STAGE_RANK[pin.stage]) pin.stage = item.stage;
      pins.set(id, pin);
    }
  }
  // A pin is "sold here" when a robot you can order in Germany did its strongest work, not just any work.
  for (const pin of pins.values()) {
    pin.projects.sort((a, b) => STAGE_RANK[b.stage] - STAGE_RANK[a.stage] || Number(ORDERABLE.includes(b.status)) - Number(ORDERABLE.includes(a.status)));
    pin.sold = pin.projects.some((item) => item.stage === pin.stage && ORDERABLE.includes(item.status));
  }
  const name = (country: string) => COUNTRY_NAMES[country] ?? country;
  return {
    europe: europe.views.europe, germany: europe.views.germany,
    pins: [...pins.values()].sort((a, b) => a.y - b.y),
    unpinned: [...unpinned].map(([country, list]) => ({ country, name: name(country), projects: list }))
      .sort((a, b) => Number(EUROPE.has(b.country)) - Number(EUROPE.has(a.country)) || b.projects.length - a.projects.length || a.name.localeCompare(b.name)),
    unnamed, total: projects.length,
  };
}
