import { z } from 'zod';
import {
  DATA_SENSITIVITY,
  DUST_TYPES,
  DUST_ZONES,
  ERROR_TOLERANCE,
  EXPOSURES,
  FLOORS,
  INCUMBENT_STATUS,
  SAFETY_CRITICALITY,
  VARIABILITY,
  WET_LEVELS,
} from '@/lib/content/vocab';
import type { FactKey, TaskFacts } from './types';

/**
 * TaskFacts as a zod schema, for what a project stores: the facts of a custom
 * task and a visitor's overrides on a library task. null is unknown, and the
 * defaults make every key present so a stored draft never loses a field.
 */
export const RangeSchema = z.object({ min: z.number().min(0).max(100000), max: z.number().min(0).max(100000) });

export const FactsSchema = z.object({
  object_mass_kg: RangeSchema.nullable().default(null),
  variability: z.enum(VARIABILITY).nullable().default(null),
  error_tolerance: z.enum(ERROR_TOLERANCE).nullable().default(null),
  safety_criticality: z.enum(SAFETY_CRITICALITY).nullable().default(null),
  reach_height_m: RangeSchema.nullable().default(null),
  environment: z.enum(EXPOSURES).nullable().default(null),
  dust: z.object({ type: z.enum(DUST_TYPES), zone: z.enum(DUST_ZONES) }).nullable().default(null),
  wet: z.enum(WET_LEVELS).nullable().default(null),
  floor: z.enum(FLOORS).nullable().default(null),
  incumbent_automation: z.object({ status: z.enum(INCUMBENT_STATUS), machine_classes: z.array(z.string().max(60)).max(20) }).nullable().default(null),
  data_sensitivity: z.enum(DATA_SENSITIVITY).nullable().default(null),
  runtime_continuous_min: z.number().min(0).max(100000).nullable().default(null),
});
export type Facts = z.infer<typeof FactsSchema>;
export const emptyFacts = (): Facts => FactsSchema.parse({});

// Facts must stay assignable to the engine's TaskFacts; this line fails to compile if a key drifts.
const _engineShape: TaskFacts = emptyFacts();
void _engineShape;

/** Visitor-facing labels for the facts the screen asks about, in the order the card shows them. */
export const FACT_LABELS: Record<FactKey, string> = {
  object_mass_kg: 'Heaviest object handled (kg)',
  variability: 'How much the task varies',
  error_tolerance: 'What an error costs',
  safety_criticality: 'Safety relevance',
  reach_height_m: 'Working height (m)',
  environment: 'Indoor or outdoor',
  dust: 'Dust at the step',
  wet: 'Wet conditions',
  floor: 'Floor',
  incumbent_automation: 'Existing automation for this step',
  data_sensitivity: 'Cameras and data',
  runtime_continuous_min: 'Longest unbroken run (minutes)',
};
