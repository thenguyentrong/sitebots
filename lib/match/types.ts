import type { AvailabilityCurrent, PriceCurrent, RobotCard } from '@/lib/spec/types';

export type Candidate = {
  card: RobotCard;
  prices: PriceCurrent[];
  availability: AvailabilityCurrent[];
};

export type CriterionStatus = 'pass' | 'partial' | 'fail' | 'unknown';

export type CriterionResult = {
  id: string;
  label: string;
  /** hard: a fail excludes the robot. soft: a fail scores 0 and the robot stays in. */
  kind: 'hard' | 'soft';
  weight: number;
  status: CriterionStatus;
  /** 0..1 for soft criteria; hard criteria carry 1 or 0. */
  score: number;
  text: string;
};

export type PriceQuote = {
  amount_eur: number;
  original: { amount: number; currency: string; region: string; tier: number; source_url: string; observed_at: string };
  /** 'listed' when read in EUR from an EU store or distributor; 'converted' for a US list price; 'estimate' for aggregator figures. */
  basis: 'listed' | 'converted' | 'estimate';
};

export type Ranked = {
  robot: RobotCard;
  score: number;
  coverage: number;
  results: CriterionResult[];
  price: PriceQuote | null;
};

export type Excluded = {
  robot: RobotCard;
  reasons: string[];
  results: CriterionResult[];
};

export type MatchOutput = {
  ranked: Ranked[];
  excluded: Excluded[];
  considered: number;
};
