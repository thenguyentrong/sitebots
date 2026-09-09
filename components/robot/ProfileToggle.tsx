'use client';

import { useState, type ReactNode } from 'react';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** Two server-rendered views, one shown. No refetch, no chart library. */
export function ProfileToggle({ site, tasks }: { site: ReactNode; tasks: ReactNode }) {
  const [view, setView] = useState<'site' | 'tasks'>('site');
  return (
    <div>
      <div className={cn(ui.segment, 'mb-4')} role="tablist" aria-label="Profile view">
        {(['site', 'tasks'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn(ui.segmentItem, view === v && ui.segmentActive)} data-profile-tab={v}>
            {v === 'site' ? 'Site conditions' : 'Tasks'}
          </button>
        ))}
      </div>
      <div hidden={view !== 'site'} data-profile-view="site">{site}</div>
      <div hidden={view !== 'tasks'} data-profile-view="tasks">{tasks}</div>
    </div>
  );
}
