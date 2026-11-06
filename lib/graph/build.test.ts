import { describe, expect, it } from 'vitest';
import { buildGraph, countGraph, graphHash, isNamedPlace, slug, type GraphInput, type InputRobot } from './build';
import { decodeGraph, encodeGraph } from './file';
import type { GraphEdge, GraphFile } from './types';

const seller = (name: string, productUrl: string | null, role: 'distributor' | 'reseller' | 'rental' = 'reseller') => ({
  name, country: 'DE', role, productUrl, contactUrl: null, email: null, phone: null, priceEur: null, priceBasis: null, sourceId: 's1', note: null,
});
const evidence = (over: Partial<InputRobot['evidence'][number]>): InputRobot['evidence'][number] => ({ taskIds: [], task: 'Did the work', stage: 'deployment', where: null, date: null, sourceId: 's1', note: null, ...over });

function robot(id: string, over: Partial<InputRobot> = {}): InputRobot {
  return {
    id, name: id.toUpperCase(), maker: 'Acme Robotics', makerCountry: 'DE', model: id, variant: null, robotType: 'humanoid', specialisedFor: [], officialUrl: 'https://acme.example/' + id,
    lifecycle: 'shipping', evidence: [], sources: [{ id: 's1', url: 'https://source.example/' + id, title: 'Page', publisher: 'Acme', kind: 'manufacturer', checkedAt: '2026-10-01' }],
    germany: { status: 'buy_now', sellers: [] }, ...over,
  };
}

const job = (id: string, over: Partial<GraphInput['jobs'][number]> = {}): GraphInput['jobs'][number] => ({
  id, title: 'Job ' + id, titleDe: 'Arbeit ' + id, href: '/use-cases/' + id, where: 'site', family: 'surface_finishing', familyTerms: [], settingId: 'site_drywall', settingText: 'Drywall', alsoIn: [], rules: [], ...over,
});

function input(over: Partial<GraphInput> = {}): GraphInput {
  return {
    robots: [], jobs: [],
    settings: [{ id: 'site_drywall', title: 'Drywall', titleDe: 'Trockenbauarbeiten', group: 'site', section: 'interior', aliases: ['Ständerwände'] }, { id: 'site_painting', title: 'Painting', titleDe: 'Malerarbeiten', group: 'site', section: 'interior', aliases: [] }],
    rules: [
      { id: 'dust', title: 'Dust rule', titleDe: 'Staubregel', reference: 'TRGS 559', url: 'https://rules.example/dust', kind: 'guideline', jurisdiction: 'DE', status: 'in_force', triggers: ['mineral_dust'] },
      { id: 'always', title: 'General rule', titleDe: 'Allgemeine Regel', reference: 'ISO 1', url: 'https://rules.example/iso', kind: 'standard', jurisdiction: 'EU', status: 'published', triggers: ['always'] },
    ],
    fits: [], places: {}, robotHrefs: {}, brandHrefs: {}, ...over,
  };
}

const edgesOf = (graph: { edges: GraphEdge[] }, kind: GraphEdge['kind']) => graph.edges.filter((edge) => edge.kind === kind);

