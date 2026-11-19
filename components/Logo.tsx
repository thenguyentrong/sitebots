import Link from '@/components/LocaleLink';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-safety text-white shadow-sm', className)} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="16" height="11" rx="3.5" />
        <path d="M12 4v4M8 19v2M16 19v2" />
        <circle cx="9.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

/** `compact` drops the name on phones, where the menu needs the room. */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" aria-label={SITE.name} className={cn('flex shrink-0 items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[15px] font-semibold tracking-tight', compact && 'max-sm:sr-only')}>{SITE.name}</span>
    </Link>
  );
}
