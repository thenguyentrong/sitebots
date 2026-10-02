import {expect,it} from 'vitest';
import {projectSpecs} from './current';
type Fact=Parameters<typeof projectSpecs>[0][number];
const row=(url:string,value:number,date:string,tier=1):Fact=>({field:'weight_kg',qualifier:null,value_num:value,value_min:null,value_max:null,value_text:null,value_bool:null,value_json:null,unit:'kg',raw_value:String(value),source_id:'test',source_url:url,evidence_url:null,source_tier:tier,observed_at:date,confidence:.9,note:null});
it('keeps old facts in history without manufacturing a current conflict',()=>{
 const r=projectSpecs([row('https://maker.test/robot',40,'2025-01-01'),row('https://maker.test/robot',55,'2026-01-01')]);expect(r.specs.weight_kg.value).toBe(55);expect(r.conflicts).toEqual([]);
});
it('still reports disagreement between current sources',()=>{
 const r=projectSpecs([row('https://maker.test/robot',55,'2026-01-01'),row('https://store.test/robot',40,'2026-01-02',2)]);expect(r.specs.weight_kg.value).toBe(55);expect(r.conflicts).toHaveLength(1);
});
it('does not silently discard simultaneous contradictory claims',()=>{
 const r=projectSpecs([row('https://maker.test/robot',55,'2026-01-01'),row('https://maker.test/robot',40,'2026-01-01')]);expect(r.conflicts).toHaveLength(1);
});
it('invalidated extractions cannot override evidence or confer verified status',()=>{
 const bad={...row('https://maker.test/robot',2,'2026-09-13'),invalidated_at:'2026-09-13'};
 const valid=row('https://report.test/robot',40,'2026-01-01',3);
 const result=projectSpecs([bad,valid]);
 expect(result.specs.weight_kg.value).toBe(40);
 expect(result.specs.weight_kg.trust).toBe('reported');
 expect(result.conflicts).toEqual([]);
 expect(projectSpecs([bad]).specs).toEqual({});
});

it('keeps conservative payload values tied to their actual measurement basis', async () => {
 const {conservativePayload}=await import('./current');
 const make=(field:string,qualifier:string,value:number,tier=1)=>({...row('https://maker.test/robot',value,'2026-09-13',tier),field,qualifier});
 const specs=projectSpecs([make('payload_kg','peak',2),make('payload_kg','rated_dual',6,3)]).specs;
 expect(conservativePayload(specs)).toMatchObject({conservative:null,key:'payload_kg:peak',estimated:true});
 const peakOnly=projectSpecs([make('payload_kg','peak',2)]).specs;
 expect(conservativePayload(peakOnly)).toMatchObject({conservative:null,key:'payload_kg:peak',estimated:true});
});
