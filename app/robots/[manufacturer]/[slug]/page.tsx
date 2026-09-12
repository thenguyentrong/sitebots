import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPublicManufacturer } from '@/lib/manufacturers';
import { CompareToggle } from '@/components/compare/CompareBar';
import { JsonLd } from '@/components/JsonLd';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/jsonld';
import { getRobotModel } from '@/lib/models/index';
import { resolvePresets } from '@/lib/models/poses';
import { EquipmentPanel } from '@/components/robot/EquipmentPanel';
import { UseCaseProfile } from '@/components/robot/UseCaseProfile';
import { profileFor } from '@/lib/profile/profile';
import { PartsPanel } from '@/components/robot/PartsPanel';
import { PricePanel } from '@/components/robot/PricePanel';
import { RobotMedia } from '@/components/robot/RobotMedia';
import { SourceList } from '@/components/robot/SourceList';
import { SpecTable } from '@/components/robot/SpecTable';
import { VariantTabs } from '@/components/robot/VariantTabs';
import { Badge } from '@/components/ui/badge';
import { getRobotDetail } from '@/lib/queries/robots';
import { publicMetadata } from '@/lib/seo';
import { FORM_FACTOR_LABEL, formatSpec, pickPayloadKey, qualifierLabel, STATUS_LABEL } from '@/lib/spec/display';
import { fieldDef } from '@/lib/spec/fields';
import type { RobotCard, Specs } from '@/lib/spec/types';

export const dynamic = 'force-dynamic';

type Params = Promise<{ manufacturer: string; slug: string }>;
type Search = Promise<{ variant?: string; render?: string }>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { manufacturer, slug } = await params;
  const { variant } = await searchParams;
  const detail = await getRobotDetail(manufacturer, slug, variant);
  if (!detail) return {};
  const r = detail.robot;
  const bits = [
    r.height_m !== null ? `${r.height_m} m` : null,
    r.weight_kg !== null ? `${r.weight_kg} kg` : null,
    r.payload_kg_conservative !== null ? `${r.payload_kg_conservative} kg payload` : null,
    r.ip_rating,
  ].filter(Boolean);
  return { ...publicMetadata({
    title: `${r.name} specs, price and site suitability`,
    description: `${r.manufacturer_name} ${r.name}: ${bits.join(', ') || 'specifications'} — with the source of every value, regional prices and delivery status.`,
    path: `/robots/${manufacturer}/${slug}`,
  }), ...(!isPublicManufacturer(manufacturer) ? { robots: { index: false, follow: false } } : {}) };
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'neutral' | 'warn'> = {
  shipping: 'success',
  pre_order: 'info',
  prototype: 'neutral',
  concept: 'neutral',
  discontinued: 'warn',
  unknown: 'neutral',
};

/** The six numbers a site manager asks first, from the projection. */
function keyFigures(r: RobotCard, specs: Specs) {
  const payloadKey = pickPayloadKey(specs);
  // The shift-relevant runtime: loaded before walking before unstated before
  // standby, then better evidence. Standby hours are not working hours.
  const runtimeOrder = ['loaded', 'walking', 'unstated', 'idle'];
  const runtimeKey = Object.keys(specs)
    .filter((k) => k.startsWith('runtime_h'))
    .sort((a, b) => {
      const qa = runtimeOrder.indexOf(a.split(':')[1] ?? 'unstated');
      const qb = runtimeOrder.indexOf(b.split(':')[1] ?? 'unstated');
      return qa - qb || specs[a].source_tier - specs[b].source_tier;
    })[0];
  return [
    { label: 'Height', key: 'height_m' },
    { label: 'Weight', key: 'weight_kg' },
    { label: 'Payload', key: payloadKey ?? 'payload_kg' },
    { label: 'Runtime', key: runtimeKey ?? 'runtime_h' },
    { label: 'Max speed', key: 'max_speed_ms' },
    { label: 'IP rating', key: 'ip_rating' },
  ].map(({ label, key }) => {
    const spec = specs[key];
    const q = qualifierLabel(key.split(':')[1]);
    return { label, key, spec, qualifier: q };
  });
}

