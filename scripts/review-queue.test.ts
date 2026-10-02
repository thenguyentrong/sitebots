import { describe, expect, it } from 'vitest';
import { buildReviewQueue, csvCell, parseArgs, queueCsv, type AuditInput } from './review-queue';

function fixture(): AuditInput {
  const robot = (id: string, variant: string, visible = true) => ({
    id, key: `maker/g1${variant === 'base' ? '' : '#' + variant}`, maker_slug: 'maker', maker: 'Maker',
    model_slug: 'g1', variant, name: variant === 'base' ? 'G1' : 'G1 EDU', public: visible,
    form_factor: 'humanoid', status: 'unknown', website: 'https://maker.example/', sourceUrls: [],
  });
  return { catalogue: [robot('base', 'base'), robot('edu', 'edu'), robot('hidden', 'experimental', false)], facts: [], availability: [], issues: [], summary: { auditedAt: '2026-09-30T22:00:00.000Z', robots: 3 } };
}
const fact = (robot_id: string, source_tier: number, extra = {}) => ({ robot_id, field: 'payload_kg', qualifier: 'rated', source_tier, source_url: 'https://maker.example/g1', observed_at: '2026-09-12T12:00:00.000Z', invalidated_at: null, ...extra });
const claim = (region: string, source_tier: number, status = 'for_sale') => ({ robot_id: 'base', region, source_tier, status, source_url: 'https://seller.example/g1', observed_at: '2026-09-12T12:00:00.000Z' });

