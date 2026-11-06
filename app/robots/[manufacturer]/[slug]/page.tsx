import { BuyingPanel } from '@/components/robot/BuyingPanel';
import { GermanySection, JobsSection, TrackRecordSection, type Deployment } from '@/components/market/GermanyBuy';
import { MarketSpecifications } from '@/components/market/MarketSpecifications';
import { marketForCatalogue } from '@/lib/market/links';
import { marketImagesFor, pageIdentity } from '@/lib/market/tiles';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isPublicRobot } from '@/lib/catalogue-policy';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/jsonld';
import { catalogueFacts, catalogueType, marketFacts, mergeFacts } from '@/lib/compare/facts';
import { getRobotModel } from '@/lib/models/index';
import { resolvePresets } from '@/lib/models/poses';
import { EquipmentPanel } from '@/components/robot/EquipmentPanel';
import { UseCaseProfile } from '@/components/robot/UseCaseProfile';
import { germanyBuyingRoutes } from '@/lib/purchasing';
import { profileFor } from '@/lib/profile/profile';
import { PartsPanel } from '@/components/robot/PartsPanel';
import { PricePanel } from '@/components/robot/PricePanel';
import { RobotMedia } from '@/components/robot/RobotMedia';
import { RobotTemplate, STATUS_VARIANT } from '@/components/robot/RobotTemplate';
import { SourceList } from '@/components/robot/SourceList';
import { SourcesDisagree } from '@/components/robot/SourcesDisagree';
import { SpecTable } from '@/components/robot/SpecTable';
import { VariantTabs } from '@/components/robot/VariantTabs';
import { getRobotDetail } from '@/lib/queries/robots';
import { publicMetadata } from '@/lib/seo';
import { formatSpec, pickPayloadKey, qualifierLabel, STATUS_LABEL } from '@/lib/spec/display';

export const dynamic = 'force-dynamic';

type Params = Promise<{ manufacturer: string; slug: string }>;
type Search = Promise<{ variant?: string; render?: string }>;

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { manufacturer, slug } = await params;
  const { variant } = await searchParams;
  const detail = await getRobotDetail(manufacturer, slug, variant);
  if (!detail) return {};
  const r = detail.robot;
  const payloadKey = pickPayloadKey(r.specs ?? {});
  const bits = [
    r.height_m !== null ? `${r.height_m} m` : null,
    r.weight_kg !== null ? `${r.weight_kg} kg` : null,
    payloadKey ? formatSpec(payloadKey, r.specs[payloadKey]) + ' payload (' + (qualifierLabel(payloadKey.split(':')[1]) ?? 'basis unstated') + ')' : null,
    r.ip_rating,
  ].filter(Boolean);
  return { ...publicMetadata({
    title: `${r.name} specs, price and site suitability`,
    description: `${r.manufacturer_name} ${r.name}: ${bits.join(', ') || 'specifications'}, with the source of every value, regional prices and delivery status.`,
    path: `/robots/${manufacturer}/${slug}`,
  }), ...(!isPublicRobot(manufacturer, slug) ? { robots: { index: false, follow: false } } : {}) };
}

