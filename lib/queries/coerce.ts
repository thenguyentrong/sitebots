/**
 * Postgres `numeric` comes back as a string from both drivers, and
 * `timestamptz` as a Date. The types in lib/spec/types.ts promise numbers and
 * ISO strings, so every query passes its rows through here once.
 */
const NUMERIC = new Set([
  'height_m',
  'height_min_m',
  'height_max_m',
  'weight_kg',
  'payload_kg_conservative',
  'payload_kg_rated',
  'payload_kg_peak',
  'reach_m',
  'walk_speed_ms',
  'max_speed_ms',
  'battery_wh',
  'runtime_h',
  'charge_time_h',
  'compute_tops',
  'temp_min_c',
  'temp_max_c',
  'max_slope_deg',
  'step_height_m',
  'noise_db',
  'completeness',
  'price_amount',
  'amount',
  'facts',
]);

const DATES = new Set(['price_observed_at', 'observed_at', 'built_at', 'created_at', 'updated_at']);

export function coerceRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = null;
    } else if (NUMERIC.has(k)) {
      const n = typeof v === 'number' ? v : Number(v);
      out[k] = Number.isFinite(n) ? n : null;
    } else if (DATES.has(k)) {
      out[k] = v instanceof Date ? v.toISOString() : String(v);
    } else if (typeof v === 'string' && (k === 'specs' || k === 'conflicts')) {
      out[k] = JSON.parse(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function coerceRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => coerceRow<T>(r));
}
