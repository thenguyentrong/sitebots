import type { CompanyContext } from '@/lib/context/schema';
import type { TaskCard } from '@/lib/tasks/types';
import { SETTING_FOR_GROUP, jobForFamily } from './legacy';
import { newProject, type Project, type TaskSnapshot } from './model';

/**
 * A project keeps a copy of the library record it was started from: facts,
 * their confidence and notes, the reference verdict and the review date. A
 * later edit of the record never silently changes a saved brief; the Screen
 * station can say "record updated since you added it" instead.
 */
export function snapshotFromCard(card: TaskCard): TaskSnapshot {
  return {
    id: card.id,
    setting: card.setting,
    family: card.family,
    title: card.title,
    summary: card.summary,
    facts: card.facts,
    meta: Object.fromEntries(Object.entries(card.meta).map(([key, value]) => [key, { confidence: value!.confidence, note: value!.note.slice(0, 600) }])),
    reference_verdict: card.reference_verdict,
    reference_results: card.reference_results,
    better_answer: card.better_answer.class,
    solution_classes: card.solution_classes,
    capabilities_required: card.capabilities_required,
    pilot_metrics: card.pilot.metrics,
    compliance_flags: card.compliance_flags,
    sources_reviewed_at: card.sources_reviewed_at,
  };
}

export function projectFromCard(id: string, card: TaskCard, context: CompanyContext): Project {
  const base = newProject(id, jobForFamily(card.family), SETTING_FOR_GROUP[context.group]);
  return {
    ...base,
    title: card.title.en,
    description: card.summary.en,
    task: { kind: 'library', snapshot: snapshotFromCard(card) },
    solutionClasses: card.solution_classes,
  };
}
