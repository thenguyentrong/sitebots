import type { Floor } from '@/lib/content/vocab';
import type { TaskFacts } from '@/lib/screen/types';

type LegacyNeeds = {
  payload: string; reach: string; runtime: string;
  terrain: '' | 'paved' | 'gravel' | 'rubble' | 'mud';
  stairs: '' | 'none' | 'required';
  environment: '' | 'indoor' | 'outdoor' | 'both';
};
function numericRequirement(text: string, multiplier = 1): number | null | undefined {
  if (!text.trim()) return undefined;
  const value = Number(text) * multiplier;
  return Number.isFinite(value) && value > 0 && value <= 100000 ? value : null;
}

/** Preserve old explicit inputs once; subsequent matching reads the editable task facts. */
export function legacyFactsFromNeeds(needs: LegacyNeeds): Partial<TaskFacts> {
  const facts: Partial<TaskFacts> = {};
  const mass = numericRequirement(needs.payload);
  const reach = numericRequirement(needs.reach);
  const minutes = numericRequirement(needs.runtime, 60);
  // An invalid explicit value must not reveal a favourable inherited requirement.
  if (mass !== undefined) facts.object_mass_kg = mass === null ? null : { min: 0, max: mass };
  if (reach !== undefined) facts.reach_height_m = reach === null ? null : { min: 0, max: reach };
  if (minutes !== undefined) facts.runtime_continuous_min = minutes;
  if (needs.environment) facts.environment = needs.environment;
  if (needs.terrain) facts.floor = needs.terrain === 'paved' ? 'level' : 'uneven';
  if (needs.stairs === 'required') facts.floor = 'stairs';
  return facts;
}

/** Invalid old text remains in the saved plan and is surfaced until a current task value replaces it. */
export function legacyRequirementIssues(needs: LegacyNeeds, facts: Pick<TaskFacts, 'object_mass_kg' | 'reach_height_m' | 'runtime_continuous_min'>): string[] {
  const entries = [
    { raw: needs.payload, value: facts.object_mass_kg, label: 'object mass', multiplier: 1 },
    { raw: needs.reach, value: facts.reach_height_m, label: 'working height', multiplier: 1 },
    { raw: needs.runtime, value: facts.runtime_continuous_min, label: 'continuous runtime in hours', multiplier: 60 },
  ];
  return entries.filter((entry) => entry.value === null && numericRequirement(entry.raw, entry.multiplier) === null)
    .map((entry) => `The saved ${entry.label} value "${entry.raw}" could not be transferred as a valid requirement. Enter a current value or keep it explicitly unknown.`);
}

/** The task floor is coarser than old terrain inputs; retain detail only while it remains compatible. */
export function retainedLegacyTerrain(terrain: string, floor: Floor | null): 'gravel' | 'rubble' | 'mud' | undefined {
  if (floor !== 'uneven' && floor !== 'mixed') return undefined;
  return terrain === 'gravel' || terrain === 'rubble' || terrain === 'mud' ? terrain : undefined;
}
