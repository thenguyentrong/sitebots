import type { EdgeKind, Graph, NodeKind } from './types';

// The graph as the owner's map page needs it: small enough to send to a browser, with edges pointing at
// nodes by position. No file system access here, so the page's client code may import these types.

export type ViewNode = { id: string; kind: NodeKind; label: string; url: string | null; sourceUrl: string | null; search: string; type: string | null; status: string | null };
export type ViewEdge = { s: number; t: number; k: EdgeKind; stage?: string; task?: string; where?: string };
export type GraphView = { nodes: ViewNode[]; edges: ViewEdge[] };

export function graphView({ nodes, edges }: Graph): GraphView {
  const position = new Map(nodes.map((node, index) => [node.id, index]));
  return {
    nodes: nodes.map((node) => ({
      id: node.id, kind: node.kind, label: node.label, url: node.url, sourceUrl: node.sourceUrl,
      search: [node.label, ...node.terms].join(' ').toLowerCase(),
      type: typeof node.meta.type === 'string' ? node.meta.type : null,
      status: typeof node.meta.status === 'string' ? node.meta.status : null,
    })),
    edges: edges.flatMap((edge) => {
      const s = position.get(edge.source);
      const t = position.get(edge.target);
      if (s === undefined || t === undefined) return [];
      return [{ s, t, k: edge.kind, ...(edge.stage ? { stage: edge.stage } : {}), ...(edge.task ? { task: edge.task } : {}), ...(edge.where ? { where: edge.where } : {}) }];
    }),
  };
}
