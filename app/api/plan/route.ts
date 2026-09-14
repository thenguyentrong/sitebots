import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadCandidates } from '@/lib/match/candidates';
import { RequirementSchema, hasAnyRequirement } from '@/lib/match/requirements';
import { rankRobots } from '@/lib/match/score';
import { assessCandidate } from '@/lib/plan/assessment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
const Schema = z.object({ requirements: RequirementSchema, ids: z.array(z.string().uuid()).max(4).optional() });
export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 24000) return NextResponse.json({ error: 'Assessment request is too large.' }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: 'Send a valid assessment request.' }, { status: 400 }); }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Check the requirement values.', issues: parsed.error.issues }, { status: 400 });
  const { requirements, ids } = parsed.data;
  if (!hasAnyRequirement(requirements)) return NextResponse.json({ error: 'Choose a job capability or add a requirement before screening the catalogue.' }, { status: 400 });
  try {
    const { candidates, usdToEur } = await loadCandidates();
    const selected = ids ? candidates.filter((candidate) => ids.includes(candidate.card.id)) : candidates;
    const ranked = rankRobots(selected, requirements, { usdToEur, limit: 12 });
    const wanted = ids ?? ranked.ranked.map((row) => row.robot.id);
    const results = wanted.flatMap((id) => {
      const candidate = selected.find((row) => row.card.id === id);
      return candidate ? [assessCandidate(candidate, requirements, usdToEur)] : [];
    });
    return NextResponse.json({ results, considered: selected.length, blocked: ranked.excluded.length, missing: ids?.filter((id) => !selected.some((candidate) => candidate.card.id === id)) ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'The catalogue could not be checked. Your assessment is saved; try again.' }, { status: 503 });
  }
}
