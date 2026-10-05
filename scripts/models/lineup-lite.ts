import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { NodeIO, type Document } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, dequantize, meshopt, prune, quantize, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LINEUP } from '@/lib/models/lineup';
import { computeNormals } from './load-mesh';

/**
 * Light copies of the landing's lineup models.
 *
 * The robot pages show one model close up, so their GLBs carry 80k–160k
 * triangles each. The landing stands five of them in a row a few hundred
 * pixels tall, and loading the full set there meant 7.5 MB and about two
 * seconds of blocked main thread on every desktop visit. These copies keep
 * the node tree (the rig poses links by name) and cut the triangles with the
 * same meshoptimizer `Prune` pass the model build uses: CAD meshes are many
 * small disconnected shells, which a topology-preserving pass cannot remove.
 *
 * Usage: node --import tsx scripts/models/lineup-lite.ts [ratio]
 * Writes public/models/lite/*.glb and lib/models/lineup-lite.json.
 */

const RATIO = Number(process.argv[2] ?? 0.15);
/** Relative error, as in the model build: about 1 % of a primitive's size, invisible at hero scale. */
const ERROR = 0.01;
/** Small parts (fingers, cable shells) keep at least this many triangles so they do not vanish. */
const MIN_TRIS = 60;
/** Models below this are left as built. */
const LIGHT_ENOUGH = 20000;

const root = process.cwd();
const outDir = join(root, 'public/models/lite');
const manifestFile = join(root, 'lib/models/lineup-lite.json');
const index = JSON.parse(readFileSync(join(root, 'data/models/index.json'), 'utf8')) as { robots: Record<string, { glbUrl: string; triangles: number; bytes: number }> };

function triangles(doc: Document): number {
  let n = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const indices = prim.getIndices();
    n += indices ? indices.getCount() / 3 : (prim.getAttribute('POSITION')?.getCount() ?? 0) / 3;
  }
  return Math.round(n);
}

/**
 * Decimate every triangle primitive in place, the way the model build does: weld on position only
 * (vertices split for normals are seams the simplifier will not cross), simplify with `Prune`, then
 * compute creased normals again.
 */
function decimate(doc: Document, ratio: number): void {
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const indices = prim.getIndices();
    const position = prim.getAttribute('POSITION');
    if (!indices || !position || prim.getMode() !== 4) continue;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(Array.from(position.getArray()!), 3));
    geometry.setIndex(Array.from(indices.getArray()!));
    const welded = mergeVertices(new BufferGeometry().setAttribute('position', geometry.toNonIndexed().getAttribute('position')), 1e-5);
    const weldedPositions = new Float32Array(welded.getAttribute('position').array as ArrayLike<number>);
    const weldedIndices = new Uint32Array(welded.index!.array as ArrayLike<number>);
    const count = weldedIndices.length;
    const target = Math.max(MIN_TRIS * 3, Math.floor((count / 3) * ratio) * 3);
    let kept: Uint32Array = weldedIndices;
    if (target < count) [kept] = MeshoptSimplifier.simplify(weldedIndices, weldedPositions, 3, target, ERROR, ['Prune']);
    // `Prune` can drop a whole small part (a finger segment is all small shells); keep such parts
    // whole rather than lose a node the full model shows.
    if (kept.length < Math.min(count, MIN_TRIS * 3)) kept = weldedIndices;
    // Compact the vertices the simplified triangles still use.
    const remap = new Map<number, number>();
    const compactIndices = new Uint32Array(kept.length);
    for (let i = 0; i < kept.length; i++) {
      let n = remap.get(kept[i]);
      if (n === undefined) remap.set(kept[i], (n = remap.size));
      compactIndices[i] = n;
    }
    const compactPositions = new Float32Array(remap.size * 3);
    for (const [from, to] of remap) compactPositions.set(weldedPositions.subarray(from * 3, from * 3 + 3), to * 3);
    const shaded = computeNormals({ positions: compactPositions, normals: new Float32Array(0), indices: compactIndices, color: [1, 1, 1, 1], name: '' });
    for (const semantic of prim.listSemantics()) if (semantic !== 'POSITION') prim.setAttribute(semantic, null);
    position.setArray(shaded.positions);
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(shaded.normals).setBuffer(position.getBuffer()));
    indices.setArray(shaded.indices);
  }
}

async function main(): Promise<void> {
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

mkdirSync(outDir, { recursive: true });
const manifest: Record<string, { glbUrl: string; bytes: number; triangles: number; from: string }> = {};
for (const row of LINEUP) {
  const entry = index.robots[row.key];
  if (!entry) throw new Error('No model for ' + row.key);
  const doc = await io.read(join(root, 'public', entry.glbUrl));
  const before = triangles(doc);
  // Already light (Spot): the full model costs less than a decimated copy would save.
  if (before < LIGHT_ENOUGH) {
    manifest[row.key] = { glbUrl: entry.glbUrl, bytes: entry.bytes, triangles: before, from: entry.glbUrl };
    console.log(`${row.key.padEnd(24)} ${before} triangles, kept as is`);
    continue;
  }
  await doc.transform(dequantize(), weld());
  decimate(doc, RATIO);
  await doc.transform(dedup(), prune(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const glb = await io.writeBinary(doc);
  const hash = createHash('sha1').update(glb).digest('hex').slice(0, 16);
  const file = basename(entry.glbUrl).replace(/\.[0-9a-f]{16}\.glb$/, '') + '.' + hash + '.glb';
  // One copy per robot: drop earlier builds of the same model.
  const stem = file.replace(/\.[0-9a-f]{16}\.glb$/, '.');
  for (const old of readdirSync(outDir)) if (old.startsWith(stem) && old !== file) rmSync(join(outDir, old));
  writeFileSync(join(outDir, file), glb);
  const after = triangles(doc);
  manifest[row.key] = { glbUrl: '/models/lite/' + file, bytes: glb.byteLength, triangles: after, from: entry.glbUrl };
  console.log(`${row.key.padEnd(24)} ${before} → ${after} triangles, ${(entry.bytes / 1048576).toFixed(2)} → ${(glb.byteLength / 1048576).toFixed(2)} MB`);
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 1) + '\n');
console.log('wrote ' + manifestFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
