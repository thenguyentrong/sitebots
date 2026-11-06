import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { decodeGraph, type StoredGraph } from './file';
import { indexGraph, neighboursOf, nodeDetail, searchNodes, type GraphIndex, type NeighbourResult, type NodeDetail, type NodeRef } from './query';
import type { EdgeKind, GraphFile, NodeKind } from './types';

// Server-side only: node:fs keeps it out of any client bundle. The repo marks such modules by this
// comment rather than `import 'server-only'`, which would not resolve under vitest or tsx.
//
// Everything here reads data/graph/graph.json, never the database, so a chat lookup costs a Map read.
// A route that calls this needs './data/graph/*.json' in outputFileTracingIncludes in next.config.ts;
// without it the file is missing on Vercel only.

export type { GraphIndex, Neighbour, NeighbourResult, NodeDetail, NodeRef } from './query';
export { EDGE_KINDS, NODE_KINDS, isRealWork, type EdgeKind, type GraphEdge, type GraphFile, type GraphNode, type NodeKind } from './types';

const FILE = join(process.cwd(), 'data', 'graph', 'graph.json');

let cache: { file: GraphFile; index: GraphIndex; stamp: number } | null = null;
// Development picks up a fresh `npm run graph` without a restart; production never rereads the file.
const REREAD = process.env.NODE_ENV !== 'production';

function loaded() {
  const stamp = cache && !REREAD ? cache.stamp : statSync(FILE).mtimeMs;
  if (cache?.stamp === stamp) return cache;
  const file = decodeGraph(JSON.parse(readFileSync(FILE, 'utf8')) as StoredGraph);
  cache = { file, index: indexGraph(file), stamp };
  return cache;
}

/** The whole file: nodes, edges, counts. For lookups use the three functions below. */
export const loadGraph = (): GraphFile => loaded().file;

/** Finds nodes by English or German words or part of a name, best match first. Empty for an empty query. */
export function searchGraph(query: string, options: { kinds?: readonly NodeKind[]; limit?: number } = {}): NodeRef[] {
  return searchNodes(loaded().index, query, options);
}

/** What a node connects to, proof before paper. `total` counts past `limit`. Unknown ids give `{ total: 0, items: [] }`.
 *  Paper fits and proof are separate kinds: to list every robot for a job, ask for both `fits_job` and `proven_on`. */
export function neighbours(id: string, options: { edgeKinds?: readonly EdgeKind[]; limit?: number } = {}): NeighbourResult {
  return neighboursOf(loaded().index, id, options);
}

/** One node with how many edges of each kind it has, or null. */
export function nodeById(id: string): NodeDetail | null {
  return nodeDetail(loaded().index, id);
}
