// URDF → GLB for one robot or all of them.
//
//   node --max-old-space-size=8192 --import tsx scripts/models/convert.ts --robot unitree/g1 [--dry-run] [--local] [--upload]
//   node --max-old-space-size=8192 --import tsx scripts/models/convert.ts --all --local
//
// --dry-run  fetch, parse, build; print the per-link table; write nothing
// --local    copy the GLB to public/models-dev/ and record it in data/models/index.local.json (dev)
// --upload   put the GLB on Vercel Blob and record it in data/models/index.json (committed)

import './dom-polyfill';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { indexKey } from '@/lib/models/index';
import { IndexFile, SourcesFile, type Credits, type ModelEntry, type ModelSource } from '@/lib/models/schemas';
import { args, str } from '../scrape/_lib/args';
import { buildGlb } from './build-glb';
import { fetchDescription, fetchMeshes, licenseText, modelSlug, outDir, srcDir } from './fetch';
import { parseUrdf, visualMeshPaths } from './parse-urdf';
import { expandXacro } from './expand-xacro';
import { parseMjcf } from './parse-mjcf';

const ROOT = process.cwd();

export function loadSources(): ModelSource[] {
  return SourcesFile.parse(JSON.parse(readFileSync(join(ROOT, 'data', 'models', 'sources.json'), 'utf8'))).robots;
}

function readIndex(file: string): IndexFile {
  if (!existsSync(file)) return { generatedAt: new Date().toISOString(), robots: {} };
  return IndexFile.parse(JSON.parse(readFileSync(file, 'utf8')));
}

export async function convertOne(src: ModelSource, opts: { log: (m: string) => void; skipFetch?: boolean }): Promise<{ glb: Uint8Array; entry: Omit<ModelEntry, 'glbUrl'>; outFiles: { glb: string; joints: string; credits: string } }> {
  const log = opts.log;
  log(`\n== ${src.robotKey} (${src.repo}@${src.sha.slice(0, 7)}, ${src.path}/${src.urdf})`);
  const { dir, tree } = await fetchDescription(src, log);
  const urdfPath = join(dir, src.path, src.urdf);
  let xml = readFileSync(urdfPath, 'utf8');
  if (src.format === 'xacro') {
    xml = await expandXacro(urdfPath, { srcRoot: dir, packages: src.packages, args: src.xacroArgs });
    log(`xacro expanded: ${(xml.length / 1024).toFixed(0)} KB`);
  }
  const ctx = { urdfDir: src.meshBase ? join(dir, ...src.meshBase.split('/')) : dirname(urdfPath), srcRoot: dir, packages: src.packages };
  const model = src.format === 'mjcf' ? parseMjcf(xml, ctx) : parseUrdf(xml, ctx);
  log(`${src.format === 'mjcf' ? 'MJCF' : 'URDF'}: ${model.links.size} links, ${model.joints.length} joints, root ${model.rootLink}`);

  const meshes = visualMeshPaths(model).map((abs) => relative(dir, abs).replace(/\\/g, '/'));
  await fetchMeshes(src, tree, meshes, log);

  const built = await buildGlb(model, src, log);
  const hash = createHash('sha256').update(built.glb).digest('hex').slice(0, 16);
  const lic = licenseText(src);
  const credits: Credits = {
    robotKey: src.robotKey,
    source: { sourceId: src.sourceId, repo: src.repo, url: `https://github.com/${src.repo}/tree/${src.sha}/${src.path}`, sha: src.sha, path: src.path, urdf: src.urdf },
    license: { spdx: src.license, file: `/licenses/${src.sourceId}.txt`, copyright: lic.copyright },
    modifications: [
      `Converted from ${src.format === 'xacro' ? 'xacro/URDF' : src.format === 'mjcf' ? 'MJCF (MuJoCo)' : 'URDF'} and ${meshes.some((m) => /\.dae$/i.test(m)) ? 'Collada' : meshes.some((m) => /\.obj$/i.test(m)) ? 'OBJ' : 'STL'} meshes to glTF 2.0`,
      `Decimated ${built.stats.trianglesBefore.toLocaleString('en-GB')} → ${built.stats.trianglesAfter.toLocaleString('en-GB')} triangles`,
      'Collision geometry and sensor housings removed',
      'meshopt-compressed',
    ],
    stats: { triangles: { before: built.stats.trianglesBefore, after: built.stats.trianglesAfter }, bytes: built.stats.bytes, links: built.stats.links, joints: built.stats.joints },
    generatedAt: new Date().toISOString(),
  };

  const out = outDir(src);
  mkdirSync(out, { recursive: true });
  const base = modelSlug(src);
  const outFiles = { glb: join(out, `${base}.glb`), joints: join(out, `${base}.joints.json`), credits: join(out, `${base}.credits.json`) };
  writeFileSync(outFiles.glb, built.glb);
  writeFileSync(outFiles.joints, JSON.stringify(built.joints, null, 1));
  writeFileSync(outFiles.credits, JSON.stringify(credits, null, 1));
  writeFileSync(join(out, `${base}.stats.json`), JSON.stringify(built.stats, null, 1));

  // Licence text, committed and served verbatim.
  if (lic.text) {
    const licDir = join(ROOT, 'data', 'models', 'licenses');
    mkdirSync(licDir, { recursive: true });
    writeFileSync(join(licDir, `${src.sourceId}.txt`), lic.text);
  }

  const table = built.stats.perLink.sort((a, b) => b.after - a.after).slice(0, 12).map((l) => `${l.link.padEnd(32)} ${String(l.before).padStart(8)} → ${String(l.after).padStart(6)}`);
  log(table.join('\n'));

  return {
    glb: built.glb,
    entry: { hash, bytes: built.stats.bytes, triangles: built.stats.trianglesAfter, heightM: src.heightM, variants: src.variants, joints: built.joints, credits },
    outFiles,
  };
}

