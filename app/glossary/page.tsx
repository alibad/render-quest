import type { Metadata } from 'next';
import Link from 'next/link';

import { GlossaryExplorer } from '@/components/glossary/GlossaryExplorer';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { GLOSSARY } from '@/lib/glossary';

export const metadata: Metadata = {
  title: 'Glossary',
  description:
    'Plain definitions for the graphics vocabulary — clip space, the perspective divide, normal matrices, winding order — each linked to a lab that shows it.',
  alternates: { canonical: '/glossary' },
};

export default function Glossary() {
  const withLab = GLOSSARY.filter((entry) => entry.lab).length;

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-14">
        <p className="eyebrow">Glossary</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          The words, without the hand-waving.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {GLOSSARY.length} terms this site actually uses, defined in plain language.{' '}
          {withLab} of them link to a{' '}
          <Link href="/labs" className="link-accent">
            lab
          </Link>{' '}
          that demonstrates the idea, because the fastest definition of &ldquo;perspective
          divide&rdquo; is a slider that performs one.
        </p>

        <div className="mt-10">
          <GlossaryExplorer />
        </div>
      </main>
      <Footer />
    </>
  );
}
