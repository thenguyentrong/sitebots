'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { useLang } from '@/lib/i18n/client';
import { bilingual } from '@/lib/i18n/text';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

const TEXT = bilingual({
  en: { view: 'Profile view', site: 'Site conditions', tasks: 'Tasks' },
  de: { view: 'Ansicht des Profils', site: 'Baustellenbedingungen', tasks: 'Aufgaben' },
});

/** Two server-rendered views with keyboard-accessible tabs. */
export function ProfileToggle({ site, tasks }: { site: ReactNode; tasks: ReactNode }) {
  const t = TEXT[useLang()];
  const [view, setView] = useState<'site' | 'tasks'>('site');
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const views = ['site', 'tasks'] as const;
  return <div>
    <div className={cn(ui.segment, 'mb-4')} role="tablist" aria-label={t.view}>
      {views.map((v, index) => <button key={v} ref={el => { refs.current[index] = el; }} type="button" role="tab" id={`${id}-${v}-tab`} aria-controls={`${id}-${v}-panel`} aria-selected={view === v} tabIndex={view === v ? 0 : -1} onClick={() => setView(v)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        setView(views[next]); refs.current[next]?.focus();
      }} className={cn(ui.segmentItem, view === v && ui.segmentActive)} data-profile-tab={v}>{v === 'site' ? t.site : t.tasks}</button>)}
    </div>
    {views.map(v => <div key={v} id={`${id}-${v}-panel`} role="tabpanel" aria-labelledby={`${id}-${v}-tab`} tabIndex={0} hidden={view !== v} data-profile-view={v}>{v === 'site' ? site : tasks}</div>)}
  </div>;
}
