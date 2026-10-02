import { expect, it } from 'vitest';
import { mapSpecLabel } from './specmap';
import { extractQuantity } from '../../normalize/units';
it('preserves energy units and thousands separators adjacent to units', () => {
 expect(extractQuantity('24V, 60Ah (1,440Wh)', 'Wh')).toMatchObject({value:1440,unit:'Wh'});
 expect(extractQuantity('15 ah','Wh')).toBeNull();
 expect(extractQuantity('1,5 m','m')).toMatchObject({value:1.5});
 expect(mapSpecLabel('Battery','15 ah').some(f=>f.field==='battery_wh')).toBe(false);
});
it('does not label a component DOF count as a total', () => {
 expect(mapSpecLabel('Degrees of freedom','Neck: 2; arms: 14')).toEqual([]);
 expect(mapSpecLabel('Neck','2')).toEqual([]);
 expect(mapSpecLabel('Waist degrees of freedom','1 or 3')).toEqual([]);
 expect(mapSpecLabel('Total degrees of freedom','28 DOF')).toEqual([{field:'dof_total',value:'28'}]);
});
it('separates rated and peak payloads without treating unit conversions as peaks', () => {
 expect(mapSpecLabel('Arm maximum load','Peak: About 21Kg; Rated: About 7Kg')).toEqual(expect.arrayContaining([
  expect.objectContaining({field:'payload_kg',qualifier:'rated',value:'7 kg'}),
  expect.objectContaining({field:'payload_kg',qualifier:'peak',value:'21 kg'}),
 ]));
 expect(mapSpecLabel('Payload','44 lb (20 kg)')).toHaveLength(1);
});
it('requires explicit evidence for hot swapping and absence of lidar', () => {
 expect(mapSpecLabel('Battery life','1 h, quick-release battery').some(f=>f.field==='hot_swap')).toBe(false);
 expect(mapSpecLabel('Sensing','Contact sensors and 6 DoF IMU')).toEqual([]);
 expect(mapSpecLabel('Camera','RGB-D stereo camera').some(f=>f.field==='has_lidar')).toBe(false);
 expect(mapSpecLabel('Battery','1 kWh, hot-swappable')).toEqual(expect.arrayContaining([expect.objectContaining({field:'hot_swap',value:true})]));
});
it('keeps day-based promises out of warranty months', () => {
 expect(mapSpecLabel('Warranty','30 day money-back guarantee')).toEqual([]);
 expect(mapSpecLabel('Warranty','2 years')).toEqual([expect.objectContaining({field:'warranty_months',value:24})]);
});

it('keeps new-class generic payload basis unstated and single arm DOF undoubled', () => {
  for (const formFactor of ['amr_agv', 'industrial_arm', 'cobot', 'dedicated_robot', 'integrated_cell'] as const) {
    expect(mapSpecLabel('Payload', '100 kg', { formFactor })).toEqual([{ field: 'payload_kg', value: '100 kg', note: 'Payload: 100 kg' }]);
    expect(mapSpecLabel('Payload', '100 kg (peak 200 kg)', { formFactor })).toEqual([{ field: 'payload_kg', value: '100 kg', note: 'Payload: 100 kg (peak 200 kg)' }]);
    expect(mapSpecLabel('DOF of each arm', '6', { formFactor })).toEqual([{ field: 'dof_arms', value: '6', note: 'DOF of each arm: 6' }]);
    expect(mapSpecLabel('DOF of each arm', '6 x 2', { formFactor })).toEqual([{ field: 'dof_arms', value: 12, note: 'DOF of each arm: 6 x 2' }]);
  }
});
