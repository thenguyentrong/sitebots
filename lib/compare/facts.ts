import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { MARKET_TEXT } from '@/lib/i18n/market';
import { bilingual } from '@/lib/i18n/text';
import { bodyKind, priceText, toCard } from '@/lib/market/cards';
import { configurationSpecifications, type MarketSource, type MarketValueRow } from '@/lib/market/display';
import type { MarketRobot } from '@/lib/market/load';
import { jobLabel } from '@/lib/market/vocab';
import { availabilityLabel, formFactorLabel, formatMoney, formatSpec, plainDashes, priceTierLabel, qualifierLabel, statusLabel } from '@/lib/spec/display';
import { splitSpecKey } from '@/lib/spec/fields';
import type { AvailabilityCurrent, PriceCurrent, RobotCard, SpecValue } from '@/lib/spec/types';

// One set of plain facts per robot, whichever data it comes from. The compare table and the Key facts
// on a robot page both read this, so the two can never tell a buyer different things. Market records
// and catalogue rows store different keys and units; this file is the only place that maps them.
// Nothing here ranks, scores or fills a gap: a value that was not published stays empty.
// Our own words follow the page's language (last argument, English by default); what a source wrote,
// such as the conditions of a value, stays as published.

export const NOT_PUBLISHED = 'Not published';
export const notPublished = (lang: Lang = 'en') => MARKET_TEXT[lang].notPublished;

const FACT_TEXT = bilingual({
  en: {
    maker: 'Maker', assessed: 'Assessed', reported: 'Reported', statedAs: 'stated as', notIncluded: 'not included', armOrTotal: 'Arm or total not stated',
    leadTime: 'Lead time', exampleQuote: 'Example quote', more: (n: number) => 'and ' + n + ' more', fingers: 'fingers', walkingSpeed: 'Walking speed',
    euListing: 'EU listing', sellerFound: 'Seller listing found', stockOpen: 'Stock not confirmed', tier: (n: number) => 'tier ' + n,
    hands: { none: 'No hands', gripper: 'Grippers', dexterous: 'Multi-finger hands', tool: 'Process tool', optional: 'Hands sold separately' } as Record<string, string>,
    catalogueHands: { none: 'No hands', gripper: 'Grippers', three_finger: 'Three-finger hands', five_finger: 'Five-finger hands' } as Record<string, string>,
  },
  de: {
    maker: 'Hersteller', assessed: 'Bewertet', reported: 'Berichtet', statedAs: 'angegeben als', notIncluded: 'nicht enthalten', armOrTotal: 'Arm oder gesamt nicht angegeben',
    leadTime: 'Lieferzeit', exampleQuote: 'Beispielangebot', more: (n: number) => 'und ' + n + ' weitere', fingers: 'Finger', walkingSpeed: 'Gehgeschwindigkeit',
    euListing: 'Angebot in der EU', sellerFound: 'Händlerangebot gefunden', stockOpen: 'Bestand nicht bestätigt', tier: (n: number) => 'Stufe ' + n,
    hands: { none: 'Keine Hände', gripper: 'Greifer', dexterous: 'Mehrfingerhände', tool: 'Prozesswerkzeug', optional: 'Hände separat erhältlich' },
    catalogueHands: { none: 'Keine Hände', gripper: 'Greifer', three_finger: 'Dreifingerhände', five_finger: 'Fünffingerhände' },
  },
});

/** The row names in German; FACT_ROWS keeps the English. */
const FACT_LABEL_DE: Record<string, string> = {
  type: 'Typ', maker: 'Hersteller', job: 'Gebaut für', moves: 'Bewegt sich auf', height: 'Höhe', weight: 'Gewicht', arms: 'Arme', hands: 'Hände',
  payloadArm: 'Traglast pro Arm', payloadBoth: 'Traglast, beide Arme', carry: 'Traglast am Körper', reach: 'Reichweite', runtime: 'Laufzeit',
  charging: 'Ladezeit', speed: 'Höchstgeschwindigkeit', stairs: 'Treppen', rough: 'Unebener Boden', outdoors: 'Im Freien', slope: 'Steigung',
  step: 'Stufenhöhe', ip: 'Schutzart', temperature: 'Betriebstemperatur', germany: 'Status in Deutschland', price: 'Preis', sellers: 'Händler',
};

