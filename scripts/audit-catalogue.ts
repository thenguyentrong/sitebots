import { mkdirSync, writeFileSync } from 'node:fs';
import { db, done } from './_guard';
import { getRobotModel } from '../lib/models/index';
import { fieldDef } from '../lib/spec/fields';
async function main() {
  const sql = await db();
  const out = process.env.CATALOGUE_AUDIT_DIR ?? '.out/catalogue-audit'; mkdirSync(out, { recursive: true });
  const robots = await sql.query(`select r.*, m.slug as maker_slug, m.name as maker, m.website_url as website, rc.specs, rc.conflicts, rc.verified_fields from robots r join manufacturers m on m.id=r.manufacturer_id left join robot_current rc on rc.robot_id=r.id order by m.name,r.name,r.variant`);
  const facts = await sql.query('select * from robot_facts');
  const assets = await sql.query('select * from robot_assets');
  const prices = await sql.query('select * from price_current');
  const availability = await sql.query('select * from availability_current');
  const sources = await sql.query('select * from sources');
  const links = await sql.query('select * from robot_sources');
  for (const [name, rows] of Object.entries({robots,facts,assets,prices,availability,sources,links})) writeFileSync(`${out}/${name}.json`,JSON.stringify(rows,null,2));
  const priceHistory=await sql.query('select * from price_observations');
  const availabilityHistory=await sql.query('select * from availability_observations');
  const runs=await sql.query('select * from scrape_runs');
  const curated=await sql.query('select * from curated_entries');
  for(const [name,rows] of Object.entries({priceHistory,availabilityHistory,runs,curated})) writeFileSync(`${out}/${name}.json`,JSON.stringify(rows,null,2));
  const issues: {robot:string; kind:string; detail:unknown}[]=[];
  const catalogue = robots.map((r:any)=>{
    const key=`${r.maker_slug}/${r.model_slug}${r.variant==='base'?'':`#${r.variant}`}`;
    const ownAssets=assets.filter((a:any)=>a.robot_id===r.id);
    const model=getRobotModel(`${r.maker_slug}/${r.model_slug}`,r.variant);
    const base = robots.find((b:any)=>b.maker_slug===r.maker_slug&&b.model_slug===r.model_slug&&b.variant==='base') as any;
    const photos=ownAssets.filter((a:any)=>['image','hero'].includes(a.kind));
    const borrowed=base&&base.id!==r.id?assets.filter((a:any)=>a.robot_id===base.id&&['image','hero'].includes(a.kind)&&!a.url.startsWith('/renders/')):[];
    const f=facts.filter((f:any)=>f.robot_id===r.id);
    if(!photos.length&&!borrowed.length) issues.push({robot:key,kind:'missing_image',detail:null});
    if(!model) issues.push({robot:key,kind:'missing_3d',detail:null});
    if(!r.website) issues.push({robot:key,kind:'missing_maker_website',detail:null});
    if(!f.some((x:any)=>x.source_tier===1)) issues.push({robot:key,kind:'no_manufacturer_facts',detail:null});
    if(r.conflicts?.length) issues.push({robot:key,kind:'conflicting_specs',detail:r.conflicts});
    const missing=['height_m','weight_kg','dof_total','runtime_h','ip_rating'].filter(x=>!Object.keys(r.specs??{}).some(k=>(k===x||k.startsWith(x+':')) && r.specs[k]?.value!=null));
    if(missing.length) issues.push({robot:key,kind:'missing_core_specs',detail:missing});
    if(!f.length) issues.push({robot:key,kind:'no_facts',detail:null});
    for(const fact of f as any[]) {
      if(fact.value_min!=null && fact.value_max!=null && Number(fact.value_min)>Number(fact.value_max)) issues.push({robot:key,kind:'inverted_range',detail:fact.field});
      if(!Number.isFinite(Number(fact.confidence))||Number(fact.confidence)<0||Number(fact.confidence)>1) issues.push({robot:key,kind:'invalid_confidence',detail:fact.field});
      if(!Number.isFinite(Date.parse(fact.observed_at))||Date.parse(fact.observed_at)>Date.now()+86400000) issues.push({robot:key,kind:'invalid_observed_date',detail:fact.observed_at});
      const def=fieldDef(fact.field);
      if(!def) issues.push({robot:key,kind:'unknown_field',detail:{field:fact.field,source:fact.source_url}});
      if(!/^(https?:|curated:)/.test(fact.source_url)) issues.push({robot:key,kind:'invalid_source_url',detail:fact.source_url});
      const v=fact.value_num===null?null:Number(fact.value_num);
      const bounds:Record<string,[number,number]>={height_m:[0.05,5],weight_kg:[0.05,2000],dof_total:[1,250],runtime_h:[0.01,96],walk_speed_ms:[0,30],battery_wh:[0.1,100000],reach_m:[0,5]};
      if(v!==null&&bounds[fact.field]&&(v<bounds[fact.field][0]||v>bounds[fact.field][1])) issues.push({robot:key,kind:'numeric_outlier',detail:{field:fact.field,value:v,source:fact.source_url}});
    }
    const sourceUrls=[...new Set(f.map((x:any)=>x.source_url))];
    return {...r,key,images:photos.length,borrowedImages:borrowed.length,has3d:!!model,sourceUrls,missingCore:missing,factCount:f.length};
  });
  const byId=new Map(catalogue.map(r=>[r.id,r.key]));
  for(const p of priceHistory as any[]) {
    if(!Number.isFinite(Number(p.amount))||Number(p.amount)<=0) issues.push({robot:byId.get(p.robot_id)??p.robot_id,kind:'invalid_price',detail:{amount:p.amount,source:p.source_url}});
    if(!/^[A-Z]{3}$/.test(p.currency)) issues.push({robot:byId.get(p.robot_id)??p.robot_id,kind:'invalid_currency',detail:p.currency});
  }
  const duplicateNames=new Map<string,string[]>();
  for(const r of catalogue) {const k=r.maker_slug+'/'+r.name.toLowerCase().replace(/[^a-z0-9]/g,'');duplicateNames.set(k,[...(duplicateNames.get(k)??[]),r.key]);}
  for(const keys of duplicateNames.values()) if(keys.length>1) for(const key of keys) issues.push({robot:key,kind:'possible_duplicate_name',detail:keys});
  writeFileSync(`${out}/catalogue.json`,JSON.stringify(catalogue,null,2));
  writeFileSync(`${out}/issues.json`,JSON.stringify(issues,null,2));
  const counts=Object.fromEntries([...new Set(issues.map(x=>x.kind))].map(k=>[k,issues.filter(x=>x.kind===k).length]));
  const summary={auditedAt:new Date().toISOString(),priceObservations:priceHistory.length,availabilityObservations:availabilityHistory.length,curatedEntries:curated.length,scrapeRuns:runs.length,baseRobots:catalogue.filter(r=>r.variant==='base').length,robots:robots.length,makers:new Set(robots.map((r:any)=>r.maker_slug)).size,facts:facts.length,assets:assets.length,prices:prices.length,models:catalogue.filter(r=>r.has3d).length,counts};
  writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
  if(process.argv.includes('--verbose')) console.log('LIMX',JSON.stringify(catalogue.filter(r=>/limx/i.test(r.key)).map(r=>({key:r.key,name:r.name,website:r.website,images:r.images,model:r.has3d,sources:r.sourceUrls})),null,2));
}
main().then(()=>done()).catch(e=>{console.error(e);return done(1)});
