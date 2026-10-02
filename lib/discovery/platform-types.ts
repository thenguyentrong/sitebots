export type PlatformMatch = {
  reviewId: string; sourceIds: string[]; rationale: string; limitations: string[];
  requiresTooling: boolean; availability: 'historical' | 'pilot_access' | 'research_order' | 'announced' | 'commercial_enquiry' | 'unknown';
  handLabel: string; movementLabel: string;
};
export const AVAILABILITY_LABELS: Record<PlatformMatch['availability'], string> = {
  historical: 'Historical model', pilot_access: 'Pilot access · enquire', research_order: 'Research hardware · request quote',
  announced: 'Announced · delivery unconfirmed', commercial_enquiry: 'Commercial enquiry', unknown: 'Supply unconfirmed',
};
