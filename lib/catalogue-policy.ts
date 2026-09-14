import { isPublicManufacturer } from '@/lib/manufacturers';

// Upstream placeholders are kept in the evidence ledger, but never presented as products.
export const PLACEHOLDER_MODEL_PATTERN = '^tbd(-[0-9]+)?$';
const placeholderModel = new RegExp(PLACEHOLDER_MODEL_PATTERN, 'i');
export function isPublicRobot(manufacturer: string, model: string): boolean {
  return isPublicManufacturer(manufacturer) && !placeholderModel.test(model);
}
