// Correct confirmed catalogue identities after a source refresh. Rehearse on a PGlite copy.
import { COMMIT, db, done, preflight } from './_guard';
import { upsertFacts, insertPrices, insertAvailability } from '../lib/ingest/facts';
import { ensureManufacturer } from '../lib/ingest/entities';
import { buildCurrent } from '../lib/ingest/current';
import type { NormalizedFact, NormalizedPrice, NormalizedAvailability } from '../lib/spec/types';
async function main() {
  if(process.env.USE_LOCAL_DB!=='1') throw new Error('Run this reviewed migration against a local PGlite snapshot.');
  const sql=await db();await preflight(sql,'Catalogue identity repairs');
  if(!COMMIT){console.log('Would merge zerith/02 and zerith/w1 into CASBOT, preserving facts and observations; correct maker websites.');return;}
  await sql.query('BEGIN');
  try {
    const casbot=await ensureManufacturer(sql,'casbot');await ensureManufacturer(sql,'zerith');await ensureManufacturer(sql,'tars');
    for(const model of ['02','w1']) {
      const rows=await sql.query(`select r.id,r.name,m.slug as maker from robots r join manufacturers m on m.id=r.manufacturer_id where m.slug in ('zerith','casbot') and r.model_slug=$1 and r.variant='base'`,[model]) as {id:string;name:string;maker:string}[];
      const old=rows.find(r=>r.maker==='zerith'), target=rows.find(r=>r.maker==='casbot');
      if(!old)continue;
      if(!target || !old.name.startsWith('CASBOT') || !target.name.startsWith('CASBOT'))throw new Error(`Unexpected identities for ${model}`);
      const curated=await sql`select * from curated_entries where robot_id=${old.id}`;
      if(curated.length)throw new Error('Curated entries require explicit field review before merge.');
      const facts=await sql`select * from robot_facts where robot_id=${old.id}` as NormalizedFact[];
      const prices=await sql`select * from price_observations where robot_id=${old.id}` as NormalizedPrice[];
      const availability=await sql`select * from availability_observations where robot_id=${old.id}` as NormalizedAvailability[];
      await upsertFacts(sql,target.id,facts);await insertPrices(sql,target.id,prices);await insertAvailability(sql,target.id,availability);
      const missing=await sql`select old.id from robot_facts old left join robot_facts dest on dest.robot_id=${target.id} and dest.fact_hash=old.fact_hash where old.robot_id=${old.id} and dest.id is null`;
      if(missing.length)throw new Error('Fact preservation check failed');
      await sql`update robot_assets set robot_id=${target.id} where robot_id=${old.id}`;
      await sql`delete from robots where id=${old.id}`;
      await buildCurrent(sql,[target.id]);
      console.log(`Merged zerith/${model} into casbot/${model}: ${facts.length} facts, ${prices.length} prices, ${availability.length} availability observations preserved.`);
    }
    await sql`delete from manufacturer_aliases where manufacturer_id in (select id from manufacturers where slug='zerith') and alias like '%casbot%'`;
    await sql`delete from manufacturer_aliases where manufacturer_id in (select id from manufacturers where slug='tars') and alias='shanghai'`;
    await sql`update robots set form_factor='mobile_manipulator' where manufacturer_id in (select id from manufacturers where slug='zerith') and model_slug='h1'`;
    await sql`update robots set form_factor='mobile_manipulator' where manufacturer_id=${casbot} and model_slug='w1'`;
    await sql.query('COMMIT');
  }catch(e){await sql.query('ROLLBACK');throw e;}
}
main().then(()=>done()).catch(e=>{console.error(e);return done(1)});
