import type Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { loadContent } from '@/lib/content/load';
import { neighbours, nodeById, searchGraph } from '@/lib/graph';
import { STATUS_LABELS, TYPE_LABELS, bodyLabel, priceText, toCard } from '@/lib/market/cards';
import { jobsForRobot, loadJobDetail, loadJobs } from '@/lib/market/jobs';
import { robotHref } from '@/lib/market/links';
import { loadMarket, type MarketRobot } from '@/lib/market/load';
import { STAGE_RANK } from '@/lib/market/match';
import { PROOF_TEXT, SPEC_TEXT, STATUS_TEXT, STEP_TEXT, TYPE_TEXT, WORK_TEXT, type Lang } from './i18n';

/** One fact in the brief. "assumed" is the adviser's guess to confirm, "open" still matters and is
 *  unknown, "not_needed" is something the person said they do not care about. */
const BriefFactSchema = z.object({
  key: z.string().min(1).max(40).describe('Short stable id, for example who, priorities, budget, job, place, ground, robot_type, load_kg, reach, runtime_h, hands, people_nearby, stairs, timing, country, shortlist.'),
  label: z.string().min(1).max(40).describe('Plain label shown to the person, in their language.'),
  value: z.string().max(160).describe('What is known, without words like assumed: the state already says that. Empty for open.'),
  state: z.enum(['known', 'assumed', 'open', 'not_needed']),
});
export type BriefFact = z.infer<typeof BriefFactSchema>;

const Question = z.object({
  key: z.string().min(1).max(40).describe('Same key as the brief fact it fills.'),
  label: z.string().min(1).max(80).describe('The question in a few words.'),
  kind: z.enum(['choice', 'multi', 'number', 'text']),
  options: z.array(z.string().max(60)).max(6).optional().describe('For choice and multi: short answers the person could give, in their language. Choice adds Not sure by itself.'),
  unit: z.string().max(12).optional(),
  why: z.string().max(90).optional().describe('One short reason this answer changes the advice.'),
});
export type ChatForm = { title?: string; language: Lang; questions: z.infer<typeof Question>[] };

const OptionInput = z.object({
  robot_id: z.string().max(120),
  label: z.string().max(30).describe('Short tag such as Typical choice, Lowest cost, Most proven.'),
  why: z.string().max(240).describe('Why this makes sense for this person.'),
  pros: z.array(z.string().max(120)).min(1).max(4),
  cons: z.array(z.string().max(120)).min(1).max(4),
  confirm: z.array(z.string().max(120)).max(3).describe('What to confirm with the seller for this robot.'),
  person_asked_for_it: z.boolean().optional().describe('True only if the person asked for this exact robot. A robot that cannot be ordered in Germany needs it.'),
});

export type ChatOption = {
  id: string; name: string; maker: string; type: string; status: string; price: string; leadTime: string | null;
  href: string; image: string | null; alt: string; proof: string | null; specs: { label: string; value: string }[];
  sellers: { name: string; country: string; url: string | null; price: string | null }[];
  label: string; why: string; pros: string[]; cons: string[]; confirm: string[]; language: Lang;
};
export type LeftOut = { name: string; reason: string };

// A tool result is resent on every later round of a turn, so an unbounded one costs several times over.
const MAX_RESULT_CHARS = 7000;

/** The owner's call, not a finding. The adviser never brings these up itself, and talks about them only
 *  when a person asks by name. They stay in the database and on their pages. */
const NOT_SUGGESTED = new Set(['kepler-k2', 'kepler-k2-all-runner', 'kepler-k2-basic']);

const orderable = (robot: MarketRobot) => robot.germany.status === 'buy_now' || robot.germany.status === 'quote';

const sellerNames = (robot: MarketRobot, country?: string) => new Set(robot.germany.sellers.filter((seller) => !country || seller.country === country).map((seller) => seller.name));

let marketScores: Map<string, number> | null = null;

/** How present a robot is on the market. There are no sales figures, so sellers stand in for them: a
 *  robot many shops carry, from a maker many shops carry, is one that people really buy. */
