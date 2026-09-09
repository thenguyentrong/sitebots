import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5', {
  variants: {
    variant: {
      neutral: 'border-edge bg-subtle text-muted',
      outline: 'border-edge bg-card text-muted',
      ink: 'border-foreground bg-foreground text-background',
      accent: 'border-safety/20 bg-safety-soft text-safety',
      success: 'border-trust-verified/20 bg-trust-verified-soft text-trust-verified',
      info: 'border-trust-assessed/20 bg-trust-assessed-soft text-trust-assessed',
      warn: 'border-trust-reported/20 bg-trust-reported-soft text-trust-reported',
      danger: 'border-destructive/20 bg-destructive-soft text-destructive',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean };

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export { badgeVariants };
