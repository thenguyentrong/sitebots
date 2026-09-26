import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import type { z } from 'zod';
import { machineClassFamilies, pinDifferences, screenRecord } from '@/lib/screen/record';
import { RULE_FLAG_IDS } from '@/lib/screen/rules';
import {
  ComplianceEntry,
  CostBlocksFile,
  HumanoidLimitsFile,
  PartnersFile,
  PilotMetricsFile,
  RfiFile,
  RoadmapFile,
  type HumanoidLimit,
  type Partner,
  type PilotMetric,
  type RfiItem,
} from './implementation-schema';
import { missingGerman } from './l10n';
import {
  FamiliesFile,
  MachineClassesFile,
  SettingRecord,
  SolutionClassesFile,
  TaskRecord,
  TradesFile,
  type FamilyRecord,
  type MachineClassRecord,
  type SolutionClassRecord,
  type TradeRecord,
} from './schema';
import { FAMILY_IDS, SOLUTION_CLASS_IDS } from './vocab';

/**
 * Everything under data/ that the decision journey reads, validated. Loading
 * throws on the first schema error with `path: field: message`, like the curated
 * layer. checkContent() then reports referential and editorial issues in bulk so an
 * author sees all of them at once. Both run in `npm run content -- --check` and in
 * lib/content/content.test.ts.
 */

export type LoadedTask = { path: string; record: TaskRecord };
export type Content = {
  root: string;
  families: FamilyRecord[];
  trades: TradeRecord[];
  machineClasses: MachineClassRecord[];
  solutionClasses: SolutionClassRecord[];
  settings: SettingRecord[];
  tasks: LoadedTask[];
  compliance: ComplianceEntry[];
  costs: CostBlocksFile;
  roadmap: RoadmapFile;
  rfi: { items: RfiItem[] };
  pilotMetrics: PilotMetric[];
  humanoidLimits: HumanoidLimit[];
  partners: Partner[];
};

function readYaml<S extends z.ZodType>(root: string, rel: string, schema: S): z.output<S> {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`${rel}: missing`);
  const parsed = schema.safeParse(parse(readFileSync(p, 'utf8')));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new Error(`${rel}: ${i.path.join('.')}: ${i.message}`);
  }
  return parsed.data;
}

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

const rel = (root: string, p: string) => relative(root, p).replace(/\\/g, '/');

const cache = new Map<string, Content>();

export function loadContent(root = process.cwd()): Content {
  const hit = cache.get(root);
  if (hit) return hit;
  const content: Content = {
    root,
    families: readYaml(root, 'data/taxonomy/families.yaml', FamiliesFile).families,
    trades: readYaml(root, 'data/taxonomy/trades.yaml', TradesFile).trades,
    machineClasses: readYaml(root, 'data/taxonomy/machine-classes.yaml', MachineClassesFile).machine_classes,
    solutionClasses: readYaml(root, 'data/taxonomy/solution-classes.yaml', SolutionClassesFile).solution_classes,
    settings: yamlFiles(join(root, 'data', 'settings')).map((p) => readYaml(root, rel(root, p), SettingRecord)),
    tasks: yamlFiles(join(root, 'data', 'tasks')).map((p) => ({ path: rel(root, p), record: readYaml(root, rel(root, p), TaskRecord) })),
    compliance: yamlFiles(join(root, 'data', 'compliance')).map((p) => readYaml(root, rel(root, p), ComplianceEntry)),
    costs: readYaml(root, 'data/costs/blocks.yaml', CostBlocksFile),
    roadmap: readYaml(root, 'data/reference/roadmap.yaml', RoadmapFile),
    rfi: readYaml(root, 'data/reference/rfi-criteria.yaml', RfiFile),
    pilotMetrics: readYaml(root, 'data/reference/pilot-metrics.yaml', PilotMetricsFile).metrics,
    humanoidLimits: readYaml(root, 'data/reference/humanoid-limits.yaml', HumanoidLimitsFile).limits,
    partners: readYaml(root, 'data/partners.yaml', PartnersFile).partners,
  };
  cache.set(root, content);
  return content;
}

export function clearContentCache() {
  cache.clear();
}

const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

