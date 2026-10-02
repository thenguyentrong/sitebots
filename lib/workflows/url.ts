// Client-safe helpers for step flows.

/** The video at the second where a step is seen. */
export const watchUrl = (videoId: string, at: number) => 'https://www.youtube.com/watch?v=' + videoId + '&t=' + at + 's';

/** What the job map panel needs to show a task's steps. */
export type StepStripData = {
  video: { id: string; title: string; channel: string; channelUrl: string | null } | null;
  /** Set when the steps are AI illustrations because no public video shows the work. */
  illustration: { generator: string; model: string } | null;
  steps: { en: string; de: string; at: number | null; frame: string | null }[];
};
