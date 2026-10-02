import { REVIEWED_TASK_LINKS } from './task-links';
import { RESEARCHED_TASKS } from './researched-tasks';
export const ALL_REVIEWED_TASK_LINKS = [...REVIEWED_TASK_LINKS, ...RESEARCHED_TASKS.flatMap(task => task.reviewLinks ?? [])];
