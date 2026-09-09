/**
 * Class recipes shared by server and client components. Tailwind reads this
 * file like any other, so the strings must stay literal.
 */
export const ui = {
  input:
    'h-10 w-full rounded-lg border border-edge bg-card px-3 text-sm text-foreground transition placeholder:text-faint hover:border-edge-strong focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10',
  select:
    'select h-10 w-full rounded-lg border border-edge bg-card pl-3 pr-9 text-sm text-foreground transition hover:border-edge-strong focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10',
  btn: 'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-5 text-sm font-medium text-background shadow-sm transition hover:bg-foreground/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  btnSecondary:
    'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-edge bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:border-edge-strong hover:bg-subtle active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  btnGhost:
    'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted transition hover:bg-subtle hover:text-foreground',
  sm: 'h-8 px-3.5 text-xs',
  /** Segmented control wrapper and its items. */
  segment: 'inline-flex flex-wrap items-center gap-1 rounded-full border border-edge bg-subtle p-1',
  segmentItem: 'rounded-full px-3 py-1 text-sm text-muted transition hover:text-foreground',
  segmentActive: 'bg-card text-foreground shadow-sm font-medium',
  link: 'underline decoration-edge-strong underline-offset-4 transition hover:decoration-foreground',
} as const;
