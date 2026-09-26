'use client';

import type { PlanOption, Project } from '@/lib/plan/model';
import { usePlan } from '@/lib/plan/store';

/**
 * The active project and the two update helpers every station shares. Any
 * edit that can change a verdict or a shortlist sends the critical-requirements
 * review back to "unknown"; a confirmation must be repeated, never inherited.
 */
function resetsGate(patch: Partial<Project>, current: Project): boolean {
  return Boolean(
    patch.needs || patch.setting !== undefined || patch.focus !== undefined || patch.jobId || patch.description !== undefined ||
    patch.factOverrides || patch.task || patch.solutionClasses || (patch.selectedOptionId && patch.selectedOptionId !== current.selectedOptionId),
  );
}

export function useJourneyProject() {
  const plan = usePlan();
  const project = plan.project;
  function update(patch: Partial<Project>) {
    if (!project) return;
    plan.updateProject(project.id, (current) => ({ ...current, ...patch, ...(resetsGate(patch, current) ? { gate: 'unknown' as const } : {}) }));
  }
  function updateOption(id: string, patch: Partial<PlanOption>) {
    if (!project) return;
    plan.updateProject(project.id, (current) => ({ ...current, options: current.options.map((option) => option.id === id ? { ...option, ...patch } : option) }));
  }
  return { plan, project, update, updateOption };
}
