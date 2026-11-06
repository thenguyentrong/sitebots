import { STAGE_RANK } from '@/lib/market/match';
import { EDGE_KINDS, type EdgeKind, type Graph, type GraphEdge, type GraphNode, type NodeKind, type PaperVerdict } from './types';

// Search and neighbours over a loaded graph. Pure, so tests can run them on a small graph of their
// own; the chat reaches them through lib/graph/index.ts.

/** A node as a result row: enough to name it and link to it. `status` is a robot's standing in Germany,
 *  there so a caller can never present a robot that is not sold here as one you can buy. */
export type NodeRef = { id: string; kind: NodeKind; label: string; url: string | null; status?: string };
export type Neighbour = Omit<GraphEdge, 'source' | 'target' | 'kind'> & { edge: EdgeKind; direction: 'out' | 'in'; node: NodeRef };
export type NeighbourResult = { total: number; items: Neighbour[] };
export type NodeDetail = GraphNode & { edgeCounts: Partial<Record<EdgeKind, number>> };

type Link = { edge: GraphEdge; other: string; direction: 'out' | 'in' };
type SearchRow = { node: GraphNode; label: string; labelWords: string[]; terms: string; termWords: string[]; degree: number };
/** `rows` stays null until the first search: folding every name is the one slow step of a cold start,
 *  and a chat turn that only follows links never needs it. */
export type GraphIndex = { nodes: Map<string, GraphNode>; links: Map<string, Link[]>; rows: SearchRow[] | null };

// Fold both sides the same way, so "Daemmung", "Dämmung" and "Dammung" meet, and "Strasse" finds "Straße".
export function foldText(text: string): string {
  return text.toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}
const words = (text: string) => text.split(/[^a-z0-9]+/).filter(Boolean);

export function indexGraph({ nodes, edges }: Graph): GraphIndex {
  const links = new Map<string, Link[]>();
  const attach = (id: string, link: Link) => { const row = links.get(id); if (row) row.push(link); else links.set(id, [link]); };
  for (const edge of edges) {
    attach(edge.source, { edge, other: edge.target, direction: 'out' });
    attach(edge.target, { edge, other: edge.source, direction: 'in' });
  }
  return { nodes: new Map(nodes.map((node) => [node.id, node])), links, rows: null };
}

function searchRows(index: GraphIndex): SearchRow[] {
  index.rows ??= [...index.nodes.values()].map((node) => {
    const label = foldText(node.label), terms = foldText(node.terms.join(' '));
    // Paper fits do not count: a popular humanoid should not outrank the job's real machine.
    const degree = (index.links.get(node.id) ?? []).filter((link) => link.edge.kind !== 'fits_job').length;
    return { node, label, labelWords: words(label), terms, termWords: words(terms), degree };
  });
  return index.rows;
}

export const toRef = (node: GraphNode): NodeRef => ({
  id: node.id, kind: node.kind, label: node.label, url: node.url, ...(node.kind === 'robot' ? { status: String(node.meta.status) } : {}),
});

export function nodeDetail(index: GraphIndex, id: string): NodeDetail | null {
  const node = index.nodes.get(id);
  if (!node) return null;
  const edgeCounts: NodeDetail['edgeCounts'] = {};
  for (const { edge } of index.links.get(id) ?? []) edgeCounts[edge.kind] = (edgeCounts[edge.kind] ?? 0) + 1;
  return { ...node, edgeCounts };
}

/** Proof before paper. With a tight limit, a robot's 60 paper fits must not push out its one real project. */
const KIND_ORDER: EdgeKind[] = ['proven_on', 'worked_at', 'made_by', 'sold_by', 'job_in_setting', 'rule_applies', 'fits_job'];
const VERDICT_ORDER: Record<PaperVerdict, number> = { similar: 0, fits: 1, stretch: 2 };

