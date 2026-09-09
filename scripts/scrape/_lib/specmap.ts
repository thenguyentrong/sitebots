import type { FormFactor } from '@/lib/spec/enums';
import { extractQuantity, normalizeIp, type Quantity } from '@/scripts/normalize/units';
import type { RawField } from './types';

/**
 * Manufacturer spec sheets share a vocabulary but not a layout. This maps a
 * (label, value) pair from any of them onto canonical fields, with the unit
 * conversions left to the normaliser. A rule that does not recognise the
 * label returns nothing — bearings, torque, encoders and marketing lines are
 * left where they are.
 *
 * Values are re-emitted as clean "number unit" strings so the raw text with
 * its remarks ("≈ 60kg Total weight (battery included)") is still kept on the
 * fact as raw_value, while the parser sees only the quantity.
 */

export type SpecContext = { formFactor?: FormFactor; section?: string };

/**
 * Text of an element with a space where a block boundary or <br> was. Plain
 * .text() joins "4-6h" and "Walking without load" into "4-6hWalking", which
 * turns the hour into a nonsense unit.
 */
export function spacedText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|span|td|th|dd|dt|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOT_AVAILABLE = /^(\/|○|-|—|n\/a|na|none|no|tbd|optional)$/i;

function fmt(q: Quantity | null, fallbackUnit?: string): string | null {
  if (!q) return null;
  const unit = q.unit ?? fallbackUnit ?? '';
  if (q.min !== undefined && q.max !== undefined) return `${q.min}–${q.max} ${unit}`.trim();
  if (q.min !== undefined) return `${q.min} ${unit}`.trim();
  if (q.value !== undefined) return `${q.value} ${unit}`.trim();
  return null;
}

/** "1320x450x200mm", "≈ 1098mm×450mm×645mm", "70cm x 31cm x 40cm" → the dimensions in order, as "n unit". */
export function dimensions(text: string): string[] {
  const s = text.replace(/[×＊*]/g, 'x').replace(/[≈~]/g, '');
  const m = s.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*x\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)?/i);
  if (!m) return [];
  const unit = m[6] ?? m[4] ?? m[2] ?? 'mm';
  return [m[1], m[3], m[5]].map((n, i) => `${n} ${[m[2], m[4], m[6]][i] ?? unit}`);
}

function f(field: string, value: string | number | boolean | null, extra: Partial<RawField> = {}): RawField[] {
  return value === null || value === '' ? [] : [{ field, value, ...extra }];
}

function multiplied(text: string, note: string): RawField[] {
  // "6" per leg, "7x2" both arms, "22x2" both hands
  const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(text);
  if (m) return [{ field: '', value: Number(m[1]) * Number(m[2]), note: `${text.trim()} — ${note}` }];
  const q = extractQuantity(text);
  if (!q || q.value === undefined) return [];
  return [{ field: '', value: q.value * 2, note: `${q.value} ${note}` }];
}