function marketScore(robot: MarketRobot): number {
  if (!marketScores) {
    const robots = loadMarket();
    const listings = new Map<string, number>();
    for (const item of robots) listings.set(item.maker, (listings.get(item.maker) ?? 0) + sellerNames(item).size);
    marketScores = new Map(robots.map((item) => {
      const stage = bestStage(item);
      const use = stage === 'deployment' ? 3 : stage === 'pilot' ? 2 : 0;
      return [item.id, sellerNames(item).size * 2 + sellerNames(item, 'DE').size + (item.germany.priceEur ? 1 : 0) + use + Math.min(3, Math.floor((listings.get(item.maker) ?? 0) / 10))];
    }));
  }
  return marketScores.get(robot.id) ?? 0;
}

const marketWord = (robot: MarketRobot) => {
  const score = marketScore(robot);
  return score >= 11 ? 'mainstream' : score >= 7 ? 'established' : 'niche';
};

const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 1);

/** How many query words appear in the text, as whole or partial words. */
function matchScore(query: string, text: string): number {
  const haystack = text.toLowerCase();
  return words(query).filter((word) => haystack.includes(word)).length;
}

function bestStage(robot: MarketRobot): keyof typeof STAGE_RANK | null {
  const stages = robot.evidence.map((item) => item.stage).sort((a, b) => STAGE_RANK[b] - STAGE_RANK[a]);
  return stages[0] ?? null;
}

/** What the adviser reads. A maker's statement counts as what the robot does, so it carries no label of
 *  doubt. Real use keeps its own word, because that is the first thing a buyer wants to hear. */
const USE_WORD = { claim: 'made_for', demo: 'demo', pilot: 'pilot', deployment: 'daily_use' } as const;

/** The robot's strongest real use, if it has one. */
function realUse(robot: MarketRobot) {
  const stage = bestStage(robot);
  return stage && stage !== 'claim' ? stage : null;
}

function robotRow(robot: MarketRobot) {
  const c = robot.capabilities;
  const use = realUse(robot);
  return {
    id: robot.id, name: robot.name, maker: robot.maker, type: TYPE_LABELS[robot.robotType],
    built_for: robot.specialisedFor.length ? robot.specialisedFor.slice(0, 4) : undefined,
    germany: STATUS_LABELS[robot.germany.status], market: marketWord(robot), price: priceText(toCard(robot)), lifecycle: robot.lifecycle,
    moves: bodyLabel(robot), arms: c.arms, hands: c.hands, arm_payload_kg: c.armPayloadKg, carry_kg: c.carryPayloadKg,
    runtime_h: c.runtimeH, ip: c.ipRating, stairs: c.stairs, outdoor: c.outdoor,
    real_use: use ? USE_WORD[use] : undefined, url: robotHref(robot.id),
  };
}

const SearchInput = z.object({
  query: z.string().max(120).optional().describe('Words to match in the name, maker, summary or job. English works best.'),
  type: z.enum(['humanoid', 'quadruped', 'mobile_manipulator', 'specialised']).optional(),
  germany: z.enum(['orderable', 'buy_now', 'quote', 'preorder', 'not_sold', 'all']).optional().describe('Default orderable, which means buy_now or quote. Use all only to look beyond what can be ordered.'),
  max_price_eur: z.number().positive().optional(),
  min_arm_payload_kg: z.number().positive().optional(),
  min_carry_kg: z.number().positive().optional().describe('For carrying jobs: the load on its back or deck. Use with type to find carriers of that type.'),
  needs_hands: z.boolean().optional(),
  stairs: z.boolean().optional(),
  outdoor: z.boolean().optional(),
  limit: z.number().int().min(1).max(15).optional(),
});

