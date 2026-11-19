import type { Picture, MarketRobot } from './load';
import type { GermanyStatus, RobotType } from './schema';
import type { Lang } from '@/lib/i18n/config';
import { formatEur, formatMoney, formatNumber } from '@/lib/i18n/format';
import { MARKET_TEXT } from '@/lib/i18n/market';
import { JOB_LABELS } from './vocab';

// Client-safe slices of a market record and the words the UI uses for them.

// The English words stay exported for code that has no page language (the adviser's tools, scripts, tests).
export const TYPE_LABELS: Record<RobotType, string> = MARKET_TEXT.en.type;
export const TYPE_PLURAL: Record<RobotType, string> = MARKET_TEXT.en.typePlural;
export const STATUS_LABELS: Record<GermanyStatus, string> = MARKET_TEXT.en.status;
export const typeLabel = (type: RobotType, lang: Lang = 'en'): string => MARKET_TEXT[lang].type[type];
export const typePlural = (type: RobotType, lang: Lang = 'en'): string => MARKET_TEXT[lang].typePlural[type];
export const statusLabel = (status: GermanyStatus, lang: Lang = 'en'): string => MARKET_TEXT[lang].status[status];

export type CardSeller = { name: string; country: string; role: string; productUrl: string | null; contactUrl: string | null; email: string | null; phone: string | null; priceEur: number | null; priceBasis: string | null };
export type CardSpec = { key: string; label: string; value: string; conditions: string | null };
export type RobotCardData = {
  id: string; name: string; maker: string; makerCountry: string; robotType: RobotType; summary: string; officialUrl: string | null;
  body: string; picture: Picture | null; lifecycle: string;
  germany: { status: GermanyStatus; note: string; price: { amount: number; basis: string; kind: string } | null; priceOther: { amount: number; currency: string; market: string } | null; leadTime: string | null; sellers: CardSeller[]; checkedAt: string };
  hands: string; arms: number; handsIncluded: boolean | null; armPayloadKg: number | null; carryPayloadKg: number | null; runtimeH: number | null;
  ipRating: string | null; stairs: boolean | null; outdoor: boolean | null; roughGround: boolean | null;
  specs: CardSpec[]; evidenceCount: number; jobKey: string | null;
  /** The robot's one page: its catalogue page where the catalogue has it, else its market page. */
  href: string;
};

const KEY_ORDER = ['height_m', 'weight_kg', 'arm_payload_kg', 'both_arms_payload_kg', 'carry_payload_kg', 'runtime_h', 'ip_rating', 'dof_total', 'max_speed_ms', 'reach_m'];

function show(value: number | string | boolean, unit: string | null, lang: Lang): string {
  const text = typeof value === 'boolean' ? MARKET_TEXT[lang][value ? 'yes' : 'no'] : typeof value === 'number' ? formatNumber(value, lang, 2) : value;
  return unit ? text + ' ' + unit : text;
}

/** How the robot moves, as one key of MARKET_TEXT.body (and .moves). */
export function bodyKind(robot: Pick<MarketRobot, 'robotType' | 'capabilities'>): keyof (typeof MARKET_TEXT)['en']['body'] {
  const { legs, wheels, tracks } = robot.capabilities;
  if (robot.robotType === 'specialised') return tracks ? 'tracks' : wheels ? 'wheels' : legs ? 'legs' : 'machine';
  if (legs && wheels) return 'legsWheels';
  return legs ? 'legs' : tracks ? 'tracks' : wheels ? 'wheels' : 'stationary';
}

export function bodyLabel(robot: Pick<MarketRobot, 'robotType' | 'capabilities'>, lang: Lang = 'en'): string {
  return MARKET_TEXT[lang].body[bodyKind(robot)];
}

export function toCard(robot: MarketRobot, lang: Lang = 'en'): RobotCardData {
  const specs = [...robot.specs].sort((a, b) => {
    const ia = KEY_ORDER.indexOf(a.key), ib = KEY_ORDER.indexOf(b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const c = robot.capabilities;
  return {
    id: robot.id, name: robot.name, maker: robot.maker, makerCountry: robot.makerCountry, robotType: robot.robotType, summary: robot.summary,
    officialUrl: robot.officialUrl, body: bodyLabel(robot, lang), picture: robot.picture, lifecycle: robot.lifecycle,
    germany: {
      status: robot.germany.status, note: robot.germany.statusNote,
      price: robot.germany.priceEur ? { amount: robot.germany.priceEur.amount, basis: robot.germany.priceEur.basis, kind: robot.germany.priceEur.kind } : null,
      priceOther: robot.germany.priceOther ? { amount: robot.germany.priceOther.amount, currency: robot.germany.priceOther.currency, market: robot.germany.priceOther.market } : null,
      leadTime: robot.germany.leadTime,
      sellers: robot.germany.sellers.map(({ sourceId: _source, note: _note, ...seller }) => seller),
      checkedAt: robot.germany.checkedAt,
    },
    hands: c.hands, arms: c.arms, handsIncluded: c.handsIncluded, armPayloadKg: c.armPayloadKg, carryPayloadKg: c.carryPayloadKg, runtimeH: c.runtimeH,
    ipRating: c.ipRating, stairs: c.stairs, outdoor: c.outdoor, roughGround: c.roughGround,
    specs: specs.slice(0, 8).map((spec) => ({ key: spec.key, label: spec.label, value: show(spec.value, spec.unit, lang), conditions: spec.conditions })),
    evidenceCount: robot.evidence.length,
    jobKey: robot.robotType === 'specialised' ? robot.specialisedFor.find((key) => key in JOB_LABELS) ?? 'other' : null,
    href: '/market/' + robot.id,
  };
}

export function priceText(card: Pick<RobotCardData, 'germany'>, lang: Lang = 'en'): string {
  const { price, priceOther, status } = card.germany;
  const t = MARKET_TEXT[lang];
  if (price) return (price.kind === 'from' ? t.from + ' ' : '') + formatEur(price.amount, lang) + (price.basis === 'net' ? ' ' + t.net : price.basis === 'gross' ? ' ' + t.gross : '');
  if (priceOther) return formatMoney(priceOther.amount, priceOther.currency, lang) + ' (' + priceOther.market + ')';
  return status === 'not_sold' ? t.notSoldHere : t.onRequest;
}
