import { z } from 'zod';
import { DUST_TYPES, DUST_ZONES, EXPOSURES, FLOORS, NOT_SURE, SETTING_GROUPS, VALUE_DRIVERS, WET_LEVELS, type DustType } from '@/lib/content/vocab';
import type { ScreenContext } from '@/lib/screen/types';

/**
 * Station 0: the company's starting point, stored once per workspace. Every
 * question has "not sure" as a stored value, because an unanswered condition
 * must never turn into a favourable default further down the journey.
 */

const NS = NOT_SURE;
export const CONTEXT_ROLES = ['sponsor', 'project_lead', 'production_lead', 'works_council_contact', 'it_data_protection', 'safety_officer'] as const;
export type ContextRole = (typeof CONTEXT_ROLES)[number];
export const IT_DATA_LIMITS = ['no_cloud', 'no_video_of_people', 'no_permanent_connectivity'] as const;
export const TIMELINES = ['pilot_within_6_months', '6_to_18_months', 'exploring', NS] as const;
export const PROCUREMENT = ['buy', 'lease', 'raas', NS] as const;
export const SHIFT_PATTERNS = ['one', 'two', 'three', NS] as const;

/** Construction-site sub-settings before the LV trades (24.09.2026) and where a stored context now points. */
export const LEGACY_SUBSETTINGS: Record<string, string> = {
  site_structural: 'site_concrete',
  site_mep: 'site_electrical',
  site_interior_finishing: 'site_drywall',
  site_erection_assembly: 'site_concrete',
  site_facade_envelope: 'site_ventilated_facade',
  site_civil_infrastructure: 'site_roads_paving',
  site_tunnel_underground: 'site_tunnelling',
  site_road_works: 'site_roads_paving',
  site_serial_renovation: 'site_etics',
};

export const CompanyContextSchema = z.object({
  group: z.enum([...SETTING_GROUPS, ''] as const).default(''),
  subSetting: z.string().max(60).default('').transform((id) => LEGACY_SUBSETTINGS[id] ?? id),
  existingAutomation: z.enum(['listed', 'none', NS] as const).default(NS),
  machineClasses: z.array(z.string().max(60)).max(40).default([]),
  dustType: z.enum([...DUST_TYPES, NS] as const).default(NS),
  dustZone: z.enum([...DUST_ZONES, NS] as const).default(NS),
  floor: z.enum([...FLOORS, NS] as const).default(NS),
  exposure: z.enum([...EXPOSURES, NS] as const).default(NS),
  wet: z.enum([...WET_LEVELS, NS] as const).default(NS),
  itData: z.array(z.enum(IT_DATA_LIMITS)).max(3).default([]),
  worksCouncil: z.enum(['yes', 'no', NS] as const).default(NS),
  goals: z.array(z.enum(VALUE_DRIVERS)).max(3).default([]),
  timeline: z.enum(TIMELINES).default(NS),
  procurement: z.enum(PROCUREMENT).default(NS),
  shiftPattern: z.enum(SHIFT_PATTERNS).default(NS),
  roles: z.record(z.string().max(40), z.enum(['identified', 'not_yet'] as const)).default({}),
  constraints: z.string().max(4000).default(''),
  openQuestions: z.string().max(4000).default(''),
  updatedAt: z.string().max(30).default(''),
});
export type CompanyContext = z.infer<typeof CompanyContextSchema>;

export const emptyContext = (): CompanyContext => CompanyContextSchema.parse({});

/** The slice the screen engine reads. Dust needs a zone to count at all; a known zone with an unknown material is "mixed". */
export function toScreenContext(ctx: CompanyContext): ScreenContext {
  const zone = ctx.dustZone;
  const type: DustType = zone === 'none' ? 'none' : ctx.dustType === NS ? 'mixed' : ctx.dustType;
  return {
    subSetting: ctx.subSetting || null,
    dust: zone === NS ? NS : { type, zone },
    existingAutomation: ctx.existingAutomation === 'listed' ? ctx.machineClasses : ctx.existingAutomation,
    floor: ctx.floor,
    exposure: ctx.exposure,
    wet: ctx.wet,
    worksCouncil: ctx.worksCouncil,
    shiftPattern: ctx.shiftPattern,
  };
}

/** How many of the questions that change a verdict have an answer other than "not sure". */
export function contextProgress(ctx: CompanyContext): { answered: number; total: number } {
  const answers = [ctx.group !== '', ctx.subSetting !== '', ctx.existingAutomation !== NS, ctx.dustZone !== NS, ctx.floor !== NS, ctx.exposure !== NS, ctx.worksCouncil !== NS, ctx.goals.length > 0, ctx.timeline !== NS, ctx.procurement !== NS];
  return { answered: answers.filter(Boolean).length, total: answers.length };
}