function searchRobots(input: z.infer<typeof SearchInput>) {
  const scored = loadMarket().flatMap((robot) => {
    const c = robot.capabilities;
    if (input.type && robot.robotType !== input.type) return [];
    if (NOT_SUGGESTED.has(robot.id) && !(input.query && matchScore(input.query, robot.name))) return [];
    const wanted = input.germany ?? 'orderable';
    if (wanted === 'orderable' && !orderable(robot)) return [];
    if (wanted !== 'orderable' && wanted !== 'all' && robot.germany.status !== wanted) return [];
    if (input.max_price_eur && !(robot.germany.priceEur && robot.germany.priceEur.amount <= input.max_price_eur)) return [];
    if (input.min_arm_payload_kg && !(c.armPayloadKg !== null && c.armPayloadKg >= input.min_arm_payload_kg)) return [];
    if (input.min_carry_kg && !(c.carryPayloadKg !== null && c.carryPayloadKg >= input.min_carry_kg)) return [];
    if (input.needs_hands && !['gripper', 'dexterous', 'optional'].includes(c.hands)) return [];
    if (input.stairs && c.stairs !== true) return [];
    if (input.outdoor && c.outdoor !== true) return [];
    const score = input.query ? matchScore(input.query, [robot.name, robot.maker, robot.summary, ...robot.specialisedFor].join(' ')) : 0;
    return input.query && !score ? [] : [{ robot, score }];
  });
  // What people really buy comes first, so the first results are the typical choices, not the best word match.
  scored.sort((a, b) => Number(orderable(b.robot)) - Number(orderable(a.robot)) || marketScore(b.robot) - marketScore(a.robot) || b.score - a.score);
  return { total: scored.length, robots: scored.slice(0, input.limit ?? 10).map((item) => robotRow(item.robot)) };
}

const GetRobotInput = z.object({ id: z.string().max(120).describe('Robot id from another tool.') });

