import {REVIEWED_TASK_LINKS} from './task-links';
import {loadTaskReviewLinks} from './links';
import {loadContent} from '@/lib/content/load';
import {taskCards} from '@/lib/tasks/cards';
import {describe,it,expect} from 'vitest';
import {validateTaskReviewLinks,type TaskReviewLink} from './links';
import {loadSolutionReviews} from '@/lib/solutions/load';
import {loadDiscoveryPoints} from './load';
const reviews=loadSolutionReviews();
const base=()=>({taskId:'test/task',reviewId:reviews[0].id,relationship:'partial_task',rationale:'Supports one named part of the task.',sourceIds:[reviews[0].sources.find(source=>source.retrievalMode==='direct')!.id],limitations:['The complete site workflow remains untested.']} satisfies TaskReviewLink);
describe('task-specific research links',()=>{
 it('publishes the same reviewed task links to discovery and saved assessments',()=>{
  const ids=new Set(taskCards(loadContent()).map(task=>task.id));
  const order=(items:typeof REVIEWED_TASK_LINKS)=>[...items].sort((a,b)=>(a.taskId+a.reviewId).localeCompare(b.taskId+b.reviewId));
  expect(order(REVIEWED_TASK_LINKS)).toEqual(order(loadTaskReviewLinks(reviews,ids)));
 });
 it('rejects unknown identities, duplicate links and unsupported citations',()=>{
  const link=base(),ids=new Set([link.taskId]);
  expect(validateTaskReviewLinks([link],reviews,ids)).toEqual([link]);
  expect(()=>validateTaskReviewLinks([link,link],reviews,ids)).toThrow('Duplicate');
  expect(()=>validateTaskReviewLinks([link],reviews,new Set())).toThrow('Unknown task');
  expect(()=>validateTaskReviewLinks([{...link,reviewId:'wrong'}],reviews,ids)).toThrow('Unknown configuration');
  expect(()=>validateTaskReviewLinks([{...link,sourceIds:['wrong']}],reviews,ids)).toThrow('Unsupported');
  const blocked=structuredClone(reviews);blocked[0].sources.forEach(source=>source.retrievalMode='blocked');
  expect(()=>validateTaskReviewLinks([link],blocked,ids)).toThrow('Unsupported');
 });
 it('retains partial-task scope and source citations in the browser payload',()=>{
  const points=loadDiscoveryPoints();
  for(const point of points)for(const link of point.reviewLinks??[]){
   expect(point.reviewIds).toContain(link.reviewId);
   expect(link.taskId).toBe(point.id);
   expect(link.limitations.length).toBeGreaterThan(0);
   expect(link.sourceIds.length).toBeGreaterThan(0);
  }
 });
});
