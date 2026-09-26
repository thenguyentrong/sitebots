import { emptyContext } from '@/lib/context/schema';
import { emptyFacts, type Facts } from '@/lib/screen/facts';
import { GROUP_FOR_SETTING, familyForJob } from './legacy';
import { EMPTY_WORKSPACE, WorkspaceSchema, WorkspaceV1Schema, type ProjectV1, type Workspace, type WorkspaceV1 } from './model';

/**
 * Version one drafts (eight jobs, three settings, no company context) become
 * version two projects with a custom task carrying whatever the finder knew.
 * The old key is never deleted: an older build still finds its draft, and a
 * rollback loses nothing.
 */

export function factsFromNeeds(project: ProjectV1): Facts {
  const facts = emptyFacts();
  const kg = Number(project.needs.payload);
  if (project.needs.payload.trim() && Number.isFinite(kg) && kg > 0) facts.object_mass_kg = { min: 0, max: kg };
  const reach = Number(project.needs.reach);
  if (project.needs.reach.trim() && Number.isFinite(reach) && reach > 0) facts.reach_height_m = { min: 0, max: reach };
  if (project.variability) facts.variability = project.variability;
  if (project.needs.environment) facts.environment = project.needs.environment;
  if (project.needs.terrain) facts.floor = project.needs.terrain === 'paved' ? 'level' : 'uneven';
  if (project.needs.stairs === 'required') facts.floor = 'stairs';
  return facts;
}

export function migrateV1(old: WorkspaceV1): Workspace {
  const first = old.projects[0];
  return {
    version: 2,
    activeId: old.activeId,
    context: { ...emptyContext(), group: first ? GROUP_FOR_SETTING[first.setting] : '' },
    projects: old.projects.map((project) => ({
      ...project,
      task: { kind: 'custom' as const, family: familyForJob(project.jobId), facts: factsFromNeeds(project) },
      factOverrides: {},
      solutionClasses: project.focus === 'humanoid' ? ['humanoid' as const] : [],
      screenConfirmedAt: '',
    })),
  };
}

export type ReadResult = { workspace: Workspace; migrated: boolean; error: boolean };

/** What the store finds in the browser: the current key first, the old key as a fallback. */
export function readWorkspace(rawV2: string | null, rawV1: string | null): ReadResult {
  if (rawV2) {
    try {
      const parsed = WorkspaceSchema.safeParse(JSON.parse(rawV2));
      if (parsed.success) return { workspace: parsed.data, migrated: false, error: false };
    } catch {
      // fall through to the old key
    }
  }
  if (rawV1) {
    try {
      const parsed = WorkspaceV1Schema.safeParse(JSON.parse(rawV1));
      if (parsed.success) return { workspace: migrateV1(parsed.data), migrated: true, error: Boolean(rawV2) };
    } catch {
      // reported below
    }
  }
  return { workspace: EMPTY_WORKSPACE, migrated: false, error: Boolean(rawV2 || rawV1) };
}