export type FactSource = { url: string; label: string };
/** One published claim. A row can hold several: a 3 kg rated and a 5 kg peak are different claims. */
export type FactValue = { text: string; note: string | null; source: FactSource | null; muted?: boolean };

/** The order is fixed and the same for every robot type. `core` rows stay when nobody has a value. */
export const FACT_ROWS = [
  { key: 'type', label: 'Type', core: true },
  { key: 'maker', label: 'Maker', core: true },
  { key: 'job', label: 'Built for', core: false },
  { key: 'moves', label: 'Moves on', core: true },
  { key: 'height', label: 'Height', core: true },
  { key: 'weight', label: 'Weight', core: true },
  { key: 'arms', label: 'Arms', core: true },
  { key: 'hands', label: 'Hands', core: true },
  { key: 'payloadArm', label: 'Payload per arm', core: true },
  { key: 'payloadBoth', label: 'Payload, both arms', core: false },
  { key: 'carry', label: 'Carry on body', core: true },
  { key: 'reach', label: 'Reach', core: false },
  { key: 'runtime', label: 'Runtime', core: true },
  { key: 'charging', label: 'Charging time', core: false },
  { key: 'speed', label: 'Max speed', core: true },
  { key: 'stairs', label: 'Stairs', core: true },
  { key: 'rough', label: 'Rough ground', core: true },
  { key: 'outdoors', label: 'Outdoors', core: true },
  { key: 'slope', label: 'Slope', core: false },
  { key: 'step', label: 'Step', core: false },
  { key: 'ip', label: 'IP rating', core: true },
  { key: 'temperature', label: 'Operating temperature', core: false },
  { key: 'germany', label: 'Germany status', core: true },
  { key: 'price', label: 'Price', core: true },
  { key: 'sellers', label: 'Sellers', core: true },
] as const;

export type FactKey = (typeof FACT_ROWS)[number]['key'];
export type Facts = Record<FactKey, FactValue[]>;

/** The rows on every robot page. Chosen by what a buyer asks first and what the market records hold
 * (see the coverage test in facts.test.ts); an even count keeps the two-column grid closed. */
export const KEY_FACT_KEYS: readonly FactKey[] = ['moves', 'height', 'weight', 'arms', 'hands', 'payloadArm', 'carry', 'runtime', 'speed', 'stairs', 'outdoors', 'ip'];
export const KEY_FACT_ROWS = KEY_FACT_KEYS.map((key) => FACT_ROWS.find((row) => row.key === key)!);
/** A row's name in the page's language. */
export const factLabel = (key: FactKey, lang: Lang = 'en'): string => lang === 'de' ? FACT_LABEL_DE[key] : FACT_ROWS.find((row) => row.key === key)!.label;

/** A row stays when it is core or a selected robot has a real value; "Not applicable" is not a value. */
export const visibleRows = (columns: { facts: Facts }[]) => FACT_ROWS.filter((row) => row.core || columns.some((column) => column.facts[row.key].some((value) => !value.muted)));

const fact = (text: string, note?: string | null, source?: FactSource | null): FactValue => ({ text: plainDashes(text), note: note ? plainDashes(note) : null, source: source ?? null });
const notApplicable = (lang: Lang): FactValue => ({ text: MARKET_TEXT[lang].notApplicable, note: null, source: null, muted: true });
const joinNotes = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join('; ') || null;
const yesNo = (value: boolean, lang: Lang = 'en') => MARKET_TEXT[lang][value ? 'yes' : 'no'];
const number = (value: number, decimals: number, lang: Lang = 'en') => formatNumber(value, lang, decimals);
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www[.]/, '');
  } catch {
    return url;
  }
};

