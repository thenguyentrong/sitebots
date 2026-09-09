import { describe, expect, it } from 'vitest';
import { curatedAliases, type AliasFile } from '@/lib/ingest/aliases';
import { resolveManufacturer, resolveSubject, resolveSubjectIn } from './entity';

const curated = curatedAliases();

describe('resolveSubjectIn (curated file)', () => {
  it('resolves Unitree store titles to model and variant', () => {
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree G1' })).toMatchObject({
      manufacturerSlug: 'unitree',
      modelSlug: 'g1',
      variant: 'base',
    });
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree H2 Plus' })).toMatchObject({
      modelSlug: 'h2',
      variant: 'plus',
    });
    expect(
      resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree Go2', variant_raw: 'Go2 Pro' }),
    ).toMatchObject({ modelSlug: 'go2', variant: 'pro' });
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree B2-W' })).toMatchObject({
      modelSlug: 'b2',
      variant: 'w',
    });
  });

  it('prefers the longer model alias', () => {
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree H1-2' })?.modelSlug).toBe('h1-2');
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree H1' })?.modelSlug).toBe('h1');
  });

  it('keeps model names inside their manufacturer', () => {
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Galbot', model_raw: 'G1' })).toBeNull();
  });

  it('searches the model string for a maker only when the maker field is empty', () => {
    expect(resolveSubjectIn(curated, { manufacturer_raw: '', model_raw: 'Boston Dynamics Spot' })).toMatchObject({
      manufacturerSlug: 'boston-dynamics',
      modelSlug: 'spot',
    });
    expect(resolveManufacturer(curated, { manufacturer_raw: 'Galbot', model_raw: 'Unitree G1' })).toBeNull();
  });

  it('does not match a model alias as a substring', () => {
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree Go2 Charger' })?.modelSlug).toBe('go2');
    expect(resolveSubjectIn(curated, { manufacturer_raw: 'Unitree', model_raw: 'Unitree A1 Motor' })).toBeNull();
  });
});

describe('two-pass resolution', () => {
  const generated: AliasFile = {
    manufacturers: { galbot: { name: 'Galbot', aliases: ['Beijing Galbot'] } },
    robots: {
      galbot: { g1: { name: 'Galbot G1', form_factor: 'mobile_manipulator', aliases: ['G1'] } },
      unitree: { superman: { name: 'Superman', form_factor: 'humanoid', aliases: [] } },
    },
  };

  it('finds a generated model under a curated maker', () => {
    const curatedMaker = resolveManufacturer(curated, { manufacturer_raw: 'Unitree Robotics', model_raw: 'Superman' });
    expect(curatedMaker).toBe('unitree');
    expect(resolveSubjectIn(generated, { manufacturer_raw: 'Unitree Robotics', model_raw: 'Superman' }, 'generated')).toBeNull();
    // the real resolveSubject does the fall-through with the file on disk; here the lookup is exercised directly
    expect(resolveSubjectIn({ manufacturers: curated.manufacturers, robots: generated.robots }, { manufacturer_raw: 'Unitree Robotics', model_raw: 'Superman' }, 'generated')).toMatchObject({
      manufacturerSlug: 'unitree',
      modelSlug: 'superman',
      via: 'generated',
    });
  });

  it('keeps a generated G1 with its own maker', () => {
    expect(resolveSubjectIn(generated, { manufacturer_raw: 'Galbot', model_raw: 'G1' }, 'generated')).toMatchObject({
      manufacturerSlug: 'galbot',
      modelSlug: 'g1',
    });
  });

  it('resolves through both files on disk without crossing makers', () => {
    const hit = resolveSubject({ manufacturer_raw: 'Unitree Robotics', model_raw: 'Unitree G1' });
    expect(hit).toMatchObject({ manufacturerSlug: 'unitree', modelSlug: 'g1', via: 'curated' });
  });
});
