import { z } from 'zod';
import { formatNumber } from '@/lib/i18n/format';
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

const EQUIPMENT_TYPE_LABEL_DE: Record<EquipmentType, string> = {
  arm: 'Manipulatorarm', gripper: 'Greifer', hand: 'Hand', lidar: 'LiDAR', camera_ptz: 'PTZ-Kamera', camera_thermal: 'Wärmebildkamera', camera_depth: 'Tiefenkamera',
  gas_sensor: 'Gassensor', acoustic_sensor: 'Akustiksensor', dock: 'Ladestation', payload_mount: 'Nutzlasthalterung', compute: 'Rechenmodul', radio: 'Funk',
  speaker_light: 'Lautsprecher / Licht', battery: 'Akku', charger: 'Ladegerät', controller: 'Steuergerät', tool_changer: 'Werkzeugwechsler', case: 'Koffer', kit: 'Bausatz', other: 'Sonstiges',
};
const SENSOR_TYPE_LABEL_DE: Record<SensorType, string> = {
  lidar: 'LiDAR', depth_camera: 'Tiefenkamera', rgb_camera: 'RGB-Kamera', fisheye_camera: 'Fischaugenkamera', imu: 'IMU', force_torque: 'Kraft/Moment',
  tactile: 'Taktil', microphone: 'Mikrofon', gnss: 'GNSS', ultrasonic: 'Ultraschall', foot_contact: 'Fußkontakt', other: 'Sonstige',
};
const ACTUATOR_GROUP_LABEL_DE: Record<ActuatorGroup, string> = { leg: 'Beine', arm: 'Arme', hand: 'Hände', waist: 'Hüfte', neck: 'Hals', wheel: 'Räder', other: 'Sonstige' };

type Lang = 'en' | 'de';
/** The part words in the page's language; the English constants above stay for the scripts and tests. */
export const equipmentTypeLabel = (type: string, lang: Lang = 'en'): string => (lang === 'de' ? EQUIPMENT_TYPE_LABEL_DE : EQUIPMENT_TYPE_LABEL)[type as EquipmentType] ?? type;
export const sensorTypeLabel = (type: string, lang: Lang = 'en'): string => (lang === 'de' ? SENSOR_TYPE_LABEL_DE : SENSOR_TYPE_LABEL)[type as SensorType] ?? type;
export const actuatorGroupLabel = (group: string, lang: Lang = 'en'): string => (lang === 'de' ? ACTUATOR_GROUP_LABEL_DE : ACTUATOR_GROUP_LABEL)[group as ActuatorGroup] ?? group;

const fmt = (n: number, d = 0, lang: Lang = 'en') => formatNumber(n, lang, d);

/** One line for a compare cell or a card: enough to compare, not the whole list. */
export function summarizeJson(field: string, value: unknown, lang: Lang = 'en'): string {
  const de = lang === 'de';
  if (field === 'equipment_options' && Array.isArray(value)) {
    const items = value as EquipmentItem[];
    const types = [...new Set(items.map((i) => equipmentTypeLabel(i.type, lang)))];
    const list = types.slice(0, 4).join(', ') + (types.length > 4 ? '…' : '');
    // German nouns keep their capital letter.
    return de ? `${items.length} ${items.length === 1 ? 'Option' : 'Optionen'}: ${list}` : `${items.length} option${items.length === 1 ? '' : 's'}: ${list.toLowerCase()}`;
  }
  if (field === 'sensors' && Array.isArray(value)) {
    const items = value as SensorItem[];
    return items.map((i) => `${i.count && i.count > 1 ? `${i.count}× ` : ''}${i.model ?? sensorTypeLabel(i.type, lang)}`).slice(0, 4).join(', ') + (items.length > 4 ? '…' : '');
  }
  if (field === 'actuators' && Array.isArray(value)) {
    const items = value as ActuatorItem[];
    return items.map((i) => `${actuatorGroupLabel(i.group, lang)}${i.peak_torque_nm ? ` ${fmt(i.peak_torque_nm, 0, lang)} N·m` : ''}${i.count ? ` ×${i.count}` : ''}`).join(' · ');
  }
  if (field === 'battery_pack' && value && typeof value === 'object') {
    const b = value as BatteryPack;
    const parts = [
      b.chemistry ? (de && b.chemistry === 'other' ? 'Akku' : CHEMISTRY_LABEL[b.chemistry]) : null,
      b.voltage_v ? `${fmt(b.voltage_v, 1, lang)} V` : null,
      b.capacity_ah ? `${fmt(b.capacity_ah, 1, lang)} Ah` : null,
      b.energy_wh ? `${fmt(b.energy_wh, 0, lang)} Wh` : null,
      b.packs && b.packs > 1 ? `${b.packs} ${de ? 'Akkus' : 'packs'}` : null,
      b.swappable ? (de ? 'wechselbar' : 'swappable') : null,
    ].filter(Boolean);
    return parts.join(' · ') || (de ? 'veröffentlicht' : 'published');
  }
  if (Array.isArray(value)) return de ? `${value.length} ${value.length === 1 ? 'Eintrag' : 'Einträge'}` : `${value.length} item${value.length === 1 ? '' : 's'}`;
  return de ? 'veröffentlicht' : 'published';
}
