import { describe, expect, it } from 'vitest';
import { foldText, indexGraph, neighboursOf, nodeDetail, searchNodes } from './query';
import type { GraphEdge, GraphNode, NodeKind } from './types';

const node = (id: string, kind: NodeKind, label: string, terms: string[] = [], meta: GraphNode['meta'] = {}): GraphNode => ({ id, kind, label, url: '/' + id, sourceUrl: null, terms, meta });
const nodes = [
  node('robot:brokk-170', 'robot', 'Brokk 170', ['Brokk', 'Demolition', 'Abbruch Rückbau', 'Bauroboter'], { status: 'quote' }),
  node('robot:g1', 'robot', 'Unitree G1', ['G1', 'Unitree Robotics', 'humanoid', 'humanoider Roboter'], { status: 'buy_now' }),
  node('robot:g1-edu', 'robot', 'Unitree G1 EDU', ['G1', 'EDU', 'Unitree Robotics', 'humanoid'], { status: 'not_sold' }),
  node('maker:unitree', 'maker', 'Unitree Robotics', ['Unitree Robotics']),
  node('seller:rs', 'seller', 'RobotShop', ['RobotShop EU (eu.robotshop.com)']),
  node('job:drywall', 'job', 'Finish drywall joints', ['Gipskartonfugen spachteln', 'Drywall', 'Trockenbauarbeiten']),
  node('job:insulate', 'job', 'Install insulation', ['Dämmung einbauen', 'Wärmedämmung']),
  node('job:road', 'job', 'Mark road lines', ['Straße markieren']),
  node('setting:drywall', 'setting', 'Drywall', ['Trockenbauarbeiten', 'Ständerwände']),
  node('project:basf', 'project', 'BASF, Ludwigshafen, Germany', ['Deutschland']),
  node('rule:dust', 'rule', 'TRGS 559 mineral dust', ['TRGS 559 Mineralischer Staub']),
];
const edges: GraphEdge[] = [
  { source: 'robot:g1', target: 'maker:unitree', kind: 'made_by' },
  { source: 'robot:g1-edu', target: 'maker:unitree', kind: 'made_by' },
  { source: 'robot:g1', target: 'seller:rs', kind: 'sold_by', role: 'distributor', sourceUrl: 'https://rs.example/g1' },
  { source: 'robot:g1', target: 'job:insulate', kind: 'fits_job', verdict: 'stretch' },
  { source: 'robot:g1', target: 'job:drywall', kind: 'fits_job', verdict: 'fits' },
  { source: 'robot:g1', target: 'job:road', kind: 'fits_job', verdict: 'similar' },
  { source: 'robot:g1', target: 'job:drywall', kind: 'proven_on', stage: 'claim', sourceUrl: 'https://maker.example' },
  { source: 'robot:g1', target: 'job:road', kind: 'proven_on', stage: 'deployment', sourceUrl: 'https://customer.example', where: 'BASF, Ludwigshafen, Germany' },
  { source: 'robot:g1', target: 'project:basf', kind: 'worked_at', stage: 'deployment' },
  { source: 'job:drywall', target: 'setting:drywall', kind: 'job_in_setting' },
  { source: 'rule:dust', target: 'job:drywall', kind: 'rule_applies' },
];
const index = indexGraph({ nodes, edges });
const ids = (query: string, options?: Parameters<typeof searchNodes>[2]) => searchNodes(index, query, options).map((hit) => hit.id);

describe('foldText', () => {
  it('meets German spellings halfway', () => {
    expect(foldText('Dämmung')).toBe(foldText('Daemmung'));
    expect(foldText('Straße')).toBe(foldText('STRASSE'));
    expect(foldText('Génération')).toBe('generation');
  });
});

