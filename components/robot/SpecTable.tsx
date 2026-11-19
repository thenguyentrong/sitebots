import * as React from 'react';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { formatDate, formatSpec, qualifierLabel } from '@/lib/spec/display';
import { GROUPS, fieldLabel, groupLabel, splitSpecKey, visibleFields, type FieldDef } from '@/lib/spec/fields';
import type { Specs, SpecValue } from '@/lib/spec/types';
import { EvidenceBadge } from './EvidenceBadge';

type Row = { key: string; def: FieldDef; spec: SpecValue | null };

function hostOf(url: string): string {
  if (url.startsWith('curated://')) return 'curated';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Every field the registry knows, in registry order, with the trust badge and
 * the source it was read from. Fields nobody publishes are listed as unknown
 * rather than hidden — for a construction buyer "IP rating: not published" is
 * the finding. With `unpublishedAsList` they are named together at the end
 * instead of one empty row each.
 */
export function SpecTable({ specs, formFactor, unpublishedAsList = false, lang = 'en' }: { specs: Specs; formFactor: string; unpublishedAsList?: boolean; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
  const keys = Object.keys(specs);
  const present = new Set(keys.map((k) => splitSpecKey(k).field));
  const fields = visibleFields(formFactor, present);
  const groups = GROUPS.filter((g) => !g.panel).map((group) => ({
    group,
    rows: fields.filter((f) => f.group === group.id).flatMap((def): Row[] => {
      const matching = keys.filter((k) => splitSpecKey(k).field === def.id).sort();
      if (matching.length === 0) return [{ key: def.id, def, spec: null }];
      return matching.map((k) => ({ key: k, def, spec: specs[k] }));
    }),
  }));
  const unpublished = unpublishedAsList ? groups.flatMap(({ rows }) => rows.filter((row) => !row.spec).map((row) => fieldLabel(row.def.id, lang))) : [];
  const [open, close] = lang === 'de' ? ['„', '“'] : ['"', '"'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {groups.map(({ group, rows: all }) => {
            const rows = unpublishedAsList ? all.filter((row) => row.spec) : all;
            if (!rows.length) return null;
            return (
              <React.Fragment key={group.id}>
                <tr>
                  <th colSpan={4} className="eyebrow px-4 pt-6 pb-2 text-left">
                    {groupLabel(group.id, lang)}
                  </th>
                </tr>
                {rows.map(({ key, def, spec }) => {
                  const { qualifier } = splitSpecKey(key);
                  const q = qualifierLabel(qualifier, lang);
                  // On a phone the source goes under the value instead of a fourth column.
                  const source = spec && spec.source_url.startsWith('curated://') ? (
                    <span className="text-faint" title={`${t.assessedBy} · ${spec.source_url.replace('curated://', 'data/curated/')}`}>
                      {t.curated}
                    </span>
                  ) : spec ? (
                    <a
                      href={spec.source_url}
                      rel="nofollow noopener"
                      target="_blank"
                      className="text-faint underline-offset-2 transition hover:text-foreground hover:underline"
                      title={`${spec.source_url} · ${t.seen} ${formatDate(spec.observed_at, lang)}${spec.raw ? ` · ${open}${spec.raw}${close}` : ''}`}
                    >
                      {hostOf(spec.source_url)}
                    </a>
                  ) : null;
                  return (
                    <tr key={key} className="border-t border-edge/60 align-top transition hover:bg-subtle/60">
                      <td className="w-[36%] px-4 py-2.5 text-muted">
                        {fieldLabel(def.id, lang)}
                        {q ? <span className="text-faint"> · {q}</span> : null}
                      </td>
                      <td className="num px-2 py-2.5 font-medium">
                        {spec ? formatSpec(key, spec, lang) : <span className="font-normal text-faint">{t.notPublished}</span>}
                        {spec?.note ? <div className="mt-0.5 text-xs font-normal text-faint" lang={recordLang(lang)}>{spec.note}</div> : null}
                        {source ? <div className="mt-0.5 text-xs font-normal sm:hidden">{source}</div> : null}
                      </td>
                      <td className="px-2 py-2.5">
                        <EvidenceBadge trust={spec ? spec.trust : 'unknown'} lang={lang} />
                      </td>
                      <td className="hidden px-4 py-2.5 text-right text-xs sm:table-cell">{source}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
          {unpublished.length ? (
            <tr className="border-t border-edge/60" data-testid="spec-unpublished">
              <td colSpan={4} className="px-4 pt-4 pb-2">
                <p className="eyebrow">{t.notPublishedTitle} · {unpublished.length}</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {unpublished.map((label, index) => (
                    <li key={label + index} className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted">{label}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-faint">{t.notPublishedAnywhere}</p>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