async function main() {
  const a = args();
  const sources = loadSources();
  const asked = str(a.robot);
  const selected = a.all === true ? sources : sources.filter((s) => s.robotKey === asked || `${s.robotKey}#${s.variants[0]}` === asked);
  if (!selected.length) throw new Error(`no robot matches --robot ${str(a.robot) ?? '(none)'}; known: ${sources.map((s) => s.robotKey).join(', ')}`);
  const log = (m: string) => console.log(m);

  for (const src of selected) {
    const r = await convertOne(src, { log });
    if (a['dry-run'] === true) continue;

    if (a.local === true) {
      const pub = join(ROOT, 'public', 'models-dev');
      mkdirSync(pub, { recursive: true });
      const prefix = `${modelSlug(src)}.`;
      const file = `${prefix}${r.entry.hash}.glb`;
      for (const old of readdirSync(pub)) if (old.startsWith(prefix) && old !== file) rmSync(join(pub, old));
      copyFileSync(r.outFiles.glb, join(pub, file));
      const indexFile = join(ROOT, 'data', 'models', 'index.local.json');
      const index = readIndex(indexFile);
      index.robots[indexKey(src.robotKey, src.variants)] = { glbUrl: `/models-dev/${file}`, ...r.entry };
      index.generatedAt = new Date().toISOString();
      writeFileSync(indexFile, JSON.stringify(index, null, 1));
      log(`local: /models-dev/${file} → data/models/index.local.json`);
    }

    if (a.upload === true) {
      const { uploadModel } = await import('./upload');
      const url = await uploadModel(src, r.glb, r.entry.hash);
      const indexFile = join(ROOT, 'data', 'models', 'index.json');
      const index = readIndex(indexFile);
      index.robots[indexKey(src.robotKey, src.variants)] = { glbUrl: url, ...r.entry };
      index.generatedAt = new Date().toISOString();
      writeFileSync(indexFile, JSON.stringify(index, null, 1));
      log(`uploaded: ${url} → data/models/index.json`);
    }
  }
  // Serve the licence files with the site.
  const licDir = join(ROOT, 'data', 'models', 'licenses');
  if (existsSync(licDir)) {
    const pubLic = join(ROOT, 'public', 'licenses');
    mkdirSync(pubLic, { recursive: true });
    for (const f of require('node:fs').readdirSync(licDir) as string[]) copyFileSync(join(licDir, f), join(pubLic, f));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
