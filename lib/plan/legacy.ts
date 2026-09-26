import type { FamilyId, SettingGroup } from '@/lib/content/vocab';

/**
 * Bridges between the version-one finder (eight jobs, three settings) and the
 * journey (task families, four setting groups). The old ids survive on a
 * project as mirrors so the components that still read `jobId` and `setting`
 * keep working until the stations replace them; the migration and the
 * project constructors are the only writers.
 */

export type LegacySetting = '' | 'site' | 'factory' | 'yard';

export const FAMILY_FOR_JOB: Record<string, FamilyId | ''> = {
  transport: 'intralogistics_transport',
  inspection: 'inspection_qa_documentation',
  progress: 'inspection_qa_documentation',
  monitoring: 'monitoring_safety_patrol',
  layout: 'layout_marking_surveying',
  cleaning: 'cleaning_housekeeping_replenishment',
  sorting: 'kitting_picking_sorting',
  custom: '',
};

export const JOB_FOR_FAMILY: Record<FamilyId, string> = {
  intralogistics_transport: 'transport',
  kitting_picking_sorting: 'sorting',
  machine_tending: 'custom',
  assembly_fastening: 'custom',
  inspection_qa_documentation: 'inspection',
  layout_marking_surveying: 'layout',
  surface_finishing: 'custom',
  cleaning_housekeeping_replenishment: 'cleaning',
  heavy_element_handling: 'custom',
  packaging_palletising_loading: 'custom',
  monitoring_safety_patrol: 'monitoring',
  machine_operation_dedicated: 'custom',
};

export const GROUP_FOR_SETTING: Record<LegacySetting, SettingGroup | ''> = { '': '', site: 'site', factory: 'factory', yard: 'yard_logistics' };
export const SETTING_FOR_GROUP: Record<SettingGroup | '', LegacySetting> = { '': '', site: 'site', factory: 'factory', yard_logistics: 'yard', operations: '' };

export const familyForJob = (jobId: string): FamilyId | '' => FAMILY_FOR_JOB[jobId] ?? '';
export const jobForFamily = (family: FamilyId | ''): string => (family ? JOB_FOR_FAMILY[family] : 'custom');
