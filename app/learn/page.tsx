import type { Metadata } from 'next';
import Link from 'next/link';

import { LearnExplorer } from '@/components/learn/LearnExplorer';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { ALL_RESOURCES } from '@/lib/resources';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Learn',
  description:
    'A curated path through computer graphics and game development — the best courses, books, interactive explainers and tools on the web, in the order that makes sense.',
  path: '/learn',
});

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
          development. Not a link dump — every one says why it earns your evenings,
          and they are arranged so each stage makes the next one easier. Most are
          free, and a job checks every link each Monday — one that stops answering says
          so on its own card.
        </p>

        <div className="mt-12">
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
