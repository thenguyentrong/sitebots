import { z } from 'zod';
import { HAND_TYPES, type HandType } from './enums';

/**
 * Structured "what is it made of / what can it carry" fields. Four json
 * fields, each one fact with one source and one trust badge, instead of
 * dozens of scalars: the deployment_evidence precedent. Item shapes are
 * validated at every gate (curated YAML, normaliser, seed) so a typo in a
 * type never reaches the page.
 */

export const EQUIPMENT_TYPES = ['arm', 'gripper', 'hand', 'lidar', 'camera_ptz', 'camera_thermal', 'camera_depth', 'gas_sensor', 'acoustic_sensor', 'dock', 'payload_mount', 'compute', 'radio', 'speaker_light', 'battery', 'charger', 'controller', 'tool_changer', 'case', 'kit', 'other'] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const SENSOR_TYPES = ['lidar', 'depth_camera', 'rgb_camera', 'fisheye_camera', 'imu', 'force_torque', 'tactile', 'microphone', 'gnss', 'ultrasonic', 'foot_contact', 'other'] as const;
export type SensorType = (typeof SENSOR_TYPES)[number];

export const ACTUATOR_GROUPS = ['leg', 'arm', 'hand', 'waist', 'neck', 'wheel', 'other'] as const;
export type ActuatorGroup = (typeof ACTUATOR_GROUPS)[number];

export const BATTERY_CHEMISTRIES = ['li_ion', 'li_po', 'lfp', 'nmc', 'other'] as const;

export const EquipmentItem = z.object({
  type: z.enum(EQUIPMENT_TYPES),
  name: z.string().min(1),
  maker: z.string().optional(),
  url: z.url().optional(),
  /** Ships with the base robot (true) or is sold separately (false / unknown). */
  included: z.boolean().optional(),
  note: z.string().optional(),
});
export type EquipmentItem = z.infer<typeof EquipmentItem>;

export const SensorItem = z.object({
  type: z.enum(SENSOR_TYPES),
  model: z.string().optional(),
  count: z.number().int().positive().optional(),
  location: z.string().optional(),
  note: z.string().optional(),
});
export type SensorItem = z.infer<typeof SensorItem>;

export const ActuatorItem = z.object({
  group: z.enum(ACTUATOR_GROUPS),
  /** Drive type as the maker names it: QDD, harmonic, planetary, cycloidal, hydraulic … */
  type: z.string().optional(),
  model: z.string().optional(),
  count: z.number().int().positive().optional(),
  peak_torque_nm: z.number().positive().optional(),
  note: z.string().optional(),
});
export type ActuatorItem = z.infer<typeof ActuatorItem>;

export const BatteryPack = z.object({
  chemistry: z.enum(BATTERY_CHEMISTRIES).optional(),
  voltage_v: z.number().positive().optional(),
  capacity_ah: z.number().positive().optional(),
  energy_wh: z.number().positive().optional(),
  cells_series: z.number().int().positive().optional(),
  packs: z.number().int().positive().optional(),
  model: z.string().optional(),
  swappable: z.boolean().optional(),
  note: z.string().optional(),
});
export type BatteryPack = z.infer<typeof BatteryPack>;

