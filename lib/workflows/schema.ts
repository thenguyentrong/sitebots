import { z } from 'zod';

// A task shown step by step: the steps a crew works through, each tied to the moment in a public
// video where it can be seen. Frames are taken from that video and credited to its channel.

const text = z.string().trim().min(1);
const L10n = z.object({ en: text, de: text });
const day = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);

export const WorkflowStepSchema = z.object({
  title: L10n,
  /** Second in the video where the step is seen. */
  at: z.number().int().nonnegative(),
});

export const WorkflowSchema = z.object({
  task: z.string().regex(/^[a-z0-9_]+[/][a-z0-9-]+$/),
  video: z.object({
    id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: text,
    channel: text,
    channelUrl: z.url().nullable(),
    language: z.string().min(2),
    durationS: z.number().int().positive(),
    checkedAt: day,
  }),
  steps: z.array(WorkflowStepSchema).min(3).max(12),
  /** What a reader should know about the video, for example that it shows one formwork system of several. */
  note: L10n.optional(),
}).superRefine((workflow, ctx) => {
  workflow.steps.forEach((step, index) => {
    if (step.at > workflow.video.durationS) ctx.addIssue({ code: 'custom', path: ['steps', index, 'at'], message: 'after the end of the video' });
  });
});

export type Workflow = z.infer<typeof WorkflowSchema>;
