import { createHash } from 'node:crypto';
import { JOB_LABELS } from '@/lib/market/vocab';
import { STAGE_RANK, type Verdict } from '@/lib/market/match';
import type { Dossier, RobotType } from '@/lib/market/schema';
import { EDGE_KINDS, NODE_KINDS, PAPER_VERDICTS, REAL_WORK_STAGES, type Graph, type GraphCounts, type GraphEdge, type GraphNode, type PaperVerdict } from './types';

// The knowledge graph as a pure function of loaded data: no file system, no clock, no random numbers.
// The same input gives the same output, which is what lets a test compare graph.json with the data.
// The owner's rule holds throughout: unknown stays unknown, so a link exists only where the data states it.

export type InputRobot = Pick<Dossier, 'id' | 'name' | 'maker' | 'makerCountry' | 'model' | 'variant' | 'robotType' | 'specialisedFor' | 'officialUrl' | 'lifecycle' | 'evidence' | 'sources'> & {
  germany: Pick<Dossier['germany'], 'status' | 'sellers'>;
};
export type InputJob = {
  id: string; title: string; titleDe: string | null; href: string; where: string; family: string; familyTerms: string[];
  /** Its home setting from data/settings. Null for researched jobs, whose setting is free text. */
  settingId: string | null; settingText: string;
  alsoIn: string[];
  /** Compliance entries the task record flags. */
  rules: string[];
};
export type InputSetting = { id: string; title: string; titleDe: string; group: string; section: string | null; aliases: string[] };
export type InputRule = { id: string; title: string; titleDe: string; reference: string; url: string; kind: string; jurisdiction: string; status: string; triggers: string[] };
export type InputFit = { robotId: string; jobId: string; verdict: Verdict };
export type InputPlace = { town?: string; country: string };
export type GraphInput = {
  robots: InputRobot[]; jobs: InputJob[]; settings: InputSetting[]; rules: InputRule[]; fits: InputFit[];
  places: Record<string, InputPlace[]>;
  /** Page of each robot (lib/market/links.ts robotHref). */
  robotHrefs: Record<string, string>;
  /** Maker page by robot, for robots whose catalogue page names a brand. */
  brandHrefs: Record<string, string>;
};

/** Lower case ASCII, for ids: "Génération Robots" and "Generation Robots" get the same one. */
export function slug(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const withoutBrackets = (name: string) => name.replace(/\s*\([^)]*\)/g, '').trim();

/** The spelling most records use, then the shortest, so a label does not depend on file order. */
function commonest(counts: Map<string, number>): string {
  return [...counts].sort(([a, x], [b, y]) => y - x || a.length - b.length || a.localeCompare(b))[0][0];
}
const bump = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
const unique = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))];

// Search words the records do not carry. English comes from the site's own labels; the German is
// here because market records are written in English only, and a German buyer searches "Abbruch".
const TYPE_TERMS: Record<RobotType, string[]> = {
  humanoid: ['humanoid', 'humanoid robot', 'humanoider Roboter'],
  quadruped: ['quadruped', 'robot dog', 'Roboterhund', 'Laufroboter', 'Vierbeiner'],
  mobile_manipulator: ['mobile manipulator', 'mobiler Manipulator', 'Roboterarm auf Fahrwerk'],
  specialised: ['specialised machine', 'construction robot', 'Spezialmaschine', 'Bauroboter', 'Baustellenroboter'],
};
const CATEGORY_DE: Record<string, string> = {
  layout_marking: 'Markieren Anreißen Absteckung', drilling_anchoring: 'Bohren Dübel Anker', demolition: 'Abbruch Rückbau', surface_spraying: 'Spritzen Lackieren Malen',
  drywall_finishing: 'Trockenbau Spachteln', floor_grinding: 'Boden schleifen Bodenschleifen', concrete_finishing: 'Beton glätten Betonglätten', rebar_tying: 'Bewehrung flechten Rödeln',
  rebar_placement: 'Bewehrung verlegen', bricklaying: 'Mauern Mauerwerk Maurer', printing_3d: '3D-Druck Betondruck', material_lifting: 'Materialaufzug Heben Hebezeug', welding: 'Schweißen',
  facade_cleaning: 'Fassadenreinigung', glazing_installation: 'Verglasung Glasmontage Fenstermontage', scanning_documentation: 'Scannen Dokumentation Baufortschritt',
  excavation: 'Bagger Erdarbeiten Aushub', tunnelling: 'Tunnelbau',
};
const COUNTRY_DE: [RegExp, string][] = [
  [/germany/i, 'Deutschland'], [/austria/i, 'Österreich'], [/switzerland/i, 'Schweiz'], [/netherlands/i, 'Niederlande'], [/czech/i, 'Tschechien'], [/denmark/i, 'Dänemark'],
  [/sweden/i, 'Schweden'], [/norway/i, 'Norwegen'], [/france/i, 'Frankreich'], [/spain/i, 'Spanien'], [/italy/i, 'Italien'], [/\buk\b/i, 'Großbritannien'], [/japan/i, 'Japan'],
];

