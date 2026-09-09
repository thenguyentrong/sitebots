// parts-from-model.ts — actuator peak torques from the maker's own description.
//
//   node --import tsx scripts/models/parts-from-model.ts            report
//   node --import tsx scripts/models/parts-from-model.ts --commit   write tier-0 facts (stop `next dev` first)
//
// URDF <limit effort> and MJCF actuatorfrcrange are the peak joint torque
// the maker put in the file that drives their own simulator. Grouped by
// limb (leg / arm / hand / waist / neck / wheel) with a count and the highest
// torque in the group, they become one `actuators` fact per robot whose
// evidence is the file itself, at the pinned commit.

import './dom-polyfill';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ActuatorItem } from '@/lib/spec/parts';
import { COMMIT, db, done, preflight } from '../_guard';
import { upsertFacts } from '@/lib/ingest/facts';
import { buildCurrent } from '@/lib/ingest/current';
import type { NormalizedFact } from '@/lib/spec/types';
import { SourcesFile } from '@/lib/models/schemas';
import { expandXacro } from './expand-xacro';
import { srcDir } from './fetch';
import { parseMjcf } from './parse-mjcf';
import { parseUrdf, type UrdfJoint } from './parse-urdf';

// Not imported from convert.ts: that module runs its own main() on import.
function loadSources() {
  return SourcesFile.parse(JSON.parse(readFileSync(join(process.cwd(), 'data', 'models', 'sources.json'), 'utf8'))).robots;
}

function groupOf(name: string): ActuatorItem['group'] {
  const n = name.toLowerCase();
  if (/wheel/.test(n)) return 'wheel';
  if (/hand|finger|thumb|index|middle|ring|pinky|gripper|palm/.test(n)) return 'hand';
  if (/hip|knee|ankle|thigh|calf|leg|foot|toe|(^|_)[fhr][lr]_(hx|hy|kn)/.test(n)) return 'leg';
  if (/shoulder|elbow|wrist|arm|sho_|_el|forearm/.test(n)) return 'arm';
  if (/waist|torso|spine|pelvis/.test(n)) return 'waist';
  if (/neck|head/.test(n)) return 'neck';
  return 'other';
}

function actuatorsOf(joints: UrdfJoint[]): ActuatorItem[] {
  const by = new Map<ActuatorItem['group'], { count: number; peak: number }>();
  for (const j of joints) {
    if (j.type !== 'revolute' && j.type !== 'continuous') continue;
    if (!j.limit?.effort || j.limit.effort <= 0) continue;
    // 1000 N·m and up is a simulator placeholder (Spot's simple xacro, lift columns), not a spec.
    if (j.limit.effort >= 1000) continue;
    const g = groupOf(j.name);
    const cur = by.get(g) ?? { count: 0, peak: 0 };
    cur.count++;
    cur.peak = Math.max(cur.peak, j.limit.effort);
    by.set(g, cur);
  }
  // A limb group whose peak is 1 N·m or less is an exporter default (BRUCE's Gazebo file), not a spec; fingers really are that small.
  for (const [g, v] of by) if (g !== 'hand' && v.peak <= 1) by.delete(g);
  const order: ActuatorItem['group'][] = ['leg', 'arm', 'hand', 'waist', 'neck', 'wheel', 'other'];
  return order.filter((g) => by.has(g)).map((g) => ({ group: g, count: by.get(g)!.count, peak_torque_nm: Math.round(by.get(g)!.peak * 10) / 10 }));
}

async function main() {
  const sources = loadSources();
  const facts: { robotKey: string; variants: string[]; items: ActuatorItem[]; url: string; observed: string }[] = [];
  for (const src of sources) {
    const file = join(srcDir(src), src.path, src.urdf);
    if (!existsSync(file)) {
      console.log(`  –  ${src.robotKey}: description not fetched yet (run convert.ts first)`);
      continue;
    }
    let xml = readFileSync(file, 'utf8');
    if (src.format === 'xacro') xml = await expandXacro(file, { srcRoot: srcDir(src), packages: src.packages, args: src.xacroArgs });
    const ctx = { urdfDir: dirname(file), srcRoot: srcDir(src), packages: src.packages };
    const model = src.format === 'mjcf' ? parseMjcf(xml, ctx) : parseUrdf(xml, ctx);
    const items = actuatorsOf(model.joints);
    if (!items.length) {
      console.log(`  –  ${src.robotKey}: no effort limits in the file`);
      continue;
    }
    const url = `https://github.com/${src.repo}/blob/${src.sha}/${src.path}/${src.urdf}`;
    facts.push({ robotKey: src.robotKey, variants: src.variants, items, url, observed: new Date().toISOString() });
    console.log(`  ✓  ${src.robotKey.padEnd(26)} ${items.map((i) => `${i.group} ${i.count}× ≤${i.peak_torque_nm} N·m`).join(' · ')}`);
  }
  if (!COMMIT) {
    console.log(`\n${facts.length} robots with actuator data (report only — re-run with --commit to write)`);
    return;
  }
  const sql = await db();
  await preflight(sql, 'actuators from description files');
  let wrote = 0;
  const touched: string[] = [];
  for (const f of facts) {
    const [maker, model] = f.robotKey.split('/');
    const rows = (await sql`select r.id from robots r join manufacturers m on m.id = r.manufacturer_id
      where m.slug = ${maker} and r.model_slug = ${model} and r.variant = any(${f.variants})`) as { id: string }[];
    for (const r of rows) {
      const fact: NormalizedFact = {
        field: 'actuators', qualifier: null, unit: null, raw_value: JSON.stringify(f.items), raw_unit: null,
        value_json: f.items, evidence_url: f.url, confidence: 0.9, note: 'Peak joint torque per limb group, from the maker\'s published robot description (effort limits).',
        source_id: 'curated', source_url: f.url, source_tier: 0, observed_at: f.observed, run_id: null, snapshot_id: null,
      };
      wrote += await upsertFacts(sql, r.id, [fact]);
      touched.push(r.id);
    }
  }
  if (touched.length) await buildCurrent(sql, touched);
  console.log(`\n${wrote} actuator fact(s) written for ${touched.length} robot rows`);
  await done();
}

main().catch(async (e) => {
  console.error(e);
  if (COMMIT) await done(1);
  process.exit(1);
});
