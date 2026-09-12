import { describe, expect, it } from 'vitest';
import { bruceFields } from './mfr/westwood';

describe('BRUCE manufacturer specifications', () => {
  const body = '<h1>BRUCE Humanoid Open-Platform</h1><div id="tab-description"><p>Height: 70 cm</p><p>Weight: 4.8 kg</p><p>Total DoF: 16</p></div>';
  it('preserves the decimal weight and source units', () => {
    expect(bruceFields(body)).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'height_m', value: 70, unit: 'cm' }),
      expect.objectContaining({ field: 'weight_kg', value: 4.8, unit: 'kg' }),
      expect.objectContaining({ field: 'dof_total', value: 16 }),
    ]));
  });
  it('does not read unrelated product or shipping data', () => {
    expect(bruceFields(body.replace('BRUCE', 'BEAR'))).toEqual([]);
    expect(bruceFields('<h1>BRUCE</h1><aside>Weight: 48 kg</aside>')).toEqual([]);
  });
});
