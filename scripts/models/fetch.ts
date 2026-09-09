import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ModelSource } from '@/lib/models/schemas';

/**
 * Get exactly the files a model needs from GitHub, pinned by commit:
 * the repository tree (one API call, cached), then raw.githubusercontent.com
 * per file. A description folder can weigh 300 MB of STL for every variant;
 * the URDF names the handful we need, so meshes are fetched in a second
 * stage after parsing.
 */
const CACHE = join(process.cwd(), '.cache', 'models');
const UA = 'SitebotsBot/0.1 (+http://localhost:3000/bot)';

export type TreeEntry = { path: string; type: 'blob' | 'tree'; size?: number; sha: string };

export function modelSlug(src: Pick<ModelSource, 'robotKey' | 'variants'>): string {
  const key = src.robotKey.replace('/', '__');
  return src.variants.includes('base') ? key : `${key}__${src.variants[0]}`;
}

export function srcDir(src: ModelSource): string {
  return join(CACHE, modelSlug(src), 'src');
}

export function outDir(src: ModelSource): string {
  return join(CACHE, modelSlug(src), 'out');
}

export async function repoTree(repo: string, sha: string): Promise<TreeEntry[]> {
  const file = join(CACHE, '_trees', `${repo.replace('/', '_')}-${sha}.json`);
  if (existsSync(file)) {
    const j = JSON.parse(readFileSync(file, 'utf8')) as { tree?: TreeEntry[]; truncated?: boolean };
    if (j.tree) return j.tree;
  }
  mkdirSync(dirname(file), { recursive: true });
  const headers: Record<string, string> = { 'user-agent': UA, accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${repo}/git/trees/${sha}?recursive=1`, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`GitHub tree ${repo}@${sha}: HTTP ${res.status}`);
  const json = (await res.json()) as { tree: TreeEntry[]; truncated: boolean };
  if (json.truncated) throw new Error(`GitHub tree ${repo}@${sha} is truncated; fetch by subfolder`);
  writeFileSync(file, JSON.stringify(json));
  return json.tree;
}

async function download(repo: string, sha: string, path: string, dest: string, expectedSize?: number): Promise<'fetched' | 'cached'> {
  if (existsSync(dest) && (expectedSize === undefined || statSync(dest).size === expectedSize)) return 'cached';
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(300_000) });
  if (!res.ok || !res.body) throw new Error(`${url}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as import('stream/web').ReadableStream), createWriteStream(dest));
  // Git LFS pointers are tiny text files; the real bytes live on the media host.
  if (statSync(dest).size < 400 && readFileSync(dest, 'utf8').startsWith('version https://git-lfs')) {
    const lfs = await fetch(`https://media.githubusercontent.com/media/${repo}/${sha}/${path}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(300_000) });
    if (!lfs.ok || !lfs.body) throw new Error(`${url}: LFS pointer but media fetch failed (${lfs.status})`);
    await pipeline(Readable.fromWeb(lfs.body as import('stream/web').ReadableStream), createWriteStream(dest));
  }
  return 'fetched';
}

async function withConcurrency<T>(items: T[], limit: number, fn: (t: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/** Stage 1: description files (urdf, xacro, mtl, licence). */
export async function fetchDescription(src: ModelSource, log: (m: string) => void): Promise<{ dir: string; tree: TreeEntry[] }> {
  const tree = await repoTree(src.repo, src.sha);
  const dir = srcDir(src);
  const wanted = tree.filter(
    (e) =>
      e.type === 'blob' &&
      ((e.path.startsWith(src.path + '/') && /\.(urdf|xacro|xml|mtl)$/i.test(e.path)) ||
        Object.values(src.packages).some((p) => e.path.startsWith(p + '/') && /\.(urdf|xacro|xml|mtl)$/i.test(e.path)) ||
        /^(LICENSE|LICENCE|NOTICE)(\.[a-z]+)?$/i.test(e.path) ||
        e.path === src.licenseFile),
  );
  let fetched = 0;
  await withConcurrency(wanted, 6, async (e) => {
    const r = await download(src.repo, src.sha, e.path, join(dir, e.path), e.size);
    if (r === 'fetched') fetched++;
  });
  log(`stage 1: ${wanted.length} description files (${fetched} fetched)`);
  return { dir, tree };
}

/** Stage 2: only the meshes the chosen URDF references. `paths` are repo-relative. */
export async function fetchMeshes(src: ModelSource, tree: TreeEntry[], paths: string[], log: (m: string) => void): Promise<number> {
  const dir = srcDir(src);
  const byPath = new Map(tree.map((e) => [e.path, e]));
  const missing = paths.filter((p) => !byPath.has(p));
  if (missing.length) throw new Error(`meshes not in ${src.repo}@${src.sha.slice(0, 7)}: ${missing.slice(0, 5).join(', ')}`);
  let fetched = 0;
  let bytes = 0;
  await withConcurrency(paths, 6, async (p) => {
    const e = byPath.get(p)!;
    bytes += e.size ?? 0;
    const r = await download(src.repo, src.sha, p, join(dir, p), e.size);
    if (r === 'fetched') fetched++;
  });
  log(`stage 2: ${paths.length} meshes, ${(bytes / 1e6).toFixed(1)} MB (${fetched} fetched)`);
  return bytes;
}

export function licenseText(src: ModelSource): { text: string; copyright: string } {
  const p = join(srcDir(src), src.licenseFile);
  const text = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const copyright = src.copyright ?? text.split(/\r?\n/).find((l) => /copyright/i.test(l))?.trim() ?? '';
  return { text, copyright };
}
