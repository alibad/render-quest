import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LABS } from '@/lib/labs';
import { NOT_DOING, ROADMAP, ROADMAP_COUNTS, ROADMAP_THESIS } from '@/lib/roadmap';
import { REPO_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Roadmap',
  description:
    'What is being built next on Render Quest, what has shipped, and what was proposed and declined.',
  alternates: { canonical: '/roadmap' },
};

const STATE_LABEL = {
  done: 'Shipped',
  next: 'Next',
  later: 'Later',
} as const;

const STATE_CLASS = {
  done: 'border-axis-y/40 bg-axis-y/10 text-axis-y',
  next: 'border-accent/40 bg-accent/10 text-accent',
  later: 'border-line-strong text-fg-faint',
} as const;

export default function Roadmap() {
  const building = LABS.filter((lab) => lab.status === 'building');

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-14">
        <p className="eyebrow">Roadmap</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What is being built, and what is not.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {ROADMAP_THESIS}
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Stat value={ROADMAP_COUNTS.done} label="shipped" />
          <Stat value={ROADMAP_COUNTS.next} label="next" />
          <Stat value={ROADMAP_COUNTS.later} label="later" />
          <Stat value={NOT_DOING.length} label="declined" />
        </dl>

        <ol className="mt-14 space-y-14">
          {ROADMAP.map((phase, index) => (
            <li key={phase.name}>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xs text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-fg">
                  {phase.name}
                </h2>
              </div>
              <p className="mt-1.5 max-w-prose pl-8 text-sm leading-relaxed text-fg-muted">
                {phase.goal}
              </p>

              <ul className="mt-5 space-y-3 sm:pl-8">
                {phase.items.map((item) => (
                  <li
                    key={item.title}
                    className={`panel p-4 ${item.state === 'done' ? 'opacity-70' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold tracking-tight text-fg">
                        {item.title}
                      </h3>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${
                          STATE_CLASS[item.state]
                        }`}
                      >
                        {STATE_LABEL[item.state]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                      {item.what}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-fg-faint">
                      {item.why}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-16 border-t border-line pt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Proposed, and declined
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            Each of these was a real suggestion with a real argument behind it. Saying
            no in public is the part of a roadmap that actually costs something.
          </p>
          <dl className="mt-6 space-y-5">
            {NOT_DOING.map((item) => (
              <div key={item.title} className="border-l-2 border-line pl-4">
                <dt className="text-sm font-medium text-fg-muted line-through decoration-line-strong">
                  {item.title}
                </dt>
                <dd className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg-faint">
                  {item.why}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {building.length > 0 ? (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="text-lg font-semibold tracking-tight">Labs in progress</h2>
            <ul className="mt-4 space-y-2">
              {building.map((lab) => (
                <li key={lab.slug} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-fg-faint" />
                  <span className="text-fg-muted">
                    <strong className="font-medium text-fg">{lab.title}</strong> —{' '}
                    {lab.takeaway}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-14 border-t border-line pt-8 text-sm leading-relaxed text-fg-muted">
          Think something here is in the wrong order, or missing?{' '}
          <a
            href={`${REPO_URL}/issues/new`}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Say so
          </a>
          . The last two rounds of this plan were reordered by people arguing with it.
          Otherwise, the <Link href="/labs" className="link-accent">labs</Link> are the
          part that already exists.
        </p>
      </main>
      <Footer />
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="tabular font-mono text-xl font-semibold text-fg">{value}</span>
        <span className="ml-2 text-xs text-fg-faint">{label}</span>
      </dd>
    </div>
  );
}
