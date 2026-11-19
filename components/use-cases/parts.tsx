import type { StageCounts } from '@/lib/market/use-case-views';
import { USE_STAGES, type UseStage } from '@/lib/market/use-cases';
import { cn } from '@/lib/utils';

// Small pieces the use-case pictures share: a country flag, the stage colours and the stage bar.

/** One hue in three steps, darkest for daily use (the proof scale of globals.css, flipped in dark mode). */
export const STAGE_COLOR: Record<UseStage, string> = { deployment: 'var(--proof-deployment)', pilot: 'var(--proof-pilot)', demo: 'var(--proof-demo)' };
export const STAGE_SHORT: Record<UseStage, [string, string]> = { deployment: ['in daily use', 'in daily use'], pilot: ['pilot', 'pilots'], demo: ['demo', 'demos'] };

/** A country flag from public/flags (country-flag-icons, copied by scripts/assets/flags.sh). The name stands next to it, so the image is decorative. */
export function CountryFlag({ code, className }: { code: string | null | undefined; className?: string }) {
  if (!code) return null;
  const iso = (code === 'UK' ? 'GB' : code).toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${iso}.svg`} alt="" width={18} height={12} loading="lazy" className={cn('inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10', className)} />;
}

export function StageDot({ stage, className }: { stage: UseStage; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)} style={{ background: STAGE_COLOR[stage] }} />;
}

const words = (stages: StageCounts) => USE_STAGES.filter((s) => stages[s]).map((s) => `${stages[s]} ${STAGE_SHORT[s][stages[s] === 1 ? 0 : 1]}`);

/** The share of daily use, pilots and demos in one rounded bar, with a 2px gap between the parts. */
export function StageBar({ stages, className }: { stages: StageCounts; className?: string }) {
  const total = stages.deployment + stages.pilot + stages.demo;
  if (!total) return null;
  return <div role="img" aria-label={words(stages).join(', ')} className={cn('flex h-2 w-full gap-[2px] overflow-hidden rounded-full', className)}>
    {USE_STAGES.map((s) => stages[s] ? <span key={s} title={`${stages[s]} ${STAGE_SHORT[s][stages[s] === 1 ? 0 : 1]}`} className="h-full min-w-[4px]" style={{ flexGrow: stages[s], background: STAGE_COLOR[s] }} /> : null)}
  </div>;
}

/** "12 in daily use · 2 pilots", each part with its colour dot. */
export function StageWords({ stages, className }: { stages: StageCounts; className?: string }) {
  return <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted', className)}>
    {USE_STAGES.filter((s) => stages[s]).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><StageDot stage={s} /><span><span className="num font-medium text-foreground">{stages[s]}</span> {STAGE_SHORT[s][stages[s] === 1 ? 0 : 1]}</span></span>)}
  </p>;
}

export function StageLegend({ className }: { className?: string }) {
  return <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)} aria-label="Colour key">
    <li className="inline-flex items-center gap-1.5"><StageDot stage="deployment" />In daily use</li>
    <li className="inline-flex items-center gap-1.5"><StageDot stage="pilot" />Pilot on a real project</li>
    <li className="inline-flex items-center gap-1.5"><StageDot stage="demo" />Demonstration</li>
  </ul>;
}
