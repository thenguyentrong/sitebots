import { TASK_CAPABILITIES, type TaskCapability, type Trust } from '@/lib/spec/enums';
import type { Candidate } from '@/lib/match/types';

/** The 17 site tasks, grouped the way a site manager thinks about a day. Every task appears exactly once. */
export const TASK_BUCKETS: { id: string; label: string; tasks: TaskCapability[] }[] = [
  { id: 'transport', label: 'Transport', tasks: ['carry_payload', 'fetch_and_deliver', 'shelf_pick', 'tool_handoff'] },
  { id: 'inspection', label: 'Inspection & capture', tasks: ['site_inspection', 'progress_scan_360', 'lidar_scan', 'patrol_monitoring'] },
  { id: 'manipulation', label: 'Manipulation & tools', tasks: ['teleoperated_manipulation', 'drilling', 'screwing', 'material_sorting', 'kitting', 'machine_tending', 'palletising'] },
  { id: 'navigation', label: 'Navigation', tasks: ['autonomous_nav_indoor', 'autonomous_nav_outdoor', 'stair_climbing'] },
  { id: 'sitework', label: 'Site work', tasks: ['layout_marking', 'cleaning_sweep', 'surface_finishing'] },
];

export const TASK_LABEL: Record<TaskCapability, string> = {
  carry_payload: 'Carry material', fetch_and_deliver: 'Fetch and deliver', shelf_pick: 'Pick from shelves', tool_handoff: 'Hand over tools',
  site_inspection: 'Site inspection', progress_scan_360: '360° progress capture', lidar_scan: 'LiDAR scanning', layout_marking: 'Layout marking',
  drilling: 'Drilling', screwing: 'Screwing', cleaning_sweep: 'Sweeping', material_sorting: 'Sorting material', patrol_monitoring: 'Patrol / monitoring',
  teleoperated_manipulation: 'Teleoperated handling', autonomous_nav_indoor: 'Navigate indoors alone', autonomous_nav_outdoor: 'Navigate outdoors alone', stair_climbing: 'Climb stairs',
  kitting: 'Kitting', machine_tending: 'Machine tending', palletising: 'Palletising', surface_finishing: 'Surface finishing',
};

const TASK_LABEL_DE: Record<TaskCapability, string> = {
  carry_payload: 'Material tragen', fetch_and_deliver: 'Holen und bringen', shelf_pick: 'Aus Regalen greifen', tool_handoff: 'Werkzeug übergeben',
  site_inspection: 'Baustelle prüfen', progress_scan_360: '360°-Baufortschritt erfassen', lidar_scan: 'LiDAR-Scan', layout_marking: 'Anzeichnen',
  drilling: 'Bohren', screwing: 'Schrauben', cleaning_sweep: 'Kehren', material_sorting: 'Material sortieren', patrol_monitoring: 'Streife / Überwachung',
  teleoperated_manipulation: 'Ferngesteuertes Handhaben', autonomous_nav_indoor: 'Allein navigieren (innen)', autonomous_nav_outdoor: 'Allein navigieren (außen)', stair_climbing: 'Treppen steigen',
  kitting: 'Kommissionieren', machine_tending: 'Maschinen beschicken', palletising: 'Palettieren', surface_finishing: 'Oberflächen bearbeiten',
};
const BUCKET_LABEL_DE: Record<string, string> = { transport: 'Transport', inspection: 'Prüfen und Erfassen', manipulation: 'Handhaben und Werkzeuge', navigation: 'Navigation', sitework: 'Arbeiten auf der Baustelle' };
const WORDING = {
  en: { notAssessed: 'not assessed', confidence: 'source confidence not established', thirdParty: 'third-party report only', maker: 'maker states it', assessed: 'assessed with evidence', notConfirmed: 'task not confirmed' },
  de: { notAssessed: 'nicht bewertet', confidence: 'Verlässlichkeit der Quelle nicht belegt', thirdParty: 'nur von Dritten berichtet', maker: 'laut Hersteller', assessed: 'mit Belegen bewertet', notConfirmed: 'Aufgabe nicht bestätigt' },
};
/** A task's name in the page's language. */
export const taskLabel = (id: TaskCapability, lang: 'en' | 'de' = 'en'): string => (lang === 'de' ? TASK_LABEL_DE : TASK_LABEL)[id];
/** The short name on the radar's spokes. */
export const taskShortLabel = (id: TaskCapability, lang: 'en' | 'de' = 'en'): string =>
  lang === 'de' ? ({ autonomous_nav_indoor: 'Navigation innen', autonomous_nav_outdoor: 'Navigation außen' } as Record<string, string>)[id] ?? TASK_LABEL_DE[id] : TASK_LABEL[id].replace('Navigate ', '').replace(' alone', '');
export const bucketLabel = (id: string, lang: 'en' | 'de' = 'en'): string => (lang === 'de' ? BUCKET_LABEL_DE[id] : null) ?? TASK_BUCKETS.find((b) => b.id === id)?.label ?? id;

export type TaskStatus = 'yes' | 'partial' | 'unknown' | 'no';
export type TaskRow = { id: TaskCapability; label: string; status: TaskStatus; wording: string };

/**
 * Per task: yes when the curated list names it with verified/assessed trust,
 * partial when only a third party reports it. A task absent from a list is
 * unknown: absence is not evidence that it cannot be performed.
 */
export function taskRows(c: Candidate, lang: 'en' | 'de' = 'en'): { rows: TaskRow[]; trust: Trust } {
  const w = WORDING[lang];
  const spec = c.card.specs?.task_capabilities;
  const listed = new Set<string>(Array.isArray(spec?.value) ? (spec.value as string[]) : c.card.task_capabilities ?? []);
  const assessed = Boolean(spec) || listed.size > 0;
  const trust: Trust = spec?.trust ?? (listed.size ? 'reported' : 'unknown');
  const rows = TASK_CAPABILITIES.map((id): TaskRow => {
    if (!assessed) return { id, label: taskLabel(id, lang), status: 'unknown', wording: w.notAssessed };
    if (listed.has(id) && trust === 'unknown') return { id, label: taskLabel(id, lang), status: 'unknown', wording: w.confidence };
    if (listed.has(id)) return trust === 'reported' ? { id, label: taskLabel(id, lang), status: 'partial', wording: w.thirdParty } : { id, label: taskLabel(id, lang), status: 'yes', wording: trust === 'verified' ? w.maker : w.assessed };
    return { id, label: taskLabel(id, lang), status: 'unknown', wording: w.notConfirmed };
  });
  return { rows, trust };
}

export const TASK_SCORE: Record<TaskStatus, number | null> = { yes: 1, partial: 0.5, no: 0, unknown: null };