function getRobot({ id }: z.infer<typeof GetRobotInput>) {
  // The model sometimes passes the end of a robot's page address, such as unitree/b2, instead of its id.
  const robot = loadMarket().find((item) => item.id === id.replace(/\//g, '-'));
  if (!robot) return { error: 'No robot with this id. Use search_robots to find the id.' };
  const url = new Map(robot.sources.map((source) => [source.id, source.url]));
  return {
    ...robotRow(robot),
    summary: robot.summary,
    germany_note: robot.germany.statusNote,
    lead_time: robot.germany.leadTime,
    checked: robot.germany.checkedAt,
    price_other: robot.germany.priceOther,
    sellers: robot.germany.sellers.map((seller) => ({ name: seller.name, country: seller.country, role: seller.role, page: seller.productUrl ?? seller.contactUrl, price_eur: seller.priceEur, basis: seller.priceBasis })),
    specs: robot.specs.slice(0, 24).map((spec) => ({ key: spec.key, value: spec.value, unit: spec.unit, conditions: spec.conditions })),
    notes: robot.capabilities.notes,
    worked_on: robot.evidence.slice(0, 8).map((item) => ({ task: item.task, use: USE_WORD[item.stage], where: item.where, date: item.date, source: url.get(item.sourceId) })),
    fits_jobs: jobsForRobot(robot.id).slice(0, 8).map((job) => ({ id: job.id, title: job.title, fit: job.fit.verdict })),
    unknown: robot.openQuestions.slice(0, 5),
  };
}

const FindJobsInput = z.object({ query: z.string().min(2).max(120).describe('The work to look up, in English, for example "ceiling drilling" or "drywall".'), limit: z.number().int().min(1).max(10).optional() });

function findJobs({ query, limit }: z.infer<typeof FindJobsInput>) {
  const scored = loadJobs().jobs.flatMap((job) => {
    const score = matchScore(query, [job.title, job.summary, job.setting].join(' '));
    return score ? [{ job, score }] : [];
  }).sort((a, b) => b.score - a.score || b.job.proofs.length - a.job.proofs.length);
  return {
    total: scored.length,
    jobs: scored.slice(0, limit ?? 6).map(({ job }) => ({ id: job.id, title: job.title, setting: job.setting, where: job.where, robots_that_fit: job.fits.options.length, robots_with_proof: job.proofs.length })),
  };
}

const VERDICTS: string[] = ['done', 'similar', 'fits', 'stretch'];
const MATCH_WORD: Record<string, string> = { done: 'done', similar: 'similar', fits: 'fits', stretch: 'possible' };

const RobotsForJobInput = z.object({ job_id: z.string().max(160).describe('Job id from find_jobs.') });

function robotsForJob({ job_id }: z.infer<typeof RobotsForJobInput>) {
  const job = loadJobDetail(job_id);
  if (!job) return { error: 'No job with this id. Use find_jobs first.' };
  const names = new Map(loadMarket().map((robot) => [robot.id, robot]));
  const suggested = <T extends { robotId: string }>(items: readonly T[]) => items.filter((item) => !NOT_SUGGESTED.has(item.robotId));
  const presence = (id: string) => { const robot = names.get(id); return robot ? marketScore(robot) : 0; };
  const fit = (item: (typeof job.fits.options)[number]) => {
    const robot = names.get(item.robotId);
    return { id: item.robotId, name: robot?.name, germany: robot ? STATUS_LABELS[robot.germany.status] : undefined, market: robot ? marketWord(robot) : undefined, price: robot ? priceText(toCard(robot)) : undefined, match: MATCH_WORD[item.verdict], checks: item.checks, use: item.evidence ? USE_WORD[item.evidence.stage] : null, url: robotHref(item.robotId) };
  };
  return {
    job: { title: job.title, summary: job.summary, setting: job.setting, where: job.where, heaviest_part_kg: job.needs?.maxObjectKg ?? null, movement: job.needs?.movement ?? null, hand_work: job.needs?.handWork ?? null },
    known_for_this_job: suggested(job.proofs).slice(0, 6).map((proof) => ({ id: proof.robotId, name: proof.name, use: USE_WORD[proof.stage], task: proof.task, where: proof.where, date: proof.date, source: proof.url, germany: STATUS_LABELS[proof.status], price: proof.price, url: proof.href })),
    orderable_here: [...suggested(job.fits.options)].sort((a, b) => VERDICTS.indexOf(a.verdict) - VERDICTS.indexOf(b.verdict) || presence(b.robotId) - presence(a.robotId)).slice(0, 10).map(fit),
    preorder_only: suggested(job.fits.preorder).slice(0, 4).map(fit),
    market_meaning: 'mainstream and established robots are what companies really buy here. niche robots are carried by few sellers.', match_meaning: 'done: made for this job or has done it, see use. similar: related work. fits: specs match. possible: some needs are unknown or unmet. use: made_for means the maker offers it for this work; demo, pilot and daily_use are real use.',
  };
}

const GraphInput = z.object({
  query: z.string().max(120).optional().describe('Search words, when you do not have a node id yet.'),
  node_id: z.string().max(200).optional().describe('Node id from an earlier result, to see what it connects to.'),
});

function exploreGraph({ query, node_id }: z.infer<typeof GraphInput>) {
  if (node_id) {
    const node = nodeById(node_id);
    return node ? { node, connections: neighbours(node_id, { limit: 40 }) } : { error: 'No node with this id.' };
  }
  if (query) return { matches: searchGraph(query, { limit: 12 }) };
  return { error: 'Give query or node_id.' };
}

const FactsInput = z.object({
  topic: z.enum(['rules', 'costs', 'labour_cost', 'humanoid_limits', 'pilot_metrics', 'questions_for_sellers', 'roadmap', 'partners']),
  query: z.string().max(80).optional().describe('Narrows rules to one subject, for example "machinery" or "dust".'),
});

/** The English side of a bilingual record, without the provenance that would only cost tokens. */
function english(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(english);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.en === 'string' && typeof record.de === 'string') return record.en;
    return Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'provenance').map(([key, item]) => [key, english(item)]));
  }
  return value;
}

