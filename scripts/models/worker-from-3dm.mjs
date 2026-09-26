// worker-from-3dm.mjs: the viewer's 1.80 m reference person, from a Rhino file.
//
//   npm i --no-save rhino3dm
//   node scripts/models/worker-from-3dm.mjs <ConstructionWorker.3dm> public/models/reference/construction-worker.glb
//
// The file stores millimetres although it is flagged as metres. Parts: 0 body (coverall,
// hard hat, boots), 1 safety glasses, 2 head. The hat is split off the body above 1.68 m
// and every colour is set here, because the file carries none.

import rhino3dm from 'rhino3dm';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Document, NodeIO } = require('@gltf-transform/core');
const { EXTMeshoptCompression, KHRMeshQuantization } = require('@gltf-transform/extensions');
const { dedup, meshopt, prune, weld } = require('@gltf-transform/functions');
const { MeshoptEncoder } = require('meshoptimizer');

const [input, output, turnArg = '0'] = process.argv.slice(2);
const TURN = Number(turnArg);
const rhino = await rhino3dm();
const file = rhino.File3dm.fromByteArray(new Uint8Array(fs.readFileSync(input)));
const objs = file.objects();

// Parts: 0 body (clothes, vest, hat, boots), 1 safety glasses (transparent in the file), 2 head.
// Colours are linear (glTF): coverall #5b6472, hard hat #e8e6e1, skin #c49d85. Above HAT_Y the body mesh is the hat.
const PARTS = [
  { index: 0, name: 'coverall', color: [0.105, 0.127, 0.168, 1], roughness: 0.9, metallic: 0, hat: { name: 'hard_hat', color: [0.807, 0.791, 0.753, 1], roughness: 0.35, metallic: 0 } },
  { index: 1, name: 'glasses', color: [0.02, 0.02, 0.025, 0.6], roughness: 0.1, metallic: 0.2, blend: true },
  { index: 2, name: 'head', color: [0.552, 0.337, 0.235, 1], roughness: 0.7, metallic: 0 },
];
const HAT_Y = 1.68;

const body = objs.get(0).geometry().getBoundingBox();
const head = objs.get(2).geometry().getBoundingBox();
const floor = body.min[2];
const headTop = head.max[2];
const scale = 1.8 / (headTop - floor);
const cx = (body.min[0] + body.max[0]) / 2;
const cy = (body.min[1] + body.max[1]) / 2;
const cos = Math.cos(TURN);
const sin = Math.sin(TURN);
console.log(`model ${(body.max[2] - floor).toFixed(0)} mm to the hat, ${(headTop - floor).toFixed(0)} mm to the head; scale ${scale.toFixed(6)} m/mm`);

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('worker');
const root = doc.createNode('construction_worker');
scene.addChild(root);
const mesh = doc.createMesh('construction_worker');

for (const part of PARTS) {
  const g = objs.get(part.index).geometry();
  const vs = g.vertices();
  const ns = g.normals();
  const fs2 = g.faces();
  const positions = new Float32Array(vs.count * 3);
  const normals = new Float32Array(vs.count * 3);
  for (let i = 0; i < vs.count; i++) {
    const [x, y, z] = vs.get(i);
    // Z-up to Y-up: (x, y, z) -> (x, z, -y), then turn about the vertical axis.
    const px = (x - cx) * scale;
    const py = (z - floor) * scale;
    const pz = -(y - cy) * scale;
    positions[i * 3] = px * cos + pz * sin;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = -px * sin + pz * cos;
    if (ns.count === vs.count) {
      const [nx, ny, nz] = ns.get(i);
      const ax = nx, ay = nz, az = -ny;
      normals[i * 3] = ax * cos + az * sin;
      normals[i * 3 + 1] = ay;
      normals[i * 3 + 2] = -ax * sin + az * cos;
    }
  }
  const tri = [];
  for (let i = 0; i < fs2.count; i++) {
    const [a, b, c, d] = fs2.get(i);
    tri.push(a, b, c);
    if (d !== c) tri.push(a, c, d);
  }
  const groups = [{ spec: part, tri: [] }];
  if (part.hat) groups.push({ spec: part.hat, tri: [] });
  for (let t = 0; t < tri.length; t += 3) {
    const cy2 = (positions[tri[t] * 3 + 1] + positions[tri[t + 1] * 3 + 1] + positions[tri[t + 2] * 3 + 1]) / 3;
    groups[part.hat && cy2 > HAT_Y ? 1 : 0].tri.push(tri[t], tri[t + 1], tri[t + 2]);
  }
  const pos = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);
  const nor = doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer);
  for (const { spec, tri: idx } of groups) {
    const material = doc.createMaterial(spec.name).setBaseColorFactor(spec.color).setRoughnessFactor(spec.roughness).setMetallicFactor(spec.metallic);
    if (spec.blend) material.setAlphaMode('BLEND');
    mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nor).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer)).setMaterial(material));
    console.log(`${spec.name}: ${idx.length / 3} triangles`);
  }
}
root.setMesh(mesh);
await MeshoptEncoder.ready;
await doc.transform(dedup(), weld(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const glb = await io.writeBinary(doc);
fs.writeFileSync(output, glb);
console.log(`wrote ${output}, ${(glb.byteLength / 1024).toFixed(0)} KB`);