export default async function RobotPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { manufacturer, slug } = await params;
  const { variant, render } = await searchParams;
  const detail = await getRobotDetail(manufacturer, slug, variant);
  if (!detail) notFound();
  // ?render=1 is the still-image mode: the viewer alone, framed tight, used by
  // scripts/assets/render-models.ts to make the card images.
  const compact = render === '1';

  const { robot, images, variants, prices, availability, sources, conflicts } = detail;
  const market = marketForCatalogue(manufacturer, slug);
  // The German pictures were checked by eye, so they lead the gallery.
  const gallery = [...marketImagesFor(market, variants, robot.id, images.map((image) => image.url)), ...images];
  const specs = robot.specs ?? {};
  const base = `/robots/${manufacturer}/${slug}`;
  const verified = robot.verified_fields?.length ?? 0;
  const total = Object.keys(specs).length;
  const listed = isPublicRobot(manufacturer, slug);

  const path = `${base}${robot.variant === 'base' ? '' : `?variant=${robot.variant}`}`;
  const profile = profileFor({ card: robot, prices, availability });
  const model = getRobotModel(`${manufacturer}/${slug}`, robot.variant);
  const presets = model ? resolvePresets(`${manufacturer}/${slug}${robot.variant === 'base' ? '' : `#${robot.variant}`}`, robot.form_factor, model.joints.joints) : {};
  const hasMedia = Boolean(model) || gallery.length > 0;
  // The market record of this configuration speaks first; the catalogue fills what it leaves open.
  const record = pageIdentity(variants, market).recordFor.get(robot.id) ?? null;
  const facts = mergeFacts(record ? marketFacts(record) : null, catalogueFacts(robot, prices, availability, germanyBuyingRoutes(manufacturer, slug, robot.variant, prices)));
  // Where German sellers are listed, prices that only third-party databases report fold away; a
  // maker's store price or delivery status stays open.
  const onlyReported = market.length > 0 && prices.every((p) => p.tier > 2) && availability.every((a) => a.source_tier == null || a.source_tier > 2);
  const deployments = Array.isArray(specs.deployment_evidence?.value) ? specs.deployment_evidence.value as unknown as Deployment[] : [];

  const catalogueValues = <div id={market.length ? undefined : 'configuration-specs'} className="scroll-mt-6 pb-3">
    {market.length ? <div className="border-t border-edge/70 px-5 pt-4">
      <h3 className="text-sm font-medium">Catalogue specifications</h3>
      <p className="mt-1 text-xs text-muted">Catalogue values for {robot.variant === 'base' ? 'the base record' : robot.variant}.</p>
    </div> : null}
    <SpecTable specs={specs} formFactor={robot.form_factor} unpublishedAsList />
  </div>;

  return (
    <>
      {listed ? <JsonLd data={productJsonLd(robot, prices, availability, path)} /> : null}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Robots', path: '/robots' },
          { name: robot.manufacturer_name, path: `/brands/${robot.manufacturer_slug}` },
          { name: robot.name, path },
        ])}
      />
      <RobotTemplate page={{
        compact,
        name: robot.name,
        type: catalogueType(robot.form_factor),
        status: { label: STATUS_LABEL[robot.status], variant: STATUS_VARIANT[robot.status] ?? 'neutral' },
        year: robot.release_year,
        maker: { name: robot.manufacturer_name, href: `/brands/${robot.manufacturer_slug}`, country: robot.manufacturer_country },
        summary: robot.summary ?? record?.summary ?? null,
        compare: { id: robot.id, name: robot.name },
        actions: <VariantTabs base={base} variants={variants} current={robot.variant} />,
        notice: !listed ? <p className="card mb-6 p-4 text-sm text-muted">Reference only · This record has no named, reviewed current or upcoming commercial product offering. This robot is hidden from the supplier catalogue and matcher. <Link href={`/brands/${manufacturer}`} className="underline underline-offset-4">View manufacturer review</Link></p> : null,
        media: hasMedia ? <RobotMedia model={model} presets={presets} images={gallery} name={robot.name} formFactor={robot.form_factor} compact={compact} /> : null,
        germany: <GermanySection robots={market} pictures={!hasMedia} fallback={listed ? <BuyingPanel manufacturer={manufacturer} model={slug} variant={robot.variant} prices={prices} /> : undefined} />,
        prices: <div id="prices" className="scroll-mt-6">
          {onlyReported ? (
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm [&::-webkit-details-marker]:hidden">
                <span className="font-medium">Price and delivery outside Germany</span>
                <span className="text-xs text-faint">{prices.length ? prices.length + ' reported by databases, not by a seller' : 'nothing published'}</span>
                <span className="text-xs font-medium underline underline-offset-2 group-open:hidden">Show</span>
                <span className="hidden text-xs font-medium underline underline-offset-2 group-open:inline">Hide</span>
              </summary>
              <div className="mt-4">
                <PricePanel prices={prices} availability={availability} />
              </div>
            </details>
          ) : (
            <PricePanel prices={prices} availability={availability} />
          )}
        </div>,
        facts,
        jobs: <JobsSection robots={market} />,
        trackRecord: <TrackRecordSection robots={market} deployments={deployments} />,
        specs: <>
          <MarketSpecifications robots={market} />
          {catalogueValues}
        </>,
        specsAside: <span className="num text-xs text-faint">{total} catalogue value{total === 1 ? '' : 's'} · {verified} verified</span>,
        conflicts: conflicts.length ? <SourcesDisagree conflicts={conflicts} /> : null,
        moreLabel: 'Parts, equipment and evidence profile',
        more: <>
          <div id="parts" className="scroll-mt-6 space-y-6">
            <PartsPanel specs={specs} formFactor={robot.form_factor} alsoUnpublished={specs.equipment_options ? [] : ['Equipment options']} />
            {specs.equipment_options ? <EquipmentPanel spec={specs.equipment_options} /> : null}
          </div>
          <div id="profile" className="scroll-mt-6">
            <UseCaseProfile profile={profile} name={robot.name} marketRobots={market} configurationLabel={robot.variant === 'base' ? 'Catalogue model' : robot.variant} />
          </div>
        </>,
        sources: <SourceList sources={sources} market={market.flatMap((item) => item.sources)} />,
      }} />
    </>
  );
}
