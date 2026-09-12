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
