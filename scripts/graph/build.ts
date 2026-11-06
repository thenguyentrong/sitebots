import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildGraph, countGraph, graphHash, isNamedPlace } from '@/lib/graph/build';
import { encodeGraph } from '@/lib/graph/file';
import { loadGraphInput } from '@/lib/graph/source';
import { EDGE_KINDS } from '@/lib/graph/types';
import { loadMarket } from '@/lib/market/load';

/**
 * npm run graph: the one step that refreshes the knowledge graph after any data change.
 * Writes data/graph/graph.json. No timestamp goes in: the file must only change when the data does,
 * and lib/graph/data.test.ts compares it with the data.
 */

// Outside production a broken record is skipped with a warning. Here that would quietly drop a robot
// from the graph and from the chat, so fail instead.
loadMarket({ strict: true });

const input = loadGraphInput();
const graph = buildGraph(input);
const counts = countGraph(graph);
const stored = encodeGraph({ version: 1, hash: graphHash(graph), counts, ...graph });

// One row per line keeps a data change a readable diff without adding more than a newline per row.
const rows = (items: unknown[]) => '[\n' + items.map((item) => JSON.stringify(item)).join(',\n') + '\n]';
const edgeBlocks = EDGE_KINDS.map((kind) => JSON.stringify(kind) + ':' + rows(stored.edges[kind])).join(',\n');
const text = '{"version":1,"hash":' + JSON.stringify(stored.hash) + ',"counts":' + JSON.stringify(counts)
  + ',\n"nodes":' + rows(stored.nodes) + ',\n"edges":{\n' + edgeBlocks + '}}\n';

const out = join(process.cwd(), 'data', 'graph', 'graph.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);

const kb = (bytes: number) => (bytes / 1024).toFixed(0) + ' KB';
console.log('nodes', counts.nodes, 'total', graph.nodes.length);
console.log('edges', counts.edges, 'total', graph.edges.length);
console.log(`${out}: ${kb(Buffer.byteLength(text))}, gzip ${kb(gzipSync(text).length)}`);

// Places the rule in lib/graph/build.ts left out, so a new kind of wording gets noticed.
const skipped = input.robots.flatMap((robot) => robot.evidence).filter((entry) => entry.where && (entry.stage === 'pilot' || entry.stage === 'deployment') && !isNamedPlace(entry.where)).map((entry) => entry.where);
console.log('real work with no named place, so no project node:', [...new Set(skipped)].sort().join(' | '));
