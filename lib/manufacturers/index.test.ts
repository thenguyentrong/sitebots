import { describe, expect, it } from 'vitest';
import review from '@/data/manufacturers/review.json';
import { canonicalManufacturerSlug, isPublicManufacturer, manufacturerAliases, manufacturerReview, publicManufacturerSlugs } from './index';

describe('reviewed manufacturer catalogue', () => {
  it('excludes academic projects, software-only entries and unknown discoveries', () => {
    for (const slug of ['mit', 'nasa', 'kaist', 'orbit', 'nvidia', 'qihan', 'not-reviewed-yet']) expect(isPublicManufacturer(slug), slug).toBe(false);
  });
  it('keeps commercial research-platform companies and announced products', () => {
    for (const slug of ['unitree', 'limx-dynamics', 'pal', 'westwood', 'artificial-dynamic-organism', 'x-humanoid', 'tesla', 'sunday']) expect(isPublicManufacturer(slug), slug).toBe(true);
    expect(manufacturerReview('unitree')?.status).toBe('commercial');
    expect(manufacturerReview('tesla')?.status).toBe('developing');
  });
  it('groups former and duplicate names without excluding their robot records', () => {
    expect(canonicalManufacturerSlug('under-control')).toBe('noble-machines');
    expect(manufacturerAliases('x-humanoid')).toEqual(expect.arrayContaining(['x-humanoid', 'hric', 'humanoid-innovation-center']));
    expect(publicManufacturerSlugs()).toContain('hric');
  });
  it('requires evidence and an explicit review for every visible supplier', () => {
    const all = review.manufacturers as Record<string, {canonicalSlug?: string}>;
    for (const slug of Object.keys(all)) {
      if (all[slug].canonicalSlug) {
        expect(all[all[slug].canonicalSlug!], slug).toBeDefined();
        expect(all[all[slug].canonicalSlug!].canonicalSlug, `Alias chain at ${slug}`).toBeUndefined();
      }
      const record = manufacturerReview(slug)!;
      expect(record.reviewedAt, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (isPublicManufacturer(slug)) {
        expect(record.evidence.length, slug).toBeGreaterThan(0);
        for (const source of record.evidence) expect(['https:', 'http:']).toContain(new URL(source.url).protocol);
      }
    }
  });
});
