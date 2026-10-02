// YouTube helpers for the task workflows: find a video that shows a task, read its chapters and
// transcript, preview it as a storyboard to locate each step, and grab a frame at each step.
// Reads public pages only; no video is downloaded. One request at a time per call.
//
//   node --import tsx scripts/workflows/youtube.ts search "<query>" [count]
//   node --import tsx scripts/workflows/youtube.ts info <videoId>
//   node --import tsx scripts/workflows/youtube.ts storyboard <videoId> <outDir>
//   node --import tsx scripts/workflows/youtube.ts frames <videoId> <seconds,seconds,...> <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
  'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
  // Declines the EU consent page so the server sends the page data.
  cookie: 'SOCS=CAI; CONSENT=PENDING+987',
};

async function page(url: string): Promise<string> {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  return response.text();
}

/** The JSON object assigned to `name` in a page script. */
function embedded(html: string, name: string): unknown {
  const start = html.indexOf(name + ' = ');
  const at = start >= 0 ? start : html.indexOf(name + '=');
  if (at < 0) return null;
  const open = html.indexOf('{', at);
  let depth = 0;
  let inString = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(open, i + 1));
  }
  return null;
}

type Json = Record<string, unknown>;
const text = (node: unknown): string => {
  const value = node as { simpleText?: string; runs?: { text: string }[] } | undefined;
  return value?.simpleText ?? value?.runs?.map((run) => run.text).join('') ?? '';
};

function* walk(node: unknown, key: string): Generator<Json> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* walk(item, key);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === key && v && typeof v === 'object') yield v as Json;
    else yield* walk(v, key);
  }
}

async function search(query: string, count = 12) {
  const html = await page('https://www.youtube.com/results?hl=de&gl=DE&search_query=' + encodeURIComponent(query));
  const data = embedded(html, 'var ytInitialData') ?? embedded(html, 'ytInitialData');
  const out = [];
  for (const video of walk(data, 'videoRenderer')) {
    out.push({
      id: video.videoId,
      title: text(video.title),
      channel: text(video.ownerText),
      duration: text(video.lengthText),
      views: text(video.viewCountText),
      published: text(video.publishedTimeText),
    });
    if (out.length >= count) break;
  }
  console.log(JSON.stringify(out, null, 1));
}

async function watchData(id: string) {
  const html = await page('https://www.youtube.com/watch?hl=de&v=' + id);
  const player = embedded(html, 'var ytInitialPlayerResponse') as Json | null;
  if (!player) throw new Error('No player data for ' + id);
  return { html, player };
}

/** Chapters from the description: lines that start with a time stamp. */
function chapters(description: string) {
  const out: { at: number; title: string }[] = [];
  for (const line of description.split('\n')) {
    const match = /^[^0-9]{0,3}((?:[0-9]{1,2}:)?[0-9]{1,2}:[0-9]{2})[ )\]:.-]*(.+)$/.exec(line.trim());
    if (!match) continue;
    const parts = match[1].split(':').map(Number);
    out.push({ at: parts.reduce((sum, part) => sum * 60 + part, 0), title: match[2].trim() });
  }
  return out.length >= 2 ? out : [];
}

async function transcript(player: Json) {
  const tracks = (((player.captions as Json | undefined)?.playerCaptionsTracklistRenderer as Json | undefined)?.captionTracks ?? []) as { baseUrl: string; languageCode: string; kind?: string }[];
  const pick = tracks.find((t) => t.languageCode === 'de' && t.kind !== 'asr') ?? tracks.find((t) => t.languageCode === 'de') ?? tracks.find((t) => t.languageCode === 'en' && t.kind !== 'asr') ?? tracks.find((t) => t.languageCode === 'en') ?? tracks[0];
  if (!pick) return { language: null, lines: [] as { at: number; text: string }[] };
  try {
    const body = await page(pick.baseUrl + '&fmt=json3');
    const events = (JSON.parse(body).events ?? []) as { tStartMs: number; segs?: { utf8: string }[] }[];
    const lines = events.filter((e) => e.segs).map((e) => ({ at: Math.round(e.tStartMs / 1000), text: e.segs!.map((s) => s.utf8).join('').replace(/\s+/g, ' ').trim() })).filter((l) => l.text);
    return { language: pick.languageCode + (pick.kind === 'asr' ? ' (automatic)' : ''), lines };
  } catch {
    return { language: pick.languageCode, lines: [] };
  }
}

async function info(id: string) {
  const { player } = await watchData(id);
  const details = player.videoDetails as Json;
  const micro = (player.microformat as Json | undefined)?.playerMicroformatRenderer as Json | undefined;
  const description = String(details.shortDescription ?? '');
  const spoken = await transcript(player);
  console.log(JSON.stringify({
    id,
    title: details.title,
    channel: details.author,
    channelUrl: micro?.ownerProfileUrl ?? (details.channelId ? 'https://www.youtube.com/channel/' + details.channelId : null),
    durationS: Number(details.lengthSeconds),
    published: micro?.publishDate ?? null,
    playable: (player.playabilityStatus as Json | undefined)?.status,
    embeddable: (player.playabilityStatus as Json | undefined)?.playableInEmbed ?? null,
    chapters: chapters(description),
    description: description.slice(0, 1500),
    transcriptLanguage: spoken.language,
    transcript: spoken.lines.map((l) => l.at + 's ' + l.text).join('\n').slice(0, 12000),
  }, null, 1));
}