/** Referential and editorial checks across the loaded content. Empty = clean. */
export function checkContent(c: Content): string[] {
  const issues: string[] = [];
  const say = (where: string, what: string) => issues.push(`${where}: ${what}`);

  const familyIds = c.families.map((f) => f.id);
  for (const id of FAMILY_IDS) if (!familyIds.includes(id)) say('data/taxonomy/families.yaml', `family ${id} missing`);
  for (const id of dupes(familyIds)) say('data/taxonomy/families.yaml', `duplicate family ${id}`);
  const classIds = c.solutionClasses.map((s) => s.id);
  for (const id of SOLUTION_CLASS_IDS) if (!classIds.includes(id)) say('data/taxonomy/solution-classes.yaml', `solution class ${id} missing`);
  for (const id of dupes(classIds)) say('data/taxonomy/solution-classes.yaml', `duplicate solution class ${id}`);
  const tradeIds = c.trades.map((t) => t.id);
  for (const id of dupes(tradeIds)) say('data/taxonomy/trades.yaml', `duplicate trade ${id}`);
  const machineIds = c.machineClasses.map((m) => m.id);
  for (const id of dupes(machineIds)) say('data/taxonomy/machine-classes.yaml', `duplicate machine class ${id}`);
  const settingIds = c.settings.map((s) => s.id);
  for (const id of dupes(settingIds)) say('data/settings', `duplicate setting ${id}`);
  const complianceIds = c.compliance.map((e) => e.id);
  for (const id of dupes(complianceIds)) say('data/compliance', `duplicate entry ${id}`);
  const metricIds = c.pilotMetrics.map((m) => m.id);
  for (const id of dupes(metricIds)) say('data/reference/pilot-metrics.yaml', `duplicate metric ${id}`);
  for (const id of dupes(c.partners.map((p) => p.id))) say('data/partners.yaml', `duplicate partner ${id}`);
  for (const id of RULE_FLAG_IDS) if (!complianceIds.includes(id)) say('data/compliance', `the screen engine flags ${id}, which has no entry`);
  if (!metricIds.includes(c.roadmap.abort_template.metric_id)) say('data/reference/roadmap.yaml', `abort_template.metric_id ${c.roadmap.abort_template.metric_id} is not a pilot metric`);

  const taskIds = c.tasks.map((t) => t.record.id);
  for (const id of dupes(taskIds)) say('data/tasks', `duplicate task ${id}`);
  const tasksPerSetting = new Map<string, number>();
  for (const { path, record: t } of c.tasks) {
    const expectedId = path.replace(/^data\/tasks\//, '').replace(/\.ya?ml$/, '');
    if (t.id !== expectedId) say(path, `id ${t.id} does not match the path (${expectedId})`);
    if (!settingIds.includes(t.setting)) say(path, `unknown setting ${t.setting}`);
    tasksPerSetting.set(t.setting, (tasksPerSetting.get(t.setting) ?? 0) + 1);
    for (const tr of t.trades) if (!tradeIds.includes(tr)) say(path, `unknown trade ${tr}`);
    for (const s of t.also_in_settings) {
      if (!settingIds.includes(s)) say(path, `unknown also_in_settings ${s}`);
      if (s === t.setting) say(path, `also_in_settings repeats the record's own setting`);
    }
    for (const m of t.attributes.incumbent_automation.value?.machine_classes ?? []) if (!machineIds.includes(m)) say(path, `unknown machine class ${m}`);
    for (const f of t.compliance_flags) if (!complianceIds.includes(f)) say(path, `unknown compliance flag ${f}`);
    for (const m of t.pilot.metrics) if (!metricIds.includes(m)) say(path, `unknown pilot metric ${m}`);
    if (t.derived_from && !taskIds.includes(t.derived_from)) say(path, `derived_from ${t.derived_from} does not exist`);
    const home = c.settings.find((s) => s.id === t.setting);
    if (home?.group === 'site' && t.status === 'published' && !t.lv) say(path, 'a construction-site task needs its LV anchor (lv: lb, atv, position, unit)');
    if (t.lv?.lb && home?.lv && !home.lv.lb.includes(t.lv.lb)) say(path, `lv.lb ${t.lv.lb} is not a Leistungsbereich of ${t.setting}`);
    if (t.lv?.atv && home?.lv && home.lv.atv.length && !home.lv.atv.includes(t.lv.atv)) say(path, `lv.atv ${t.lv.atv} is not an ATV of ${t.setting}`);
    if (t.status === 'published') for (const p of missingGerman(t)) say(path, `German missing at ${p}`);
    for (const d of pinDifferences(t, screenRecord(t, machineClassFamilies(c.machineClasses)))) say(path, `pinned verdict is stale: ${d}`);
  }

  for (const s of c.settings) {
    const where = `data/settings/${s.id}.yaml`;
    for (const m of s.typical_incumbent_automation) if (!machineIds.includes(m)) say(where, `unknown machine class ${m}`);
    for (const tr of s.typical_trades) if (!tradeIds.includes(tr)) say(where, `unknown trade ${tr}`);
    if (s.coverage === 'screened' && !(tasksPerSetting.get(s.id) ?? 0)) say(where, 'coverage is "screened" but no task record exists');
    if (s.group === 'site' && (!s.section || !s.lv)) say(where, 'a construction-site setting needs its section and its LV reference (lb, atv)');
    if (s.group !== 'site' && s.section) say(where, 'only construction-site settings have a section');
    if (s.status === 'published') for (const p of missingGerman(s)) say(where, `German missing at ${p}`);
  }

  const complete: [string, unknown][] = [
    ['data/taxonomy/families.yaml', c.families],
    ['data/taxonomy/trades.yaml', c.trades],
    ['data/taxonomy/machine-classes.yaml', c.machineClasses],
    ['data/taxonomy/solution-classes.yaml', c.solutionClasses],
    ['data/compliance', c.compliance],
    ['data/costs/blocks.yaml', c.costs],
    ['data/reference/roadmap.yaml', c.roadmap],
    ['data/reference/rfi-criteria.yaml', c.rfi],
    ['data/reference/pilot-metrics.yaml', c.pilotMetrics],
    ['data/reference/humanoid-limits.yaml', c.humanoidLimits],
    ['data/partners.yaml', c.partners],
  ];
  for (const [where, value] of complete) for (const p of missingGerman(value)) say(where, `German missing at ${p}`);

  return issues;
}
