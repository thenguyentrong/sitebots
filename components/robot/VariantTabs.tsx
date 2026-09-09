import Link from 'next/link';
import { variantLabel } from '@/lib/ingest/entities';
import type { RobotVariant } from '@/lib/queries/robots';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

/**
 * Variants are tabs on one URL, not pages of their own: a G1 base and a G1
 * EDU page would be two thin near-duplicates competing for the same search.
 * The selected tab is in the query string so it can still be linked.
 */
export function VariantTabs({ base, variants, current }: { base: string; variants: RobotVariant[]; current: string }) {
  if (variants.length < 2) return null;
  return (
    <nav className={ui.segment} aria-label="Variants">
      {variants.map((v) => {
        const active = v.variant === current;
        return (
          <Link
            key={v.variant}
            href={v.variant === 'base' ? base : `${base}?variant=${v.variant}`}
            aria-current={active ? 'page' : undefined}
            className={cn(ui.segmentItem, active && ui.segmentActive)}
          >
            {v.variant === 'base' ? 'Base' : variantLabel(v.variant) || v.variant}
          </Link>
        );
      })}
    </nav>
  );
}
