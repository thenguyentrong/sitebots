// Client-safe. One map projection for the borders (built by scripts/maps/europe.ts) and the pins
// (placed at render time), so a pin always lands where its town is on the drawn map.

/** Lambert azimuthal equal-area around the middle of Europe (the projection behind EPSG:3035): areas
 *  keep their size, so Germany is not stretched against the north. */
const LAT0 = 52, LON0 = 10;
/** Map units per Earth radius; the drawings are a few hundred units across. */
export const MAP_SCALE = 1000;
const rad = Math.PI / 180;

export function project(lat: number, lon: number): [number, number] {
  const phi = lat * rad, lambda = (lon - LON0) * rad, phi0 = LAT0 * rad;
  const k = Math.sqrt(2 / (1 + Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda)));
  const x = k * Math.cos(phi) * Math.sin(lambda);
  const y = k * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda));
  // SVG counts y downwards.
  return [x * MAP_SCALE, -y * MAP_SCALE];
}
