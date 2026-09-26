import type { CSSProperties } from 'react';

/** Line icons for the journey: stations, setting groups, task families, the ten tests and statuses. 24-unit grid, stroke only. */
const PATHS: Record<string, string[]> = {
  // stations
  context: ['M3 21h18', 'M5 21V8l7-5 7 5v13', 'M10 21v-6h4v6'],
  'use-cases': ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  screen: ['M4 12l5 5L20 6'],
  priorities: ['M4 20v-8', 'M10 20V6', 'M16 20v-4', 'M22 20H2'],
  systems: ['M8 8V6a4 4 0 0 1 8 0v2', 'M5 8h14v12H5z', 'M9 13h.01', 'M15 13h.01'],
  implementation: ['M4 4h16v16H4z', 'M8 12l3 3 5-6'],
  // setting groups
  site: ['M3 21h18', 'M6 21V3h4v18', 'M10 4h11l-5 5h-6', 'M18 7v7', 'M16 14h4'],
  factory: ['M3 21V10l6 3V8l6 4V3h4l2 18z', 'M7 17h1', 'M12 17h1', 'M17 17h1'],
  yard_logistics: ['M3 9l9-6 9 6v12H3z', 'M7 21v-9h10v9', 'M7 16h10'],
  operations: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7v5l3 3'],
  // task families
  intralogistics_transport: ['M3 7h12v10H3z', 'M15 11h4l3 4v2h-7', 'M7 7V4h5v3', 'M5 20h.01', 'M18 20h.01'],
  kitting_picking_sorting: ['M3 15h18v6H3z', 'M6 15V9l5-5 4 3-4 5', 'M15 7l3 3-3 3', 'M6 18h.01', 'M12 18h.01', 'M18 18h.01'],
  machine_tending: ['M4 20h16', 'M6 20V9h12v11', 'M9 9V4h6v5', 'M12 13v3'],
  assembly_fastening: ['M14 3l7 7-4 4-7-7z', 'M3 21l7-7', 'M10 7l4 4'],
  inspection_qa_documentation: ['M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'M15 15l6 6', 'M7 10l2 2 4-4'],
  layout_marking_surveying: ['M3 3h18v18H3z', 'M3 9h12v12', 'M9 3v6', 'M9 15h6', 'M18 6h.01'],
  surface_finishing: ['M3 17l6-6 4 4 8-8', 'M3 21h18'],
  cleaning_housekeeping_replenishment: ['M14 3l-3 9', 'M7 11l8 3-2 7-9-3z', 'M18 7l3-1', 'M19 12h3'],
  heavy_element_handling: ['M3 20h18', 'M5 20V8h14v12', 'M9 8V5h6v3', 'M12 3v2'],
  packaging_palletising_loading: ['M3 9h18v12H3z', 'M3 9l4-6h10l4 6', 'M12 3v6'],
  monitoring_safety_patrol: ['M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', 'M8 12l3 3 5-6'],
  machine_operation_dedicated: ['M4 17h4l2-4h4l2 4h4', 'M8 17v3', 'M16 17v3', 'M10 13V6h4v7'],
  // the ten tests
  T1_mass: ['M8 7a4 4 0 1 1 8 0', 'M4 21l2-14h12l2 14z'],
  T2_dust: ['M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 17z'],
  T3_incumbent: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M5 5l2 2', 'M17 17l2 2', 'M5 19l2-2', 'M17 7l2-2'],
  T4_variability: ['M3 7h4l6 10h8', 'M3 17h4l6-10h8', 'M18 4l3 3-3 3', 'M18 14l3 3-3 3'],
  T5_failure_tolerance: ['M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z', 'M12 8v5', 'M12 16h.01'],
  X1_reach: ['M12 21V5', 'M6 11l6-6 6 6'],
  X2_outdoor: ['M7 15a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 17 15', 'M8 19l-1 2', 'M12 19l-1 2', 'M16 19l-1 2'],
  X3_data: ['M4 7h3l2-3h6l2 3h3v12H4z', 'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  X4_runtime: ['M3 8h15v8H3z', 'M18 10h2v4h-2', 'M6 11h5v2H6z'],
  X5_atex: ['M12 3s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4 1-7 1-9z'],
  // statuses and misc
  pass: ['M5 12l4 4L19 7'],
  fail: ['M6 6l12 12', 'M18 6L6 18'],
  marginal: ['M12 5v8', 'M12 17h.01'],
  unknown: ['M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2', 'M12 17h.01'],
  flag: ['M5 21V4h11l-1 3 1 3H5'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  plus: ['M12 5v14', 'M5 12h14'],
  better: ['M4 12h10', 'M10 8l4 4-4 4', 'M17 4h3v16h-3'],
  note: ['M6 3h9l5 5v13H6z', 'M14 3v6h6', 'M9 13h6', 'M9 17h6'],
};

export function Icon({ name, size = 18, className, style, title }: { name: string; size?: number; className?: string; style?: CSSProperties; title?: string }) {
  const paths = PATHS[name] ?? PATHS.unknown;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} className={className} style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}>
    {title ? <title>{title}</title> : null}
    {paths.map((d) => <path d={d} key={d} />)}
  </svg>;
}
