import { NextResponse } from 'next/server';
import { loadCandidates } from '@/lib/match/candidates';
import { RequirementSchema } from '@/lib/match/requirements';
import { rankRobots } from '@/lib/match/score';

/**
 * POST a Requirements object, get the ranked and excluded lists with reasons.
 * Same pure function as the home page; this is for scripts and the future
 * free-text parser, not a separate ranking.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'body must be JSON' }, { status: 400 });
  }
  const parsed = RequirementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid requirements', issues: parsed.error.issues }, { status: 400 });
  }
  const { candidates, usdToEur } = await loadCandidates();
  const out = rankRobots(candidates, parsed.data, { usdToEur, limit: 50 });
  return NextResponse.json({
    considered: out.considered,
    ranked: out.ranked.map((r) => ({
      id: r.robot.id,
      name: r.robot.name,
      manufacturer: r.robot.manufacturer_slug,
      model: r.robot.model_slug,
      variant: r.robot.variant,
      form_factor: r.robot.form_factor,
      score: r.score,
      coverage: r.coverage,
      price: r.price,
      criteria: r.results,
    })),
    excluded: out.excluded.map((e) => ({ id: e.robot.id, name: e.robot.name, manufacturer: e.robot.manufacturer_slug, reasons: e.reasons })),
  });
}