export default async function RobotPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { manufacturer, slug } = await params;
  const { variant, render } = await searchParams;
  const detail = await getRobotDetail(manufacturer, slug, variant);
  if (!detail) notFound();
  // ?render=1 is the still-image mode: the viewer alone, framed tight, used by
  // scripts/assets/render-models.ts to make the card images.
  const compact = render === '1';

  const { robot, image, images, variants, prices, availability, sources, conflicts } = detail;
  const specs = robot.specs ?? {};
  const base = `/robots/${manufacturer}/${slug}`;
  const figures = keyFigures(robot, specs);
  const verified = robot.verified_fields?.length ?? 0;
  const total = Object.keys(specs).length;

  const path = `${base}${robot.variant === 'base' ? '' : `?variant=${robot.variant}`}`;
  const profile = profileFor({ card: robot, prices, availability });
  const model = getRobotModel(`${manufacturer}/${slug}`, robot.variant);
  const presets = model ? resolvePresets(`${manufacturer}/${slug}${robot.variant === 'base' ? '' : `#${robot.variant}`}`, robot.form_factor, model.joints.joints) : {};

  return (
    <>
      {isPublicManufacturer(manufacturer) ? <JsonLd data={productJsonLd(robot, prices, availability, path)} /> : null}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Robots', path: '/robots' },
          { name: robot.manufacturer_name, path: `/brands/${robot.manufacturer_slug}` },
          { name: robot.name, path },
        ])}
      />

      <div className="border-b border-edge/70 bg-card/60">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8 sm:px-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
            <Link href="/robots" className="transition hover:text-foreground">
              Robots
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/brands/${robot.manufacturer_slug}`} className="transition hover:text-foreground">
              {robot.manufacturer_name}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground">{robot.name}</span>
          </nav>

          <header className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{FORM_FACTOR_LABEL[robot.form_factor]}</Badge>
                <Badge variant={STATUS_VARIANT[robot.status] ?? 'neutral'} dot>
                  {STATUS_LABEL[robot.status]}
                </Badge>
                {robot.release_year ? <Badge variant="neutral">{robot.release_year}</Badge> : null}
              </div>
              <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{robot.name}</h1>
              <p className="mt-2 text-sm text-muted">
                by{' '}
                <Link href={`/brands/${robot.manufacturer_slug}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {robot.manufacturer_name}
                </Link>
                {robot.manufacturer_country ? ` · ${robot.manufacturer_country}` : ''}
              </p>
              {robot.summary ? <p className="mt-4 max-w-2xl text-base text-muted">{robot.summary}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <VariantTabs base={base} variants={variants} current={robot.variant} />
              <CompareToggle id={robot.id} name={robot.name} size="md" />
            </div>
          </header>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {!isPublicManufacturer(manufacturer) ? <p className="card mb-6 p-4 text-sm text-muted">Reference only · This manufacturer has no verified current or upcoming commercial offering in our review. This robot is hidden from the supplier catalogue and matcher. <Link href={`/brands/${manufacturer}`} className="underline underline-offset-4">View manufacturer review</Link></p> : null}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-6">
            <RobotMedia model={model} presets={presets} images={images} name={robot.name} formFactor={robot.form_factor} compact={compact} />

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {figures.map((f) => (
                <div key={f.label} className="card p-4">
                  <dt className="label">
                    {f.label}
                    {f.qualifier ? <span> · {f.qualifier.split(',')[0]}</span> : null}
                  </dt>
                  <dd className="num mt-1.5 text-xl font-semibold tracking-tight">
                    {f.spec ? formatSpec(f.key, f.spec) : <span className="text-sm font-normal text-faint">not published</span>}
                  </dd>
                  <dd className="mt-2">
                    <EvidenceBadge trust={f.spec ? f.spec.trust : 'unknown'} />
                  </dd>
                </div>
              ))}
            </dl>

            <PricePanel prices={prices} availability={availability} />
          </div>

          <section className="card overflow-hidden self-start">
            <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-4 py-3.5">
              <h2 className="text-sm font-semibold">Specifications</h2>
              <span className="num text-xs text-faint">
                {total} value{total === 1 ? '' : 's'} · {verified} verified
              </span>
            </header>
            <div className="pb-3">
              <SpecTable specs={specs} formFactor={robot.form_factor} />
            </div>
          </section>
        </div>

        {compact ? null : (
          <div className="mt-6">
            <UseCaseProfile profile={profile} name={robot.name} />
          </div>
        )}

        {compact ? null : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PartsPanel specs={specs} formFactor={robot.form_factor} />
            <EquipmentPanel spec={specs.equipment_options} />
          </div>
        )}

        {conflicts.length ? (
          <section className="card mt-6 border-safety/30 bg-safety-soft/30 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-safety" aria-hidden />
              <h2 className="text-sm font-semibold">Sources disagree</h2>
            </div>
            <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {conflicts.map((c) => (
                <li key={c.key} className="rounded-xl border border-safety/20 bg-card/80 p-3">
                  <span className="font-medium">{fieldDef(c.key.split(':')[0])?.label ?? c.key}</span>
                  {c.key.includes(':') ? <span className="text-faint"> · {qualifierLabel(c.key.split(':')[1])}</span> : null}
                  <ul className="num mt-1.5 space-y-0.5 text-muted">
                    {c.values.map((v, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3">
                        <span>{String(v.value)}</span>
                        <a href={v.source_url} rel="nofollow noopener" target="_blank" className="text-xs text-faint underline-offset-2 hover:text-foreground hover:underline">
                          {new URL(v.source_url).hostname.replace(/^www\./, '')}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-6">
          <SourceList sources={sources} />
        </div>
      </main>
    </>
  );
}
