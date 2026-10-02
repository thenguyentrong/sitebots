import { NextResponse } from 'next/server';
import { getRobotModel } from '@/lib/models/index';
import { resolvePresets } from '@/lib/models/poses';
import { FORM_FACTORS, type FormFactor } from '@/lib/spec/enums';

// The 3D model of one robot for the viewer on a robot card. Loaded only when a visitor opens it,
// so a list of cards ships no model data. key = "maker/slug" or "maker/slug#variant".
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get('key') ?? '';
  const form = params.get('form') ?? '';
  if (!/^[a-z0-9-]+[/][a-z0-9-]+(#[a-z0-9-]+)?$/.test(key)) return NextResponse.json({ error: 'Unknown model' }, { status: 400 });
  const [robotKey, variant = 'base'] = key.split('#');
  const entry = getRobotModel(robotKey, variant);
  if (!entry) return NextResponse.json({ error: 'No model for this robot' }, { status: 404 });
  const formFactor: FormFactor = (FORM_FACTORS as readonly string[]).includes(form) ? form as FormFactor : 'humanoid';
  const presets = resolvePresets(key, formFactor, entry.joints.joints);
  return NextResponse.json({ entry, presets }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
