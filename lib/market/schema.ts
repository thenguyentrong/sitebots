import { z } from 'zod';

// One file per exact robot configuration under data/market/de/. A record answers three
// questions for a buyer in Germany: can I get it here, what does it do, and who sells it.

const text = z.string().trim().min(1);
const https = z.url().refine((value) => value.startsWith('https://'), 'HTTPS URL expected');
const day = z.iso.date();
const country = z.string().regex(/^[A-Z]{2}$/, 'ISO country code, e.g. DE');

export const ROBOT_TYPES = ['humanoid', 'quadruped', 'mobile_manipulator', 'specialised'] as const;
export const DE_STATUS = ['buy_now', 'quote', 'preorder', 'not_sold'] as const;
export const LIFECYCLE = ['shipping', 'preorder', 'pilot_only', 'prototype', 'discontinued'] as const;
export const HANDS = ['none', 'gripper', 'dexterous', 'tool', 'optional'] as const;
export const SELLER_ROLES = ['manufacturer', 'distributor', 'reseller', 'integrator', 'rental'] as const;
export const SOURCE_KINDS = ['manufacturer', 'seller', 'press', 'customer', 'trade_fair', 'database', 'other'] as const;
export const EVIDENCE_STAGES = ['claim', 'demo', 'pilot', 'deployment'] as const;

export type RobotType = (typeof ROBOT_TYPES)[number];
export type GermanyStatus = (typeof DE_STATUS)[number];
export type EvidenceStage = (typeof EVIDENCE_STAGES)[number];

export const SourceSchema = z.object({
  id: z.string().regex(/^s\d+$/, 'source ids are s1, s2, ...'),
  url: https,
  title: text,
  publisher: text,
  kind: z.enum(SOURCE_KINDS),
  checkedAt: day,
});

export const SpecSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: text,
  value: z.union([z.number().finite(), text, z.boolean()]),
  unit: z.string().nullable(),
  conditions: z.string().nullable(),
  sourceId: text,
});

export const SellerSchema = z.object({
  name: text,
  country,
  role: z.enum(SELLER_ROLES),
  productUrl: https.nullable(),
  contactUrl: https.nullable(),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  priceEur: z.number().positive().nullable(),
  priceBasis: z.enum(['net', 'gross', 'unknown']).nullable(),
  sourceId: text,
  note: z.string().nullable(),
});

export const GermanySchema = z.object({
  status: z.enum(DE_STATUS),
  statusNote: text,
  sourceIds: z.array(text).min(1),
  priceEur: z.object({
    amount: z.number().positive(),
    basis: z.enum(['net', 'gross', 'unknown']),
    kind: z.enum(['list', 'from', 'quoted_example']),
    sourceId: text,
    note: z.string().nullable(),
  }).nullable(),
  priceOther: z.object({
    amount: z.number().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    market: text,
    sourceId: text,
  }).nullable(),
  leadTime: z.string().nullable(),
  sellers: z.array(SellerSchema),
  checkedAt: day,
});

export const CapabilitySchema = z.object({
  legs: z.boolean(),
  wheels: z.boolean(),
  tracks: z.boolean(),
  levelFloors: z.boolean(),
  roughGround: z.boolean().nullable(),
  stairs: z.boolean().nullable(),
  outdoor: z.boolean().nullable(),
  arms: z.number().int().min(0).max(4),
  hands: z.enum(HANDS),
  handsIncluded: z.boolean().nullable(),
  armPayloadKg: z.number().nonnegative().nullable(),
  carryPayloadKg: z.number().nonnegative().nullable(),
  runtimeH: z.number().positive().nullable(),
  ipRating: z.string().regex(/^IP[0-9X][0-9X]$/).nullable(),
  sdk: z.string().nullable(),
  sourceIds: z.array(text).min(1),
  notes: z.array(text),
});

export const ImageSchema = z.object({
  url: https,
  pageUrl: https,
  credit: text,
  alt: text,
  kind: z.enum(['product', 'in_use']),
});

export const EvidenceSchema = z.object({
  taskIds: z.array(text),
  task: text,
  stage: z.enum(EVIDENCE_STAGES),
  where: z.string().nullable(),
  date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/).nullable(),
  sourceId: text,
  note: z.string().nullable(),
});

export const DossierSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  maker: text,
  makerCountry: country,
  model: text,
  variant: z.string().nullable(),
  name: text,
  robotType: z.enum(ROBOT_TYPES),
  specialisedFor: z.array(text),
  officialUrl: https.nullable(),
  summary: text,
  launched: z.string().regex(/^\d{4}(-\d{2})?$/).nullable(),
  lifecycle: z.enum(LIFECYCLE),
  germany: GermanySchema,
  specs: z.array(SpecSchema),
  capabilities: CapabilitySchema,
  images: z.array(ImageSchema),
  evidence: z.array(EvidenceSchema),
  sources: z.array(SourceSchema).min(1),
  openQuestions: z.array(text),
  checkedAt: day,
}).superRefine((record, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const ids = new Set<string>();
  for (const source of record.sources) {
    if (ids.has(source.id)) issue('Duplicate source id ' + source.id);
    ids.add(source.id);
  }
  const cited = [
    ...record.germany.sourceIds,
    ...record.germany.sellers.map((seller) => seller.sourceId),
    ...(record.germany.priceEur ? [record.germany.priceEur.sourceId] : []),
    ...(record.germany.priceOther ? [record.germany.priceOther.sourceId] : []),
    ...record.specs.map((spec) => spec.sourceId),
    ...record.capabilities.sourceIds,
    ...record.evidence.map((item) => item.sourceId),
  ];
  for (const id of cited) if (!ids.has(id)) issue('Unknown source reference ' + id);
  const keys = record.specs.map((spec) => spec.key);
  if (new Set(keys).size !== keys.length) issue('Spec keys must be unique');
  const { status, sellers } = record.germany;
  if ((status === 'buy_now' || status === 'quote') && !sellers.length) issue(status + ' needs at least one seller or sales route');
  if (status === 'buy_now' && !sellers.some((seller) => seller.productUrl || seller.priceEur)) issue('buy_now needs a seller page that lists this model');
  if (record.robotType === 'specialised' && !record.specialisedFor.length) issue('specialised robots name the jobs they do in specialisedFor');
  if (record.capabilities.hands === 'none' && record.capabilities.arms > 0) issue('arms without hands: use gripper, tool or optional');
});

export type Dossier = z.infer<typeof DossierSchema>;
export type Seller = z.infer<typeof SellerSchema>;
export type Spec = z.infer<typeof SpecSchema>;
