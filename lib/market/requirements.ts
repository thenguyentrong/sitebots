import { z } from 'zod';

// What a job needs from a robot, per use case. Editorial task assumptions, not measurements.
export const MOVEMENT = ['stationary', 'level_floors', 'rough_ground', 'stairs_ladders'] as const;
export const HAND_WORK = ['none', 'simple_grip', 'two_arm', 'dexterous', 'tool'] as const;
export const GENERAL_FIT = ['plausible', 'stretch', 'no'] as const;
// Shared with specialisedFor in market records.
export const SPECIALISED_JOBS = [
  'layout_marking', 'drilling_anchoring', 'demolition', 'surface_spraying', 'drywall_finishing', 'floor_grinding',
  'concrete_finishing', 'rebar_tying', 'rebar_placement', 'bricklaying', 'printing_3d', 'material_lifting',
  'welding', 'facade_cleaning', 'glazing_installation', 'scanning_documentation', 'excavation', 'tunnelling', 'other',
] as const;

export type Movement = (typeof MOVEMENT)[number];
export type HandWork = (typeof HAND_WORK)[number];

export const UseCaseNeedsSchema = z.object({
  id: z.string().min(1),
  movement: z.enum(MOVEMENT),
  handWork: z.enum(HAND_WORK),
  maxObjectKg: z.number().nonnegative().nullable(),
  tool: z.string().nullable(),
  sensing: z.string().nullable(),
  generalPurpose: z.enum(GENERAL_FIT),
  specialisedJob: z.enum(SPECIALISED_JOBS).nullable(),
  reason: z.string().trim().min(10),
});
export const NeedsBatchSchema = z.object({ schemaVersion: z.literal(1), useCases: z.array(UseCaseNeedsSchema) });
export type UseCaseNeeds = z.infer<typeof UseCaseNeedsSchema>;
