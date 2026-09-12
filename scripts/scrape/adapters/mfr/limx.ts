import * as cheerio from 'cheerio';
import { dimensions, spacedText } from '../../_lib/specmap';
import { extractQuantity } from '../../../normalize/units';
import type { RawField, SourceAdapter } from '../../_lib/types';

const MODELS = { oli: { name: 'LimX Oli', page: 'oli', config: 'Oli Lite' }, luna: { name: 'Luna', page: 'luna', config: 'Luna standard' }, 'tron-1': { name: 'TRON 1', page: 'tron1', config: 'TRON 1 Standard Edition' } } as const;

/** Desktop cells are separate configurations; the mobile cell duplicates the first. */
export function limxRows(body: string): Map<string, string> {
  const $ = cheerio.load(body);
  const rows = new Map<string, string>();
  $('div.grid').each((_, row) => {
    const cells = $(row).children('div');
    if (!cells.first().hasClass('font-medium')) return;
    const label = spacedText(cells.first().html()).replace(/\[\d+\]/g, '');
    const desktop = cells.filter((_, c) => $(c).hasClass('md:flex'));
    if (desktop.length) rows.set(label, spacedText(desktop.first().html()));
  });
  return rows;
}

export function limxFields(body: string, model: keyof typeof MODELS): RawField[] {
  const rows = limxRows(body), fields: RawField[] = [];
  const config = MODELS[model].config;
  const numeric = (label: string, field: string, unit?: string, extra: Partial<RawField> = {}) => {
    const raw = rows.get(label); if (!raw) return;
    const q = extractQuantity(raw, unit); if (!q || q.value === undefined) return;
    fields.push({ field, value: q.value, unit: q.unit ?? unit, ...(/^[≤<]/.test(raw) ? { value: null, max: q.value } : {}), note: `${config}; ${label}: ${raw}`, confidence: 0.95, ...extra });
  };
  numeric('Height', 'height_m', 'm');
  numeric(model === 'oli' ? 'Weight (Battery Included)' : model === 'luna' ? 'Weight (with battery)' : 'Net Weight', 'weight_kg', 'kg');
  numeric(model === 'oli' ? 'Active DoF (Total)' : 'Active DoF', 'dof_total');
  for(const [label,field] of [[model==='oli'?'Single Leg DoF':'Leg DoF','dof_legs'],[model==='oli'?'Single Arm DoF':'Arm DoF','dof_arms']] as const) { const value=rows.get(label); if(value && /^\d+$/.test(value)) fields.push({field,value:Number(value)*2,note:`${config}; ${value} per limb, both limbs counted.`}); }
  const waist=rows.get('Waist DoF'),neck=rows.get('Neck DoF');
  if(waist&&neck&&/^\d+$/.test(waist)&&/^\d+$/.test(neck)) fields.push({field:'dof_body',value:Number(waist)+Number(neck),note:`${config}; waist ${waist} + neck ${neck}.`});
  numeric(model === 'tron-1' ? 'Battery Range' : 'Battery Life', 'runtime_h', 'h', { qualifier: 'unstated' });
  numeric(model === 'luna' ? 'Max Walking Speed' : 'Maximum Moving Speed', 'max_speed_ms', 'm/s');
  numeric(model === 'oli' ? 'Maximum Load Capacity (Single Arm)' : model === 'luna' ? 'Max Arm Payload' : 'Load Capacity', 'payload_kg', 'kg', { qualifier: 'rated' });
  if (model === 'luna') numeric('Charging Time', 'charge_time_h', 'h');
  for (const [label, field] of [['Computer Specification (CPU/Memory/Storage)', 'compute_module'], ['Computing Configuration (SoC / RAM / Storage)', 'compute_module'], ['Compute (Chip/RAM/Storage)', 'compute_module']] as const) {
    const value=rows.get(label); if(value) fields.push({field,value,note:config});
  }
  const capacity=rows.get(model==='luna'?'Capacity':'Battery Capacity')?.replaceAll(',','');
  const match=capacity?.match(/(\d+(?:\.\d+)?)\s*(mAh|Ah)/i);
  if(match) {
    const pack: Record<string,unknown>={capacity_ah:Number(match[1])/(match[2].toLowerCase()==='mah'?1000:1)};
    const voltage=rows.get('Battery Supply Voltage')?.match(/([\d.]+)V/); if(voltage) pack.voltage_v=Number(voltage[1]);
    fields.push({field:'battery_pack',value:pack,note:`${config}; nominal battery capacity. Charger output is not the pack voltage.`});
  }
  if(model==='tron-1') {
    const raw=rows.get('Dimensions'), d=raw?dimensions(raw):[];
    if(d.length) {const q=extractQuantity(d[2]); if(q?.value!==undefined) fields.push({field:'height_m',value:null,max:q.value,unit:q.unit,note:`${config}; ${raw} (L × W × H)`}); fields.push({field:'footprint',value:raw!});}
    numeric('Maximum Climbing Angle*','max_slope_deg','°',{note:`${config}; maximum 30°, measured in wheeled configuration.`});
    numeric('Maximum Obstacle Height Limitation*','step_height_m','m',{note:`${config}; maximum 20 cm, measured in wheeled configuration.`});
    const speed=rows.get('Motion Speed*'); if(speed) fields.push({field:'terrain_notes',value:speed,note:'Speed depends on the installed feet; wheeled speed is not walking speed.'});
  }
  return fields;
}

export const limx: SourceAdapter = {
  id:'limx', source:{id:'limxdynamics.com',domain:'limxdynamics.com',tier:1,kind:'manufacturer',name:'LimX Dynamics'},engine:'fetch',
  async fetchIndex(){ return Object.entries(MODELS).map(([slug,m])=>({slug,url:`https://www.limxdynamics.com/en/products/${m.page}/spec`})); },
  async fetchRecord(entry,ctx){return ctx.fetch(entry.url);},
  parse(snapshot,entry){const model=entry.slug as keyof typeof MODELS;if(!MODELS[model])return [];
    const fields=limxFields(snapshot.body,model);if(!fields.length)return [];
    return [{adapter:'limx',source_id:'limxdynamics.com',source_url:snapshot.url,observed_at:snapshot.fetchedAt,subject:{manufacturer_raw:'LimX Dynamics',model_raw:MODELS[model].name},fields,prices:[],availability:[],assets:[]}];
  }
};
