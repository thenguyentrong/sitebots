import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { WorkflowSchema, type Workflow } from './schema';
import type { StepStripData } from './url';

// Server side. Reads data/workflows/<setting>/<task>.json and the frame manifest written by
// scripts/workflows/build.ts.

export type Frame = { src: string; width: number; height: number };
export type WorkflowWithFrames = Workflow & { frames: (Frame | null)[] };

const root = () => join(process.cwd(), 'data', 'workflows');
let cache: Map<string, WorkflowWithFrames> | null = null;

function frames(): Record<string, (Frame | null)[]> {
  const file = join(root(), 'frames.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).frames ?? {} : {};
}

export function loadWorkflows(): Map<string, WorkflowWithFrames> {
  if (cache) return cache;
  const manifest = frames();
  const out = new Map<string, WorkflowWithFrames>();
  const dir = root();
  for (const setting of existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort() : []) {
    for (const name of readdirSync(join(dir, setting)).filter((file) => file.endsWith('.json')).sort()) {
      const workflow = WorkflowSchema.parse(JSON.parse(readFileSync(join(dir, setting, name), 'utf8')));
      if (workflow.task !== setting + '/' + name.replace(/[.]json$/, '')) throw new Error('Workflow ' + setting + '/' + name + ' names task ' + workflow.task);
      out.set(workflow.task, { ...workflow, frames: workflow.steps.map((_, index) => manifest[workflow.task]?.[index] ?? null) });
    }
  }
  if (process.env.NODE_ENV === 'production') cache = out;
  return out;
}

export const loadWorkflow = (task: string): WorkflowWithFrames | null => loadWorkflows().get(task) ?? null;

export { watchUrl } from './url';

/** The step flow of a task, reduced to what the job map panel shows. */
export function stepStrip(task: string): StepStripData | null {
  const workflow = loadWorkflow(task);
  if (!workflow) return null;
  const video = workflow.video ? { id: workflow.video.id, title: workflow.video.title, channel: workflow.video.channel, channelUrl: workflow.video.channelUrl } : null;
  const illustration = workflow.illustration ? { generator: workflow.illustration.generator, model: workflow.illustration.model } : null;
  return { video, illustration, steps: workflow.steps.map((step, index) => ({ en: step.title.en, de: step.title.de, at: step.at ?? null, frame: workflow.frames[index]?.src ?? null })) };
}
