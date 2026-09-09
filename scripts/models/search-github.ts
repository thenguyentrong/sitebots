// search-github.ts — find redistributable robot descriptions on GitHub.
//
//   node --import tsx scripts/models/search-github.ts --maker unitree deep-robotics
//   node --import tsx scripts/models/search-github.ts --all --limit 30
//
// Two stages. First the repository search, because most makers publish one
// repo for their whole fleet (unitree_ros carries G1, H1, Go2, B2 …). Then,
// for every candidate, the licence and the URDF/xacro/MJCF files it holds.
// Nothing is downloaded and nothing is written: the output is a shortlist to
// paste into data/models/sources.json by hand, after a human has looked at it.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { args, str } from '../scrape/_lib/args';

const TOKEN = process.env.GITHUB_TOKEN || '';
const UA = 'SitebotsBot/0.1 (+https://sitebots.dev/bot)';

/** Only these can be rehosted; anything else is a look-but-do-not-touch. */
const ALLOWED = new Set(['bsd-3-clause', 'bsd-2-clause', 'mit', 'apache-2.0', 'cc0-1.0', 'unlicense']);

type Repo = { full_name: string; description: string | null; stargazers_count: number; license: { spdx_id: string } | null; default_branch: string; pushed_at: string };

async function gh<T>(path: string): Promise<T | null> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': UA,
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000;
    const wait = Math.max(2000, reset - Date.now() + 1000);
    console.error(`  rate limited, waiting ${Math.round(wait / 1000)}s`);
    await new Promise((r) => setTimeout(r, Math.min(wait, 65_000)));
    return gh<T>(path);
  }
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Search queries per maker, most specific first. */
function queries(maker: string): string[] {
  const bare = maker.replace(/-/g, ' ');
  return [`${bare} description urdf`, `${bare} robot description`, `${bare} urdf`, `${bare} mjcf OR mujoco model`];
}

type Hit = { repo: string; stars: number; spdx: string; allowed: boolean; pushed: string; description: string; urdf: string[]; xacro: string[]; mjcf: string[] };

async function inspect(repo: Repo): Promise<Hit | null> {
  const spdx = repo.license?.spdx_id ?? 'NOASSERTION';
  const tree = await gh<{ tree: { path: string; type: string }[]; truncated: boolean }>(
    `/repos/${repo.full_name}/git/trees/${repo.default_branch}?recursive=1`,
  );
  if (!tree?.tree) return null;
  const paths = tree.tree.filter((t) => t.type === 'blob').map((t) => t.path);
  const pick = (re: RegExp) => paths.filter((p) => re.test(p)).slice(0, 12);
  const urdf = pick(/\.urdf$/i);
  const xacro = pick(/\.urdf\.xacro$|\.xacro$/i);
  const mjcf = pick(/\.xml$/i).filter((p) => /mjcf|mujoco|scene|_model/i.test(p)).slice(0, 6);
  if (!urdf.length && !xacro.length && !mjcf.length) return null;
  return {
    repo: repo.full_name,
    stars: repo.stargazers_count,
    spdx,
    allowed: ALLOWED.has(spdx.toLowerCase()),
    pushed: repo.pushed_at.slice(0, 10),
    description: repo.description ?? '',
    urdf,
    xacro,
    mjcf,
  };
}

/** Every maker we know, from the alias files (no database needed): slug → display name. */
function allMakers(): { slug: string; name: string }[] {
  const out = new Map<string, string>();
  for (const file of ['data/aliases.generated.yaml', 'data/aliases.yaml']) {
    if (!existsSync(file)) continue;
    const doc = parseYaml(readFileSync(file, 'utf8')) as { manufacturers?: Record<string, { name?: string }> };
    for (const [slug, m] of Object.entries(doc.manufacturers ?? {})) out.set(slug, m?.name ?? slug);
  }
  return [...out].map(([slug, name]) => ({ slug, name }));
}

/** Fewer, sharper queries for the sweep: the search budget is 30 calls a minute. */
function sweepQueries(name: string): string[] {
  const q = name.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  return [`"${q}" urdf OR mjcf OR description in:name,description,readme`, `"${q}" robot description`];
}