function compareLinks(index: GraphIndex) {
  const label = (link: Link) => index.nodes.get(link.other)?.label ?? link.other;
  const stage = (link: Link) => (link.edge.stage ? STAGE_RANK[link.edge.stage] : 0);
  const verdict = (link: Link) => (link.edge.verdict ? VERDICT_ORDER[link.edge.verdict] : 0);
  return (a: Link, b: Link) => KIND_ORDER.indexOf(a.edge.kind) - KIND_ORDER.indexOf(b.edge.kind) || stage(b) - stage(a) || verdict(a) - verdict(b)
    || Number(a.edge.also ?? false) - Number(b.edge.also ?? false) || label(a).localeCompare(label(b));
}

export function neighboursOf(index: GraphIndex, id: string, { edgeKinds, limit = 30 }: { edgeKinds?: readonly EdgeKind[]; limit?: number } = {}): NeighbourResult {
  const allowed = new Set(edgeKinds ?? EDGE_KINDS);
  const links = (index.links.get(id) ?? []).filter((link) => allowed.has(link.edge.kind)).sort(compareLinks(index));
  const items = links.slice(0, Math.max(0, limit)).flatMap(({ edge, other, direction }) => {
    const node = index.nodes.get(other);
    if (!node) return [];
    const { source: _source, target: _target, kind, ...detail } = edge;
    return [{ ...detail, edge: kind, direction, node: toRef(node) }];
  });
  return { total: links.length, items };
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'for', 'of', 'in', 'on', 'and', 'with', 'to', 'which', 'what', 'der', 'die', 'das', 'ein', 'eine', 'fur', 'von', 'mit', 'und', 'im', 'auf', 'zum', 'zur', 'welche', 'welcher']);
/** German glues "robot" onto the job ("Abbruchroboter"), and neither language needs the exact ending
 *  of a word to mean it. Tried only after the word as typed, at a discount. */
const ENDINGS = /(?:roboter[ns]?|robots?|s|en)$/;

function scoreWord(row: SearchRow, word: string): number {
  const long = word.length >= 3;
  if (row.labelWords.includes(word)) return 70;
  if (row.labelWords.some((item) => item.startsWith(word))) return 60;
  if (row.termWords.includes(word)) return 50;
  if (long && row.label.includes(word)) return 45;
  if (row.termWords.some((item) => item.startsWith(word))) return 40;
  return long && row.terms.includes(word) ? 25 : 0;
}

function scoreToken(row: SearchRow, token: string): number {
  const exact = scoreWord(row, token);
  if (exact || token.length < 5) return exact;
  const stem = token.replace(ENDINGS, '');
  return stem.length >= 3 && stem !== token ? scoreWord(row, stem) * 0.8 : 0;
}

export function searchNodes(index: GraphIndex, query: string, { kinds, limit = 10 }: { kinds?: readonly NodeKind[]; limit?: number } = {}): NodeRef[] {
  const phrase = foldText(query).trim();
  const typed = words(phrase);
  if (!typed.length) return [];
  const useful = typed.filter((token) => !STOP_WORDS.has(token));
  const tokens = useful.length ? useful : typed;
  const allowed = kinds?.length ? new Set(kinds) : null;
  const scored = searchRows(index).flatMap((row) => {
    if (allowed && !allowed.has(row.node.kind)) return [];
    const parts = tokens.map((token) => scoreToken(row, token));
    const score = parts.reduce((sum, part) => sum + part, 0);
    if (!score) return [];
    // An exact or starting match on the whole name beats any mix of word matches.
    const whole = row.label === phrase ? 1000 : row.label.startsWith(phrase) ? 200 : row.label.includes(phrase) ? 100 : 0;
    return [{ row, score: score + whole, all: parts.every(Boolean) }];
  });
  // Every word must match, unless nothing matches them all: then the best partial matches still help.
  const matches = scored.some((item) => item.all) ? scored.filter((item) => item.all) : scored;
  return matches.sort((a, b) => b.score - a.score || b.row.degree - a.row.degree || a.row.node.label.localeCompare(b.row.node.label))
    .slice(0, Math.max(0, limit)).map((item) => toRef(item.row.node));
}
