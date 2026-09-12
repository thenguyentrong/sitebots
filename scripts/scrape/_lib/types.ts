import type { AvailabilityStatus, FormFactor, Region, RobotStatus } from '@/lib/spec/enums';

export type SourceMeta = {
  /** Matches an id in data/sources.json. */
  id: string;
  domain: string;
  tier: 1 | 2 | 3;
  kind: 'manufacturer' | 'distributor' | 'aggregator' | 'index';
  name: string;
};

export type IndexEntry = {
  slug: string;
  url: string;
  hint?: Record<string, unknown>;
};

export type Snapshot = {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  fetchedAt: string;
  body: string;
  sha256: string;
  bytes: number;
  fromCache: boolean;
};

/** A value as the source stated it. Normalisation turns it into a NormalizedFact. */
export type RawField = {
  field: string;
  value: string | number | boolean | string[] | Record<string, unknown> | Record<string, unknown>[] | null;
  unit?: string;
  qualifier?: string;
  min?: number;
  max?: number;
  note?: string;
  confidence?: number;
  evidence_url?: string;
};

export type RawPrice = {
  amount: number;
  currency: string;
  region: Region;
  tier: 1 | 2 | 3;
  direct: boolean;
  config?: string;
  includes_vat?: boolean;
  sku?: string;
  note?: string;
  evidence_url?: string;
};

export type RawAvailability = {
  region: Region;
  status: AvailabilityStatus;
  in_stock?: boolean;
  lead_time_days_min?: number;
  lead_time_days_max?: number;
  lead_time_text?: string;
};

export type RawAsset = {
  kind: 'image' | 'hero' | 'logo' | 'datasheet_pdf';
  url: string;
  licence?: string;
  attribution?: string;
  alt?: string;
};

export type RawRecord = {
  adapter: string;
  source_id: string;
  source_url: string;
  observed_at: string;
  subject: {
    manufacturer_raw: string;
    model_raw: string;
    variant_raw?: string;
    form_factor_hint?: FormFactor;
    /** What the source says about the maker and the product; used to propose alias entries, never to match. */
    website_hint?: string;
    country_hint?: string;
    status_hint?: RobotStatus;
    release_year_hint?: number;
    summary_hint?: string;
  };
  fields: RawField[];
  prices: RawPrice[];
  availability: RawAvailability[];
  assets: RawAsset[];
};

export type FetchOptions = {
  headers?: Record<string, string>;
  fresh?: boolean;
  accept?: string;
  ttlMs?: number;
};

export type Ctx = {
  fetch: (url: string, opts?: FetchOptions) => Promise<Snapshot>;
  log: (msg: string) => void;
  limit?: number;
  only?: string;
  fresh?: boolean;
};

export interface SourceAdapter {
  id: string;
  source: SourceMeta;
  engine: 'fetch' | 'playwright';
  /** URLs to visit. Constructed only from sitemaps, APIs or a fixed list — never crawled. */
  fetchIndex(ctx: Ctx): Promise<IndexEntry[]>;
  fetchRecord(entry: IndexEntry, ctx: Ctx): Promise<Snapshot>;
  /** Pure: a snapshot in, records out. Tested against fixtures under tests/fixtures. */
  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[];
}
