import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { CHANGELOG, FEED_URL, LAST_UPDATED, WORKING_NOTE_DAYS, formatDate } from '@/lib/changelog';
import { pageMetadata } from '@/lib/metadata';
import { REPO_URL } from '@/lib/site';

const base = pageMetadata({
  title: 'Changelog',
  description:
    'What changed on Render Quest and when, newest first — and an Atom feed, which is the only way to follow a site that runs no analytics and sets no cookies.',
  path: '/changelog',
});

/**
 * The feed is advertised here rather than site-wide because `app/layout.tsx` is
 * the only place a head link can cover every route, and a reader who wants a
 * feed looks for it on the page that lists the entries. If the link moves to the
 * layout later, this one is harmless duplication rather than a conflict.
 */
export const metadata: Metadata = {
  ...base,
  alternates: {
    ...base.alternates,
    types: { 'application/atom+xml': FEED_URL },
  },
};

export default function Changelog() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-14">
        <p className="eyebrow">Changelog</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What changed, and when.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          Until this page there was no date anywhere on the site, so a returning
          reader could not tell whether the last change was yesterday or two years
          ago. It was{' '}
          <time dateTime={LAST_UPDATED} className="text-fg">
            {formatDate(LAST_UPDATED)}
          </time>
          . Entries are newest first, and each one is a link you can send someone.
        </p>

        {/*
          A feed is not a nice-to-have on this particular site. /privacy promises
          no accounts, no cookies, no analytics and no newsletter, and the roadmap
          records all four being declined on purpose — which leaves a reader who
          wants to hear about a change with nothing at all. Atom is the one
          subscription mechanism that survives those promises intact, because the
          subscriber holds it and the site never learns who they are.
        */}
        <section className="mt-8 rounded-xl border border-dashed border-line-strong p-5">
          <p className="eyebrow">Follow this without being followed</p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
            This site has no accounts, no newsletter, no cookies and no analytics, so
            there is no list to join and nothing here knows you came back.{' '}
            <a href="/feed.xml" className="link-accent">
              The Atom feed
            </a>{' '}
            is the whole subscription mechanism: your reader fetches it, the site
            learns nothing about you beyond the request itself, and the{' '}
            <Link href="/privacy" className="link-accent">
              privacy page
            </Link>{' '}
            stays true.
          </p>
          <p className="mt-3 font-mono text-2xs text-fg-faint">{FEED_URL}</p>
        </section>

        <ol className="mt-14 space-y-12">
          {CHANGELOG.map((entry) => (
            <li
              key={entry.date}
              id={entry.date}
              className="scroll-mt-24 border-l-2 border-line pl-5 transition-colors target:border-accent"
            >
              <div className="flex items-baseline gap-3">
                <time
                  dateTime={entry.date}
                  className="tabular font-mono text-2xs uppercase tracking-wider text-accent"
                >
                  {formatDate(entry.date)}
                </time>
                <a
                  href={`#${entry.date}`}
                  className="font-mono text-2xs text-fg-faint transition-colors hover:text-fg"
                  aria-label={`Link to the entry for ${formatDate(entry.date)}`}
                >
                  #
                </a>
              </div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-fg">
                {entry.title}
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                {entry.summary}
              </p>
              <ul className="mt-4 space-y-2.5">
                {entry.changes.map((change) => (
                  <li key={change} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-fg-faint" />
                    <span className="max-w-prose text-fg-muted">{change}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <section className="mt-16 border-t border-line pt-10">
          <h2 className="text-lg font-semibold tracking-tight">Where these come from</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
            There is a working note in the repository for each of the{' '}
            {WORKING_NOTE_DAYS} days this site has been worked on. Those are notes to
            self: they name commits, count tests, and carry a list of things that are
            currently broken. The entries above are written from them and are not
            generated out of them — no part of a working note is published by
            machinery, so a note written tomorrow publishes nothing until somebody
            decides what of it a reader should see.
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
            If you would rather have the unedited version, the notes are in the open
            too:{' '}
            <a
              href={`${REPO_URL}/tree/main/todo`}
              target="_blank"
              rel="noreferrer noopener"
              className="link-accent"
            >
              todo/ in the repository
            </a>
            . What is planned is not here at all — that lives in the{' '}
            <Link href="/roadmap" className="link-accent">
              roadmap
            </Link>{' '}
            and in the issue tracker it points at.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
