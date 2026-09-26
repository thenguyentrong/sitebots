/**
 * The numbers the screen tests against. Each carries its basis, because the
 * methodology page renders them and a task record pins its verdict against them.
 * Change a value → bump THRESHOLDS_VERSION and re-run `npm run content -- --check`,
 * which recomputes every pinned verdict.
 */

export type Threshold<T> = {
  value: T;
  basis: 'catalogue_stats' | 'analyst' | 'assumed' | 'source';
  evidence_url?: string;
  note: string;
  checked_at: string;
};

export const THRESHOLDS_VERSION = '2026-09-24.1';

export const SCREEN_THRESHOLDS = {
  mass_design_kg: {
    value: 15,
    basis: 'analyst',
    note: 'Design limit with margin below the 20–25 kg payload ceiling of the 2025/26 generation. Sitebots assessment from one industry engagement, 2025/26.',
    checked_at: '2026-09-24',
  },
  mass_ceiling_kg: {
    value: { min: 20, max: 25 },
    basis: 'analyst',
    note: 'Payload ceiling across current platforms; the catalogue shows no shipping humanoid with a conservative working payload above it. A published independent source is still to be recorded.',
    checked_at: '2026-09-24',
  },
  reliability_pct: {
    value: 99,
    basis: 'assumed',
    note: 'Task reliability that deployed humanoids reach today, against 99.99 % expected in industrial automation. Assumed until a public source is recorded.',
    checked_at: '2026-09-24',
  },
  runtime_continuous_min: {
    value: { min: 30, max: 90 },
    basis: 'assumed',
    note: 'Continuous runtime under load, against an 8-hour shift. Catalogue runtime figures are nominal (idle or walking) and mostly higher; assumed until corroborated.',
    checked_at: '2026-09-24',
  },
  reach_marginal_m: {
    value: 1.8,
    basis: 'assumed',
    note: 'Working height above which reach becomes a question. No catalogue humanoid publishes working reach (0 of 493 public variants on 2026-09-24).',
    checked_at: '2026-09-24',
  },
} satisfies Record<string, Threshold<number | { min: number; max: number }>>;

export type ThresholdId = keyof typeof SCREEN_THRESHOLDS;
