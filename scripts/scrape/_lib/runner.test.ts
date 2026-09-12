import {expect,it,vi} from 'vitest';
import {runAdapter} from './runner';
import {FetchRefused} from './fetch';
import type {SourceAdapter} from './types';
it('records an unavailable index as a failed source result',async()=>{
 const fetchRecord=vi.fn();const adapter:SourceAdapter={id:'offline',source:{id:'offline',domain:'offline.test',tier:3,kind:'aggregator',name:'Offline'},engine:'fetch',fetchIndex:async()=>{throw new FetchRefused('network','timed out','https://offline.test')},fetchRecord,parse:()=>[]};
 const r=await runAdapter(adapter,{log:()=>{}});expect(r.errors).toEqual(['offline index: network — timed out']);expect(r.records).toEqual([]);expect(fetchRecord).not.toHaveBeenCalled();expect(r.blocked).toBe(false);
});
