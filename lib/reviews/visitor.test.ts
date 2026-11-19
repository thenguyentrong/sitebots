import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ReviewInput, deleteReview, diskStore, listReviews, saveReview } from './visitor';

describe('visitor reviews', () => {
  const store = diskStore(mkdtempSync(join(tmpdir(), 'reviews-')));
  const input = ReviewInput.parse({ target: 'robot:unitree-g1', rating: 4, worked: true, role: 'Lab lead', text: 'Walked for two hours on the lab floor without a fall.' });
  it('keeps one review per account and target, and never shows the account code', async () => {
    await saveReview(input, 'u1', 'google', store, new Date('2026-11-19T10:00:00Z'));
    await saveReview({ ...input, rating: 5 }, 'u1', 'google', store, new Date('2026-11-20T10:00:00Z'));
    await saveReview({ ...input, rating: 2 }, 'u2', 'microsoft', store);
    const seen = await listReviews('robot:unitree-g1', 'u1', store);
    expect(seen).toHaveLength(2);
    expect(seen.find((r) => r.mine)?.rating).toBe(5);
    expect(seen.find((r) => r.mine)?.createdAt).toBe('2026-11-19T10:00:00.000Z');
    expect(JSON.stringify(seen)).not.toContain('u1');
    await deleteReview('robot:unitree-g1', 'u1', store);
    expect(await listReviews('robot:unitree-g1', 'u1', store)).toHaveLength(1);
  });
  it('refuses short texts, bad ratings and unknown kinds of target', () => {
    expect(ReviewInput.safeParse({ ...input, text: 'too short' }).success).toBe(false);
    expect(ReviewInput.safeParse({ ...input, rating: 6 }).success).toBe(false);
    expect(ReviewInput.safeParse({ ...input, target: 'user:x' }).success).toBe(false);
  });
});
