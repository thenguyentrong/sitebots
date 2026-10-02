export const INDUSTRY_IDS = ['construction', 'manufacturing', 'warehousing', 'facilities', 'energy', 'agriculture', 'retail_hospitality', 'healthcare_logistics', 'waste_recycling', 'mining', 'research_education'] as const;
export type IndustryId = (typeof INDUSTRY_IDS)[number];
export const INDUSTRIES: Record<IndustryId, { en: string; de: string }> = {
  construction: { en: 'Construction & infrastructure', de: 'Bau & Infrastruktur' },
  manufacturing: { en: 'Manufacturing & assembly', de: 'Fertigung & Montage' },
  warehousing: { en: 'Warehousing & logistics', de: 'Lager & Logistik' },
  facilities: { en: 'Facilities & commercial buildings', de: 'Gebäude & Facility Management' },
  energy: { en: 'Energy & utilities', de: 'Energie & Versorgung' },
  agriculture: { en: 'Agriculture & food production', de: 'Landwirtschaft & Lebensmittelproduktion' },
  retail_hospitality: { en: 'Retail & hospitality', de: 'Handel & Gastgewerbe' },
  healthcare_logistics: { en: 'Healthcare logistics & labs', de: 'Gesundheitslogistik & Labore' },
  waste_recycling: { en: 'Waste & recycling', de: 'Abfall & Recycling' },
  mining: { en: 'Mining & heavy industry', de: 'Bergbau & Schwerindustrie' },
  research_education: { en: 'Research & education', de: 'Forschung & Bildung' },
};
export const isIndustry = (id: string): id is IndustryId => (INDUSTRY_IDS as readonly string[]).includes(id);

/** Editorial applicability of the existing collection, not a claim of demonstrated automation. */
export function legacyIndustries(setting: string): IndustryId[] {
  if (setting.startsWith('site_')) return ['construction'];
  if (['prefab_timber', 'precast_concrete', 'facade_prefab', 'mep_prefab', 'modular_volumetric', 'steel_fabrication', 'rebar_formwork_prep', 'joinery_windows_doors', 'construction_3d_printing'].includes(setting)) return ['construction', 'manufacturing'];
  if (['material_yard_warehouse', 'construction_logistics_hub', 'equipment_rental_depot'].includes(setting)) return ['construction', 'warehousing'];
  if (setting === 'facility_operation') return ['facilities'];
  if (setting === 'asset_inspection_infrastructure') return ['construction', 'energy'];
  return [];
}

