import { z } from 'zod';
import reviewData from '@/data/robots/status-reviews.json';
import { AVAILABILITY_STATUS, REGIONS, ROBOT_STATUS } from '@/lib/spec/enums';

const Review = z.object({
  manufacturer: z.string().min(1), model: z.string().min(1), variant: z.string().min(1),
  status: z.enum(ROBOT_STATUS), sourceUrl: z.url(), observedAt: z.iso.datetime(), reason: z.string().min(1),
  evidence: z.array(z.object({ url: z.url(), note: z.string().min(1) })),
  price: z.object({ amount: z.number().positive(), currency: z.string().regex(/^[A-Z]{3}$/), region: z.enum(REGIONS), config: z.string().min(1), includesVat: z.boolean().nullable(), note: z.string().min(1) }).optional(),
  availability: z.object({ region: z.enum(REGIONS), status: z.enum(AVAILABILITY_STATUS), note: z.string().min(1) }),
});
export const robotStatusReviews = z.object({ reviews: z.array(Review) }).parse(reviewData).reviews;

/** Exact variants only: an orderable kit never establishes availability of every related configuration. */
export function reviewedRobotStatus(manufacturer: string, model: string, variant = 'base') {
  return robotStatusReviews.find(r => r.manufacturer === manufacturer && r.model === model && r.variant === variant) ?? null;
}