describe('buildGraph', () => {
  it('links a robot to its maker and gives it the page the site uses', () => {
    const graph = buildGraph(input({ robots: [robot('a1')], robotHrefs: { a1: '/robots/acme/a1#germany' }, brandHrefs: { a1: '/brands/acme' } }));
    expect(graph.nodes.find((node) => node.id === 'robot:a1')).toMatchObject({ kind: 'robot', url: '/robots/acme/a1#germany', meta: { status: 'buy_now' } });
    expect(graph.nodes.find((node) => node.id === 'maker:acme-robotics')).toMatchObject({ url: '/brands/acme', sourceUrl: 'https://acme.example' });
    expect(edgesOf(graph, 'made_by')).toEqual([{ source: 'robot:a1', target: 'maker:acme-robotics', kind: 'made_by' }]);
  });

  it('falls back to the market page and leaves a maker without a brand page unlinked', () => {
    const graph = buildGraph(input({ robots: [robot('a1')] }));
    expect(graph.nodes.find((node) => node.id === 'robot:a1')?.url).toBe('/market/a1');
    expect(graph.nodes.find((node) => node.id === 'maker:acme-robotics')?.url).toBeNull();
  });

  it('treats differently written makers as one', () => {
    const graph = buildGraph(input({ robots: [robot('a1', { maker: 'Dobot' }), robot('a2', { maker: 'Dobot' }), robot('a3', { maker: 'DOBOT' }), robot('a4', { maker: 'Dobot (Yuejiang)' })] }));
    const makers = graph.nodes.filter((node) => node.kind === 'maker');
    expect(makers).toHaveLength(1);
    expect(makers[0]).toMatchObject({ id: 'maker:dobot', label: 'Dobot' });
    expect(makers[0].terms).toContain('Dobot (Yuejiang)');
  });

  it('joins seller spellings by web address and keeps separate companies apart', () => {
    const graph = buildGraph(input({ robots: [
      robot('a1', { germany: { status: 'buy_now', sellers: [seller('RobotShop EU (eu.robotshop.com)', 'https://eu.robotshop.com/a'), seller('Bipedal GmbH', 'https://bipedal.de/a')] } }),
      robot('a2', { germany: { status: 'buy_now', sellers: [seller('RobotShop', 'https://www.robotshop.com/b')] } }),
      robot('a3', { germany: { status: 'buy_now', sellers: [seller('RobotShop', 'https://www.robotshop.com/c')] } }),
    ] }));
    const sellers = graph.nodes.filter((node) => node.kind === 'seller');
    expect(sellers.map((node) => node.id).sort()).toEqual(['seller:bipedal-de', 'seller:robotshop-com']);
    expect(sellers.find((node) => node.id === 'seller:robotshop-com')).toMatchObject({ label: 'RobotShop' });
    expect(sellers.find((node) => node.id === 'seller:robotshop-com')?.terms).toContain('RobotShop EU (eu.robotshop.com)');
    expect(edgesOf(graph, 'sold_by').filter((edge) => edge.target === 'seller:robotshop-com')).toHaveLength(3);
  });

  it('keeps a seller with no address, and does not merge a .co.uk domain with every other .co.uk', () => {
    const graph = buildGraph(input({ robots: [robot('a1', { germany: { status: 'buy_now', sellers: [seller('10X', null), seller('One Ltd', 'https://one.co.uk/a'), seller('Two Ltd', 'https://two.co.uk/a')] } })] }));
    expect(graph.nodes.filter((node) => node.kind === 'seller').map((node) => node.id).sort()).toEqual(['seller:10x', 'seller:one-co-uk', 'seller:two-co-uk']);
  });

  it('keeps fits on paper and proof in different edge kinds', () => {
    const graph = buildGraph(input({
      robots: [robot('a1', { evidence: [evidence({ taskIds: ['j/proven'], stage: 'pilot', date: '2026-03' })] })],
      jobs: [job('j/proven'), job('j/paper'), job('j/near')],
      fits: [{ robotId: 'a1', jobId: 'j/proven', verdict: 'done' }, { robotId: 'a1', jobId: 'j/paper', verdict: 'fits' }, { robotId: 'a1', jobId: 'j/near', verdict: 'similar' }],
    }));
    expect(edgesOf(graph, 'fits_job').map((edge) => [edge.target, edge.verdict])).toEqual([['job:j/near', 'similar'], ['job:j/paper', 'fits']]);
    expect(edgesOf(graph, 'proven_on')).toEqual([{ source: 'robot:a1', target: 'job:j/proven', kind: 'proven_on', stage: 'pilot', sourceUrl: 'https://source.example/a1', task: 'Did the work', date: '2026-03' }]);
  });

  it('keeps every stage on proven_on, a claim as well as daily use', () => {
    const graph = buildGraph(input({ robots: [robot('a1', { evidence: [evidence({ taskIds: ['j/1'], stage: 'claim' }), evidence({ taskIds: ['j/1'], stage: 'deployment', where: 'BASF, Ludwigshafen, Germany' })] })], jobs: [job('j/1')] }));
    expect(edgesOf(graph, 'proven_on').map((edge) => edge.stage)).toEqual(['deployment', 'claim']);
  });

  it('makes no edge to a job the site does not have', () => {
    const graph = buildGraph(input({ robots: [robot('a1', { evidence: [evidence({ taskIds: ['j/gone'] })] })], fits: [] }));
    expect(edgesOf(graph, 'proven_on')).toEqual([]);
  });

  it('makes a project only from real work at a named place', () => {
    const graph = buildGraph(input({
      robots: [
        robot('a1', { evidence: [evidence({ where: 'BASF, Ludwigshafen, Germany', stage: 'deployment' }), evidence({ where: 'IFA 2026, Berlin, Germany', stage: 'demo' }), evidence({ where: 'Renault Group, France', stage: 'claim' }), evidence({ where: 'USA (customers not named)' }), evidence({ where: null })] }),
        robot('a2', { evidence: [evidence({ where: 'BASF, Ludwigshafen, Germany', stage: 'pilot' })] }),
      ],
      places: { 'BASF, Ludwigshafen, Germany': [{ town: 'Ludwigshafen', country: 'DE' }] },
    }));
    const projects = graph.nodes.filter((node) => node.kind === 'project');
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ label: 'BASF, Ludwigshafen, Germany', meta: { country: 'DE', towns: 'Ludwigshafen' } });
    expect(projects[0].terms).toContain('Deutschland');
    expect(edgesOf(graph, 'worked_at').map((edge) => [edge.source, edge.stage])).toEqual([['robot:a1', 'deployment'], ['robot:a2', 'pilot']]);
  });

  it('links jobs to their home and to the settings they also happen in', () => {
    const graph = buildGraph(input({ jobs: [job('j/1', { alsoIn: ['site_painting', 'site_unknown'] })] }));
    expect(edgesOf(graph, 'job_in_setting')).toEqual([
      { source: 'job:j/1', target: 'setting:site_drywall', kind: 'job_in_setting' },
      { source: 'job:j/1', target: 'setting:site_painting', kind: 'job_in_setting', also: true },
    ]);
  });

  it('gives a researched job its stated setting, with no page behind it', () => {
    const graph = buildGraph(input({ jobs: [job('research:milk', { settingId: null, settingText: 'Dairy cattle barn', where: 'other', titleDe: null })] }));
    expect(graph.nodes.find((node) => node.id === 'setting:other/dairy-cattle-barn')).toMatchObject({ label: 'Dairy cattle barn', url: null });
    expect(edgesOf(graph, 'job_in_setting')[0].target).toBe('setting:other/dairy-cattle-barn');
  });

  it('applies a rule only where a task flags it, and invents nothing from its triggers', () => {
    const graph = buildGraph(input({ jobs: [job('j/1', { rules: ['dust', 'not_a_rule'] }), job('j/2')] }));
    expect(edgesOf(graph, 'rule_applies')).toEqual([{ source: 'rule:dust', target: 'job:j/1', kind: 'rule_applies' }]);
    // "always" is a trigger, not a link: the entry stays in the graph with no edge.
    expect(graph.nodes.find((node) => node.id === 'rule:always')).toMatchObject({ url: null, sourceUrl: 'https://rules.example/iso', meta: { triggers: 'always' } });
  });

  it('gives German search words to records written in English', () => {
    const graph = buildGraph(input({ robots: [robot('b1', { robotType: 'specialised', specialisedFor: ['demolition', 'site_demolition/concrete-breaking'] })] }));
    const terms = graph.nodes.find((node) => node.id === 'robot:b1')!.terms.join(' ');
    expect(terms).toContain('Abbruch');
    expect(terms).toContain('Demolition');
    expect(terms).not.toContain('site_demolition');
  });

  it('gives the same graph whatever order the data was read in', () => {
    const robots = [robot('a2', { germany: { status: 'quote', sellers: [seller('Bipedal GmbH', 'https://bipedal.de/a')] } }), robot('a1', { maker: 'Zeta' })];
    const jobs = [job('j/2'), job('j/1')];
    const fits = [{ robotId: 'a1', jobId: 'j/1', verdict: 'fits' as const }, { robotId: 'a2', jobId: 'j/2', verdict: 'stretch' as const }];
    const one = buildGraph(input({ robots, jobs, fits }));
    const two = buildGraph(input({ robots: [...robots].reverse(), jobs: [...jobs].reverse(), fits: [...fits].reverse() }));
    expect(two).toEqual(one);
    expect(graphHash(two)).toBe(graphHash(one));
  });

  it('counts every kind and changes the hash when the data changes', () => {
    const before = buildGraph(input({ robots: [robot('a1')] }));
    const after = buildGraph(input({ robots: [robot('a1', { germany: { status: 'not_sold', sellers: [] } })] }));
    expect(countGraph(before).nodes).toMatchObject({ robot: 1, maker: 1, seller: 0, rule: 2 });
    expect(countGraph(before).edges).toMatchObject({ made_by: 1, fits_job: 0 });
    expect(graphHash(after)).not.toBe(graphHash(before));
  });
});

