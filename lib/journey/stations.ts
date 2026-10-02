/**
 * The three steps: find the work, check a task for your own site, decide on
 * the shortlist. Find and Check are the public library; Decide lives under
 * /plan and carries the visitor's own state.
 */
import type { Project } from '@/lib/plan/model';

export type StationId = 'find' | 'check' | 'decide';
export type Station = { id: StationId; number: string; href: string; label: string; hint: string; question: string };

export const STATIONS: readonly Station[] = [
  { id: 'find', number: '1', href: '/use-cases', label: 'Find', hint: 'Explore tasks and settings', question: 'Start with the task library and filter by workplace and kind of work.' },
  { id: 'check', number: '2', href: '/use-cases', label: 'Check', hint: 'A few questions per task', question: 'Describe the loads, conditions and operating needs specific to your workplace.' },
  { id: 'decide', number: '3', href: '/plan', label: 'Decide', hint: 'Shortlist, solutions, cost', question: 'Compare complete solutions and their evidence, estimate costs and define what a pilot must prove.' },
];

/** Where a task on the shortlist is checked again: its library page, or the page for tasks of your own. */
export function checkHref(project: Project): string {
  return project.task.kind === 'library' ? `/use-cases/${project.task.snapshot.id}#check` : `/use-cases/custom?project=${project.id}#check`;
}

/** Routes under /plan/[station]. Context and screen are the old first steps and redirect; the other three are the Decide pages. */
export const PLAN_STATIONS = ['context', 'screen', 'priorities', 'systems', 'implementation'] as const;
export type PlanStation = (typeof PLAN_STATIONS)[number];
export const isPlanStation = (value: string): value is PlanStation => (PLAN_STATIONS as readonly string[]).includes(value);

export function stationForPath(pathname: string): StationId | null {
  if (pathname.startsWith('/workflows')) return 'find';
  if (pathname === '/use-cases' || pathname.startsWith('/use-cases/criteria')) return 'find';
  if (pathname.startsWith('/use-cases/')) return 'check';
  if (pathname.startsWith('/plan')) return 'decide';
  return null;
}
