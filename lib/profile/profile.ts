import type { Candidate } from '@/lib/match/types';
import type { Trust } from '@/lib/spec/enums';
import { axesFor, type Axis } from './axes';
import { TASK_BUCKETS, TASK_SCORE, taskRows, type TaskRow } from './tasks';

export type Profile = {
  axes: Axis[];
  tasks: TaskRow[];
  buckets: { id: string; label: string; tasks: TaskRow[] }[];
  taskTrust: Trust;
  /** Radar values 0–1 or null (gap) for the two views. */
  radar: { site: (number | null)[]; tasks: (number | null)[] };
};

/** Pure: the same inputs the matcher uses, nothing fetched. CompareRow has the same shape as Candidate. */
export function profileFor(c: Candidate): Profile {
  const axes = axesFor(c);
  const { rows, trust } = taskRows(c);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return {
    axes,
    tasks: rows,
    buckets: TASK_BUCKETS.map((b) => ({ id: b.id, label: b.label, tasks: b.tasks.map((t) => byId.get(t)!) })),
    taskTrust: trust,
    radar: { site: axes.map((a) => a.score), tasks: rows.map((r) => TASK_SCORE[r.status]) },
  };
}

export { AXES } from './axes';
export { TASK_BUCKETS, TASK_LABEL } from './tasks';