/** Words that name a country or a wider area, not a place of work. */
const AREAS = new Set([
  'germany', 'deutschland', 'austria', 'switzerland', 'czech republic', 'denmark', 'sweden', 'norway', 'uk', 'united kingdom', 'france', 'spain', 'portugal', 'netherlands', 'poland',
  'slovakia', 'hungary', 'bulgaria', 'italy', 'europe', 'usa', 'us', 'china', 'hong kong', 'singapore', 'uae', 'united arab emirates', 'south korea', 'japan', 'malaysia', 'australia',
  'new zealand', 'vietnam', 'brazil', 'north america', 'asia', 'worldwide',
]);
/** Descriptions that name no site: "Private homes, Germany", "About 100 warehouses, China", "Unnamed hyperscaler ...". */
const VAGUE = /^(?:unnamed|commercial projects|solar projects|homes\b|private homes|about \d|\d+ robots|more than|schools|research labs|energy sites|field test site)/i;

/** A project is a named place. "USA (customers not named)" is evidence but no place, so no node is made up for it. */
export function isNamedPlace(where: string): boolean {
  if (VAGUE.test(where)) return false;
  return withoutBrackets(where).split(/,|;|\band\b/).map((piece) => piece.trim().toLowerCase()).filter(Boolean).some((piece) => !AREAS.has(piece));
}

/** The registered domain, keeping a country suffix such as .co.uk whole. */
function siteOf(url: string): string {
  const parts = new URL(url).hostname.replace(/^www\./, '').split('.');
  const size = parts.length > 2 && /^(?:co|com|org|net|ac)$/.test(parts.at(-2)!) && parts.at(-1)!.length === 2 ? 3 : 2;
  return parts.slice(-size).join('.');
}

type SellerGroup = { id: string; label: string; names: string[]; country: string; roles: string[]; contact: string | null };

/** One company is written several ways across records ("RobotShop EU", "RobotShop Europe (…)"), and a
 *  name-keyed node would split it. The web address is the one field the spellings share, so rows are
 *  joined by name or by domain. Keeping a domain as the id keeps the id stable when a spelling changes. */
function groupSellers(robots: readonly InputRobot[]): { groupOf: (name: string) => SellerGroup; groups: SellerGroup[] } {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    const up = parent.get(key) ?? key;
    if (up === key) return key;
    const top = find(up);
    parent.set(key, top);
    return top;
  };
  const join = (a: string, b: string) => { parent.set(find(a), find(b)); };
  const nameKey = (name: string) => 'n:' + slug(withoutBrackets(name));
  const rows = robots.flatMap((robot) => robot.germany.sellers);
  for (const seller of rows) for (const url of unique([seller.productUrl, seller.contactUrl])) join(nameKey(seller.name), 'd:' + siteOf(url));

  const members = new Map<string, { names: Map<string, number>; short: Map<string, number>; domains: Set<string>; countries: Map<string, number>; roles: Set<string>; contacts: Set<string> }>();
  for (const seller of rows) {
    const top = find(nameKey(seller.name));
    const group = members.get(top) ?? { names: new Map(), short: new Map(), domains: new Set(), countries: new Map(), roles: new Set(), contacts: new Set() };
    members.set(top, group);
    bump(group.names, seller.name);
    bump(group.short, withoutBrackets(seller.name));
    bump(group.countries, seller.country);
    group.roles.add(seller.role);
    for (const url of unique([seller.productUrl, seller.contactUrl])) group.domains.add(siteOf(url));
    if (seller.contactUrl) group.contacts.add(seller.contactUrl);
  }
  const byTop = new Map<string, SellerGroup>();
  for (const [top, group] of members) {
    const label = commonest(group.short);
    const domain = [...group.domains].sort()[0];
    byTop.set(top, {
      id: 'seller:' + slug(domain ?? label), label, names: [...group.names.keys()].sort(), country: commonest(group.countries),
      roles: [...group.roles].sort(), contact: [...group.contacts].sort()[0] ?? null,
    });
  }
  return { groupOf: (name) => byTop.get(find(nameKey(name)))!, groups: [...byTop.values()] };
}

