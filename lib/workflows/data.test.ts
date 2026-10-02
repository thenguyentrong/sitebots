import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadWorkflows } from './load';

describe('task workflows', () => {
  const workflows = [...loadWorkflows().values()];

  it('belong to existing tasks and keep every step inside its video', () => {
    expect(workflows.length).toBeGreaterThan(0);
    for (const workflow of workflows) {
      expect(existsSync(join(process.cwd(), 'data/tasks', workflow.task + '.yaml'))).toBe(true);
      for (const step of workflow.steps) if (workflow.video) expect(step.at).toBeLessThanOrEqual(workflow.video.durationS);
    }
  });

  it('have a stored frame for every step', () => {
    for (const workflow of workflows) {
      expect(workflow.frames).toHaveLength(workflow.steps.length);
      for (const frame of workflow.frames) {
        expect(frame).not.toBeNull();
        expect(existsSync(join(process.cwd(), 'public', frame!.src))).toBe(true);
      }
    }
  });
});
