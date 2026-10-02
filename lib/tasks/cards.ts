import { legacyIndustries } from '@/lib/content/industries';
import type { Content } from '@/lib/content/load';
import type { TaskRecord } from '@/lib/content/schema';
import { machineClassFamilies } from '@/lib/screen/record';
import { FACT_KEYS } from '@/lib/screen/types';
import type { FactMetaMap, JourneyContent, LabelMap, MachineClassOption, SettingOption, TaskCard } from './types';

/**
 * Server-side only (the loader reads the file system). Turns validated YAML
 * records into the client-safe cards and label maps the stations render.
 */

export function toTaskCard(record: TaskRecord): TaskCard {
  const a = record.attributes;
  const incumbent = a.incumbent_automation.value;
  const meta: FactMetaMap = {};
  for (const key of FACT_KEYS) meta[key] = { confidence: a[key].confidence, note: a[key].note, ...(a[key].evidence_url ? { evidence_url: a[key].evidence_url } : {}) };
  return {
    id: record.id,
    slug: record.id.split('/')[1],
    setting: record.setting,
    family: record.family,
    trades: record.trades,
    industries: record.industries.length ? record.industries : legacyIndustries(record.setting),
    title: record.title,
    summary: record.summary,
    description: record.description,
    facts: {
      object_mass_kg: a.object_mass_kg.value,
      variability: a.variability.value,
      error_tolerance: a.error_tolerance.value,
      safety_criticality: a.safety_criticality.value,
      reach_height_m: a.reach_height_m.value,
      environment: a.environment.value,
      dust: a.dust.value,
      wet: a.wet.value,
      floor: a.floor.value,
      incumbent_automation: incumbent ? { status: incumbent.status, machine_classes: incumbent.machine_classes } : null,
      data_sensitivity: a.data_sensitivity.value,
      runtime_continuous_min: a.runtime_continuous_min.value,
    },
    meta,
    reference_verdict: record.screen.verdict,
    reference_results: record.screen.results,
    killed_by: record.screen.killed_by,
    better_answer: record.screen.better_answer,
    solution_classes: record.solution_classes,
    capabilities_required: record.capabilities_required,
    value_drivers: record.value_drivers,
    also_in_settings: record.also_in_settings,
    evidence: record.evidence.map((e) => ({ statement: e.statement, url: e.url, kind: e.kind, type: e.type, date: e.date, tier: e.tier, note: e.note })),
    pilot: record.pilot,
    prerequisites: record.prerequisites,
    open_questions: record.open_questions,
    compliance_flags: record.compliance_flags,
    sources_reviewed_at: record.sources_reviewed_at,
    lv: record.lv ?? null,
    requirements: {
      object_size_m: record.requirements.object_size_m ?? null,
      tolerance_mm: record.requirements.tolerance_mm ?? null,
      force_n: record.requirements.force_n ?? null,
    },
  };
}

export const taskCards = (c: Content): TaskCard[] => c.tasks.filter((t) => t.record.status === 'published').map((t) => toTaskCard(t.record));

export const findTaskCard = (c: Content, setting: string, slug: string): TaskCard | undefined => {
  const hit = c.tasks.find((t) => t.record.id === `${setting}/${slug}` && t.record.status === 'published');
  return hit ? toTaskCard(hit.record) : undefined;
};

export const settingOptions = (c: Content): SettingOption[] =>
  c.settings
    .filter((s) => s.status === 'published')
    .map((s) => ({
      id: s.id,
      group: s.group,
      industries: s.industries.length ? s.industries : legacyIndustries(s.id),
      title: s.title,
      coverage: s.coverage,
      coverage_note: s.coverage_note,
      typical_incumbent_automation: s.typical_incumbent_automation,
      dust: { type: s.dust.type, typical_zone: s.dust.typical_zone },
      floor: s.floor,
      exposure: s.exposure,
      seed_priority: s.seed_priority,
      section: s.section ?? null,
      lv: s.lv ?? null,
      records: c.tasks.filter((t) => t.record.status === 'published' && t.record.setting === s.id).length,
    }));

export const machineClassOptions = (c: Content): MachineClassOption[] => c.machineClasses.map((m) => ({ id: m.id, title: m.title, families: m.families }));

const labels = (rows: { id: string; title: { en: string; de: string } }[]): LabelMap => Object.fromEntries(rows.map((r) => [r.id, r.title]));

export const familyLabels = (c: Content): LabelMap => labels(c.families);
export const solutionClassLabels = (c: Content): LabelMap => labels(c.solutionClasses);
export const complianceLabels = (c: Content): LabelMap => Object.fromEntries(c.compliance.map((e) => [e.id, { en: e.term_en, de: e.term_de }]));

export function journeyContent(c: Content): JourneyContent {
  return {
    settings: settingOptions(c),
    machineClasses: machineClassOptions(c),
    families: familyLabels(c),
    solutionClasses: solutionClassLabels(c),
    compliance: complianceLabels(c),
    machineClassFamilies: machineClassFamilies(c.machineClasses),
  };
}

/**
 * Up to `n` cards that show the range: a candidate, a marginal case and a
 * ruled-out one, each from a different setting where possible, smaller
 * settings first, so one well-stocked setting does not stand for its group.
 */
export function pickExamples(cards: TaskCard[], n: number): TaskCard[] {
  const size = new Map<string, number>();
  for (const c of cards) size.set(c.setting, (size.get(c.setting) ?? 0) + 1);
  const order = [...cards].sort((a, b) => (size.get(a.setting) ?? 0) - (size.get(b.setting) ?? 0) || a.title.en.localeCompare(b.title.en));
  const picked: TaskCard[] = [];
  const used = new Set<string>();
  const take = (c: TaskCard) => { picked.push(c); used.add(c.setting); };
  for (const verdict of ['candidate', 'marginal', 'ruled_out'] as const) {
    if (picked.length >= n) break;
    const pool = order.filter((c) => c.reference_verdict === verdict && !picked.includes(c));
    const hit = pool.find((c) => !used.has(c.setting)) ?? pool[0];
    if (hit) take(hit);
  }
  for (const c of order) if (picked.length < n && !picked.includes(c)) take(c);
  return picked;
}
