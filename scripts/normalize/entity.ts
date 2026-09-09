import { curatedAliases, generatedAliases, type AliasFile } from '@/lib/ingest/aliases';
import type { FormFactor } from '@/lib/spec/enums';
import type { RawRecord } from '../scrape/_lib/types';

/**
 * Turn the words a source used into our identity: (manufacturer, model,
 * variant). Everything is driven by the alias files; nothing is guessed from
 * string similarity. The manufacturer is resolved first and the model only
 * searched within it, so "G1" cannot cross from Unitree to Galbot.
 *
 * Two passes: the curated file, then the generated one. A curated
 * manufacturer with an unknown model falls through to the generated models
 * of that same manufacturer, which is how "Unitree Superman" from an
 * aggregator lands under `unitree` without touching the curated G1 entries.
 */
export type ResolvedSubject = {
  manufacturerSlug: string;
  modelSlug: string;
  variant: string;
  name: string;
  formFactor: FormFactor;
  /** Which file produced the match. */
  via: 'curated' | 'generated';
};

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word, case-insensitive; hyphen and slash count as boundaries. */
function wordMatch(alias: string, text: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9])${escape(alias)}(?=$|[^a-z0-9])`, 'i');
  return re.test(text);
}

function longestMatch(aliases: string[], text: string): string | null {
  let best: string | null = null;
  for (const a of aliases) {
    if (a && wordMatch(a, text) && (!best || a.length > best.length)) best = a;
  }
  return best;
}

export function resolveManufacturer(file: AliasFile, subject: RawRecord['subject']): string | null {
  const haystack = [subject.manufacturer_raw, subject.model_raw, subject.variant_raw ?? ''].join(' ');
  let slug: string | null = null;
  let bestLen = 0;
  for (const [s, m] of Object.entries(file.manufacturers)) {
    const names = [m.name, ...m.aliases];
    // The maker field is authoritative when it matches; the model string is
    // searched only as a fallback for feeds without a maker column.
    const hit = longestMatch(names, subject.manufacturer_raw) ?? (subject.manufacturer_raw ? null : longestMatch(names, haystack));
    if (hit && hit.length > bestLen) {
      slug = s;
      bestLen = hit.length;
    }
  }
  return slug;
}

function resolveModel(file: AliasFile, manufacturerSlug: string, subject: RawRecord['subject'], via: 'curated' | 'generated'): ResolvedSubject | null {
  const robots = file.robots[manufacturerSlug] ?? {};
  const modelText = `${subject.model_raw} ${subject.variant_raw ?? ''}`;
  let modelSlug: string | null = null;
  let modelLen = 0;
  for (const [slug, r] of Object.entries(robots)) {
    const hit = longestMatch([r.name, ...r.aliases], modelText);
    if (hit && hit.length > modelLen) {
      modelSlug = slug;
      modelLen = hit.length;
    }
  }
  if (!modelSlug) return null;
  const robot = robots[modelSlug];

  let variant = 'base';
  let variantLen = 0;
  for (const [v, aliases] of Object.entries(robot.variants ?? {})) {
    const hit = longestMatch(aliases, modelText);
    if (hit && hit.length > variantLen) {
      variant = v;
      variantLen = hit.length;
    }
  }
  return { manufacturerSlug, modelSlug, variant, name: robot.name, formFactor: robot.form_factor, via };
}

export function resolveSubjectIn(file: AliasFile, subject: RawRecord['subject'], via: 'curated' | 'generated' = 'curated'): ResolvedSubject | null {
  const manufacturerSlug = resolveManufacturer(file, subject);
  if (!manufacturerSlug) return null;
  return resolveModel(file, manufacturerSlug, subject, via);
}

export function resolveSubject(subject: RawRecord['subject']): ResolvedSubject | null {
  const curated = curatedAliases();
  const generated = generatedAliases();

  const hit = resolveSubjectIn(curated, subject, 'curated');
  if (hit) return hit;
  if (!generated) return null;

  // A curated manufacturer keeps its slug in the generated file, so an
  // unknown model of a known maker is looked up there under the same key.
  const curatedMaker = resolveManufacturer(curated, subject);
  if (curatedMaker && generated.robots[curatedMaker]) {
    const g = resolveModel(generated, curatedMaker, subject, 'generated');
    if (g) return g;
  }
  return resolveSubjectIn(generated, subject, 'generated');
}
