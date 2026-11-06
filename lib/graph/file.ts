import { EDGE_KINDS, type EdgeKind, type GraphEdge, type GraphFile, type GraphNode } from './types';

// The form data/graph/graph.json takes on disk. The chat reads this file on every cold start, and
// repeating `source`, `target`, `kind` and full ids on each edge was close to half of it. So edges sit
// under their kind and point at nodes by position, and empty node fields are left out. Nothing else
// sees this form: decodeGraph restores plain objects, so every caller works with GraphFile.

type EdgeDetail = Omit<GraphEdge, 'source' | 'target' | 'kind'>;
export type StoredEdge = [source: number, target: number, detail?: EdgeDetail];
export type StoredNode = Pick<GraphNode, 'id' | 'kind' | 'label' | 'meta'> & Partial<Pick<GraphNode, 'url' | 'sourceUrl' | 'terms'>>;
export type StoredGraph = Omit<GraphFile, 'nodes' | 'edges'> & { nodes: StoredNode[]; edges: Record<EdgeKind, StoredEdge[]> };

export function encodeGraph({ nodes, edges, ...head }: GraphFile): StoredGraph {
  const position = new Map(nodes.map((node, row) => [node.id, row]));
  const stored = Object.fromEntries(EDGE_KINDS.map((kind) => [kind, [] as StoredEdge[]])) as StoredGraph['edges'];
  for (const { source, target, kind, ...detail } of edges) {
    const clean = Object.fromEntries(Object.entries(detail).filter(([, value]) => value !== undefined));
    stored[kind].push(Object.keys(clean).length ? [position.get(source)!, position.get(target)!, clean] : [position.get(source)!, position.get(target)!]);
  }
  return {
    ...head,
    nodes: nodes.map(({ url, sourceUrl, terms, ...node }) => ({ ...node, ...(url ? { url } : {}), ...(sourceUrl ? { sourceUrl } : {}), ...(terms.length ? { terms } : {}) })),
    edges: stored,
  };
}

export function decodeGraph({ nodes, edges, ...head }: StoredGraph): GraphFile {
  const full: GraphNode[] = nodes.map((node) => ({ url: null, sourceUrl: null, terms: [], ...node }));
  return {
    ...head,
    nodes: full,
    edges: EDGE_KINDS.flatMap((kind) => edges[kind].map(([source, target, detail]) => ({ source: full[source].id, target: full[target].id, kind, ...detail }))),
  };
}