/** Who states a value. A source name alone would hide that a seller or the press is not the maker. */
const marketSource = (source: MarketSource | null | undefined, lang: Lang = 'en'): FactSource | null =>
  source ? { url: source.url, label: (source.kind === 'manufacturer' ? FACT_TEXT[lang].maker : FACT_TEXT[lang].reported) + ' · ' + host(source.url) } : null;

function catalogueSource(spec: SpecValue, lang: Lang = 'en'): FactSource | null {
  if (spec.source_url.startsWith('curated://')) return null;
  const t = FACT_TEXT[lang];
  const who = spec.trust === 'verified' ? t.maker : spec.trust === 'assessed' ? t.assessed : t.reported;
  return { url: spec.source_url, label: who + ' · ' + host(spec.source_url) };
}

// Each row reads in one unit, because 1.39 m/s beside 5 km/h is not comparable at a glance. A converted
// value always names what the source stated, so nothing reads as more exact than it was published.
type Measure = { unit: string; decimals: number; from: Record<string, (value: number) => number> };
const MEASURES = {
  kg: { unit: 'kg', decimals: 1, from: { lb: (value) => value * 0.45359237 } },
  m: { unit: 'm', decimals: 2, from: { mm: (value) => value / 1000, cm: (value) => value / 100, ft: (value) => value * 0.3048 } },
  cm: { unit: 'cm', decimals: 1, from: { mm: (value) => value / 10, m: (value) => value * 100, in: (value) => value * 2.54 } },
  h: { unit: 'h', decimals: 1, from: { min: (value) => value / 60 } },
  speed: { unit: 'm/s', decimals: 2, from: { 'km/h': (value) => value / 3.6 } },
  slope: { unit: '°', decimals: 1, from: { '%': (value) => (Math.atan(value / 100) * 180) / Math.PI } },
  temperature: { unit: '°C', decimals: 0, from: {} },
} satisfies Record<string, Measure>;

const withUnit = (text: string, unit: string) => (unit === '°' || unit === '%' ? text + unit : text + ' ' + unit);
const cleanUnit = (unit: string | null) => (unit === 'deg' ? '°' : unit === 'C' ? '°C' : unit?.trim() || null);

/** The value in the row's unit, or as published when it is not a plain number ("a full shift", "20+"). */
export function inUnit(raw: string | number | boolean, rawUnit: string | null, measure: Measure, lang: Lang = 'en'): { text: string; stated: string | null } {
  const unit = cleanUnit(rawUnit);
  const text = String(raw).trim();
  const value = typeof raw === 'number' ? raw : /^-?\d+([.,]\d+)?$/.test(text) ? Number(text.replace(',', '.')) : null;
  if (value !== null) {
    const convert = unit ? (measure.from as Record<string, (value: number) => number>)[unit] : undefined;
    if (!unit || unit === measure.unit) return { text: withUnit(number(value, measure.decimals, lang), measure.unit), stated: null };
    if (convert) return { text: withUnit(number(convert(value), measure.decimals, lang), measure.unit), stated: FACT_TEXT[lang].statedAs + ' ' + withUnit(number(value, 2, lang), unit) };
    return { text: withUnit(number(value, 2, lang), unit), stated: null };
  }
  // "0-45" with a unit is a range; a hyphen inside words or after a sign is left alone.
  const range = text.match(/^(-?\d[\d.,]*)\s*[-–—]\s*(-?\d[\d.,]*)$/);
  const words = range ? range[1] + ' ' + MARKET_TEXT[lang].to + ' ' + range[2] : text;
  const shown = unit ?? (/[a-z°%]/i.test(words) ? null : measure.unit);
  return { text: shown && !words.includes(shown) ? withUnit(words, shown) : words, stated: null };
}

const MISSING = Object.fromEntries(FACT_ROWS.map(({ key }) => [key, []])) as unknown as Facts;
const yesOf = (row: MarketValueRow | undefined) => (typeof row?.value === 'boolean' ? row.value : null);


