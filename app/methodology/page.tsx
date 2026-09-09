import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { HARD_CRITERIA, LABELS, WEIGHTS } from '@/lib/match/weights';
import { AXES, TASK_BUCKETS, TASK_LABEL } from '@/lib/profile/profile';
import { publicMetadata } from '@/lib/seo';
import { TRUST_HINT, TRUST_LABEL } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';

export const metadata = publicMetadata({
  title: 'Methodology',
  description: 'How every value is sourced and labelled, how the matcher ranks robots, and how the construction profile is derived.',
  path: '/methodology',
});

const TRUSTS: Trust[] = ['verified', 'assessed', 'reported', 'unknown'];

/** Rendered from the same modules the matcher and the profile run on, so the page cannot drift from the code. */
export default function MethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-6">
      <header className="py-10">
        <p className="eyebrow">Methodology</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How the numbers are made</h1>
        <p className="mt-3 max-w-2xl text-muted">Every value on this site links to the page it was read from. This page says what we do with those values, in the order the site does it.</p>
      </header>

      <section id="trust" className="card scroll-mt-20 p-5">
        <h2 className="text-base font-semibold">Trust labels</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {TRUSTS.map((t) => (
            <li key={t} className="flex items-start gap-3">
              <Badge variant={t === 'verified' ? 'success' : t === 'assessed' ? 'info' : t === 'reported' ? 'warn' : 'neutral'} className="mt-0.5 shrink-0">{TRUST_LABEL[t]}</Badge>
              <span className="text-muted">{TRUST_HINT[t]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Where two sources disagree, both are shown under "Sources disagree" on the robot page. Unknown is never turned into a number.</p>
      </section>

      <section id="matcher" className="card mt-6 scroll-mt-20 p-5">
        <h2 className="text-base font-semibold">The matcher</h2>
        <p className="mt-2 text-sm text-muted">Hard requirements exclude a robot with the reason shown; soft requirements are scored 0–1 and averaged with the weights below over the criteria whose value is known. Unknown leaves the denominator unless you tick strict.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label mb-1.5">Hard (exclude)</p>
            <div className="flex flex-wrap gap-1.5">{HARD_CRITERIA.map((id) => <Badge key={id} variant="outline">{LABELS[id] ?? id}</Badge>)}</div>
          </div>
          <div>
            <p className="label mb-1.5">Soft (weighted)</p>
            <table className="text-sm">
              <tbody>
                {Object.entries(WEIGHTS).map(([id, w]) => (
                  <tr key={id}><td className="pr-4 text-muted">{LABELS[id] ?? id}</td><td className="num font-medium">{w}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="profile" className="card mt-6 scroll-mt-20 p-5">
        <h2 className="text-base font-semibold">The construction profile</h2>
        <p className="mt-2 text-sm text-muted">
          The spider chart on a robot page asks the matcher&apos;s own criteria at rising requirement values and takes the share that passes — a threshold ladder. The rungs are listed here; there is no other formula. Axes are unweighted. An axis whose inputs are not published is drawn as a gap, not as zero.
        </p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {AXES.map((a) => (
              <tr key={a.id} className="border-t border-edge/60 align-top"><td className="w-36 py-2 pr-3 font-medium">{a.label}</td><td className="py-2 text-muted">{a.hint}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-muted">The task view lists the site tasks we assess in the curated layer: yes when the maker states it or we assessed it with evidence, partial when only a third party reports it, no when a robot was assessed and the task is not listed, and not assessed otherwise.</p>
        <div className="mt-3 space-y-2">
          {TASK_BUCKETS.map((b) => (
            <div key={b.id} className="flex flex-wrap items-baseline gap-1.5 text-sm"><span className="w-40 shrink-0 text-muted">{b.label}</span>{b.tasks.map((t) => <Badge key={t} variant="outline">{TASK_LABEL[t]}</Badge>)}</div>
          ))}
        </div>
      </section>

      <section id="images" className="card mt-6 scroll-mt-20 p-5">
        <h2 className="text-base font-semibold">Images and 3D models</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Photographs come from Wikimedia Commons under a free licence, each checked by a person before it is attached, with author and licence in the caption.</li>
          <li>Preview images are the maker&apos;s own product-page image, shown as a linked preview and never copied; the caption names the maker and the page. A maker who prefers otherwise writes to the address on <Link href="/bot" className="underline-offset-2 hover:underline">/bot</Link> and the image is removed.</li>
          <li>Where a robot has a model, the page opens on it; the photos tab is a gallery of every picture we may show, the maker&apos;s own first, each with the page it came from. A variant without pictures of its own shows the base model&apos;s photographs, never its render. A robot with no real picture at all has no picture and stays off the catalogue until you ask for it — nothing is drawn, generated or stood in.</li>
          <li>3D models are converted from the maker&apos;s published robot description (URDF or MJCF) under BSD, MIT or Apache licences, with the repository, commit and licence text on the page. Renders are stills of that geometry. No picture of a real robot is generated by AI.</li>
        </ul>
      </section>
    </main>
  );
}
