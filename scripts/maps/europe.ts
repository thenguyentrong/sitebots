// Builds lib/maps/europe.json: country borders for the landing's project map, in two views (Europe and
// a closer Germany), projected with lib/maps/project.ts. Run once when the borders should change:
//   curl -L -o ne.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
//   node --import tsx scripts/maps/europe.ts ne.geojson
// Natural Earth is public domain. Each view clips the borders to its frame and drops points closer
// than about half a pixel at the size it is drawn, which keeps the inline SVG small.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { project } from '@/lib/maps/project';

type Point = [number, number];
type Feature = { properties: Record<string, string>; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] } | null };
type View = { name: string; lon: [number, number]; lat: [number, number]; tolerance: number };

// The Europe view frames the projects from Portugal to the Baltic; the Germany view the dense middle.
const VIEWS: View[] = [
  { name: 'europe', lon: [-10.5, 30], lat: [42, 64.5], tolerance: 0.9 },
  { name: 'germany', lon: [5, 16.2], lat: [46.8, 55.3], tolerance: 0.25 },
];

/** The frame of a lon/lat box in map units: the box's edges, sampled, since the projection bends them. */
function frame(view: View): [number, number, number, number] {
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const lon = view.lon[0] + (view.lon[1] - view.lon[0]) * i / 40, lat = view.lat[0] + (view.lat[1] - view.lat[0]) * i / 40;
    for (const [x, y] of [project(view.lat[0], lon), project(view.lat[1], lon), project(lat, view.lon[0]), project(lat, view.lon[1])]) { xs.push(x); ys.push(y); }
  }
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Sutherland–Hodgman: a ring clipped to a rectangle, so a country far outside the frame costs nothing. */
function clip(ring: Point[], [x, y, w, h]: [number, number, number, number]): Point[] {
  const edges: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= x, (a, b) => [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x + w, (a, b) => [x + w, a[1] + (b[1] - a[1]) * (x + w - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= y, (a, b) => [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y]],
    [(p) => p[1] <= y + h, (a, b) => [a[0] + (b[0] - a[0]) * (y + h - a[1]) / (b[1] - a[1]), y + h]],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i], previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) { if (!inside(previous)) out.push(cross(previous, current)); out.push(current); }
      else if (inside(previous)) out.push(cross(previous, current));
    }
    if (!out.length) break;
  }
  return out;
}

/** Douglas–Peucker on a closed ring. A ring that starts and ends on the same point gives the method no
 *  baseline, so it is split at the point farthest from its start. */
function simplify(ring: Point[], tolerance: number): Point[] {
  if (ring.length < 4) return ring;
  const keep = new Uint8Array(ring.length);
  let far = 1, farthest = -1;
  for (let i = 1; i < ring.length; i++) {
    const distance = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (distance > farthest) { farthest = distance; far = i; }
  }
  keep[0] = keep[far] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [[0, far], [far, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1, index = -1;
    const [ax, ay] = ring[a], [bx, by] = ring[b];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i++) {
      const distance = Math.abs((bx - ax) * (ay - ring[i][1]) - (ax - ring[i][0]) * (by - ay)) / length;
      if (distance > worst) { worst = distance; index = i; }
    }
    if (worst > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return ring.filter((_, i) => keep[i]);
}

const round = (value: number) => Math.round(value * 10) / 10;
function pathOf(rings: Point[][]): string {
  return rings.map((ring) => 'M' + ring.map(([x, y]) => round(x) + ' ' + round(y)).join('L') + 'Z').join('');
}

function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Pass the Natural Earth admin-0 GeoJSON file, see the comment at the top.');
  const features = (JSON.parse(readFileSync(file, 'utf8')).features as Feature[]).filter((feature) => feature.geometry);
  const views: Record<string, { viewBox: number[]; countries: { iso: string; name: string; d: string }[] }> = {};
  for (const view of VIEWS) {
    const box = frame(view);
    // Clip a little outside the frame so borders do not end exactly at its edge.
    const pad = box[2] * 0.03;
    const outer: [number, number, number, number] = [box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad];
    const countries = features.flatMap((feature) => {
      const polygons = (feature.geometry!.type === 'Polygon' ? [feature.geometry!.coordinates] : feature.geometry!.coordinates) as number[][][][];
      const rings = polygons.flatMap((polygon) => polygon.map((ring) => simplify(clip(ring.map(([lon, lat]) => project(lat, lon)), outer), view.tolerance)))
        .filter((ring) => ring.length >= 3);
      const iso = feature.properties.ISO_A2_EH !== '-99' ? feature.properties.ISO_A2_EH : feature.properties.ADM0_A3;
      return rings.length ? [{ iso, name: feature.properties.NAME, d: pathOf(rings) }] : [];
    });
    views[view.name] = { viewBox: box.map(round), countries };
  }
  const out = join(process.cwd(), 'lib', 'maps', 'europe.json');
  writeFileSync(out, JSON.stringify({ source: 'Natural Earth 1:50m admin-0 countries (public domain), see scripts/maps/europe.ts', views }) + '\n');
  for (const [name, view] of Object.entries(views)) console.log(name, view.countries.length, 'countries,', view.countries.reduce((sum, country) => sum + country.d.length, 0), 'characters');
}
main();
