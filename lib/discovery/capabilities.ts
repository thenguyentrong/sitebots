import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { SolutionReview } from '@/lib/solutions/schema';
import { candidateReviewIds, type OpportunityPoint } from './model';
import { requirementsForOpportunity, HAND_WORK_LEVELS, MOVEMENT_LEVELS } from './requirements';
import type { PlatformMatch } from './platform-types';

const supported = { sourceIds: z.array(z.string()).min(1), limitations: z.array(z.string()) };
const ProfileSchema = z.object({
  reviewId: z.string(),
  mobility: z.array(z.object({ capability: z.enum(['stationary', 'level_travel', 'uneven_or_steps']), ...supported })),
  manipulation: z.array(z.object({ capability: z.enum(['grip_transfer', 'bimanual', 'dexterous', 'tool_use']), support: z.enum(['configured', 'requires_tooling']), ...supported })),
  lifecycle: z.object({ state: z.enum(['historical', 'pilot_access', 'research_order', 'announced', 'commercial_enquiry', 'unknown']), ...supported }),
  limitations: z.array(z.string()), allowedTaskIds: z.array(z.string()).optional(), allowedFamilies: z.array(z.string()).optional(),
});
export type CapabilityProfile = z.infer<typeof ProfileSchema>;
export function loadCapabilityProfiles(reviews: readonly SolutionReview[]): CapabilityProfile[] {
  const root = join(process.cwd(), 'data', 'discovery-capabilities');
  if (!existsSync(root)) return [];
  const profiles = readdirSync(root).filter(file => file.endsWith('.json')).sort().flatMap(file => z.object({ schemaVersion: z.literal(1), profiles: z.array(ProfileSchema) }).parse(JSON.parse(readFileSync(join(root, file), 'utf8').replace(/^\uFEFF/, ''))).profiles);
  const seen = new Set<string>();
  for (const profile of profiles) {
    if (seen.has(profile.reviewId)) throw Error('Duplicate capability profile: ' + profile.reviewId);
    seen.add(profile.reviewId);
    const review = reviews.find(item => item.id === profile.reviewId);
    if (!review) throw Error('Unknown capability review: ' + profile.reviewId);
    for (const entry of [...profile.mobility, ...profile.manipulation, profile.lifecycle]) for (const id of entry.sourceIds) {
      if (!review.sources.some(source => source.id === id)) throw Error('Missing capability source: ' + profile.reviewId + '/' + id);
    }
  }
  return profiles;
}

