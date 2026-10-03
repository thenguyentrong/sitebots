import { FIELDS, normalizeText, type Field, type Value } from './research';
import type { Dossier } from './schema';

export type CheckedResearchRow = {
  field: Field; value: Value; basis: string; quote: string; url: string;
  publisher: string; kind: 'manufacturer' | 'seller' | 'press' | 'database';
  checkedAt: string; title: string;
};

const basisText = (basis: string | null | undefined) => {
  const text = normalizeText(basis ?? '');
  return text === 'unstated' ? '' : text;
};

/** Equal numbers from different measurement modes must not become the same claim. */
function conflictingModes(field: Field, previous: string | null, incoming: string): boolean {
  const modes = (basis: string) => {
    const found = new Set<string>();
    if (field === 'runtime_h') {
      if (/\b(?:idle|standby)\b/.test(basis)) found.add('idle');
      if (/\bwalking\b/.test(basis)) found.add('walking');
      if (/\bloaded\b|\bunder load\b|\bwith (?:a |the |full )?(?:payload|load)\b/.test(basis)) found.add('loaded');
    } else if (field === 'arm_payload_kg' || field === 'both_arms_payload_kg') {
      if (/\b(?:peak|max(?:imum)?)\b/.test(basis)) found.add('peak');
      if (/\b(?:rated|nominal|sustained)\b/.test(basis)) found.add('rated');
    }
    return found;
  };
  const before = modes(basisText(previous));
  const after = modes(basisText(incoming));
  // Richer wording may share a valid mode. Ambiguous text needs review, not a guessed conflict.
  return before.size > 0 && after.size > 0 && ![...before].some(mode => after.has(mode));
}

/** Only call after the page and exact quote have passed validation. Conflicts leave the entire record unchanged. */
export function applyCheckedResearchRow(record: Dossier, row: CheckedResearchRow): { status: 'applied' | 'conflict'; detail?: string } {
  const def = FIELDS[row.field];
  const caps = record.capabilities as Record<string, unknown>;
  if (def.capability && caps[def.capability] !== null && caps[def.capability] !== row.value) {
    return { status: 'conflict', detail: 'record has ' + String(caps[def.capability]) + ', row says ' + String(row.value) };
  }
  const existing = def.spec ? record.specs.find((spec) => spec.key === def.spec) : undefined;
  if (existing && existing.value !== row.value) return { status: 'conflict', detail: 'spec ' + def.spec + ' has ' + String(existing.value) };

  if (existing && conflictingModes(row.field, existing.conditions, row.basis)) {
    return { status: 'conflict', detail: 'spec ' + def.spec + ' has a different measurement basis: ' + existing.conditions + '; row says ' + row.basis };
  }

  let source = record.sources.find((item) => item.url.replace(/[/]$/, '') === row.url.replace(/[/]$/, ''));
  const previousSourceId = source?.id;
  const previousEvidence = previousSourceId ? record.researchEvidence?.find((item) => item.field === row.field && item.sourceId === previousSourceId && item.value === row.value) : undefined;
  if (previousEvidence && basisText(previousEvidence.basis) && basisText(previousEvidence.basis) !== basisText(row.basis)) {
    return { status: 'conflict', detail: 'existing field evidence has a different basis: ' + previousEvidence.basis + '; row says ' + (row.basis || 'unstated') };
  }
  if (!source) {
    const next = Math.max(0, ...record.sources.map((item) => Number(item.id.slice(1)))) + 1;
    source = { id: 's' + next, url: row.url, title: row.title || row.publisher, publisher: row.publisher, kind: row.kind, checkedAt: row.checkedAt };
    record.sources.push(source);
  }
  if (def.capability) {
    caps[def.capability] = row.value;
    if (!record.capabilities.sourceIds.includes(source.id)) record.capabilities.sourceIds.push(source.id);
  }
  if (def.spec && !existing) record.specs.push({ key: def.spec, label: def.label, value: row.value, unit: def.unit, conditions: row.basis && row.basis !== 'unstated' ? row.basis : null, sourceId: source.id });

  const evidence = { field: row.field, value: row.value, sourceId: source.id, quote: row.quote, basis: row.basis || null, checkedAt: row.checkedAt };
  record.researchEvidence ??= [];
  const index = record.researchEvidence.findIndex((item) => item.field === row.field && item.sourceId === source.id && item.value === row.value);
  if (index < 0) record.researchEvidence.push(evidence);
  else record.researchEvidence[index] = evidence;
  return { status: 'applied' };
}