function siteFacts({ topic, query }: z.infer<typeof FactsInput>) {
  const content = loadContent();
  switch (topic) {
    case 'rules': return { rules: english(content.compliance.filter((rule) => !query || matchScore(query, JSON.stringify(english(rule))) > 0)) };
    case 'costs': return { costs: english(content.costs), note: 'Ranges are list prices and assessments, never offers.' };
    case 'labour_cost': {
      const shares = JSON.parse(readFileSync(join(process.cwd(), 'data', 'costs', 'trade-shares.json'), 'utf8'));
      return { checked: shares.checkedAt, hourly: shares.hourly };
    }
    case 'humanoid_limits': return { limits: english(content.humanoidLimits) };
    case 'pilot_metrics': return { metrics: english(content.pilotMetrics) };
    case 'questions_for_sellers': return { questions: english(content.rfi.items) };
    case 'roadmap': return { roadmap: english(content.roadmap) };
    case 'partners': return { partners: english(content.partners) };
  }
}

const BriefInput = z.object({ facts: z.array(BriefFactSchema).min(1).max(20) });
const LanguageField = z.enum(['en', 'de']).describe('The language the person writes in.');
const FormInput = z.object({ title: z.string().min(1).max(80).optional().describe('Only for two or three questions: a short title.'), language: LanguageField, questions: z.array(Question).min(1).max(3) });
const OptionsInput = z.object({
  language: LanguageField,
  options: z.array(OptionInput).min(1).max(4),
  left_out: z.array(z.object({ name: z.string().max(80), reason: z.string().max(140) })).max(6).describe('Robots a reader would expect, and why they are not on the list.'),
});

/** The shared price line in German number and word order: "from €35,950 net" becomes "ab 35.950 € netto". */
const germanPrice = (text: string) => text
  .replace(/€([\d,.]+)/g, (_, amount: string) => amount.replace(/,/g, '.') + ' €')
  .replace(/^from /, 'ab ').replace(' net', ' netto').replace(' gross', ' brutto').replace('incl. VAT', 'inkl. MwSt.');

/** A euro price as the record states it. Without one, a foreign list price stays short: the long market
 *  note belongs on the robot's page, and the adviser has it from get_robot. */
function cardPrice(robot: MarketRobot, language: Lang): string {
  if (robot.germany.priceEur) return language === 'de' ? germanPrice(priceText(toCard(robot))) : priceText(toCard(robot));
  const other = robot.germany.priceOther;
  return other ? other.currency + ' ' + other.amount.toLocaleString('en-US') + ' ' + SPEC_TEXT[language].abroad : SPEC_TEXT[language].request;
}

/** One line per seller, German sellers first. A record can list a seller once per configuration. */
function sellersFor(robot: MarketRobot): ChatOption['sellers'] {
  const seen = new Set<string>();
  return [...robot.germany.sellers].sort((a, b) => Number(b.country === 'DE') - Number(a.country === 'DE')).flatMap((seller) => {
    if (seen.has(seller.name)) return [];
    seen.add(seller.name);
    return [{ name: seller.name, country: seller.country, url: seller.productUrl ?? seller.contactUrl, price: seller.priceEur ? seller.priceEur.toLocaleString('de-DE') + ' EUR' + (seller.priceBasis ? ' ' + seller.priceBasis : '') : null }];
  }).slice(0, 4);
}

