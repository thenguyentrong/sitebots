// Writes public/maps/world.svg: every country of data/manufacturers/countries.json (Natural Earth, public domain)
// as one static, cached picture in the 900 x 450 projection of the site's maps, in the site's dark colours (the layout fixes data-theme="dark").
//   node scripts/assets/world-map.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const { countries } = JSON.parse(readFileSync('data/manufacturers/countries.json', 'utf8'));
const paths = countries.map((c) => `<path d="${c.path}"/>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 450"><style>g{fill:#18181b;stroke:#27272a;stroke-width:.5}</style><g>${paths}</g></svg>`;
writeFileSync('public/maps/world.svg', svg);
console.log('public/maps/world.svg', Math.round(svg.length / 1024) + ' KB');
