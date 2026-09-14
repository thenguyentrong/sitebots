import type { CSSProperties } from 'react';

const paths: Record<string, string[]> = {
  transport: ['M3 7h12v10H3z', 'M15 11h4l3 4v2h-7', 'M7 7V4h5v3', 'M5 20h.01M18 20h.01'],
  inspection: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'm15 15 6 6', 'm7 10 2 2 4-4'],
  progress: ['M4 7h4l2-3h4l2 3h4v13H4z', 'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  monitoring: ['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', 'm8 12 3 3 5-6'],
  layout: ['M3 3h18v18H3z', 'M3 9h12v12', 'M9 3v6', 'M9 15h6', 'M18 6h.01'],
  cleaning: ['m14 3-3 9', 'm7 11 8 3-2 7-9-3z', 'm18 7 3-1M19 12h3'],
  sorting: ['M3 15h18v6H3z', 'M6 15V9l5-5 4 3-4 5', 'm15 7 3 3-3 3', 'M6 18h.01M12 18h.01M18 18h.01'],
  custom: ['M12 4v16M4 12h16'],
  site: ['M3 21h18M6 21V3h4v18M10 4h11l-5 5h-6M18 7v7M16 14h4'],
  factory: ['M3 21V10l6 3V8l6 4V3h4l2 18z', 'M7 17h1M12 17h1M17 17h1'],
  yard: ['M3 9 12 3l9 6v12H3z', 'M7 21v-9h10v9M7 16h10'],
};
export function PlanIcon({ name, size = 24, style }: { name: string; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{(paths[name] ?? paths.custom).map((path) => <path d={path} key={path} />)}</svg>;
}