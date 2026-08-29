import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import type { Lab } from '@/lib/labs';

/** Shared chrome around every lab: title, takeaway, and the lab itself. */
export function LabPage({ lab, children }: { lab: Lab; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-10">
        <nav className="mb-6">
          <Link
            href="/labs"
            className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
          >
            ← All labs
          </Link>
        </nav>

        <header className="mb-8 max-w-prose">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {lab.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{lab.blurb}</p>
          <p className="mt-3 flex gap-2 text-sm leading-relaxed text-fg-faint">
            <span className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>
              <span className="text-fg-muted">What you should come away with:</span>{' '}
              {lab.takeaway}
            </span>
          </p>
        </header>

        {children}
      </main>
      <Footer />
    </>
  );
}
