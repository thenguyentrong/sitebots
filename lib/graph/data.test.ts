import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadJobs } from '@/lib/market/jobs';
import { robotHref } from '@/lib/market/links';
import { loadMarket } from '@/lib/market/load';
import { buildGraph, graphHash } from './build';
import { loadGraph, neighbours, nodeById, searchGraph } from './index';
import { loadGraphInput } from './source';
import type { GraphFile } from './types';

const RUN = 'data/graph/graph.json does not match the data: run npm run graph';

// Like the light lineup models test: graph.json is a built file, and the chat and the site must not
// drift apart. Any edit to a market record, task, rule or the matcher changes the hash, and this
// fails until `npm run graph` has been run.
describe('data/graph/graph.json', () => {
  it('matches the data', () => {
    const stored = JSON.parse(readFileSync('data/graph/graph.json', 'utf8')) as { hash: string };
    expect(stored.hash, RUN).toBe(graphHash(buildGraph(loadGraphInput())));
  });
});

// The file on disk, read the way the chat reads it.
describe('the built graph', () => {
  let graph: GraphFile;
  beforeAll(() => { graph = loadGraph(); });
  const ids = (id: string, kind: Parameters<typeof neighbours>[1]) => neighbours(id, { limit: 500, ...kind }).items.map((item) => item.node.id);

  it('holds every robot and every job', () => {
    const robots = graph.nodes.filter((node) => node.kind === 'robot').map((node) => node.id.slice('robot:'.length)).sort();
    expect(robots, RUN).toEqual(loadMarket().map((robot) => robot.id).sort());
    expect(graph.nodes.filter((node) => node.kind === 'job')).toHaveLength(loadJobs().jobs.length);
  });

  it('has unique ids and no edge to a missing node', () => {
    const known = new Set(graph.nodes.map((node) => node.id));
    expect(known.size).toBe(graph.nodes.length);
    expect(graph.edges.filter((edge) => !known.has(edge.source) || !known.has(edge.target))).toEqual([]);
  });

  it('counts what it holds', () => {
    expect(graph.counts.nodes.robot + graph.counts.nodes.job).toBe(graph.nodes.filter((node) => node.kind === 'robot' || node.kind === 'job').length);
    expect(Object.values(graph.counts.edges).reduce((sum, count) => sum + count, 0)).toBe(graph.edges.length);
  });

  it('gives the Unitree G1 a maker and sellers', () => {
    expect(nodeById('robot:unitree-g1')).toMatchObject({ kind: 'robot', label: 'Unitree G1', url: robotHref('unitree-g1') });
    expect(ids('robot:unitree-g1', { edgeKinds: ['made_by'] })).toEqual(['maker:unitree-robotics']);
    expect(ids('robot:unitree-g1', { edgeKinds: ['sold_by'] }).length).toBeGreaterThan(1);
  });

  it('connects a job-specific machine to its job', () => {
    const { marketRobots } = loadJobs();
    const machines = marketRobots.filter((robot) => robot.robotType === 'specialised' && robot.specialisedFor.includes('site_demolition/concrete-breaking'));
    expect(machines.length).toBeGreaterThan(0);
    for (const machine of machines) {
      expect(ids('robot:' + machine.id, { edgeKinds: ['fits_job', 'proven_on'] }), machine.id).toContain('job:site_demolition/concrete-breaking');
    }
  });

  it('agrees with the matcher on every robot it offers for a job', () => {
    const edge = new Set(graph.edges.filter((item) => item.kind === 'fits_job' || item.kind === 'proven_on').map((item) => item.source + ' ' + item.target));
    const missing = loadJobs().jobs.flatMap((job) => [...job.fits.options, ...job.fits.preorder].map((fit) => 'robot:' + fit.robotId + ' job:' + job.id)).filter((pair) => !edge.has(pair));
    expect(missing, RUN).toEqual([]);
  });

  it('never calls proof a paper fit, and keeps every proven robot', () => {
    const proven = new Set(graph.edges.filter((edge) => edge.kind === 'proven_on').map((edge) => edge.source + ' ' + edge.target));
    expect(graph.edges.filter((edge) => edge.kind === 'fits_job' && proven.has(edge.source + ' ' + edge.target))).toEqual([]);
    for (const job of loadJobs().jobs) for (const fit of job.fits.options) {
      if (fit.verdict === 'done') expect(proven.has('robot:' + fit.robotId + ' job:' + job.id), fit.robotId + ' on ' + job.id).toBe(true);
    }
  });

  it('carries a stage and a source on every piece of evidence', () => {
    const evidence = graph.edges.filter((edge) => edge.kind === 'proven_on' || edge.kind === 'worked_at');
    expect(evidence.filter((edge) => !edge.stage || !edge.sourceUrl)).toEqual([]);
    expect(graph.edges.filter((edge) => edge.kind === 'worked_at' && edge.stage !== 'pilot' && edge.stage !== 'deployment')).toEqual([]);
  });

  it('merges the spellings of one seller and keeps a marketplace apart from its owner', () => {
    expect(graph.nodes.filter((node) => node.kind === 'seller' && /robotshop/i.test(node.label))).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.kind === 'seller' && /g[eé]n[eé]ration robots/i.test(node.label))).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.kind === 'seller' && /^(?:igus|rbtx)/i.test(node.label))).toHaveLength(2);
  });

  it('links a rule only to what flags it', () => {
    const flagged = new Set(graph.edges.filter((edge) => edge.kind === 'rule_applies').map((edge) => edge.source));
    expect(flagged.has('rule:mineral_dust_trgs_559')).toBe(true);
    expect(flagged.has('rule:iso_10218_2025')).toBe(false);
    expect(nodeById('rule:iso_10218_2025')).toMatchObject({ kind: 'rule', edgeCounts: {} });
  });

  it('answers real searches in both languages', () => {
    expect(searchGraph('unitree g1', { limit: 1 })[0].id).toBe('robot:unitree-g1');
    expect(searchGraph('unitree', { limit: 1 })[0].id).toBe('maker:unitree-robotics');
    expect(searchGraph('Trockenbau', { kinds: ['setting'], limit: 3 }).map((hit) => hit.id)).toContain('setting:site_drywall');
    expect(searchGraph('drywall', { kinds: ['setting'], limit: 3 }).map((hit) => hit.id)).toContain('setting:site_drywall');
    expect(searchGraph('Abbruchroboter', { kinds: ['robot'], limit: 5 }).length).toBeGreaterThan(0);
    expect(searchGraph('brokk', { kinds: ['maker'], limit: 1 })[0].label).toBe('Brokk');
  });
});
