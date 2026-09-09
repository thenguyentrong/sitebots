// render-models.ts — turn the 3D models into still images for the cards.
//
//   node --import tsx scripts/assets/render-models.ts              screenshot every model
//   node --import tsx scripts/assets/render-models.ts --attach --commit   record them (dev server stopped)
//
// This is the only "generated" imagery on the site, and it is generated from
// the manufacturer's own published geometry, not invented: the same GLB the
// viewer shows, posed standing, on a plain ground, with the scale figure and
// the ruler switched off. The credit names the repository, the commit and the
// licence, exactly as the viewer's credits panel does.
//
// A photograph always outranks a render (is_primary), so a robot that has both
// shows the photograph on its card and keeps the render as a fallback.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { getRobotModel, listModelKeys } from '@/lib/models/index';
import { COMMIT, db, done, preflight } from '../_guard';
import { args, str } from '../scrape/_lib/args';

const OUT = join('public', 'renders');
const MANIFEST = '.out/renders.json';
const SIZE = { width: 900, height: 700 };

type Shot = { key: string; url: string; repo: string; sha: string; spdx: string; sourceUrl: string };
type Row = { id: string; name: string; maker: string };

/**
 * Phase one: screenshot each viewer. Touches no database, because it needs the
 * dev server running and PGlite only allows one process at a time.
 */
async function shoot(only?: string) {
  mkdirSync(OUT, { recursive: true });
  const keys = listModelKeys().filter((k) => !only || k === only);
  console.log(`${keys.length} model(s) to render\n`);
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const shots: Shot[] = [];

  for (const key of keys) {
    const entry = getRobotModel(key);
    if (!entry) continue;
    const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2 });
    // The scale figure and the ruler belong to the interactive viewer, not to a
    // thumbnail; the toggle is read from localStorage before the first frame.
    await page.addInitScript(() => localStorage.setItem('sitebots.scale', '0'));
    await page.goto(`http://localhost:3000/robots/${key}?render=1`, { waitUntil: 'load', timeout: 120_000 });
    const ready = await page
      .locator('[data-robot-viewer][data-ready="true"]')
      .first()
      .waitFor({ timeout: 120_000 })
      .then(() => true)
      .catch(() => false);
    if (!ready) {
      console.log(`  !  ${key}: viewer never became ready`);
      await page.close();
      continue;
    }
    // The dev-server badge floats over the page and would land in the crop.
    await page.addStyleTag({
      content:
        'nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}' +
        'html,body,main,[data-robot-viewer]{background:transparent!important}',
    });
    // <Bounds> refits when the scale figure disappears; give it a resize and
    // time to settle, or the shot is framed for a robot plus a 1.80 m person.
    await page.setViewportSize({ width: SIZE.width, height: SIZE.height - 1 });
    await page.setViewportSize(SIZE);
    await page.waitForTimeout(4000);
    const file = join(OUT, `${key.replace('/', '__')}.png`);
    await page.locator('[data-robot-viewer] canvas').first().screenshot({ path: file, omitBackground: true });
    await page.close();
    const c = entry.credits;
    shots.push({ key, url: `/renders/${key.replace('/', '__')}.png`, repo: c.source.repo, sha: c.source.sha, spdx: c.license.spdx, sourceUrl: c.source.url });
    console.log(`  ✓  ${key.padEnd(26)} ${file}`);
  }

  await browser.close();
  writeFileSync(MANIFEST, JSON.stringify(shots, null, 2));
  console.log(`\n${shots.length} render(s) in ${OUT}. Stop the dev server, then re-run with --attach --commit.`);
}

/** Phase two: record the renders as assets. Needs the dev server stopped. */
async function attach() {
  const shots = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Shot[];
  const sql = await db();
  await preflight(sql, 'model renders');
  let wrote = 0;
  for (const s of shots) {
    const [maker_slug, model_slug] = s.key.split('/');
    const rows = (await sql`
      select r.id, r.name, m.name as maker from robots r
      join manufacturers m on m.id = r.manufacturer_id
      where m.slug = ${maker_slug} and r.model_slug = ${model_slug} and r.variant = 'base'`) as unknown as Row[];
    if (!rows.length) {
      console.log(`  !  ${s.key}: no base variant in the database`);
      continue;
    }
    const robot = rows[0];
    const attribution = `Rendered by sitebots from ${s.repo}@${s.sha.slice(0, 7)} · ${s.spdx}`;
    await sql`delete from robot_assets where robot_id = ${robot.id} and kind = 'image' and url like '/renders/%'`;
    await sql`
      insert into robot_assets (robot_id, kind, url, source_url, licence, attribution, width, height, alt, is_primary, sort)
      values (${robot.id}, 'image', ${s.url}, ${s.sourceUrl}, ${s.spdx}, ${attribution},
              ${SIZE.width}, ${SIZE.height}, ${`${robot.name} 3D model, rendered`}, false, 2)`;
    wrote++;
    console.log(`  ✓  ${s.key.padEnd(26)} ${s.url}`);
  }
  console.log(`\n${wrote} render(s) recorded`);
  if (!COMMIT) console.log('(dry run — nothing was written to the database)');
  await done();
}

async function main() {
  const a = args();
  if (a.attach === true) await attach();
  else await shoot(str(a.only));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
