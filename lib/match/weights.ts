/**
 * Soft-criterion weights. /methodology renders this object, so what the page
 * says and what the code does cannot drift apart. Hard criteria have no
 * weight: they exclude or they pass.
 */
export const WEIGHTS = {
  runtime: 2,
  budget: 2,
  lead_time: 1.5,
  terrain: 2,
  dust: 1.5,
  wet: 1.5,
  noise: 0.5,
  evidence: 0.5,
} as const;

export type SoftCriterion = keyof typeof WEIGHTS;

export const HARD_CRITERIA = [
  'form_factor',
  'payload',
  'reach',
  'tasks',
  'stairs',
  'slope',
  'outdoor',
  'temperature',
  'autonomy',
  'certifications',
] as const;

export const LABELS: Record<string, string> = {
  form_factor: 'Form factor',
  payload: 'Payload',
  reach: 'Reach',
  tasks: 'Site tasks',
  stairs: 'Stairs',
  slope: 'Slope',
  outdoor: 'Outdoor use',
  temperature: 'Temperature',
  autonomy: 'Autonomy',
  certifications: 'Certifications',
  runtime: 'Runtime per shift',
  budget: 'Budget',
  lead_time: 'Delivery',
  terrain: 'Terrain',
  dust: 'Dust',
  wet: 'Wet',
  noise: 'Noise',
  evidence: 'Evidence',
};