/** Field id → shape of its value. The gates look here. */
export const PART_SCHEMAS: Record<string, z.ZodTypeAny> = {
  sensors: z.array(SensorItem).min(1),
  actuators: z.array(ActuatorItem).min(1),
  battery_pack: BatteryPack,
  equipment_options: z.array(EquipmentItem).min(1),
};

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  arm: 'Manipulator arm', gripper: 'Gripper', hand: 'Hand', lidar: 'LiDAR', camera_ptz: 'PTZ camera', camera_thermal: 'Thermal camera', camera_depth: 'Depth camera',
  gas_sensor: 'Gas sensor', acoustic_sensor: 'Acoustic sensor', dock: 'Docking station', payload_mount: 'Payload mount', compute: 'Compute module', radio: 'Radio',
  speaker_light: 'Speaker / light', battery: 'Battery', charger: 'Charger', controller: 'Controller', tool_changer: 'Tool changer', case: 'Case', kit: 'Kit', other: 'Other',
};
export const SENSOR_TYPE_LABEL: Record<SensorType, string> = {
  lidar: 'LiDAR', depth_camera: 'Depth camera', rgb_camera: 'RGB camera', fisheye_camera: 'Fisheye camera', imu: 'IMU', force_torque: 'Force/torque',
  tactile: 'Tactile', microphone: 'Microphone', gnss: 'GNSS', ultrasonic: 'Ultrasonic', foot_contact: 'Foot contact', other: 'Other',
};
export const ACTUATOR_GROUP_LABEL: Record<ActuatorGroup, string> = { leg: 'Legs', arm: 'Arms', hand: 'Hands', waist: 'Waist', neck: 'Neck', wheel: 'Wheels', other: 'Other' };
const CHEMISTRY_LABEL: Record<string, string> = { li_ion: 'Li-ion', li_po: 'LiPo', lfp: 'LFP', nmc: 'NMC', other: 'battery' };

/** "gripper", "5-finger dexterous hand", "none / no hands" → the closed vocabulary, or null. */
export function parseHandType(raw: string): HandType | null {
  const s = raw.toLowerCase();
  if (/\b(none|no hands?|without hands?|stub)\b/.test(s)) return 'none';
  if (/\b(3|three)[\s-]*finger/.test(s)) return 'three_finger';
  if (/\b(5|five)[\s-]*finger|dexterous|dex\d|anthropomorphic|humanoid hand/.test(s)) return 'five_finger';
  if (/gripper|parallel|two[\s-]*finger|2[\s-]*finger|jaw/.test(s)) return 'gripper';
  return (HAND_TYPES as readonly string[]).includes(s) ? (s as HandType) : null;
}

const fmt = (n: number, d = 0) => n.toLocaleString('en-GB', { maximumFractionDigits: d });

/** One line for a compare cell or a card: enough to compare, not the whole list. */
export function summarizeJson(field: string, value: unknown): string {
  if (field === 'equipment_options' && Array.isArray(value)) {
    const items = value as EquipmentItem[];
    const types = [...new Set(items.map((i) => EQUIPMENT_TYPE_LABEL[i.type] ?? i.type))];
    return `${items.length} option${items.length === 1 ? '' : 's'}: ${types.slice(0, 4).join(', ').toLowerCase()}${types.length > 4 ? '…' : ''}`;
  }
  if (field === 'sensors' && Array.isArray(value)) {
    const items = value as SensorItem[];
    return items.map((i) => `${i.count && i.count > 1 ? `${i.count}× ` : ''}${i.model ?? SENSOR_TYPE_LABEL[i.type] ?? i.type}`).slice(0, 4).join(', ') + (items.length > 4 ? '…' : '');
  }
  if (field === 'actuators' && Array.isArray(value)) {
    const items = value as ActuatorItem[];
    return items.map((i) => `${ACTUATOR_GROUP_LABEL[i.group] ?? i.group}${i.peak_torque_nm ? ` ${fmt(i.peak_torque_nm)} N·m` : ''}${i.count ? ` ×${i.count}` : ''}`).join(' · ');
  }
  if (field === 'battery_pack' && value && typeof value === 'object') {
    const b = value as BatteryPack;
    const parts = [
      b.chemistry ? CHEMISTRY_LABEL[b.chemistry] : null,
      b.voltage_v ? `${fmt(b.voltage_v, 1)} V` : null,
      b.capacity_ah ? `${fmt(b.capacity_ah, 1)} Ah` : null,
      b.energy_wh ? `${fmt(b.energy_wh)} Wh` : null,
      b.packs && b.packs > 1 ? `${b.packs} packs` : null,
      b.swappable ? 'swappable' : null,
    ].filter(Boolean);
    return parts.join(' · ') || 'published';
  }
  return Array.isArray(value) ? `${value.length} item${value.length === 1 ? '' : 's'}` : 'published';
}
