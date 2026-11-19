import type { ScenePicture, StageCounts } from '@/lib/market/use-case-views';
import { USE_STAGES, type UseStage } from '@/lib/market/use-cases';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { MARKET_TEXT } from '@/lib/i18n/market';
import { cn } from '@/lib/utils';
import './use-cases.css';

// Small pieces the use-case pictures share: a country flag, the stage colours and the stage bar.

/** One hue in three steps, darkest for daily use (the proof scale of globals.css, flipped in dark mode). */
export const STAGE_COLOR: Record<UseStage, string> = { deployment: 'var(--proof-deployment)', pilot: 'var(--proof-pilot)', demo: 'var(--proof-demo)' };
export const STAGE_SHORT: Record<UseStage, [string, string]> = MARKET_TEXT.en.useStageCount;
/** "12 in daily use", "1 pilot", "3 Demos": a stage counted, in the page's language. */
export const stageCount = (stage: UseStage, n: number, lang: Lang) => formatNumber(n, lang) + ' ' + MARKET_TEXT[lang].useStageCount[stage][n === 1 ? 0 : 1];

/** A country flag from public/flags (country-flag-icons, copied by scripts/assets/flags.sh). The name stands next to it, so the image is decorative. */
export function CountryFlag({ code, className }: { code: string | null | undefined; className?: string }) {
  if (!code) return null;
  const iso = (code === 'UK' ? 'GB' : code).toUpperCase();
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${iso}.svg`} alt="" width={18} height={12} loading="lazy" className={cn('uc-flag', className)} />;
}

export function StageDot({ stage, className }: { stage: UseStage; className?: string }) {
  return <span aria-hidden className={cn('uc-dot', className)} style={{ background: STAGE_COLOR[stage] }} />;
}

const words = (stages: StageCounts, lang: Lang) => USE_STAGES.filter((s) => stages[s]).map((s) => stageCount(s, stages[s], lang));

/** The share of daily use, pilots and demos in one rounded bar, with a 2px gap between the parts. */
export function StageBar({ stages, lang, className }: { stages: StageCounts; lang: Lang; className?: string }) {
  const total = stages.deployment + stages.pilot + stages.demo;
  if (!total) return null;
  return <div role="img" aria-label={words(stages, lang).join(', ')} className={cn('flex h-2 w-full gap-[2px] overflow-hidden rounded-full', className)}>
    {USE_STAGES.map((s) => stages[s] ? <span key={s} title={stageCount(s, stages[s], lang)} className="h-full min-w-[4px]" style={{ flexGrow: stages[s], background: STAGE_COLOR[s] }} /> : null)}
  </div>;
}

/** "12 in daily use · 2 pilots", each part with its colour dot. */
export function StageWords({ stages, lang, className }: { stages: StageCounts; lang: Lang; className?: string }) {
  return <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted', className)}>
    {USE_STAGES.filter((s) => stages[s]).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><StageDot stage={s} /><span><span className="num font-medium text-foreground">{formatNumber(stages[s], lang)}</span> {MARKET_TEXT[lang].useStageCount[s][stages[s] === 1 ? 0 : 1]}</span></span>)}
  </p>;
}

export function StageLegend({ lang, className }: { lang: Lang; className?: string }) {
  const t = MARKET_TEXT[lang];
  return <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)} aria-label={t.colourKey}>
    {USE_STAGES.map((s) => <li key={s} className="inline-flex items-center gap-1.5"><StageDot stage={s} />{t.useStage[s]}</li>)}
  </ul>;
}

/** How a photo fills a card: a wide photo of work fills it and keeps its upper part (heads, booms, arms);
 * a product shot or an upright picture is shown whole on white. */
export const photoFit = (p: Pick<ScenePicture, 'scene' | 'width' | 'height'>, pad = 'p-4') =>
  p.scene && p.width / p.height >= 1.25 ? 'object-cover object-[50%_30%]' : 'object-contain ' + pad;
