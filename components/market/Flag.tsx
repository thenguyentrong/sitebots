import { cn } from '@/lib/utils';

/** The German flag as three stripes in a small rounded badge, for "buy in Germany". */
export function GermanFlag({ className, title = 'Germany' }: { className?: string; title?: string }) {
  return <span role="img" aria-label={title} title={title} className={cn('inline-flex h-[0.8em] w-[1.3em] shrink-0 flex-col overflow-hidden rounded-[3px] align-[-0.05em] ring-1 ring-black/10', className)}>
    <span className="flex-1 bg-[#000000]" />
    <span className="flex-1 bg-[#DD0000]" />
    <span className="flex-1 bg-[#FFCE00]" />
  </span>;
}
