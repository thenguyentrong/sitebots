import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { LINEUP } from './lineup';
import { IndexFile } from './schemas';
import LITE from './lineup-lite.json';

const index = IndexFile.parse(JSON.parse(readFileSync('data/models/index.json', 'utf8')));
const lite = LITE as Record<string, { glbUrl: string; from: string }>;

/** glTF node names. Not three's object names: those also carry mesh names, and identical meshes
 *  (two finger segments) may share one mesh in the copy without anything going missing. */
async function nodeNames(url: string): Promise<Set<string>> {
  const bytes = readFileSync(`public${url}`);
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const nodes = (gltf.parser.json as { nodes?: { name?: string }[] }).nodes ?? [];
  return new Set(nodes.map((node) => node.name).filter((name): name is string => Boolean(name)));
}

// The landing loads these copies instead of the full models. A model rebuild changes the full
// file's hash; then the copies are stale and must be made again with
// `node --import tsx scripts/models/lineup-lite.ts`.
describe('light lineup models', () => {
  for (const row of LINEUP) {
    it(`${row.key} has a current light copy with every node of the full model`, async () => {
      const entry = index.robots[row.key];
      expect(lite[row.key], 'missing from lib/models/lineup-lite.json').toBeDefined();
      expect(lite[row.key].from, 'built from an older model: rerun scripts/models/lineup-lite.ts').toBe(entry.glbUrl);
      expect(existsSync(`public${lite[row.key].glbUrl}`)).toBe(true);
      // The rig poses links by node name, and a lost mesh node is a missing part.
      const full = await nodeNames(entry.glbUrl);
      const copy = await nodeNames(lite[row.key].glbUrl);
      expect([...full].filter((name) => !copy.has(name))).toEqual([]);
    });
  }
});