describe('searchNodes', () => {
  it('finds the exact name first', () => {
    expect(ids('Unitree G1')[0]).toBe('robot:g1');
    expect(ids('unitree g1 edu')[0]).toBe('robot:g1-edu');
  });

  it('finds partial names, at the start of a word and inside one', () => {
    expect(ids('unit')).toContain('maker:unitree');
    expect(ids('brok')[0]).toBe('robot:brokk-170');
    expect(ids('tree')).toContain('maker:unitree');
  });

  it('handles English and German words for the same thing', () => {
    expect(ids('drywall')).toContain('setting:drywall');
    expect(ids('Trockenbau')).toContain('setting:drywall');
    expect(ids('Abbruch')).toContain('robot:brokk-170');
    expect(ids('demolition')).toContain('robot:brokk-170');
  });

  it('copes with umlauts typed or not', () => {
    for (const query of ['Dämmung', 'Daemmung', 'dammung']) expect(ids(query), query).toContain('job:insulate');
    expect(ids('Strasse')).toContain('job:road');
    expect(ids('Staende')).toContain('setting:drywall');
  });

  it('takes the job out of a German compound with "roboter"', () => {
    expect(ids('Abbruchroboter')[0]).toBe('robot:brokk-170');
  });

  it('ignores small words and needs every other word to match', () => {
    expect(ids('the Unitree for G1')[0]).toBe('robot:g1');
    expect(ids('unitree edu')).toEqual(['robot:g1-edu']);
  });

  it('falls back to partial matches when no node has every word', () => {
    expect(ids('brokk nonsenseword')).toContain('robot:brokk-170');
  });

  it('finds a rule by its reference and a project by the German country name', () => {
    expect(ids('TRGS 559')).toEqual(['rule:dust']);
    expect(ids('Deutschland')).toContain('project:basf');
  });

  it('filters by kind and honours the limit', () => {
    expect(ids('unitree', { kinds: ['maker'] })).toEqual(['maker:unitree']);
    expect(ids('unitree', { limit: 1 })).toHaveLength(1);
  });

  it('breaks a tie by real links, and paper fits do not count as real', () => {
    const job = node('job:a', 'job', 'Some job');
    const tied = indexGraph({
      nodes: [node('robot:paper', 'robot', 'Acme Paper'), node('robot:proven', 'robot', 'Acme Proven'), job, node('job:b', 'job', 'Other job'), node('job:c', 'job', 'Third job')],
      edges: [
        { source: 'robot:paper', target: 'job:a', kind: 'fits_job', verdict: 'fits' },
        { source: 'robot:paper', target: 'job:b', kind: 'fits_job', verdict: 'fits' },
        { source: 'robot:paper', target: 'job:c', kind: 'fits_job', verdict: 'fits' },
        { source: 'robot:proven', target: 'job:a', kind: 'proven_on', stage: 'pilot' },
      ],
    });
    expect(searchNodes(tied, 'acme').map((hit) => hit.id)).toEqual(['robot:proven', 'robot:paper']);
  });

  it('returns nothing for an empty query or a word nothing has', () => {
    expect(ids('')).toEqual([]);
    expect(ids('   ')).toEqual([]);
    expect(ids('zzzqqq')).toEqual([]);
  });

  it('tells a caller when a robot is not sold in Germany', () => {
    expect(searchNodes(index, 'unitree g1 edu')[0]).toMatchObject({ kind: 'robot', status: 'not_sold' });
    expect(searchNodes(index, 'unitree', { kinds: ['maker'] })[0]).not.toHaveProperty('status');
  });
});

describe('neighboursOf', () => {
  it('lists proof before paper, the strongest proof first', () => {
    const { items } = neighboursOf(index, 'robot:g1');
    expect(items.slice(0, 2).map((item) => [item.edge, item.stage])).toEqual([['proven_on', 'deployment'], ['proven_on', 'claim']]);
    expect(items.filter((item) => item.edge === 'fits_job').map((item) => item.verdict)).toEqual(['similar', 'fits', 'stretch']);
    expect(items.at(-1)?.edge).toBe('fits_job');
  });

  it('does not let paper fits push proof out of a tight limit', () => {
    const result = neighboursOf(index, 'robot:g1', { limit: 3 });
    expect(result.items.map((item) => item.edge)).toEqual(['proven_on', 'proven_on', 'worked_at']);
    expect(result.total).toBe(8);
  });

  it('filters by edge kind', () => {
    const { items, total } = neighboursOf(index, 'robot:g1', { edgeKinds: ['sold_by'] });
    expect(total).toBe(1);
    expect(items[0]).toMatchObject({ edge: 'sold_by', direction: 'out', role: 'distributor', sourceUrl: 'https://rs.example/g1', node: { id: 'seller:rs', kind: 'seller', label: 'RobotShop' } });
  });

  it('works from both ends of an edge', () => {
    const { items } = neighboursOf(index, 'maker:unitree');
    expect(items.map((item) => [item.direction, item.node.id])).toEqual([['in', 'robot:g1'], ['in', 'robot:g1-edu']]);
    expect(neighboursOf(index, 'job:drywall', { edgeKinds: ['rule_applies'] }).items[0]).toMatchObject({ direction: 'in', node: { id: 'rule:dust' } });
  });

  it('marks robots by their status in Germany', () => {
    expect(neighboursOf(index, 'maker:unitree').items.map((item) => item.node.status)).toEqual(['buy_now', 'not_sold']);
  });

  it('gives an empty result for an unknown id or a node with no links', () => {
    expect(neighboursOf(index, 'robot:nope')).toEqual({ total: 0, items: [] });
    expect(neighboursOf(index, 'robot:brokk-170')).toEqual({ total: 0, items: [] });
  });

  it('returns plain JSON with no edge endpoints repeated', () => {
    const result = neighboursOf(index, 'robot:g1');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.items[0]).not.toHaveProperty('source');
  });
});

describe('nodeDetail', () => {
  it('counts edges by kind', () => {
    expect(nodeDetail(index, 'robot:g1')?.edgeCounts).toEqual({ made_by: 1, sold_by: 1, fits_job: 3, proven_on: 2, worked_at: 1 });
    expect(nodeDetail(index, 'rule:dust')).toMatchObject({ label: 'TRGS 559 mineral dust', edgeCounts: { rule_applies: 1 } });
  });

  it('gives null for an unknown id', () => {
    expect(nodeDetail(index, 'robot:nope')).toBeNull();
  });
});
