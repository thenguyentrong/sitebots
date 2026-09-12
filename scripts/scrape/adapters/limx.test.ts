import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {limxFields} from './mfr/limx';
import {normalizeField} from '../../normalize';
const facts=(model:'oli'|'luna'|'tron-1')=>limxFields(readFileSync(`tests/fixtures/limx/${model.replace('-','')}.html`,'utf8'),model).map(f=>normalizeField(f,{source_id:'limxdynamics.com',source_url:`https://www.limxdynamics.com/en/products/${model}/spec`,source_tier:1,observed_at:'2026-09-12T00:00:00Z'}));
describe('LimX manufacturer specifications',()=>{
 it('keeps Oli Lite separate from EDU and Super',()=>{const f=facts('oli').map(x=>x.fact);expect(f.find(x=>x?.field==='height_m')?.value_num).toBe(1.65);expect(f.find(x=>x?.field==='dof_total')?.value_num).toBe(31);expect(f.find(x=>x?.field==='runtime_h')?.value_num).toBe(2);expect(f.find(x=>x?.field==='compute_module')?.value_text).not.toContain('Orin')});
 it('preserves upper bounds and metric dimensions',()=>{const f=facts('tron-1').map(x=>x.fact);expect(f.find(x=>x?.field==='height_m')).toMatchObject({value_max:.845,value_min:null});expect(f.find(x=>x?.field==='weight_kg')).toMatchObject({value_max:20});expect(f.find(x=>x?.field==='max_speed_ms')).toBeUndefined()});
 it('does not turn charger voltage or Ah into battery Wh',()=>{const f=facts('oli').map(x=>x.fact);expect(f.find(x=>x?.field==='battery_wh')).toBeUndefined();expect(f.find(x=>x?.field==='battery_pack')?.value_json).toEqual({capacity_ah:9.5})});
 it('loads Luna manufacturer values and converts speed',()=>{const f=facts('luna').map(x=>x.fact);expect(f.find(x=>x?.field==='dof_total')?.value_num).toBe(27);expect(f.find(x=>x?.field==='weight_kg')?.value_num).toBe(56);expect(f.find(x=>x?.field==='max_speed_ms')?.value_num).toBeCloseTo(5/3.6,4)});
 it('has no invalid fields or normalization warnings',()=>{for(const model of ['oli','luna','tron-1'] as const) expect(facts(model).every(x=>x.fact&&!x.warning)).toBe(true);expect(limxFields('<div>No specifications</div>','oli')).toEqual([])});
});
