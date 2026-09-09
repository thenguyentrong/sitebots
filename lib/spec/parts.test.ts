import { describe, expect, it } from 'vitest';
import { ActuatorItem, BatteryPack, EquipmentItem, PART_SCHEMAS, parseHandType, SensorItem, summarizeJson } from './parts';

describe('part item schemas', () => {
  it('accept well-formed items', () => {
    expect(EquipmentItem.safeParse({ type: 'arm', name: 'Spot Arm', maker: 'Boston Dynamics', url: 'https://bostondynamics.com/products/spot/arm/' }).success).toBe(true);
    expect(SensorItem.safeParse({ type: 'lidar', model: 'Livox Mid-360', count: 1 }).success).toBe(true);
    expect(ActuatorItem.safeParse({ group: 'leg', count: 12, peak_torque_nm: 120 }).success).toBe(true);
    expect(BatteryPack.safeParse({ chemistry: 'li_ion', energy_wh: 564, swappable: true }).success).toBe(true);
  });
  it('reject a typo in a closed vocabulary and an empty list', () => {
    expect(EquipmentItem.safeParse({ type: 'arms', name: 'x' }).success).toBe(false);
    expect(SensorItem.safeParse({ type: 'lidar', count: 0 }).success).toBe(false);
    expect(PART_SCHEMAS.equipment_options.safeParse([]).success).toBe(false);
    expect(PART_SCHEMAS.battery_pack.safeParse({ voltage_v: -1 }).success).toBe(false);
  });
});

describe('parseHandType', () => {
  it('maps maker wording onto the vocabulary', () => {
    expect(parseHandType('Dex3-1 dexterous hand')).toBe('five_finger');
    expect(parseHandType('parallel gripper')).toBe('gripper');
    expect(parseHandType('3-finger hand')).toBe('three_finger');
    expect(parseHandType('none')).toBe('none');
    expect(parseHandType('tentacles')).toBeNull();
  });
});

describe('summarizeJson', () => {
  it('writes one line per field', () => {
    expect(summarizeJson('equipment_options', [{ type: 'arm', name: 'A' }, { type: 'lidar', name: 'B' }, { type: 'lidar', name: 'C' }])).toBe('3 options: manipulator arm, lidar');
    expect(summarizeJson('battery_pack', { chemistry: 'li_ion', voltage_v: 58.8, energy_wh: 564, swappable: true })).toBe('Li-ion · 58.8 V · 564 Wh · swappable');
    expect(summarizeJson('actuators', [{ group: 'leg', count: 12, peak_torque_nm: 120 }])).toBe('Legs 120 N·m ×12');
    expect(summarizeJson('sensors', [{ type: 'lidar', model: 'Mid-360' }, { type: 'depth_camera', count: 2 }])).toBe('Mid-360, 2× Depth camera');
  });
});