export function mapSpecLabel(labelRaw: string, valueRaw: string, ctx: SpecContext = {}): RawField[] {
  const label = labelRaw.replace(/[【\[]\d+[】\]]/g, '').replace(/\s+/g, ' ').trim();
  const value = valueRaw
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/[，、]/g, ', ')
    .replace(/[\s ]+/g, ' ')
    .trim();
  if (!value || NOT_AVAILABLE.test(value)) return [];
  const quad = ctx.formFactor === 'quadruped';
  const section = (ctx.section ?? '').toLowerCase();
  const out: RawField[] = [];

  // size
  if (/height,? width and thickness.*stand|^dimensions? \(stand/i.test(label) || (/^key dimensions/i.test(label) && !/\+/.test(value))) {
    const d = dimensions(value);
    if (d.length) out.push(...f('height_m', d[0]), ...f('footprint', `${value} (H × W × D standing)`));
    return out;
  }
  if (/size\s*\(standing\)|dimension of standing|standing size|dimensions? \(standing\)/i.test(label)) {
    const d = dimensions(value);
    if (d.length) out.push(...f('height_m', d[2]), ...f('footprint', `${value} (L × W × H standing)`));
    return out;
  }
  if (/^(default )?height( \(walking\))?$/i.test(label)) return f('height_m', fmt(extractQuantity(value, 'm')));
  if (/^(total |net )?(mass|weight)/i.test(label) || /net mass/i.test(label)) return f('weight_kg', fmt(extractQuantity(value, 'kg')));

  // kinematics
  if (/total degrees of freedom|^degrees? of freedom|^dof$|total dof/i.test(label)) return f('dof_total', fmt(extractQuantity(value)));
  if (/(single|each) leg|^legs$/i.test(label) && (/degree|dof/i.test(label) || section.includes('freedom'))) return multiplied(value, 'per leg, both legs counted').map((x) => ({ ...x, field: 'dof_legs' }));
  if (/(single|each) arm degrees|dof of each arm|^arms$/i.test(label) && (/degree|dof/i.test(label) || section.includes('freedom'))) return multiplied(value, 'per arm, both arms counted').map((x) => ({ ...x, field: 'dof_arms' }));
  if (/(single|each) hand degrees|^hands$/i.test(label) && (/degree|dof/i.test(label) || section.includes('freedom'))) {
    const m = /(\d+)\s*[x×]\s*(\d+)/.exec(value);
    if (m) return f('dof_hands', Number(m[1]) * Number(m[2]), { note: `${value} — both hands counted` });
    const q = extractQuantity(value);
    return q?.value !== undefined ? f('dof_hands', q.value, { note: `${value} — per hand` }) : [];
  }
  if (/waist degrees|^neck$|^spine$/i.test(label)) {
    const q = extractQuantity(value);
    return q?.value !== undefined ? f('dof_body', q.value, { note: `${label}: ${value}` }) : [];
  }

  // payload
  if (/load\s*\(standing\)/i.test(label) || /^lift$/i.test(label)) return f('payload_kg', fmt(extractQuantity(value, 'kg')), { qualifier: 'instant', note: `${label}: ${value}` });
  if (/load\s*\(walking\)/i.test(label) || /^carry$/i.test(label)) return f('payload_kg', fmt(extractQuantity(value, 'kg')), { qualifier: 'carry_walking', note: `${label}: ${value}` });
  if (/arm (maximum )?load|arm payload|arm normal load|single arm.*load/i.test(label)) return f('payload_kg', fmt(extractQuantity(value, 'kg')), { qualifier: 'rated', note: `${label}: ${value}` });
  if (/^(max )?payload( capacity)?$/i.test(label)) {
    const main = extractQuantity(value.replace(/\(.*?\)/g, ''), 'kg');
    const max = /\((?:max)?[^\d]*(\d+(?:\.\d+)?)\s*kg\)/i.exec(value);
    out.push(...f('payload_kg', fmt(main), { qualifier: quad ? 'sustained' : 'rated', note: `${label}: ${value}` }));
    if (max) out.push(...f('payload_kg', `${max[1]} kg`, { qualifier: quad ? 'instant' : 'peak', note: `${label}: ${value}` }));
    return out;
  }

  // mobility
  if (/walking speed/i.test(label)) return f('walk_speed_ms', fmt(extractQuantity(value, 'm/s') ?? extractQuantity(value, 'km/h')));
  if (/max\.?\s*(imum)?\s*(run |walking )?speed|running speed|^speed$|moving speed|^mobility$/i.test(label)) {
    return f('max_speed_ms', fmt(extractQuantity(value, 'm/s') ?? extractQuantity(value, 'km/h')));
  }
  if (/continuous stair|stair climbing|climb drop height|step\/obstacle|max step height|^step height/i.test(label)) {
    const q = extractQuantity(value, 'cm') ?? extractQuantity(value, 'mm') ?? extractQuantity(value, 'm');
    out.push(...f('step_height_m', fmt(q)));
    out.push(...f('stair_capable', true, { note: `${label}: ${value}` }));
    return out;
  }
  if (/climb(ing)? angle|max slope|^slope$|grade/i.test(label)) return f('max_slope_deg', fmt(extractQuantity(value.replace(/°(?!\d)/g, '°'), '°') ?? extractQuantity(value)));
  if (/climbing ability/i.test(label)) return f('terrain_notes', value);

  // power
  if (/battery life|endurance|battery autonomy|run-?time|average runtime|^runtime/i.test(label)) {
    const parts = value.split(/\s*\/\s*/);
    const walking = parts.find((p) => /walk/i.test(p));
    const idle = parts.find((p) => /stand-?by|idle/i.test(p));
    if (walking && idle) {
      out.push(...f('runtime_h', fmt(extractQuantity(walking, 'h') ?? extractQuantity(walking, 'min')), { qualifier: 'walking' }));
      out.push(...f('runtime_h', fmt(extractQuantity(idle, 'h') ?? extractQuantity(idle, 'min')), { qualifier: 'idle' }));
    } else {
      out.push(...f('runtime_h', fmt(extractQuantity(value, 'h') ?? extractQuantity(value, 'min')), { qualifier: 'unstated', note: value.length > 40 ? value : undefined }));
    }
    if (/replaceable|swap|quick.?release/i.test(value)) out.push(...f('hot_swap', true, { note: value }));
    return out;
  }
  if (/battery (capacity|performance)|^battery$|^capacity$/i.test(label)) {
    out.push(...f('battery_wh', fmt(extractQuantity(value, 'Wh') ?? extractQuantity(value, 'kWh'))));
    if (/replaceable|swap|quick.?release/i.test(value)) out.push(...f('hot_swap', true, { note: value }));
    // The pack itself, when the maker prints it: capacity in mAh, cells in series, nominal volts.
    const mah = /(\d{3,6})\s*mAh/i.exec(value);
    const series = /(\d{1,2})\s*S\b/.exec(value);
    const volts = /(\d{2,3}(?:\.\d)?)\s*V\b/.exec(value);
    const wh = extractQuantity(value, 'Wh');
    if (mah || series || volts) {
      const pack: Record<string, unknown> = {};
      if (mah) pack.capacity_ah = Math.round((Number(mah[1]) / 1000) * 10) / 10;
      if (series) pack.cells_series = Number(series[1]);
      if (volts) pack.voltage_v = Number(volts[1]);
      if (wh) pack.energy_wh = wh.value;
      if (/replaceable|swap|quick.?release/i.test(value)) pack.swappable = true;
      out.push({ field: 'battery_pack', value: pack, note: value.slice(0, 160) });
    }
    return out;
  }
  if (/standby time/i.test(label)) return f('runtime_h', fmt(extractQuantity(value, 'h') ?? extractQuantity(value, 'min')), { qualifier: 'idle' });
  if (/quick release|smart battery/i.test(label)) return f('hot_swap', true, { note: `${label}: ${value}` });
  if (/recharge|charge time|charging time/i.test(label)) return f('charge_time_h', fmt(extractQuantity(value, 'h') ?? extractQuantity(value, 'min')));

  // environment
  if (/operating temp|^temperature/i.test(label)) {
    const v = value.replace(/℃/g, '°C').replace(/°(?!\s*[CF])/g, '°C');
    return f('operating_temp_c', fmt(extractQuantity(v, '°C')));
  }
  if (/ingress protection|^protection/i.test(label) || (/^body$/i.test(label) && /ip\d/i.test(value))) {
    const ip = normalizeIp(value);
    return ip ? f('ip_rating', ip, { note: /\(|hand/i.test(value) ? value : undefined }) : [];
  }
  if (/audible noise|^noise/i.test(label)) return f('noise_db', fmt(extractQuantity(value, 'dB')));

  // compute and sensing
  if (/ai compute|tops|tflops/i.test(label)) return f('compute_tops', fmt(extractQuantity(value)), { note: value });
  if (/computing power|control and perception|processor|chipset|^compute/i.test(label)) return f('compute_module', value.slice(0, 160));
  if (/^lidar|lidar model|laser radar/i.test(label)) {
    out.push(...f('lidar_model', value.slice(0, 120)));
    out.push(...f('has_lidar', !/none|\bno\b|n\/a/i.test(value)));
    return out;
  }
  if (/sensing|sensor configuration|depth sensing|^camera/i.test(label)) {
    out.push(...f('cameras', value.slice(0, 160)));
    out.push(...f('has_lidar', /lidar/i.test(value)));
    return out;
  }
  if (/^material/i.test(label)) return f('structural_material', value.slice(0, 120));
  if (/external interface|^interface|connectivity|communication|wifi/i.test(label)) return f('connectivity', value.slice(0, 160));
  if (/warranty/i.test(label)) return f('warranty_months', fmt(extractQuantity(value)), { note: value });

  return [];
}
