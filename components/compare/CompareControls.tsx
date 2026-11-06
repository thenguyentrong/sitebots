'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { comparisonHref, useCompare, type CompareItem } from '@/lib/compare/store';
import type { CompareHit } from '@/lib/compare/search';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Show this set of robots. The saved selection follows, so the bar and the table stay the same list. */
function useShow() {
  const router = useRouter();
  const { replace } = useCompare();
  return (items: CompareItem[]) => {
    replace(items);
    router.push(comparisonHref(items));
  };
}

export function CompareRemove({ id, name, items }: { id: string; name: string; items: CompareItem[] }) {
  const show = useShow();
  return <button type="button" onClick={() => show(items.filter((item) => item.id !== id))} aria-label={'Remove ' + name + ' from comparison'} className="mt-1 text-xs text-faint underline underline-offset-2 transition hover:text-foreground">Remove</button>;
}

type Search = { state: 'idle' | 'loading' | 'failed' } | { state: 'done'; hits: CompareHit[] };

/** Adds any robot by name without leaving the page. Results come from the server a few at a time. */
export function CompareSearch({ selected, max }: { selected: CompareItem[]; max: number }) {
  const show = useShow();
  const list = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<Search>({ state: 'idle' });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const full = selected.length >= max;
  const wanted = query.trim();

  useEffect(() => {
    if (wanted.length < 2) return;
    const controller = new AbortController();
    // A short pause so a fast typist sends one request, not one per letter.
    const timer = setTimeout(async () => {
      setSearch({ state: 'loading' });
      try {
        const response = await fetch('/api/compare/search?q=' + encodeURIComponent(wanted), { signal: controller.signal });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const { hits } = (await response.json()) as { hits: CompareHit[] };
        setSearch({ state: 'done', hits });
        setActive(0);
      } catch (error) {
        if (!controller.signal.aborted) setSearch({ state: 'failed' });
        else void error;
      }
    }, 160);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [wanted]);

  const hits = wanted.length >= 2 && search.state === 'done' ? search.hits.filter((hit) => !selected.some((item) => item.id === hit.id)) : [];
  const message = wanted.length < 2 ? null : search.state === 'failed' ? 'Search is not available right now.'
    : search.state === 'done' && !hits.length ? (search.hits.length ? 'Already in this comparison.' : 'No robot matches “' + wanted + '”.')
      : search.state === 'done' ? null : 'Searching…';
  const showList = open && !full && (hits.length > 0 || message !== null);
  const add = (hit: CompareHit) => {
    setQuery('');
    setSearch({ state: 'idle' });
    setOpen(false);
    show([...selected, { id: hit.id, name: hit.name }]);
    input.current?.focus();
  };
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false);
    if (!hits.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => (index + 1) % hits.length); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index - 1 + hits.length) % hits.length); }
    if (event.key === 'Enter') { event.preventDefault(); add(hits[Math.min(active, hits.length - 1)]); }
  };

  return <div className="relative w-full max-w-md" data-compare-search>
    <label htmlFor={list + '-input'} className="label mb-1.5 block">Add a robot</label>
    <input
      ref={input}
      id={list + '-input'}
      type="search"
      role="combobox"
      aria-expanded={showList}
      aria-controls={list}
      aria-autocomplete="list"
      aria-activedescendant={showList && hits.length ? list + '-' + Math.min(active, hits.length - 1) : undefined}
      autoComplete="off"
      disabled={full}
      placeholder={full ? 'Comparison full. Remove a robot to add another.' : 'Search by name or maker'}
      value={query}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={onKey}
      className={cn(ui.input, 'disabled:cursor-not-allowed disabled:bg-subtle')}
    />
    {showList ? <ul id={list} role="listbox" aria-label="Robots found" className="absolute inset-x-0 top-full z-20 mt-2 max-h-96 overflow-y-auto rounded-xl border border-edge bg-card p-1 shadow-float">
      {hits.map((hit, index) => <li
        key={hit.id}
        id={list + '-' + index}
        role="option"
        aria-selected={index === active}
        // The press keeps focus in the box, so the list is still there when the click lands.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => add(hit)}
        onMouseEnter={() => setActive(index)}
        className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5', index === active && 'bg-subtle')}
      >
        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f4f4f5] p-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small thumbnail, local or remote */}
          {hit.picture ? <img src={hit.picture} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-contain" /> : null}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{hit.name}</span>
          <span className="block truncate text-xs text-muted">{hit.maker} · {hit.type}</span>
        </span>
      </li>)}
      {message ? <li role="presentation" className="px-3 py-2 text-sm text-muted">{message}</li> : null}
    </ul> : null}
  </div>;
}
