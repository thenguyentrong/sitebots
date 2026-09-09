import * as React from 'react';
import { formatDate, formatSpec, qualifierLabel } from '@/lib/spec/display';
import { GROUPS, splitSpecKey, visibleFields, type FieldDef } from '@/lib/spec/fields';
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
 * the finding.
 */
export function SpecTable({ specs, formFactor }: { specs: Specs; formFactor: string }) {
  const keys = Object.keys(specs);
  const present = new Set(keys.map((k) => splitSpecKey(k).field));
  const fields = visibleFields(formFactor, present);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {GROUPS.filter((g) => !g.panel).map((group) => {
            const defs = fields.filter((f) => f.group === group.id);
            const rows: Row[] = defs.flatMap((def): Row[] => {
              const matching = keys.filter((k) => splitSpecKey(k).field === def.id).sort();
              if (matching.length === 0) return [{ key: def.id, def, spec: null }];
              return matching.map((k) => ({ key: k, def, spec: specs[k] }));
            });
            if (!rows.length) return null;
            return (
              <React.Fragment key={group.id}>
                <tr>
                  <th colSpan={4} className="eyebrow px-4 pt-6 pb-2 text-left">
                    {group.label}
                  </th>
                </tr>
                {rows.map(({ key, def, spec }) => {
                  const { qualifier } = splitSpecKey(key);
                  const q = qualifierLabel(qualifier);
                  return (
                    <tr key={key} className="border-t border-edge/60 align-top transition hover:bg-subtle/60">
                      <td className="w-[36%] px-4 py-2.5 text-muted">
                        {def.label}
                        {q ? <span className="text-faint"> · {q}</span> : null}
                      </td>
                      <td className="num px-2 py-2.5 font-medium">
                        {spec ? formatSpec(key, spec) : <span className="font-normal text-faint">not published</span>}
                        {spec?.note ? <div className="mt-0.5 text-xs font-normal text-faint">{spec.note}</div> : null}
                      </td>
                      <td className="px-2 py-2.5">
                        <EvidenceBadge trust={spec ? spec.trust : 'unknown'} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        {spec && spec.source_url.startsWith('curated://') ? (
                          <span className="text-faint" title={`Assessed by sitebots · ${spec.source_url.replace('curated://', 'data/curated/')}`}>
                            curated
                          </span>
                        ) : spec ? (
                          <a
                            href={spec.source_url}
                            rel="nofollow noopener"
                            target="_blank"
                            className="text-faint underline-offset-2 transition hover:text-foreground hover:underline"
                            title={`${spec.source_url} · seen ${formatDate(spec.observed_at)}${spec.raw ? ` · "${spec.raw}"` : ''}`}
                          >
                            {hostOf(spec.source_url)}
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
