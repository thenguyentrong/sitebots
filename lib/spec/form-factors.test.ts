import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import { FORM_FACTORS } from './enums';
import { FORM_FACTOR_LABEL } from './display';
import { visibleFields, visibleFieldsFor } from './fields';
import { AliasFile } from '@/lib/ingest/aliases';
import { SeedFile } from '@/lib/ingest/seed';
import { RequirementSchema } from '@/lib/match/requirements';
import { evaluateAll, runtime } from '@/lib/match/criteria';
import { smallHumanoid } from '@/lib/match/fixtures';
import { productJsonLd } from '@/lib/jsonld';

const added = FORM_FACTORS.slice(3);

describe('expanded catalogue classes', () => {
  it('accepts every class through ingestion and exact matcher filters', () => {
    for (const form of FORM_FACTORS) {
      expect(SeedFile.parse({ robots: [{ manufacturer: 'test', model: form, form_factor: form, observed_at: '2026-10-01' }] }).robots[0].form_factor).toBe(form);
      expect(AliasFile.parse({ robots: { test: { model: { name: 'Test', form_factor: form } } } }).robots.test.model.form_factor).toBe(form);
      expect(RequirementSchema.parse({ form_factor: form }).form_factor).toBe(form);
      expect(FORM_FACTOR_LABEL[form]).toBeTruthy();
    }
    expect(RequirementSchema.safeParse({ form_factor: 'unreviewed_type' }).success).toBe(false);
  });

  it('renders a class label and nonhumanoid placeholder for every new class', () => {
    const humanoid = renderToStaticMarkup(createElement(RobotGlyph, { formFactor: 'humanoid' }));
    for (const form of added) {
      const markup = renderToStaticMarkup(createElement(RobotGlyph, { formFactor: form }));
      expect(markup).toContain('<svg');
      expect(markup).not.toBe(humanoid);
      expect(productJsonLd({ ...smallHumanoid.card, form_factor: form }, [], [], '/robot').category).toBe(FORM_FACTOR_LABEL[form]);
    }
  });

  it('does not ask fixed systems for absent walking, hand or battery specifications', () => {
    for (const form of ['industrial_arm', 'cobot', 'integrated_cell']) {
      const fields = visibleFields(form, new Set()).map((field) => field.id);
      for (const id of ['walk_speed_ms', 'stair_capable', 'hand_type', 'dof_hands', 'battery_wh', 'hot_swap']) expect(fields).not.toContain(id);
      expect(fields).toContain('runtime_h');
      // Explicit claims remain visible for review even if they are unusual for the class.
      expect(visibleFields(form, new Set(['stair_capable'])).map((field) => field.id)).toContain('stair_capable');
    }
    const mixed = visibleFieldsFor(['amr_agv', 'industrial_arm'], new Set()).map((field) => field.id);
    expect(mixed).toContain('max_speed_ms');
    expect(mixed).not.toContain('walk_speed_ms');
    expect(mixed).not.toContain('dof_hands');
  });

  it('does not infer task, working load or continuous operation from a class', () => {
    for (const form of added) {
      const candidate = { ...smallHumanoid, card: { ...smallHumanoid.card, form_factor: form, specs: {}, task_capabilities: [], runtime_h: null, runtime_basis: null } };
      const req = RequirementSchema.parse({ form_factor: form, tasks: ['machine_tending'], payload_kg: 10, runtime_h_per_shift: 8 });
      const result = evaluateAll(candidate, req, { today: new Date('2026-10-01'), usdToEur: 1 });
      expect(result.find((item) => item.id === 'form_factor')?.status).toBe('pass');
      for (const id of ['tasks', 'payload', 'runtime']) expect(result.find((item) => item.id === id)?.status).toBe('unknown');
      const loaded = { value: 9, source_url: 'https://maker.example/workload', source_tier: 1, observed_at: '2026-10-01', trust: 'verified' as const, confidence: 1 };
      expect(runtime({ ...candidate, card: { ...candidate.card, specs: { 'runtime_h:loaded': loaded } } }, req)?.status).toBe('pass');
      expect(runtime({ ...candidate, card: { ...candidate.card, specs: { 'runtime_h:loaded': { ...loaded, value: 2 } } } }, req)?.status).toBe('fail');
    }
  });
});