/** The plain facts of one market record. Specifications win over the capability summary, which covers the record as a whole. */
export function marketFacts(robot: MarketRobot, lang: Lang = 'en'): Facts {
  const t = FACT_TEXT[lang];
  const words = MARKET_TEXT[lang];
  const NOT_APPLICABLE = notApplicable(lang);
  const marketSourceIn = (item: MarketSource | null | undefined) => marketSource(item, lang);
  const { specs, capabilities } = configurationSpecifications(robot);
  const c = robot.capabilities;
  const g = robot.germany;
  const source = (id: string | undefined) => robot.sources.find((item) => item.id === id) ?? null;
  const spec = (key: string) => specs.find((row) => row.key === key);
  const capability = (key: string) => capabilities.find((row) => row.key === key);
  const first = (...rows: (MarketValueRow | undefined)[]) => rows.find((row) => row && row.value !== null);
  /** `named`: the source's own label matters here. "Transport speed" and "Max speed" are different claims. */
  const measured = (row: MarketValueRow | undefined, measure: Measure, named = false, rowLabel = '', extra?: string | null): FactValue[] => {
    if (!row || row.value === null) return [];
    const { text, stated } = inUnit(row.value, row.unit, measure, lang);
    const label = named && row.label.toLowerCase() !== rowLabel.toLowerCase() ? row.label : null;
    return [fact(text, joinNotes(label, row.conditions, stated, extra), marketSourceIn(row.source))];
  };
  const plain = (row: MarketValueRow | undefined): FactValue[] => {
    if (!row || row.value === null) return [];
    return [fact(typeof row.value === 'boolean' ? yesNo(row.value, lang) : String(row.value), row.conditions, marketSourceIn(row.source))];
  };

  // A maker that gives one payload without saying where it goes keeps that wording: on an arm robot it
  // sits in the per-arm row with the doubt spelled out, on a dog or machine in the body row.
  const armPayload = first(spec('arm_payload_kg'), capability('armPayloadKg'));
  const carryPayload = first(spec('carry_payload_kg'), capability('carryPayloadKg'));
  const loose = spec('payload_kg');
  const looseOnArm = c.arms > 0 && !armPayload ? loose : undefined;
  const looseOnBody = c.arms === 0 && !carryPayload ? loose : undefined;

  const stairsCapability = capability('stairs');
  const stairsSpec = spec('stairs');
  const stairsText = typeof stairsSpec?.value === 'string' ? stairsSpec.value : null;
  const prices = g.priceEur ?? g.priceOther;
  const sellers = [...new Set(g.sellers.map((seller) => seller.name))];

  return {
    ...MISSING,
    type: [fact(words.type[robot.robotType])],
    maker: [fact(robot.maker, robot.makerCountry)],
    job: robot.robotType === 'specialised' ? [fact(robot.specialisedFor.map((job) => jobLabel(job, lang)).join(', '))] : [NOT_APPLICABLE],
    moves: c.legs || c.wheels || c.tracks ? [fact(words.moves[bodyKind(robot)])] : robot.robotType === 'specialised' ? [] : [fact(words.moves.stationary)],
    height: measured(first(spec('height_m'), spec('height_mm')), MEASURES.m, true, 'Height'),
    weight: measured(first(spec('weight_kg'), spec('weight_lb')), MEASURES.kg),
    arms: [fact(c.arms ? String(c.arms) : words.none)],
    hands: [fact(t.hands[c.hands] + (c.hands !== 'none' && c.handsIncluded === false ? ', ' + t.notIncluded : ''))],
    payloadArm: c.arms === 0 ? [NOT_APPLICABLE] : armPayload ? measured(armPayload, MEASURES.kg) : measured(looseOnArm, MEASURES.kg, false, '', looseOnArm?.conditions ? null : t.armOrTotal),
    payloadBoth: c.arms < 2 ? [NOT_APPLICABLE] : measured(spec('both_arms_payload_kg'), MEASURES.kg),
    carry: carryPayload ? measured(carryPayload, MEASURES.kg) : measured(looseOnBody, MEASURES.kg),
    reach: [...measured(first(spec('reach_m'), spec('reach_ft')), MEASURES.m, true, 'Reach'), ...measured(spec('horizontal_reach_m'), MEASURES.m, true, 'Reach'), ...measured(spec('vertical_reach_m') ?? spec('working_height_m'), MEASURES.m, true, 'Reach')].slice(0, 2),
    runtime: measured(first(spec('runtime_h'), capability('runtimeH')), MEASURES.h),
    charging: measured(spec('charging_time_h'), MEASURES.h),
    speed: measured(first(spec('max_speed_ms'), spec('max_speed_kmh'), spec('drive_speed_kmh'), spec('transport_speed_kmh')), MEASURES.speed, true, 'Max speed'),
    stairs: c.stairs !== null
      ? [fact(yesNo(c.stairs, lang), joinNotes(stairsText, stairsSpec?.conditions, stairsCapability?.conditions), marketSourceIn(stairsSpec?.source ?? stairsCapability?.source))]
      : plain(stairsSpec),
    rough: plain(capability('roughGround')),
    outdoors: plain(capability('outdoor')),
    slope: measured(first(spec('max_slope_deg'), spec('max_slope_pct')), MEASURES.slope, true, 'Max. slope'),
    step: [...measured(spec('max_step_cm'), MEASURES.cm, true, 'Step'), ...measured(spec('max_obstacle_cm') ?? spec('obstacle_height_mm'), MEASURES.cm, true, 'Step')],
    ip: plain(first(spec('ip_rating'), capability('ipRating'))),
    temperature: measured(spec('operating_temp_c'), MEASURES.temperature),
    germany: [fact(words.status[g.status], g.leadTime ? t.leadTime + ': ' + g.leadTime : null, marketSourceIn(source(g.sourceIds[0])))],
    price: prices
      ? [fact(priceText(toCard(robot, lang), lang), g.priceEur?.kind === 'quoted_example' ? joinNotes(t.exampleQuote, g.priceEur.note) : g.priceEur?.note, marketSourceIn(source(prices.sourceId)))]
      : g.status === 'not_sold' ? [] : [fact(words.onRequest)],
    sellers: sellers.length ? [fact(sellers.slice(0, 4).join(', ') + (sellers.length > 4 ? ' ' + t.more(sellers.length - 4) : ''))] : [],
  };
}

