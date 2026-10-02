import { z } from 'zod';

// A task shown step by step: the steps a crew works through, each tied to the moment in a public
// video where it can be seen. Frames are taken from that video and credited to its channel. Where no
// public video shows the work, the steps carry generated illustrations instead, labelled as such.

const text = z.string().trim().min(1);
const L10n = z.object({ en: text, de: text });
const day = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);

export const WorkflowStepSchema = z.object({
  title: L10n,
  /** Second in the video where the step is seen; absent for illustrated steps. */
  at: z.number().int().nonnegative().optional(),
  /** What the illustration was generated from, kept for anyone who wants to check or redo it. */
  prompt: text.optional(),
});

const VideoSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: text,
  channel: text,
  channelUrl: z.url().nullable(),
  language: z.string().min(2),
  durationS: z.number().int().positive(),
  checkedAt: day,
});

const IllustrationSchema = z.object({
  generator: text,
  model: text,
  generatedAt: day,
  /** Why the steps are illustrated rather than shown in footage. */
  reason: L10n,
});

export const WorkflowSchema = z.object({
  task: z.string().regex(/^[a-z0-9_]+[/][a-z0-9-]+$/),
  video: VideoSchema.optional(),
  illustration: IllustrationSchema.optional(),
  steps: z.array(WorkflowStepSchema).min(3).max(12),
  /** What a reader should know about the video, for example that it shows one formwork system of several. */
  note: L10n.optional(),
}).superRefine((workflow, ctx) => {
  if (!workflow.video === !workflow.illustration) ctx.addIssue({ code: 'custom', path: ['video'], message: 'needs either a video or an illustration source, not both' });
  workflow.steps.forEach((step, index) => {
    if (workflow.video && step.at === undefined) ctx.addIssue({ code: 'custom', path: ['steps', index, 'at'], message: 'needs the second in the video' });
    if (workflow.video && step.at !== undefined && step.at > workflow.video.durationS) ctx.addIssue({ code: 'custom', path: ['steps', index, 'at'], message: 'after the end of the video' });
    if (workflow.illustration && step.at !== undefined) ctx.addIssue({ code: 'custom', path: ['steps', index, 'at'], message: 'illustrated steps have no video second' });
  });
});

export type Workflow = z.infer<typeof WorkflowSchema>;