/** The figures come from the record, never from the model, so a card cannot show an invented price. */
function optionCard(input: z.infer<typeof OptionInput>, language: Lang): ChatOption | null {
  const robot = loadMarket().find((item) => item.id === input.robot_id);
  if (!robot) return null;
  const c = robot.capabilities;
  const words = SPEC_TEXT[language];
  const specs = ([
    [words.arm, c.armPayloadKg === null ? null : c.armPayloadKg + ' kg'],
    [words.carry, c.carryPayloadKg === null ? null : c.carryPayloadKg + ' kg'],
    [words.runtime, c.runtimeH === null ? null : c.runtimeH + ' h'],
    [words.ip, c.ipRating],
    [words.moves, bodyLabel(robot) === 'Machine' ? null : language === 'de' ? bodyLabel(robot).replace(/^On /, '').replace('legs with wheels', 'Beine mit Rädern').replace('Legs with wheels', 'Beine mit Rädern').replace('legs', 'Beine').replace('wheels', 'Räder').replace('tracks', 'Ketten') : bodyLabel(robot).replace(/^On /, '')],
  ] as [string, string | null][]).flatMap(([label, value]) => value ? [{ label, value }] : []);
  return {
    id: robot.id, name: robot.name, maker: robot.maker, type: TYPE_TEXT[language][robot.robotType], status: STATUS_TEXT[language][robot.germany.status],
    price: cardPrice(robot, language), leadTime: robot.germany.leadTime?.split(';')[0].trim() ?? null, href: robotHref(robot.id), image: robot.picture?.src ?? null, alt: robot.picture?.alt ?? robot.name,
    proof: PROOF_TEXT[language][realUse(robot) ?? 'none'], specs,
    sellers: sellersFor(robot),
    label: input.label, why: input.why, pros: input.pros, cons: input.cons, confirm: input.confirm, language,
  };
}

const TOOLS = {
  update_brief: { schema: BriefInput, run: ({ facts }: z.infer<typeof BriefInput>) => ({ saved: facts.length }), description: 'Save what you learned about this project. Call it whenever the person gives a fact, says something does not matter, or you assume something. The person sees the brief next to the chat.' },
  ask_questions: { schema: FormInput, run: () => ({ shown: true }), description: 'A small form, for two or three details that belong together and need numbers. At most once in a chat, after your text, and alone. For one question use a reply line in your text instead. Your turn ends here and the answers come back as the next message.' },
  search_robots: { schema: SearchInput, run: searchRobots, description: 'Search all robots on the German market list by words, type, availability, price, arm payload, carry load, hands, stairs or outdoor use. Returns key facts and any real use.' },
  get_robot: { schema: GetRobotInput, run: getRobot, description: 'Everything on one robot: Germany status and sellers, prices, specs with conditions, limits, real work with sources, jobs it fits. Call this before you put a robot on the list.' },
  find_jobs: { schema: FindJobsInput, run: findJobs, description: 'Find construction and prefab jobs by words. Returns job ids for robots_for_job.' },
  robots_for_job: { schema: RobotsForJobInput, run: robotsForJob, description: 'For one job: what the job needs, robots known for it anywhere in the world, robots you can order in Germany with how well they fit, and pre-order robots.' },
  explore_graph: { schema: GraphInput, run: exploreGraph, description: 'The knowledge graph of robots, makers, sellers, jobs, kinds of work, projects and rules. Search it, or give a node id to see what connects to it, such as all robots of a maker or everything a seller offers.' },
  site_facts: { schema: FactsInput, run: siteFacts, description: 'Reference facts: German and EU rules for robots, cost ranges for a pilot, labour costs, known humanoid limits, pilot metrics, questions to ask sellers, a rollout roadmap, partners.' },
  show_options: { schema: OptionsInput, run: ({ options }: z.infer<typeof OptionsInput>) => ({ shown: options.length }), description: 'Show your conclusion as cards, once you and the person have talked the job through. Price, sellers and specs are added from the database. You give the reasons, pros, cons and what to confirm. Keep your text around it to two sentences.' },
  offer_report: { schema: z.object({}), run: () => ({ shown: true }), description: 'Show a button to export this consultation as a PDF. Use when the person asks how to save, share or send the result.' },
} as const;

export type ToolName = keyof typeof TOOLS;
const isTool = (name: string): name is ToolName => name in TOOLS;

export const toolStatus = (name: string, language: Lang): string => WORK_TEXT[language][name as keyof (typeof WORK_TEXT)['en']] ?? WORK_TEXT[language].thinking;

export const CHAT_TOOLS: Anthropic.Tool[] = Object.entries(TOOLS).map(([name, tool]) => ({
  name, description: tool.description, eager_input_streaming: true,
  input_schema: z.toJSONSchema(tool.schema) as Anthropic.Tool.InputSchema,
}));

