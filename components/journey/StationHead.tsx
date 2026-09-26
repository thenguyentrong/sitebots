'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePlan } from '@/lib/plan/store';
import { ui } from '@/lib/ui';
import { Icon } from './Icon';

/** Kicker, title and one lede paragraph: the same head on every step. */
export function StationHead({ kicker, title, lede }: { kicker?: string; title: string; lede?: ReactNode }) {
  return <header className="jp-head plan-screen">
    {kicker ? <p className="jp-kicker">{kicker}</p> : null}
    <h1>{title}</h1>
    {lede ? <p className="jp-lede">{lede}</p> : null}
  </header>;
}

/** Whether the plan is stored; shown once, at the foot of a step. */
export function Saved() {
  const plan = usePlan();
  return <p className={'jp-saved' + (plan.persistenceError ? ' is-error' : '')} role="status">
    {!plan.ready ? 'Opening your plan…' : plan.persistenceError ? 'Not saved: browser storage unavailable' : 'Saved in this browser'}
  </p>;
}

/** The foot of a step: saved status on the left, the next step on the right. Part of the page flow, never pinned. */
export function StationNext({ href, label, note, onClick }: { href: string; label: string; note?: ReactNode; onClick?: () => void }) {
  return <div className="jp-next plan-screen">
    <div className="flex flex-wrap items-center gap-6">{note ? <p className="jp-muted">{note}</p> : null}<Saved /></div>
    <Link className={ui.btn} href={href} onClick={onClick}>{label} <Icon name="arrow" size={16} /></Link>
  </div>;
}
