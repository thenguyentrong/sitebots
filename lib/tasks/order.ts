import type { SettingOption } from './types';

/** LV order inside a section: by the first Leistungsbereich number, work outside the LV last. Shared by server pages and client islands. */
export const byLv = (a: SettingOption, b: SettingOption) => (a.lv?.lb[0] ?? '999').localeCompare(b.lv?.lb[0] ?? '999') || a.title.en.localeCompare(b.title.en);
