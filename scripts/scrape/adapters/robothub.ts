import * as cheerio from 'cheerio';
import type { FormFactor, RobotStatus } from '@/lib/spec/enums';
import type { IndexEntry, RawField, RawRecord, Snapshot, SourceAdapter } from '../_lib/types';

/**
 * robothub.app renders every robot page with a schema.org Product block whose
 * additionalProperty list is the spec sheet, typed and unit-annotated. That
 * block is the only thing parsed; the visible markup is left alone so a
 * redesign does not break the adapter.
 *
 * URLs come from the sitemap only. robots.txt disallows /api/, /admin and
 * paginated queries, and lists /trap — the fetch layer refuses that one
 * outright, but this adapter never constructs a URL it did not read from
 * the sitemap in the first place.
 *
 * Tier 3. Their numbers merge product variants (the G1 entry carries the EDU
 * DOF count and the base price), which is exactly what the conflict record
 * on our side is for.
 */

const SITEMAP = 'https://www.robothub.app/sitemap.xml';
const ROBOT_URL = /^https:\/\/www\.robothub\.app\/en\/robots\/([a-z0-9-]+)$/;

type PropertyValue = { '@type': 'PropertyValue'; name: string; value: string | number; unitText?: string };
type Product = {
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string;
  brand?: { name?: string };
  releaseDate?: string;
  category?: string;
  additionalProperty?: PropertyValue[];
};

function prop(props: PropertyValue[], name: string): PropertyValue | undefined {
  return props.find((p) => p.name === name);
}

function withUnit(p: PropertyValue | undefined): string | null {
  if (!p || p.value === '' || p.value == null) return null;
  return p.unitText ? `${p.value} ${p.unitText}` : String(p.value);
}

function formFactor(locomotion: string | null): FormFactor | undefined {
  if (!locomotion) return undefined;
  if (/quadruped/i.test(locomotion)) return 'quadruped';
  if (/wheel/i.test(locomotion)) return 'mobile_manipulator';
  if (/biped/i.test(locomotion)) return 'humanoid';
  return undefined;
}

function status(stage: string | null): RobotStatus | undefined {
  if (!stage) return undefined;
  if (/mass ?production|shipping|commercial/i.test(stage)) return 'shipping';
  if (/pre.?order/i.test(stage)) return 'pre_order';
  if (/prototype|pilot|beta|development/i.test(stage)) return 'prototype';
  if (/concept|announced/i.test(stage)) return 'concept';
  if (/discontinued|retired/i.test(stage)) return 'discontinued';
  return undefined;
}

export const robothub: SourceAdapter = {
  id: 'robothub',
  source: { id: 'robothub.app', domain: 'robothub.app', tier: 3, kind: 'aggregator', name: 'RobotHub' },
  engine: 'fetch',

  async fetchIndex(ctx) {
    const snap = await ctx.fetch(SITEMAP, { accept: 'application/xml,text/xml' });
    const urls = [...snap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    const entries: IndexEntry[] = [];
    for (const url of urls) {
      const m = ROBOT_URL.exec(url);
      if (m) entries.push({ slug: m[1], url });
    }
    return entries;
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    let product: Product | null = null;
    $('script[type="application/ld+json"]').each((_, s) => {
      try {
        const json = JSON.parse($(s).html() ?? '') as Product | Product[];
        const list = Array.isArray(json) ? json : [json];
        const hit = list.find((j) => j['@type'] === 'Product');
        if (hit && !product) product = hit;
      } catch {
        // malformed block; the page may still have another
      }
    });
    if (!product) return [];
    const p = product as Product;
    const props = p.additionalProperty ?? [];
    const locomotion = String(prop(props, 'Locomotion Type')?.value ?? '') || null;
    const ff = formFactor(locomotion);

    const fields: RawField[] = [];
    const push = (field: string, value: string | null, extra: Partial<RawField> = {}) => {
      if (value) fields.push({ field, value, ...extra });
    };

    // A stated range beats the single number the site derives from it.
    const heightRange = String(prop(props, 'Height Range')?.value ?? '');
    if (/\d\s*-\s*\d/.test(heightRange)) push('height_m', heightRange.replace(/cm$/i, ' cm'));
    else push('height_m', withUnit(prop(props, 'Height')));
    push('weight_kg', withUnit(prop(props, 'Weight')));
    const dofRange = String(prop(props, 'DOF Range')?.value ?? '');
    if (/\d\s*-\s*\d/.test(dofRange)) push('dof_total', dofRange.replace(/\s*dof$/i, ''), { note: `Range as published: ${dofRange}` });
    else push('dof_total', withUnit(prop(props, 'Total DOF')));
    push('dof_hands', withUnit(prop(props, 'Hand DOF')));
    push('max_speed_ms', withUnit(prop(props, 'Max Speed')));
    push('payload_kg', withUnit(prop(props, 'Payload')), {
      qualifier: ff === 'humanoid' ? 'rated_dual' : 'sustained',
      note: ff === 'humanoid' ? 'RobotHub lists this as dual-arm payload.' : undefined,
    });
    push('runtime_h', withUnit(prop(props, 'Battery Life')), { qualifier: 'unstated' });
    push('compute_module', withUnit(prop(props, 'Compute Platform')));
    const sensors = withUnit(prop(props, 'Sensors'));
    push('cameras', sensors);
    if (sensors) fields.push({ field: 'has_lidar', value: /lidar/i.test(sensors) });

    const priceText = String(prop(props, 'Price')?.value ?? '');
    const priceNum = Number(priceText.replace(/[^0-9.]/g, ''));
    const prices =
      priceText && Number.isFinite(priceNum) && priceNum > 0
        ? [
            {
              amount: priceNum,
              currency: /€/.test(priceText) ? 'EUR' : /¥|RMB|CNY/.test(priceText) ? 'CNY' : 'USD',
              region: 'GLOBAL' as const,
              tier: 3 as const,
              direct: false,
              config: 'base',
              note: `Listed by RobotHub as ${priceText}.`,
            },
          ]
        : [];

    const year = Number(prop(props, 'Release Year')?.value ?? p.releaseDate);

    return [
      {
        adapter: 'robothub',
        source_id: 'robothub.app',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: {
          manufacturer_raw: p.brand?.name ?? '',
          model_raw: p.name,
          form_factor_hint: ff,
          status_hint: status(String(prop(props, 'Product Stage')?.value ?? '') || null),
          release_year_hint: Number.isFinite(year) && year > 1990 ? year : undefined,
          summary_hint: p.description?.split(/\r?\n/)[0]?.slice(0, 300) || undefined,
        },
        fields,
        prices,
        availability: [],
        assets: p.image ? [{ kind: 'image', url: p.image, licence: 'unknown', attribution: 'via RobotHub' }] : [],
      },
    ];
  },
};
