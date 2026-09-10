import type { Metadata } from 'next';
import Link from 'next/link';

import { LearnExplorer } from '@/components/learn/LearnExplorer';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { ALL_RESOURCES, TRACKS, trackEvenings } from '@/lib/resources';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Learn',
  description:
    'A curated path through computer graphics and game development — the best courses, books, interactive explainers and tools on the web, in the order that makes sense.',
  path: '/learn',
});

/**
 * The facts the old four-sentence intro buried, as a readout row.
 *
 * Every number is computed from the registry rather than typed, for the reason
 * the whole codebase derives instead of restating: a hand-written "37" beside a
 * list that grows to 38 is a lie with no test to catch it. The hand-checked
 * count and its date come from `botBlockedVerified` — the field has existed
 * since the link checker started crying wolf on Cloudflare-fronted hosts, and
 * this is the first time the page has shown its working rather than claiming in
 * prose that every link is checked.
 */
function readout(): string[] {
  const stages = TRACKS.flatMap((track) => track.stages);
  const withLab = stages.filter((stage) => (stage.labs ?? []).length > 0).length;
  const free = ALL_RESOURCES.filter((resource) => resource.free).length;
  const evenings = TRACKS.map((track) => trackEvenings(track.id)).join(' + ');
  const byHand = ALL_RESOURCES.map((resource) => resource.botBlockedVerified).filter(
    (date): date is string => date !== undefined,
  );
  const latest = byHand.slice().sort().pop();

  return [
    `${ALL_RESOURCES.length} resources`,
    `${stages.length} stages`,
    `${withLab} with a lab here`,
    `${free} free`,
    `${evenings} evenings`,
    `${byHand.length} checked by hand ${latest}`,
  ];
}

export default function Learn() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Learn</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Everything worth reading, in the order worth reading it.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {ALL_RESOURCES.length} hand-picked resources across graphics and game
          development, in the order that makes each stage easier than the last.
        </p>

        {/*
          A wrapping flex row rather than `divide-x`: a divider on a wrapped row
          leaves an orphan rule hanging at the end of every line but the last.
        */}
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-y border-line py-2">
          {readout().map((cell) => (
            <li
              key={cell}
              className="tabular font-mono text-2xs uppercase tracking-wider text-fg-faint"
            >
              {cell}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <LearnExplorer />
        </div>

        {/*
          This page funnels readers outward, to other people's material, and then
          stopped dead. Every other page here ends with somewhere to go.
        */}
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Or come back and move something
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            Reading about a matrix and dragging one are different activities, and
            the second one is why this site exists. The{' '}
            <Link href="/labs" className="link-accent">
              labs
            </Link>{' '}
            run every idea on this list in your browser, in sequence, and the{' '}
            <Link href="/glossary" className="link-accent">
              glossary
            </Link>{' '}
            defines the vocabulary the reading uses — each term linked to the lab
            that shows it.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