export type ToolOutcome = { content: string; isError: boolean; step?: string; facts?: BriefFact[]; form?: ChatForm; options?: ChatOption[]; leftOut?: LeftOut[]; report?: boolean };

/** A finished lookup in plain words, with what it found, for the chat and the export's "what was checked". */
function stepLine(name: ToolName, input: unknown, output: unknown, language: Lang): string | undefined {
  const t = STEP_TEXT[language];
  const data = input as z.infer<typeof SearchInput> & z.infer<typeof GetRobotInput> & z.infer<typeof FindJobsInput> & z.infer<typeof RobotsForJobInput> & z.infer<typeof GraphInput> & z.infer<typeof FactsInput>;
  const result = output as { total?: number; job?: { title: string }; orderable_here?: unknown[] };
  switch (name) {
    case 'search_robots': {
      const what = [data.type ? t.types[data.type] : t.all, data.query, data.min_carry_kg ? t.carry(data.min_carry_kg) : '', data.min_arm_payload_kg ? t.arm(data.min_arm_payload_kg) : '', data.outdoor ? t.outdoor : '', data.stairs ? t.stairs : '', data.needs_hands ? t.hands : '', data.germany === 'orderable' ? t.orderable : '', data.max_price_eur ? t.upTo(data.max_price_eur) : ''];
      return t.searched(what.filter(Boolean).join(', '), result.total ?? 0);
    }
    case 'get_robot': return t.read(loadMarket().find((robot) => robot.id === data.id)?.name ?? data.id);
    case 'find_jobs': return t.job(data.query);
    case 'robots_for_job': return result.job ? t.fit(result.job.title, result.orderable_here?.length ?? 0) : undefined;
    case 'explore_graph': return t.links(data.query ?? nodeById(data.node_id ?? '')?.label ?? data.node_id ?? '');
    case 'site_facts': return t.facts[data.topic];
    default: return undefined;
  }
}

/** Inputs arrive unvalidated because the tools stream eagerly, so each is parsed here before it runs.
 *  A bad input goes back to the model as an error result it can correct. */
export function runTool(name: string, input: unknown, language: Lang = 'en'): ToolOutcome {
  if (!isTool(name)) return { content: 'Unknown tool.', isError: true };
  const tool = TOOLS[name];
  const parsed = tool.schema.safeParse(input);
  if (!parsed.success) return { content: 'Invalid input: ' + parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; '), isError: true };
  try {
    const output = (tool.run as (value: unknown) => unknown)(parsed.data);
    const text = JSON.stringify(output);
    const content = text.length > MAX_RESULT_CHARS ? text.slice(0, MAX_RESULT_CHARS) + ' [cut off here, ask for less]' : text;
    if (name === 'update_brief') return { content, isError: false, facts: (parsed.data as z.infer<typeof BriefInput>).facts };
    if (name === 'ask_questions') return { content, isError: false, form: parsed.data as ChatForm };
    if (name === 'show_options') {
      const { options, left_out, language } = parsed.data as z.infer<typeof OptionsInput>;
      // Advice to buy something nobody can buy here is worthless, however well it fits.
      const unavailable = options.flatMap((option) => {
        const robot = loadMarket().find((item) => item.id === option.robot_id);
        return robot && (!orderable(robot) || NOT_SUGGESTED.has(robot.id)) && !option.person_asked_for_it ? [robot.name] : [];
      });
      if (unavailable.length) return { content: unavailable.join(', ') + ' cannot go on the list. Replace them with robots that can be ordered in Germany.', isError: true };
      const cards = options.flatMap((option) => optionCard(option, language) ?? []);
      return cards.length ? { content, isError: false, options: cards, leftOut: left_out } : { content: 'None of these robot ids exist. Use ids from your tools.', isError: true };
    }
    if (name === 'offer_report') return { content, isError: false, report: true };
    return { content, isError: false, step: stepLine(name, parsed.data, output, language) };
  } catch (error) {
    console.error('chat tool failed', name, error);
    return { content: 'This lookup failed. Tell the person you could not check it.', isError: true };
  }
}
