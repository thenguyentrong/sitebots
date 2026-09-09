import type { FormFactor } from '@/lib/spec/enums';

/**
 * Placeholder for robots without a licensed image or a 3D model: a line glyph
 * of the form factor. Better than a broken image, honest about what we have.
 */
export function RobotGlyph({ formFactor, className }: { formFactor: FormFactor; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (formFactor === 'quadruped') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden {...common}>
        <rect x="10" y="16" width="26" height="10" rx="2" />
        <path d="M36 19h5v-4" />
        <path d="M14 26v9l-3 5M22 26v9l3 5M28 26v9l-3 5M34 26v9l3 5" />
      </svg>
    );
  }
  if (formFactor === 'mobile_manipulator') {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden {...common}>
        <rect x="8" y="28" width="30" height="10" rx="2" />
        <circle cx="13" cy="41" r="2.5" />
        <circle cx="33" cy="41" r="2.5" />
        <path d="M20 28v-9l8-6 7 4" />
        <path d="M35 17l3-3M35 17l4 1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden {...common}>
      <circle cx="24" cy="8" r="4" />
      <path d="M24 12v14M16 16h16M16 16l-3 10M32 16l3 10" />
      <path d="M24 26l-5 15M24 26l5 15" />
    </svg>
  );
}