export type CatalogueRoute = { name: string; url: string; region: string };

/** The plain facts of one catalogue row. Payload qualifiers stay apart; which rows they land in decides what a claim means. */
export function catalogueFacts(card: RobotCard, prices: PriceCurrent[], availability: AvailabilityCurrent[], routes: CatalogueRoute[] = [], lang: Lang = 'en'): Facts {
  const t = FACT_TEXT[lang];
  const NOT_APPLICABLE = notApplicable(lang);
  const specs = card.specs ?? {};
  const value = (key: string, note?: string | null): FactValue[] => {
    const spec = specs[key];
    if (!spec) return [];
    const basis = splitSpecKey(key).qualifier;
    const qualifier = basis === 'unstated' ? null : qualifierLabel(basis, lang);
    return [fact(formatSpec(key, spec, lang), joinNotes(qualifier, note, spec.note), catalogueSource(spec, lang))];
  };
  const payloads = (qualifiers: string[], note?: string): FactValue[] => qualifiers.flatMap((qualifier) => value(qualifier ? 'payload_kg:' + qualifier : 'payload_kg', qualifier === 'rated' || qualifier === 'peak' || qualifier === 'carry_walking' || qualifier.endsWith('_dual') ? null : note));

  // "sustained" and "instant" are whole-robot lifts as often as arm lifts; the note says the source does not tell.
  const unsure = t.armOrTotal;
  const body = ['carry_walking', 'rated', 'peak', 'sustained', 'instant', '', 'unstated'];
  const arm = ['rated', 'peak', 'sustained', 'instant', '', 'unstated'];
  const dog = card.form_factor === 'quadruped';

  const step = specs.step_height_m;
  const stepInCm = step && typeof step.value === 'number' && step.min == null && step.max == null ? inUnit(step.value, 'm', MEASURES.cm, lang).text : null;

  const local = availability.find((item) => item.region === 'DE') ?? availability.find((item) => item.region === 'EU');
  const offer = prices.find((price) => price.tier <= 2 && price.region === 'DE') ?? prices.find((price) => price.tier <= 2 && price.region === 'EU') ?? prices.find((price) => price.tier <= 2) ?? prices[0];
  const hand = specs.hand_type?.value;
  const fingers = specs.finger_count;

  return {
    ...MISSING,
    type: [fact(catalogueType(card.form_factor, lang))],
    maker: [fact(card.manufacturer_name, card.manufacturer_country)],
    job: [NOT_APPLICABLE],
    height: value('height_m'),
    weight: value('weight_kg'),
    hands: typeof hand === 'string' ? [fact(t.catalogueHands[hand] ?? hand.replaceAll('_', ' '), specs.hand_model ? String(specs.hand_model.value) : null, catalogueSource(specs.hand_type, lang))]
      : fingers ? [fact(formatSpec('finger_count', fingers, lang) + ' ' + t.fingers, null, catalogueSource(fingers, lang))] : [],
    payloadArm: dog ? [] : payloads(arm, unsure),
    payloadBoth: payloads(['rated_dual', 'peak_dual']),
    carry: dog ? payloads(body) : payloads(['carry_walking']),
    reach: value('reach_m'),
    runtime: ['loaded', 'walking', 'unstated', 'idle'].flatMap((basis) => value('runtime_h:' + basis)).concat(value('runtime_h')).slice(0, 2),
    charging: value('charge_time_h'),
    speed: specs.max_speed_ms ? value('max_speed_ms') : value('walk_speed_ms', t.walkingSpeed),
    stairs: value('stair_capable', specs.terrain_notes && /stair/i.test(String(specs.terrain_notes.value)) ? String(specs.terrain_notes.value) : null),
    rough: specs.terrain_notes && !/stair/i.test(String(specs.terrain_notes.value)) ? value('terrain_notes') : [],
    outdoors: value('outdoor_rated'),
    slope: value('max_slope_deg'),
    step: step ? [fact(stepInCm ?? formatSpec('step_height_m', step, lang), step.note, catalogueSource(step, lang))] : [],
    ip: value('ip_rating'),
    temperature: value('operating_temp_c'),
    germany: local ? [fact(availabilityLabel(local.status, lang), local.region === 'EU' ? t.euListing : null, { url: local.source_url, label: t.reported + ' · ' + host(local.source_url) })]
      : routes.length ? [fact(t.sellerFound, t.stockOpen)] : [],
    price: offer ? [fact(formatMoney(Number(offer.amount), offer.currency, lang) + (offer.includes_vat === false ? ' ' + MARKET_TEXT[lang].net : ''), offer.region + ', ' + (priceTierLabel(offer.tier, lang) ?? t.tier(offer.tier)), { url: offer.source_url, label: (offer.tier === 1 ? t.maker : t.reported) + ' · ' + host(offer.source_url) })] : [],
    sellers: routes.length ? [fact([...new Set(routes.map((route) => route.name))].slice(0, 4).join(', '))] : [],
  };
}

export const catalogueType = (form: RobotCard['form_factor'], lang: Lang = 'en') =>
  form === 'dedicated_robot' ? MARKET_TEXT[lang].type.specialised : (MARKET_TEXT[lang].type as Record<string, string>)[form] ?? formFactorLabel(form, lang);

/** The market record wins row by row. The catalogue row only fills a row the record leaves open. */
export function mergeFacts(market: Facts | null, catalogue: Facts | null): Facts {
  if (!market) return catalogue ?? MISSING;
  if (!catalogue) return market;
  const merged = { ...market };
  for (const { key } of FACT_ROWS) if (!market[key].some((value) => !value.muted) && catalogue[key].some((value) => !value.muted)) merged[key] = catalogue[key];
  return merged;
}

/** Market lifecycle in the catalogue's status words, so the same status reads the same on every robot page. */
export const lifecycleLabel = (lifecycle: MarketRobot['lifecycle'], lang: Lang = 'en') =>
  statusLabel(lifecycle === 'preorder' ? 'pre_order' : lifecycle, lang);
