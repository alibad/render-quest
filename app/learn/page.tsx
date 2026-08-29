import type { Metadata } from 'next';

import { LearnExplorer } from '@/components/learn/LearnExplorer';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { ALL_RESOURCES } from '@/lib/resources';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'A curated path through computer graphics and game development — the best courses, books, interactive explainers and tools on the web, in the order that makes sense.',
};

export default function Learn() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Learn</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Everything worth reading, in the order worth reading it.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {ALL_RESOURCES.length} hand-picked resources across graphics and game
          development. Not a link dump — every one says why it earns your evenings,
          and they are arranged so each stage makes the next one easier. Most are
          free. Every link is checked.
        </p>

        <div className="mt-12">
          <LearnExplorer />
        </div>
      </main>
      <Footer />
    </>
  );
}
