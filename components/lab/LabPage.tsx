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
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/tech/${lab.technology === 'webgpu' ? 'webgpu' : 'webgl'}`}
              className={`rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
                lab.technology === 'webgpu'
                  ? 'border-amber/35 bg-amber/10 text-amber hover:bg-amber/20'
                  : 'border-line-strong text-fg-faint hover:text-fg-muted'
              }`}
            >
              Built on {lab.technology === 'webgpu' ? 'WebGPU' : 'WebGL'}
            </Link>
          </div>
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
          {lab.technologyReason ? (
            <p className="mt-2.5 flex gap-2 text-sm leading-relaxed text-fg-faint">
              <span className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-amber" />
              <span>
                <span className="text-fg-muted">Why this API:</span>{' '}
                {lab.technologyReason}
              </span>
            </p>
          ) : null}
        </header>

        {children}
      </main>
      <Footer />
    </>
  );
}
