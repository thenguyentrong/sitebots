'use client';

import { SITE_SECTIONS, type SettingGroup } from '@/lib/content/vocab';
import { SECTION_LABELS, SUBSETTING_QUESTION, lbLabel, tasksLabel } from '@/lib/journey/labels';
import { byLv } from '@/lib/tasks/order';
import type { SettingOption } from '@/lib/tasks/types';
import { Row } from './ChoiceChips';

/**
 * The second context question. On a construction site it is the trade, grouped
 * the way a Leistungsverzeichnis groups it; in a factory, yard or building the
 * kind of plant or asset. One choice; the count is the number of screened tasks.
 */
export function SettingPicker({ group, settings, value, onChange }: { group: SettingGroup; settings: SettingOption[]; value: string; onChange: (id: string) => void }) {
  const question = SUBSETTING_QUESTION[group];
  const chip = (s: SettingOption) => <button key={s.id} type="button" aria-pressed={value === s.id} title={s.title.de} onClick={() => onChange(value === s.id ? '' : s.id)}>
    {s.lv && s.lv.lb.length ? <span className="chip-lb">{lbLabel(s.lv.lb)}</span> : null}{s.title.en}{s.records ? <span className="chip-count">{tasksLabel(s.records)}</span> : null}
  </button>;
  const rows = group === 'site'
    ? SITE_SECTIONS.map((section) => {
      const items = settings.filter((s) => s.section === section).sort(byLv);
      return items.length ? <Row key={section} label={SECTION_LABELS[section].en} hint={SECTION_LABELS[section].de}><div className="chips">{items.map(chip)}</div></Row> : null;
    })
    : null;
  // Kinds of plant alphabetically, so the best-stocked one does not lead.
  if (group !== 'site') return <div className="jp-rows" role="group" aria-label={question.label}><Row label={question.label} hint={question.hint}><div className="chips">{[...settings].sort((a, b) => a.title.en.localeCompare(b.title.en)).map(chip)}</div></Row></div>;
  return <div className="setting-picker" role="group" aria-label={question.label}>
    <p className="jp-label">{question.label}</p>
    <p className="jp-hint">{question.hint}</p>
    <div className="jp-rows mt-4">{rows}</div>
  </div>;
}