const HAND_SETUP: Record<string, string> = {
  'unitree-h2-edu-research': 'Optional hands / grippers required',
  'unitree-h2-plus-sharpa-research': 'Two Sharpa Wave tactile hands',
  'unitree-g1-edu-dex3-research': 'Two Dex3-1 three-finger hands',
  'agility-digit-4-tote-handling': 'Tote-specific grippers',
  'figure-03-bmw-sequencing': 'Tactile hands with palm cameras',
  'ubtech-walker-s2-industrial': 'Industrial dexterous hands',
  'pal-talos-tool-research': 'Project-specific grippers / tools',
  'limx-tron-1-arm-research': 'Single-arm gripper kit',
  'limx-tron-2-mobile-manipulation': 'Single arm · 0–70 mm gripper',
  'boston-dynamics-spot-arm-inspection': 'Spot Arm gripper',
};
const MASS_KEYS = ['arm_payload_rated_kg', 'arm_payload_kg', 'arm_payload_kg_continuous', 'arm_max_load_kg', 'payload_kg', 'handling_payload_kg'];
export function matchPlatforms(point: OpportunityPoint, reviews: readonly SolutionReview[], profiles: readonly CapabilityProfile[]): PlatformMatch[] {
  const required = requirementsForOpportunity(point);
  if (!required.allowPlatforms || !required.movement || !required.handWork) return [];
  const capability = required.capability ?? ({ none: null, simple_grip: 'grip_transfer', two_arm: 'bimanual', dexterous: 'dexterous' } as const)[required.handWork];
  const movement = required.movement === 'uneven_travel' ? 'uneven_or_steps' : required.movement;
  const matches: PlatformMatch[] = [];
  for (const profile of profiles) {
    if (point.reviewIds.includes(profile.reviewId) || profile.lifecycle.state === 'historical') continue;
    if (profile.allowedTaskIds && !profile.allowedTaskIds.includes(point.id)) continue;
    if (profile.allowedFamilies && !profile.allowedFamilies.includes(point.family)) continue;
    const review = reviews.find(item => item.id === profile.reviewId)!;
    if (point.industries.includes('research_education') && !review.industries.includes('research_education')) continue;
    // A station task has no travel requirement; mobile platforms are not excluded merely for having a base.
    const moving = profile.mobility.find(item => item.capability === movement) ?? (movement === 'stationary' ? profile.mobility[0] : undefined);
    const handling = capability ? profile.manipulation.find(item => item.capability === capability) : undefined;
    if (!moving || (capability && !handling)) continue;
    // Per-arm figures are never summed and peak or base carrying loads are never used as hand capacity.
    const mass = MASS_KEYS.map(key => review.specs.find(spec => spec.key === key && spec.unit === 'kg' && typeof spec.value === 'number')).find(Boolean);
    if (required.maxObjectMassKg && mass && (mass.value as number) < required.maxObjectMassKg) continue;
    const sourceIds = [...new Set([...moving.sourceIds, ...(handling?.sourceIds ?? []), ...profile.lifecycle.sourceIds])];
    const handLabel = profile.reviewId === 'limx-tron-2-mobile-manipulation' && capability === 'dexterous' ? 'Optional Revo2 hand integration' : HAND_SETUP[profile.reviewId] ?? HAND_WORK_LEVELS.find(item => item.id === required.handWork)!.label;
    const movementLabel = review.robotClass === 'humanoid' ? 'Bipedal platform' : profile.reviewId.startsWith('limx-tron') ? 'Sole or wheeled mode' : profile.reviewId === 'boston-dynamics-spot-arm-inspection' ? 'Quadruped with arm' : MOVEMENT_LEVELS.find(item => item.id === required.movement)!.label;
    matches.push({ reviewId: review.id, sourceIds, requiresTooling: handling?.support === 'requires_tooling', availability: profile.lifecycle.state, handLabel, movementLabel,
      rationale: 'Published platform capabilities overlap this job’s movement and hand requirements. This is an integration candidate; the complete job has not been established for this configuration.',
      limitations: [...new Set([required.explanation, handling?.support === 'requires_tooling' ? 'Fit and validate the required hand or tool; it is not included in this reviewed base configuration.' : 'Task programming, perception, gripping and fixtures still need a trial.', required.maxObjectMassKg ? 'Task objects reach ' + required.maxObjectMassKg + ' kg; include tooling mass and validate loaded reach and duty cycle.' : 'Object weight, loaded reach and cycle time remain to be specified.', ...moving.limitations, ...(handling?.limitations ?? []), ...profile.lifecycle.limitations, ...profile.limitations])],
    });
  }
  return matches.sort((a, b) => Number(a.availability === 'announced') - Number(b.availability === 'announced') || Number(a.requiresTooling) - Number(b.requiresTooling) || a.reviewId.localeCompare(b.reviewId));
}
export function withPlatformMatches(points: OpportunityPoint[], reviews: readonly SolutionReview[]): OpportunityPoint[] {
  const profiles = loadCapabilityProfiles(reviews);
  return points.map(point => {
    const enriched = { ...point, platformMatches: matchPlatforms(point, reviews, profiles) };
    const ids = new Set(candidateReviewIds(enriched));
    return { ...enriched, reviewAvailability: Object.fromEntries(profiles.filter(profile => ids.has(profile.reviewId)).map(profile => [profile.reviewId, profile.lifecycle.state])) };
  });
}
