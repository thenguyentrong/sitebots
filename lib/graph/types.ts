import type { EvidenceStage } from '@/lib/market/schema';

// Shapes of the knowledge graph. No file system access here, so anything may import this file.

export const NODE_KINDS = ['robot', 'maker', 'seller', 'job', 'setting', 'project', 'rule'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** `fits_job` is what the matcher says on paper; `proven_on` and `worked_at` come from named evidence.
 *  They stay apart because that difference is the point of the site. */
export const EDGE_KINDS = ['made_by', 'sold_by', 'fits_job', 'proven_on', 'worked_at', 'job_in_setting', 'rule_applies'] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

/** The matcher's paper verdicts. Its fourth verdict, `done`, means evidence exists for this exact job,
 *  and that is a `proven_on` edge: as a paper fit it would read as a second, weaker claim of the same thing. */
export const PAPER_VERDICTS = ['similar', 'fits', 'stretch'] as const;
export type PaperVerdict = (typeof PAPER_VERDICTS)[number];

export type NodeMeta = Record<string, string | number | boolean | null>;

export type GraphNode = {
  /** Stable and prefixed by kind, for example `robot:unitree-g1` or `job:site_drywall/ceiling-substructure`. */
  id: string;
  kind: NodeKind;
  label: string;
  /** Its page on this site. Null where the site has none: unknown stays unknown, so no link is made up. */
  url: string | null;
  /** The outside page behind it: a rule's official text, a seller's or maker's own site. */
  sourceUrl: string | null;
  /** Other names and the German words, for search. */
  terms: string[];
  meta: NodeMeta;
};

export type GraphEdge = {
  source: string;
  target: string;
  kind: EdgeKind;
  stage?: EvidenceStage;
  verdict?: PaperVerdict;
  sourceUrl?: string;
  /** What the evidence says happened, and where and when (proven_on, worked_at). */
  task?: string;
  where?: string;
  date?: string;
  /** How the seller sells this robot: distributor, reseller, rental (sold_by). */
  role?: string;
  /** A job that also happens in this setting, apart from its home setting (job_in_setting). */
  also?: boolean;
};

export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type GraphCounts = { nodes: Record<NodeKind, number>; edges: Record<EdgeKind, number> };

/** data/graph/graph.json. `hash` is a fingerprint of nodes and edges, compared with the data by a test. */
export type GraphFile = { version: 1; hash: string; counts: GraphCounts; nodes: GraphNode[]; edges: GraphEdge[] };

/** Pilots and daily use: what the site calls real work (STAGE_RANK.pilot and up in lib/market/answer.ts).
 *  A maker's claim or a fair demo is carried by `proven_on` but never counts as real work. */
export const REAL_WORK_STAGES: readonly EvidenceStage[] = ['pilot', 'deployment'];
export const isRealWork = (edge: Pick<GraphEdge, 'kind' | 'stage'>) =>
  (edge.kind === 'proven_on' || edge.kind === 'worked_at') && edge.stage !== undefined && REAL_WORK_STAGES.includes(edge.stage);