describe('isNamedPlace', () => {
  it.each([
    'BASF, Ludwigshafen, Germany', 'Gin Chia, Soilbuild, Chan Ren Fong and Dragages', 'GXO (site not stated)', 'SOLV Energy solar project, USA (site not named)',
    'DHL Supply Chain, North America, UK and Europe', 'Solar project in northeastern Louisiana, USA, supplying Meta\'s Hyperion data center',
  ])('keeps %s', (where) => expect(isNamedPlace(where)).toBe(true));
  it.each([
    'USA', 'China (no site named)', 'Netherlands and UK', 'Brazil (customer not named)', 'North America', 'Private homes, Germany', 'Commercial projects in the USA',
    'About 100 instant-retail warehouses, China', 'Unnamed hyperscaler (large technology company), data center projects; countries not named',
    '12 robots; projects in Czech Republic, Austria, Slovakia, Poland, Hungary and United Kingdom', 'Singapore (clients include Woh Hup and BHCC) and Australia',
  ])('leaves out %s', (where) => expect(isNamedPlace(where)).toBe(false));
});

describe('slug', () => {
  it('folds accents and symbols so spellings share an id', () => {
    expect(slug('Génération Robots')).toBe('generation-robots');
    expect(slug('Straße & Co.')).toBe('strasse-co');
  });
});

