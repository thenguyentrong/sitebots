import type { Lang } from '@/lib/i18n/config';
import { trustHint, trustLabel } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';
import { cn } from '@/lib/utils';

const STYLE: Record<Trust, string> = {
  verified: 'border-trust-verified/20 bg-trust-verified-soft text-trust-verified',
  assessed: 'border-trust-assessed/20 bg-trust-assessed-soft text-trust-assessed',
  reported: 'border-trust-reported/20 bg-trust-reported-soft text-trust-reported',
  unknown: 'border-edge bg-subtle text-faint',
};

/** The trust label as a small status pill; the hover title says what it means. */
export function EvidenceBadge({ trust, lang = 'en', className }: { trust: Trust; lang?: Lang; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', STYLE[trust], className)}
      title={trustHint(trust, lang)}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {trustLabel(trust, lang)}
    </span>
  );
}
