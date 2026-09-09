// github-images.ts — product pictures from the makers' own description repos.
//
//   GITHUB_TOKEN=$(gh auth token) node --import tsx scripts/assets/github-images.ts --review
//
// A first-party repository under MIT/BSD/Apache covers everything in it,
// README pictures included, so a maker that publishes its robot's geometry
// usually publishes a photograph of it too — the README hero. This walks the
// first-party, permissively licensed repos from .out/github-sweep.json, reads
// each README at the pinned commit, and proposes every picture whose file
// name, alt text or surrounding heading names a model we list. Candidates go
// to .out/review-github with contact sheets, exactly like maker-previews;
// approved ones are copied into data/assets/previews.json with the repo's
// licence and are applied by `maker-previews.ts --commit`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const TOKEN = process.env.GITHUB_TOKEN;
const REVIEW = '.out/review-github';
const SWEEP = '.out/github-sweep.json';
const UA = 'SitebotsBot/0.1 (+https://sitebots.example/bot)';

type Repo = { repo: string; spdx: string; allowed: boolean; maker: string; firstParty: boolean };
type Cand = { robot: string; name: string; maker: string; page: string; image: string; licence: string; title: string; how: 'readme' };
type Model = { slug: string; name: string; tokens: string[] };

const STOP = ['the', 'robot', 'robotics', 'inc', 'ltd', 'co', 'gmbh', 'technologies', 'series', 'humanoid'];
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.includes(t));
}

async function gh(path: string): Promise<unknown> {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: { accept: 'application/vnd.github+json', ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}), 'user-agent': UA },
  });
  if (!r.ok) return null;
  return r.json();
}

/** maker slug → models from the alias tables, so this needs no database. */
function modelsByMaker(): Map<string, Model[]> {
  const out = new Map<string, Model[]>();
  for (const f of ['data/aliases.yaml', 'data/aliases.generated.yaml']) {
    if (!existsSync(f)) continue;
    const y = parseYaml(readFileSync(f, 'utf8')) as { manufacturers?: Record<string, { name: string }>; robots?: Record<string, Record<string, { name: string }>> };
    for (const [maker, models] of Object.entries(y.robots ?? {})) {
      const list = out.get(maker) ?? [];
      const makerTok = tokens(y.manufacturers?.[maker]?.name ?? maker);
      for (const [slug, m] of Object.entries(models)) {
        if (list.some((x) => x.slug === slug)) continue;
        const tk = tokens(m.name).filter((t) => !makerTok.includes(t));
        list.push({ slug, name: m.name, tokens: tk.length ? tk : tokens(slug) });
      }
      out.set(maker, list);
    }
  }
  return out;
}

/** Markdown and HTML pictures in a README, each with the heading it sits under. */
function imagesInReadme(md: string): { src: string; alt: string; heading: string }[] {
  const out: { src: string; alt: string; heading: string }[] = [];
  let heading = '';
  for (const line of md.split('\n')) {
    const h = /^#{1,4}[ \t]+(.+)/.exec(line);
    if (h) heading = h[1].trim();
    for (const m of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) out.push({ alt: m[1], src: m[2], heading });
    for (const m of line.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
      const alt = /alt=["']([^"']*)["']/i.exec(m[0])?.[1] ?? '';
      out.push({ alt, src: m[1], heading });
    }
  }
  return out;
}

/** README-relative paths become raw-host URLs at the pinned commit; blob links become raw links. */
function rawUrl(repo: string, sha: string, src: string): string {
  const abs = /^https?:/i.test(src) ? src : `https://raw.githubusercontent.com/${repo}/${sha}/${src.replace(/^[.]?[/]/, '')}`;
  return abs.replace(/^https:[/][/]github[.]com[/]([^/]+[/][^/]+)[/]blob[/]/, 'https://raw.githubusercontent.com/$1/').replace(/[?]raw=true$/, '');
}

