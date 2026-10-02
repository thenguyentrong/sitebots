import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { INDUSTRY_IDS } from '@/lib/content/industries';
import { FAMILY_IDS } from '@/lib/content/vocab';
import type { SolutionReview } from '@/lib/solutions/schema';
import { TaskReviewLinkSchema, validateTaskReviewLinks } from './links';
import { CLUSTER_FOR_FAMILY, type OpportunitySeed } from './model';

const OpportunitySchema = z.object({
 id:z.string().regex(/^research:[a-z0-9-]+$/),title:z.string().min(8),summary:z.string().min(20),
 industries:z.array(z.enum(INDUSTRY_IDS)).min(1),family:z.enum(FAMILY_IDS),setting:z.string().min(1),
 reviewLinks:z.array(TaskReviewLinkSchema).min(1),
});
const BatchSchema=z.object({schemaVersion:z.literal(1),opportunities:z.array(OpportunitySchema)});
export function loadResearchedOpportunities(reviews:readonly SolutionReview[]):OpportunitySeed[]{
 const dir=join(process.cwd(),'data/discovery-opportunities');
 const opportunities=readdirSync(dir).filter(file=>file.endsWith('.json')).sort().flatMap(file=>BatchSchema.parse(JSON.parse(readFileSync(join(dir,file),'utf8').replace(/^\uFEFF/,''))).opportunities);
 const ids=new Set<string>();
 for(const point of opportunities){
  if(ids.has(point.id))throw Error('Duplicate researched opportunity: '+point.id);
  ids.add(point.id);
  if(point.reviewLinks.some(link=>link.taskId!==point.id))throw Error('Mismatched opportunity/task link: '+point.id);
  validateTaskReviewLinks(point.reviewLinks,reviews,new Set([point.id]));
  for(const link of point.reviewLinks){
   const review=reviews.find(review=>review.id===link.reviewId)!;
   if(point.industries.some(industry=>!review.industries?.includes(industry)))throw Error('Unscoped industry for '+point.id+' / '+review.id);
  }
 }
 return opportunities.map(point=>({...point,clusterId:CLUSTER_FOR_FAMILY[point.family],kind:'researched',href:'/solutions/'+point.reviewLinks[0].reviewId,reviewIds:point.reviewLinks.map(link=>link.reviewId)}));
}
