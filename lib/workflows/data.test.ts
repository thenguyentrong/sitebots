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

  // Stills from other people's videos are no longer stored (legal audit 19 Nov 2026); a frame, if any, must exist.
  it('store no frame that is missing on disk', () => {
    for (const workflow of workflows) {
      expect(workflow.frames).toHaveLength(workflow.steps.length);
      for (const frame of workflow.frames) if (frame) expect(existsSync(join(process.cwd(), 'public', frame.src))).toBe(true);
    }
  });
});