async function main() {
  if (!process.argv.includes('--review')) {
    console.log('usage: --review');
    return;
  }
  const repos = (JSON.parse(readFileSync(SWEEP, 'utf8')) as Repo[]).filter((r) => r.firstParty && r.allowed);
  const models = modelsByMaker();
  mkdirSync(REVIEW, { recursive: true });
  const manifest: Cand[] = [];
  const seen = new Set<string>();
  for (const r of repos) {
    const list = models.get(r.maker) ?? [];
    if (!list.length) {
      console.log(`  –  ${r.repo}: no models for maker "${r.maker}"`);
      continue;
    }
    const meta = (await gh(`/repos/${r.repo}`)) as { default_branch: string } | null;
    const head = meta ? ((await gh(`/repos/${r.repo}/commits/${meta.default_branch}`)) as { sha: string } | null) : null;
    const readme = (await gh(`/repos/${r.repo}/readme`)) as { path: string; download_url: string } | null;
    if (!head || !readme) {
      console.log(`  –  ${r.repo}: no README`);
      continue;
    }
    const md = await fetch(readme.download_url, { headers: { 'user-agent': UA } }).then((x) => (x.ok ? x.text() : ''));
    const pics = imagesInReadme(md).filter((p) => !/badge|shields[.]io|[.]svg([?]|$)|logo|icon/i.test(p.src));
    for (const [i, pic] of pics.entries()) {
      const image = rawUrl(r.repo, head.sha, pic.src);
      const hay = ` ${tokens(`${pic.src.split('/').pop() ?? ''} ${pic.alt} ${pic.heading}`).join(' ')} `;
      // Which model is this a picture of? Every token of exactly one model must
      // appear in the file name, alt text or the heading above it. A repo that
      // covers a single model gets its first README picture when nothing names it.
      const named = list.filter((m) => m.tokens.every((t) => hay.includes(` ${t} `)));
      const target = named.length === 1 ? named[0] : named.length === 0 && list.length === 1 && i === 0 ? list[0] : null;
      if (!target) continue;
      const key = `${r.maker}/${target.slug}`;
      if (seen.has(key)) continue;
      try {
        const res = await fetch(image, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
        if (!res.ok || !/^image[/]/.test(res.headers.get('content-type') ?? '')) continue;
        writeFileSync(join(REVIEW, `${r.maker}__${target.slug}.img`), Buffer.from(await res.arrayBuffer()));
      } catch {
        continue;
      }
      seen.add(key);
      const page = `https://github.com/${r.repo}/blob/${head.sha}/${readme.path}`;
      manifest.push({ robot: key, name: target.name, maker: r.maker, page, image, licence: r.spdx, title: `${r.repo} README · ${pic.heading || pic.alt || pic.src.split('/').pop()}`, how: 'readme' });
      console.log(`  ?  ${key.padEnd(30)} ${r.spdx.padEnd(12)} ${image.slice(0, 90)}`);
    }
  }
  writeFileSync(join(REVIEW, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const per = 20;
  for (let i = 0; i < manifest.length; i += per) {
    const tiles = manifest
      .slice(i, i + per)
      .map((m, j) => `<figure><img src="${m.image}" loading="eager"><figcaption><b>${i + j + 1}</b> ${m.robot}<br><small>${m.licence} · ${m.title.slice(0, 70)}</small></figcaption></figure>`)
      .join('');
    writeFileSync(join(REVIEW, `sheet-${String(i / per + 1).padStart(2, '0')}.html`), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:12px system-ui}main{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:8px}figure{margin:0;border:1px solid #ddd;padding:4px}img{width:100%;height:160px;object-fit:contain;background:#f4f4f5}figcaption{margin-top:4px}</style><main>${tiles}</main>`);
  }
  console.log(`\n${manifest.length} candidates from ${repos.length} repos → ${REVIEW} (${Math.ceil(manifest.length / per)} sheets). Approved entries go into data/assets/previews.json with their licence.`);
}

main();