/** The storyboard sheets YouTube serves for scrubbing, joined into one picture with a time under each frame. */
async function storyboard(id: string, outDir: string) {
  const { player } = await watchData(id);
  const spec = String((((player.storyboards as Json | undefined)?.playerStoryboardSpecRenderer as Json | undefined)?.spec) ?? '');
  if (!spec) throw new Error('No storyboard for ' + id);
  const duration = Number((player.videoDetails as Json).lengthSeconds);
  const [base, ...levels] = spec.split('|');
  const level = levels.length - 1;
  const [width, height, count, cols, rows, interval, name, sigh] = levels[level].split('#');
  const w = Number(width), h = Number(height), total = Number(count), c = Number(cols), r = Number(rows);
  const step = Number(interval) > 0 ? Number(interval) / 1000 : duration / total;
  const perSheet = c * r;
  const tiles: { at: number; buffer: Buffer }[] = [];
  for (let sheet = 0; sheet * perSheet < total; sheet++) {
    const url = base.replace('$L', String(level)).replace('$N', name.replace('$M', String(sheet))) + '&sigh=' + sigh;
    const image = Buffer.from(await (await fetch(url, { headers: HEADERS })).arrayBuffer());
    for (let k = 0; k < perSheet && sheet * perSheet + k < total; k++) {
      const left = (k % c) * w, top = Math.floor(k / c) * h;
      tiles.push({ at: Math.round((sheet * perSheet + k) * step), buffer: await sharp(image).extract({ left, top, width: w, height: h }).toBuffer() });
    }
  }
  // Every frame with its time, ten across, so a reviewer can find where each step happens.
  const across = 10, label = 18;
  const canvas = sharp({ create: { width: across * w, height: Math.ceil(tiles.length / across) * (h + label), channels: 3, background: '#ffffff' } });
  const composites = tiles.flatMap((tile, i) => {
    const x = (i % across) * w, y = Math.floor(i / across) * (h + label);
    const caption = Buffer.from('<svg width="' + w + '" height="' + label + '"><text x="2" y="13" font-family="Arial" font-size="13" fill="#000">' + tile.at + 's</text></svg>');
    return [{ input: tile.buffer, left: x, top: y }, { input: caption, left: x, top: y + h }];
  });
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, id + '-storyboard.png');
  await canvas.composite(composites).png().toFile(file);
  console.log(JSON.stringify({ file, frames: tiles.length, everySeconds: Math.round(step * 10) / 10, frameSize: w + 'x' + h, durationS: duration }));
}

/** Frames at the given seconds, played in YouTube's own embedded player in a headless browser. */
async function frames(id: string, seconds: number[], outDir: string) {
  const { chromium } = await import('@playwright/test');
  // Edge brings the full set of video codecs; the bundled Chromium crashes on some YouTube streams.
  const browser = await chromium.launch({ channel: process.env.FRAMES_BROWSER ?? 'msedge', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'de-DE' });
  const tab = await context.newPage();
  mkdirSync(outDir, { recursive: true });
  const saved: { at: number; file: string; width: number; height: number }[] = [];
  // YouTube refuses an embed without a referring page (error 153), so the player sits in an
  // iframe on a page served by this script under the site's address.
  const host = 'https://sitebots.vercel.app/__frames';
  await tab.route(host, (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><body style="margin:0;background:#000"><iframe id="player" width="1280" height="720" style="border:0" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&iv_load_policy=3&origin=https://sitebots.vercel.app"></iframe></body>',
  }));
  try {
    await tab.goto(host, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const frame = await (await tab.waitForSelector('iframe#player', { timeout: 30_000 })).contentFrame();
    if (!frame) throw new Error('No player frame');
    await frame.waitForSelector('video', { state: 'attached', timeout: 30_000 });
    // Embeds wait for a click; start the muted video ourselves.
    await frame.locator('.ytp-large-play-button').click({ timeout: 5_000 }).catch(() => {});
    await frame.evaluate('(() => { const v = document.querySelector("video"); v.muted = true; return v.play().catch(() => null); })()');
    // Wait for the video itself (not an advert) to play.
    await frame.waitForFunction('(() => { const v = document.querySelector("video"); const p = document.querySelector(".html5-video-player"); return v && v.readyState >= 2 && v.videoWidth > 0 && !(p && p.classList.contains("ad-showing")); })()', undefined, { timeout: 90_000 });
    for (const at of seconds) {
      const data = await frame.evaluate('(async (t) => {'
        + ' const v = document.querySelector("video"); v.pause();'
        + ' await new Promise((resolve) => { const done = () => { v.removeEventListener("seeked", done); resolve(); }; v.addEventListener("seeked", done); v.currentTime = t; setTimeout(resolve, 8000); });'
        + ' await new Promise((resolve) => setTimeout(resolve, 500));'
        + ' try { const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); return c.toDataURL("image/png"); } catch (e) { return null; }'
        + ' })(' + at + ')') as string | null;
      const raw = data ? Buffer.from(data.split(',')[1], 'base64') : await tab.locator('iframe#player').screenshot();
      const file = join(outDir, id + '-' + at + 's.webp');
      const meta = await sharp(raw).webp({ quality: 82 }).toFile(file);
      saved.push({ at, file, width: meta.width, height: meta.height });
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify(saved, null, 1));
}

const [mode, ...rest] = process.argv.slice(2);
const run = mode === 'search' ? search(rest[0], Number(rest[1] ?? 12))
  : mode === 'info' ? info(rest[0])
  : mode === 'storyboard' ? storyboard(rest[0], rest[1])
  : mode === 'frames' ? frames(rest[0], rest[1].split(',').map(Number), rest[2])
  : Promise.reject(new Error('mode: search | info | storyboard | frames'));
run.catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
