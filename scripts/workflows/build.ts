// Checks every task workflow and stores its frames for the site: data/workflows/<setting>/<task>.json
// -> public/steps/<setting>/<task>/<n>.<hash>.webp (640x360) and data/workflows/frames.json.
// Frames come from .cache/workflows/frames (written by youtube.ts frames); missing ones are captured.
//
//   node --import tsx scripts/workflows/build.ts            check and store frames
//   node --import tsx scripts/workflows/build.ts --check    check only
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { WorkflowSchema, type Workflow } from '@/lib/workflows/schema';

const root = process.cwd();
const dataDir = join(root, 'data/workflows');
const cacheDir = join(root, '.cache/workflows/frames');
const check = process.argv.includes('--check');

const workflows: Workflow[] = [];
const problems: string[] = [];
for (const setting of existsSync(dataDir) ? readdirSync(dataDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : []) {
  for (const name of readdirSync(join(dataDir, setting)).filter((file) => file.endsWith('.json')).sort()) {
    const parsed = WorkflowSchema.safeParse(JSON.parse(readFileSync(join(dataDir, setting, name), 'utf8')));
    if (!parsed.success) {
      problems.push(setting + '/' + name + ': ' + parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join('; '));
      continue;
    }
    const workflow = parsed.data;
    if (workflow.task !== setting + '/' + name.replace(/[.]json$/, '')) problems.push(setting + '/' + name + ': names task ' + workflow.task);
    if (!existsSync(join(root, 'data/tasks', workflow.task + '.yaml'))) problems.push(workflow.task + ': no task record');
    workflows.push(workflow);
  }
}
console.log(workflows.length + ' workflows, ' + workflows.reduce((n, w) => n + w.steps.length, 0) + ' steps');
if (problems.length) {
  console.log(problems.join('\n'));
  process.exitCode = 1;
}

async function main() {
  if (check || problems.length) return;
  mkdirSync(cacheDir, { recursive: true });
  const cached = (id: string, at: number) => join(cacheDir, id + '-' + at + 's.webp');
  // Capture what the agents did not leave in the cache, one video at a time.
  const missing = new Map<string, Set<number>>();
  for (const workflow of workflows) for (const step of workflow.steps) if (!existsSync(cached(workflow.video.id, step.at))) missing.set(workflow.video.id, (missing.get(workflow.video.id) ?? new Set()).add(step.at));
  for (const [id, seconds] of missing) {
    console.log('capture ' + id + ' ' + [...seconds].join(','));
    try {
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/workflows/youtube.ts', 'frames', id, [...seconds].join(','), cacheDir], { cwd: root, stdio: 'ignore', timeout: 240_000 });
    } catch (error) {
      console.log('  failed: ' + (error as Error).message.split('\n')[0]);
    }
  }
  const manifest: Record<string, ({ src: string; width: number; height: number } | null)[]> = {};
  for (const workflow of workflows) {
    const dir = join(root, 'public/steps', workflow.task);
    mkdirSync(dir, { recursive: true });
    const keep = new Set<string>();
    manifest[workflow.task] = [];
    for (const [index, step] of workflow.steps.entries()) {
      const source = cached(workflow.video.id, step.at);
      if (!existsSync(source)) {
        manifest[workflow.task].push(null);
        continue;
      }
      const name = (index + 1) + '.' + createHash('sha1').update(workflow.video.id + ':' + step.at).digest('hex').slice(0, 8) + '.webp';
      keep.add(name);
      if (!existsSync(join(dir, name))) await sharp(source).resize(640, 360, { fit: 'cover', position: 'centre' }).webp({ quality: 72 }).toFile(join(dir, name));
      manifest[workflow.task].push({ src: '/steps/' + workflow.task + '/' + name, width: 640, height: 360 });
    }
    for (const file of readdirSync(dir)) if (!keep.has(file)) rmSync(join(dir, file));
  }
  writeFileSync(join(dataDir, 'frames.json'), JSON.stringify({ frames: manifest }, null, 1) + '\n');
  const empty = Object.values(manifest).flat().filter((frame) => !frame).length;
  console.log(Object.keys(manifest).length + ' workflows stored' + (empty ? ', ' + empty + ' steps without a frame' : ''));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
