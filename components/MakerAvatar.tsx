import { cn } from '@/lib/utils';

/** Initials in a soft tile; makers have no licensed logos here. */
export function MakerAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-subtle text-xs font-semibold text-muted', className)} aria-hidden>
      {initials || '?'}
    </span>
  );
}
