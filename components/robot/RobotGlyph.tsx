import type { FormFactor } from '@/lib/spec/enums';

/** A class glyph is a placeholder, never evidence about a particular configuration. */
export function RobotGlyph({ formFactor, className }: { formFactor: FormFactor; className?: string }) {
  const common = {
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  let shape;
  if (formFactor === 'humanoid') shape = <>
    <circle cx="24" cy="8" r="4" />
    <path d="M24 12v14M16 16h16M16 16l-3 10M32 16l3 10M24 26l-5 15M24 26l5 15" />
  </>;
  else if (formFactor === 'quadruped') shape = <>
    <rect x="10" y="16" width="26" height="10" rx="2" />
    <path d="M36 19h5v-4M14 26v9l-3 5M22 26v9l3 5M28 26v9l-3 5M34 26v9l3 5" />
  </>;
  else if (formFactor === 'mobile_manipulator') shape = <>
    <rect x="8" y="28" width="30" height="10" rx="2" />
    <circle cx="13" cy="41" r="2.5" /><circle cx="33" cy="41" r="2.5" />
    <path d="M20 28v-9l8-6 7 4M35 17l3-3M35 17l4 1" />
  </>;
  else if (formFactor === 'amr_agv') shape = <>
    <rect x="6" y="22" width="36" height="13" rx="3" />
    <rect x="15" y="11" width="18" height="11" rx="1" />
    <circle cx="13" cy="38" r="3" /><circle cx="35" cy="38" r="3" />
    <path d="M20 28h8" />
  </>;
  else if (formFactor === 'industrial_arm' || formFactor === 'cobot') shape = <>
    <path d="M9 41h18l-2-6H12zM18 35V22l10-12 9 8-6 9M31 27l-4-1M31 27l1 4" />
    <circle cx="18" cy="22" r="3" /><circle cx="28" cy="10" r="3" /><circle cx="37" cy="18" r="2" />
  </>;
  else if (formFactor === 'integrated_cell') shape = <>
    <rect x="5" y="5" width="38" height="36" rx="2" />
    <path d="M5 31h38M10 36h28M18 30V20l8-9 9 6-5 8M30 25h-4M30 25v4" />
    <circle cx="18" cy="20" r="2" />
  </>;
  else shape = <>
    <rect x="10" y="10" width="28" height="27" rx="4" />
    <path d="M16 17h16M16 23h8M14 37v4M34 37v4" />
    <circle cx="29" cy="29" r="4" />
  </>;
  return <svg viewBox="0 0 48 48" className={className} aria-hidden {...common}>{shape}</svg>;
}