/** A repo counts as first-party when its owner shares a name token with the maker. */
function firstParty(repoFullName: string, maker: { slug: string; name: string }): boolean {
  const owner = repoFullName.split('/')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const toks = `${maker.slug} ${maker.name}`.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !['robotics', 'robot', 'inc', 'ltd', 'technologies', 'technology', 'dynamics', 'the'].includes(t));
  return toks.some((t) => owner.includes(t));
}

async function sweepAll(limit: number) {
  const makers = allMakers().slice(0, limit);
  console.log(`sweeping ${makers.length} makers, 2 searches each — roughly ${Math.ceil((makers.length * 2 * 2.2) / 60)} min\n`);
  const seen = new Set<string>();
  const hits: (Hit & { maker: string; firstParty: boolean })[] = [];
  let n = 0;
  for (const maker of makers) {
    n++;
    for (const q of sweepQueries(maker.name)) {
      const found = await gh<{ items: Repo[] }>(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=6`);
      await new Promise((r) => setTimeout(r, 2200)); // 30 searches/min
      for (const repo of found?.items ?? []) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);
        const hit = await inspect(repo);
        if (!hit) continue;
        const fp = firstParty(repo.full_name, maker);
        hits.push({ ...hit, maker: maker.slug, firstParty: fp });
        if (hit.allowed && fp) console.log(`  ★ ${maker.slug.padEnd(20)} ${hit.repo}  ${hit.spdx}  urdf=${hit.urdf.length} xacro=${hit.xacro.length} mjcf=${hit.mjcf.length}`);
      }
    }
    if (n % 25 === 0) {
      writeFileSync('.out/github-sweep.json', JSON.stringify(hits, null, 2));
      console.log(`  … ${n}/${makers.length} makers, ${hits.length} repos so far`);
    }
  }
  hits.sort((x, y) => Number(y.allowed && y.firstParty) - Number(x.allowed && x.firstParty) || Number(y.allowed) - Number(x.allowed) || y.stars - x.stars);
  writeFileSync('.out/github-sweep.json', JSON.stringify(hits, null, 2));
  const short = hits.filter((h) => h.allowed && h.firstParty);
  console.log(`\n${hits.length} repos inspected · ${hits.filter((h) => h.allowed).length} permissive · ${short.length} permissive AND first-party → .out/github-sweep.json`);
  console.log('\nShortlist (permissive, first-party):');
  for (const h of short) console.log(`  ${h.maker.padEnd(20)} ${h.repo.padEnd(48)} ${h.spdx.padEnd(12)} ${[...h.urdf, ...h.xacro, ...h.mjcf].slice(0, 3).join('  ')}`);
}

async function main() {
  const a = args(process.argv.slice(2));
  const makers = (str(a.maker) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (a.all === true) return sweepAll(typeof a.limit === 'string' ? Number(a.limit) : 10_000);
  const list = makers;
  if (!list.length) throw new Error('usage: --maker unitree,deep-robotics | --all [--limit N]');

  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const maker of list) {
    console.log(`\n## ${maker}`);
    for (const q of queries(maker)) {
      const found = await gh<{ items: Repo[] }>(`/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=8`);
      for (const repo of found?.items ?? []) {
        if (seen.has(repo.full_name)) continue;
        seen.add(repo.full_name);
        const hit = await inspect(repo);
        if (!hit) continue;
        hits.push(hit);
        const mark = hit.allowed ? 'OK ' : '   ';
        console.log(`${mark}${hit.repo}  ★${hit.stars}  ${hit.spdx}  ${hit.pushed}`);
        if (hit.urdf.length) console.log(`     urdf : ${hit.urdf.slice(0, 4).join('  ')}`);
        if (hit.xacro.length) console.log(`     xacro: ${hit.xacro.slice(0, 3).join('  ')}`);
        if (hit.mjcf.length) console.log(`     mjcf : ${hit.mjcf.slice(0, 3).join('  ')}`);
      }
    }
  }
  hits.sort((x, y) => Number(y.allowed) - Number(x.allowed) || y.stars - x.stars);
  writeFileSync('.out/github-models.json', JSON.stringify(hits, null, 2));
  console.log(`\n${hits.length} candidate repos, ${hits.filter((h) => h.allowed).length} with a licence we can rehost → .out/github-models.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