describe('offline review queue', () => {
  it('covers every configuration exactly once, retaining base, EDU and hidden records as unreviewed', () => {
    const { rows, summary } = buildReviewQueue(fixture(), '2026-10-01');
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.robotId)).size).toBe(3);
    expect(rows.map((r) => r.variant).sort()).toEqual(['base', 'edu', 'experimental']);
    expect(rows.every((r) => r.reviewStatus === 'unreviewed')).toBe(true);
    expect(summary).toMatchObject({ configurationCount: 3, publicConfigurations: 2, hiddenConfigurations: 1, priorities: { P0: 0, P1: 2, P2: 1 } });
  });

  it('rejects duplicate IDs, configuration identities and keys rather than merging records', () => {
    for (const mode of ['id', 'configuration', 'key']) {
      const input = fixture();
      if (mode === 'id') input.catalogue[1].id = input.catalogue[0].id;
      if (mode === 'configuration') input.catalogue[1].variant = 'base';
      if (mode === 'key') input.catalogue[1].key = input.catalogue[0].key;
      expect(() => buildReviewQueue(input, '2026-10-01')).toThrow(/Duplicate/);
    }
  });

  it('rejects incomplete or mixed audit inputs and unknown references', () => {
    const input = fixture();
    input.summary.robots = 4;
    expect(() => buildReviewQueue(input, '2026-10-01')).toThrow(/count does not match/);
    input.summary.robots = 3;
    input.facts.push(fact('absent', 1));
    expect(() => buildReviewQueue(input, '2026-10-01')).toThrow(/unknown robot/);
  });

  it('counts active tier 1 facts only, keeps qualifiers, and does not borrow base evidence for EDU', () => {
    const input = fixture();
    input.facts = [
      fact('base', 1),
      fact('base', 1, { qualifier: 'peak', observed_at: '2026-09-13T12:00:00.000Z' }),
      fact('base', 1, { field: 'weight_kg', observed_at: '2026-09-20T12:00:00.000Z', invalidated_at: '2026-09-21T00:00:00.000Z' }),
      fact('base', 2, { field: 'reach_m', source_url: 'https://seller.example/g1', observed_at: '2026-09-25T12:00:00.000Z' }),
      fact('base', 0, { field: 'task_capabilities', source_url: 'curated://maker/g1' }),
      fact('base', 0, { field: 'deployment_evidence', source_url: 'curated://maker/g1' }),
    ];
    const { rows, summary } = buildReviewQueue(input, '2026-10-01');
    expect(summary).toMatchObject({ taskCapabilitiesActiveFactCount: 1, deploymentEvidenceActiveFactCount: 1, configurationsWithTaskCapabilitiesFacts: 1, configurationsWithDeploymentEvidenceFacts: 1 });
    expect(summary.limitations.join(' ')).toContain('exclude the separate task YAML library');
    expect(summary.limitations.join(' ')).toContain('exclude separately curated data/purchasing/contacts.json');
    const base = rows.find((r) => r.variant === 'base')!;
    expect(base).toMatchObject({ activeFactCount: 5, invalidatedFactCount: 1, activeTier1FactCount: 2, latestTier1Observation: '2026-09-13T12:00:00.000Z', taskCapabilitiesActiveFactCount: 1, deploymentEvidenceActiveFactCount: 1 });
    expect(base.activeTier1Fields).toEqual(['payload_kg:peak', 'payload_kg:rated']);
    expect(base.factFields).not.toContain('weight_kg:rated');
    expect(rows.find((r) => r.variant === 'edu')!.activeTier1FactCount).toBe(0);
  });

  it('separates GLOBAL, EU and DE claims and excludes tier 3 and preorder from direct-tier buying counts', () => {
    const input = fixture();
    input.availability = [claim('GLOBAL', 1), claim('EU', 2, 'enterprise_only'), claim('DE', 3), claim('DE', 1, 'pre_order')];
    let base = buildReviewQueue(input, '2026-10-01').rows.find((r) => r.variant === 'base')!;
    expect(base.tier12BuyingRegions).toEqual(['EU', 'GLOBAL']);
    expect(base.hasRecordedTier12DeBuyingClaim).toBe(false);
    expect(base.reportedTier3BuyingClaimCount).toBe(1);
    input.availability.push(claim('DE', 2));
    base = buildReviewQueue(input, '2026-10-01').rows.find((r) => r.variant === 'base')!;
    expect(base.hasRecordedTier12DeBuyingClaim).toBe(true);
    expect(base.tier12BuyingClaims.every((c) => c.sourceTier <= 2)).toBe(true);
  });

  it('prioritizes public conflicts/identity/integrity while retaining hidden issues at P2', () => {
    const input = fixture();
    input.issues = [
      { robot: 'maker/g1', kind: 'possible_duplicate_name', detail: ['maker/g1', 'maker/g1#edu'] },
      { robot: 'maker/g1', kind: 'conflicting_specs', detail: ['payload_kg'] },
      { robot: 'maker/g1#edu', kind: 'missing_core_specs' },
      { robot: 'maker/g1#experimental', kind: 'invalid_confidence' },
    ];
    const { rows } = buildReviewQueue(input, '2026-10-01');
    expect(rows.map((r) => [r.robotId, r.priority])).toEqual([['base', 'P0'], ['edu', 'P1'], ['hidden', 'P2']]);
    expect(rows[0].nextActions[0]).toContain('configuration identity');
    expect(rows[0].recordedIssues).toHaveLength(2);
  });

  it('escapes spreadsheet formulas, quotes and delimiter/newline content', () => {
    for (const dangerous of ['=HYPERLINK("https://evil")', '+cmd', '-1+1', '@SUM(1)', '  =cmd', '\tcmd', '\rpayload', '\n=cmd']) {
      expect(csvCell(dangerous).startsWith('"\'')).toBe(true);
    }
    expect(csvCell('safe,"quoted"\ntext')).toBe('"safe,""quoted""\ntext"');
    const input = fixture();
    input.catalogue[0].name = '=cmd';
    const csv = queueCsv(buildReviewQueue(input, '2026-10-01').rows);
    expect(csv).toContain('"\'=cmd"');
    expect(csv.startsWith('\uFEFF"priority"')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(5);
  });

  it('validates CLI values and real dates', () => {
    expect(parseArgs(['--input', 'audit', '--output', 'reviews', '--as-of', '2026-10-01'])).toEqual({ input: 'audit', output: 'reviews', asOf: '2026-10-01' });
    expect(() => parseArgs(['--as-of', '2026-02-30'])).toThrow(/real date/);
    expect(() => parseArgs(['--commit'])).toThrow(/Expected/);
    expect(() => parseArgs(['--output'])).toThrow(/Expected/);
  });
});
