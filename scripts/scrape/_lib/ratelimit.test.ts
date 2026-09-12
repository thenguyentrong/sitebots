import {afterEach,expect,it,vi} from 'vitest';
import {take} from './ratelimit';
afterEach(()=>vi.useRealTimers());
it('reserves separate host slots before concurrent workers await',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
 const started:number[]=[];const jobs=Array.from({length:3},async()=>{await take('concurrent-test.example');started.push(Date.now())});
 await vi.runAllTimersAsync();await Promise.all(jobs);
 expect(started.map(t=>t-started[0])).toEqual([0,2000,4000]);
});
