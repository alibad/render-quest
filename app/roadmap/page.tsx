import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LABS } from '@/lib/labs';
import { NOT_DOING, ROADMAP, ROADMAP_COUNTS, ROADMAP_THESIS } from '@/lib/roadmap';
import { ASK_URL, REPO_URL, REPORT_URL } from '@/lib/site';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Roadmap',
  description:
    `Everything that shipped on Render Quest and why, and the ${NOT_DOING.length} proposals that were considered and turned down — with the reason for each. What is coming is in the issue tracker.`,
  path: '/roadmap',
});

/** Open issues anyone could pick up, as GitHub's own filter spells it. */
const GOOD_FIRST_ISSUES = `${REPO_URL}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`;

export default function Roadmap() {
  const building = LABS.filter((lab) => lab.status === 'building');

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-14">
        <p className="eyebrow">Roadmap</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What shipped, and what was turned down.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {ROADMAP_THESIS}
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Stat value={ROADMAP_COUNTS.shipped} label="shipped" />
          <Stat value={ROADMAP_COUNTS.declined} label="declined" />
        </dl>

        {/*
          This page used to end its front half with a panel explaining that
          nothing was in progress, because the roadmap carried the plan and the
          plan was finished. Issue #40: the repository is public now and the
          tracker holds the backlog, so the honest answer to "what is next" is a
          link rather than a list. The reasoning is on the page and not only
          here, because a reader arriving from three "what is next" links
          deserves to know why the page they landed on does not answer it
          directly.
        */}
        <section className="mt-8 rounded-xl border border-dashed border-line-strong p-5">
          <p className="eyebrow">What is next is in the issue tracker</p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
            Everything below has shipped. This page used to carry the plan as well as
            the record, and it stopped doing that the day the repository went public:
            the backlog is on the tracker, it changes there, and a second list typed
            here would be a copy of it. The copy is the one that goes stale, and the
            copy is the one on the website.
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
            So the open list lives over there, some of it tagged for someone arriving
            for the first time. There is deliberately no count of it on this page,
            because a number typed here is exactly the thing that rots. What this page
            keeps is the half a tracker is bad at — a closed issue is invisible,
            while &ldquo;this was proposed, and here is why not&rdquo; is worth reading
            and lives nowhere else.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:underline"
            >
              Open issues →
            </a>
            <a
              href={GOOD_FIRST_ISSUES}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:underline"
            >
              Good first issues →
            </a>
            <a
              href={REPORT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-fg-muted"
            >
              Report something wrong →
            </a>
            <a
              href={ASK_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-fg-muted"
            >
              Ask a question →
            </a>
          </div>
        </section>

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
                  <li key={item.title} className="panel p-4 opacity-70">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold tracking-tight text-fg">
                        {item.title}
                      </h3>
                      <span className="rounded border border-axis-y/40 bg-axis-y/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-axis-y">
                        Shipped
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
          Think something here was declined for the wrong reason, or is missing?{' '}
          <a
            href={REPORT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Say so
          </a>
          . The last two rounds of this plan were reordered by people arguing with it.
          What changed and when is on the{' '}
          <Link href="/changelog" className="link-accent">
            changelog
          </Link>
          , and the <Link href="/labs" className="link-accent">labs</Link> are the part
          you can actually use.
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