describe('the stored form of the graph', () => {
  it('restores exactly what was stored', () => {
    const graph = buildGraph(input({
      robots: [robot('a1', { germany: { status: 'buy_now', sellers: [seller('Bipedal GmbH', 'https://bipedal.de/a', 'rental')] }, evidence: [evidence({ taskIds: ['j/1'], where: 'BASF, Ludwigshafen, Germany', date: '2026' })] })],
      jobs: [job('j/1', { rules: ['dust'], alsoIn: ['site_painting'] })],
      fits: [{ robotId: 'a1', jobId: 'j/1', verdict: 'stretch' }],
    }));
    const file: GraphFile = { version: 1, hash: graphHash(graph), counts: countGraph(graph), ...graph };
    const roundTrip = decodeGraph(JSON.parse(JSON.stringify(encodeGraph(file))));
    expect(roundTrip).toEqual(JSON.parse(JSON.stringify(file)));
  });

  it('leaves out what can be restored', () => {
    const graph = buildGraph(input());
    const stored = encodeGraph({ version: 1, hash: 'x', counts: countGraph(graph), ...graph });
    expect(stored.nodes.find((node) => node.id === 'rule:dust')).not.toHaveProperty('url');
    expect(Object.keys(stored.edges)).toContain('fits_job');
  });
});