function robotTerms(robot: InputRobot): string[] {
  const categories = robot.specialisedFor.filter((item) => !item.includes('/') && !item.startsWith('research:'));
  return unique([
    robot.model, robot.variant, robot.maker, ...TYPE_TERMS[robot.robotType],
    ...categories.flatMap((item) => [JOB_LABELS[item] ?? item, CATEGORY_DE[item]]),
  ]);
}

const makerKey = (name: string) => slug(withoutBrackets(name));
const sourceOf = (robot: InputRobot, sourceId: string) => robot.sources.find((source) => source.id === sourceId)?.url;
const originOf = (url: string | null) => (url ? new URL(url).origin : null);

export function buildGraph(input: GraphInput): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const add = (node: GraphNode) => { if (!nodes.has(node.id)) nodes.set(node.id, node); };

  for (const setting of input.settings) {
    add({
      id: 'setting:' + setting.id, kind: 'setting', label: setting.title, url: '/use-cases?setting=' + setting.id, sourceUrl: null,
      terms: unique([setting.titleDe, ...setting.aliases]), meta: { group: setting.group, section: setting.section },
    });
  }
  for (const rule of input.rules) {
    add({
      id: 'rule:' + rule.id, kind: 'rule', label: rule.title, url: null, sourceUrl: rule.url, terms: unique([rule.titleDe, rule.reference]),
      meta: { ruleKind: rule.kind, jurisdiction: rule.jurisdiction, status: rule.status, triggers: rule.triggers.join(' ') },
    });
  }

  const known = new Set(input.jobs.map((job) => job.id));
  const settingIds = new Set(input.settings.map((setting) => setting.id));
  const ruleIds = new Set(input.rules.map((rule) => rule.id));
  for (const job of input.jobs) {
    add({
      id: 'job:' + job.id, kind: 'job', label: job.title, url: job.href, sourceUrl: null,
      terms: unique([job.titleDe, job.settingText, ...job.familyTerms]), meta: { where: job.where, family: job.family, setting: job.settingText },
    });
    // A researched job states its setting as free text. That is still stated, so it gets a node of its
    // own rather than no link, but no page: the site has none for it.
    const home = job.settingId ?? 'other/' + slug(job.settingText);
    if (!job.settingId) add({ id: 'setting:' + home, kind: 'setting', label: job.settingText, url: null, sourceUrl: null, terms: [], meta: { group: job.where, section: null } });
    edges.push({ source: 'job:' + job.id, target: 'setting:' + home, kind: 'job_in_setting' });
    for (const other of job.alsoIn) if (settingIds.has(other) && other !== home) edges.push({ source: 'job:' + job.id, target: 'setting:' + other, kind: 'job_in_setting', also: true });
    for (const rule of job.rules) if (ruleIds.has(rule)) edges.push({ source: 'rule:' + rule, target: 'job:' + job.id, kind: 'rule_applies' });
  }

  const makers = new Map<string, InputRobot[]>();
  for (const robot of input.robots) makers.set(makerKey(robot.maker), [...(makers.get(makerKey(robot.maker)) ?? []), robot]);
  for (const [key, robots] of makers) {
    const names = new Map<string, number>(), countries = new Map<string, number>();
    for (const robot of robots) { bump(names, robot.maker); bump(countries, robot.makerCountry); }
    add({
      id: 'maker:' + key, kind: 'maker', label: commonest(names), url: robots.map((robot) => input.brandHrefs[robot.id]).filter(Boolean).sort()[0] ?? null,
      sourceUrl: originOf(robots.map((robot) => robot.officialUrl).filter(Boolean).sort()[0] ?? null), terms: [...names.keys()].sort(), meta: { country: commonest(countries) },
    });
  }

  const { groupOf, groups } = groupSellers(input.robots);
  for (const group of groups) {
    add({ id: group.id, kind: 'seller', label: group.label, url: null, sourceUrl: group.contact, terms: group.names, meta: { country: group.country, roles: group.roles.join(' ') } });
  }

  for (const robot of input.robots) {
    const id = 'robot:' + robot.id;
    add({
      id, kind: 'robot', label: robot.name, url: input.robotHrefs[robot.id] ?? '/market/' + robot.id, sourceUrl: robot.officialUrl, terms: robotTerms(robot),
      meta: { type: robot.robotType, status: robot.germany.status, lifecycle: robot.lifecycle },
    });
    edges.push({ source: id, target: 'maker:' + makerKey(robot.maker), kind: 'made_by' });
    for (const seller of robot.germany.sellers) {
      edges.push({ source: id, target: groupOf(seller.name).id, kind: 'sold_by', role: seller.role, sourceUrl: seller.productUrl ?? sourceOf(robot, seller.sourceId) ?? seller.contactUrl ?? undefined });
    }
    for (const entry of robot.evidence) {
      const sourceUrl = sourceOf(robot, entry.sourceId);
      const detail = { stage: entry.stage, sourceUrl, task: entry.task, where: entry.where ?? undefined, date: entry.date ?? undefined };
      for (const taskId of entry.taskIds) if (known.has(taskId)) edges.push({ source: id, target: 'job:' + taskId, kind: 'proven_on', ...detail });
      // Pilots and daily use only, the same bar as the project map: a fair stand is a place a robot
      // was shown, not a place it worked, and a claim is a maker's word.
      if (!entry.where || !REAL_WORK_STAGES.includes(entry.stage) || !isNamedPlace(entry.where)) continue;
      const projectId = 'project:' + slug(entry.where);
      const at = input.places[entry.where] ?? [];
      add({
        id: projectId, kind: 'project', label: entry.where, url: null, sourceUrl: null,
        terms: unique(COUNTRY_DE.filter(([pattern]) => pattern.test(entry.where!)).map(([, german]) => german)),
        meta: { country: at[0]?.country ?? null, towns: unique(at.map((place) => place.town)).join(', ') || null },
      });
      edges.push({ source: id, target: projectId, kind: 'worked_at', ...detail });
    }
  }

  for (const fit of input.fits) {
    // `done` is a proven_on edge already; only what is known from paper stays a paper fit.
    if (!PAPER_VERDICTS.includes(fit.verdict as PaperVerdict)) continue;
    edges.push({ source: 'robot:' + fit.robotId, target: 'job:' + fit.jobId, kind: 'fits_job', verdict: fit.verdict as PaperVerdict });
  }

  return { nodes: sortNodes([...nodes.values()]), edges: sortEdges(edges) };
}

function sortNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.sort((a, b) => NODE_KINDS.indexOf(a.kind) - NODE_KINDS.indexOf(b.kind) || a.id.localeCompare(b.id, 'en'));
}

/** Total order and no exact repeats, so the file does not depend on the order files were read in. */
function sortEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Map(edges.map((edge) => [JSON.stringify(edge), edge]));
  const rank = (edge: GraphEdge) => (edge.stage ? STAGE_RANK[edge.stage] : 0);
  return [...seen].sort(([keyA, a], [keyB, b]) => EDGE_KINDS.indexOf(a.kind) - EDGE_KINDS.indexOf(b.kind) || a.source.localeCompare(b.source, 'en') || a.target.localeCompare(b.target, 'en') || rank(b) - rank(a) || keyA.localeCompare(keyB, 'en')).map(([, edge]) => edge);
}

export function countGraph({ nodes, edges }: Graph): GraphCounts {
  const counts: GraphCounts = {
    nodes: Object.fromEntries(NODE_KINDS.map((kind) => [kind, 0])) as GraphCounts['nodes'],
    edges: Object.fromEntries(EDGE_KINDS.map((kind) => [kind, 0])) as GraphCounts['edges'],
  };
  for (const node of nodes) counts.nodes[node.kind]++;
  for (const edge of edges) counts.edges[edge.kind]++;
  return counts;
}

/** A fingerprint of the content, stored in the file so a test can tell when the data has moved on. */
export function graphHash({ nodes, edges }: Graph): string {
  return createHash('sha256').update(JSON.stringify({ nodes, edges })).digest('hex').slice(0, 16);
}
