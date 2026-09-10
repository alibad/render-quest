import Link from 'next/link';

import { LabFooter } from '@/components/lab/LabFooter';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import type { EssayOutline } from '@/lib/essay-outline';
import { getLab, type Lab } from '@/lib/labs';

/**
 * A lab page shows its contents only when there is a shape worth showing. Two
 * headings is not a map, it is a repetition of the page, and the line would
 * cost more vertical space than it saved.
 */
const ENOUGH_SECTIONS = 3;

/** Shared chrome around every lab: title, takeaway, contents, and the lab itself. */
export function LabPage({
  lab,
  outline,
  children,
}: {
  lab: Lab;
  /**
   * Parsed from the essay source by `essayOutline`, which uses `node:fs`. It
   * arrives as a prop rather than being read here so that no route can pull the
   * filesystem across a `'use client'` boundary by importing this component.
   */
  outline: EssayOutline;
  children: React.ReactNode;
}) {
  const prereq = lab.prereq ? getLab(lab.prereq) : undefined;
  const contents = outline.sections.length >= ENOUGH_SECTIONS ? outline.sections : [];

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

        <header className="mb-6 max-w-prose">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              Lab {lab.order}
            </span>
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
          {prereq ? (
            <p className="mt-2.5 flex gap-2 text-sm leading-relaxed text-fg-faint">
              <span className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-line-strong" />
              <span>
                <span className="text-fg-muted">Assumes:</span>{' '}
                <Link href={`/labs/${prereq.slug}`} className="link-accent">
                  {prereq.title}
                </Link>
                . It will still make sense without it, but that one comes first.
              </span>
            </p>
          ) : null}
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

        {/* Deliberately not a sixth block in the header, and deliberately not a
            panel. The header already stacks an eyebrow, an h1, a blurb, a
            takeaway and up to two more bullets; another card between that and
            the essay would push the first canvas down the page, which is the
            regression db4d0ea fixed in the compute lab. So: one wrapped line of
            plain links, no heading of its own, no bullets, no box.

            Nothing here is nowrap. A long section title — "A pixel covers a
            different number of texels everywhere you look" is 63 characters —
            has to be allowed to break mid-title, or at 375px it sets the line's
            min-content width and the whole page scrolls sideways. */}
        {contents.length > 0 ? (
          <nav
            aria-label="Contents"
            className="mb-8 border-t border-line pt-4 text-xs leading-6 text-fg-faint"
          >
            <span className="mr-1 font-mono text-2xs uppercase tracking-wider">
              {outline.minutes} min read
            </span>
            {contents.map((section) => (
              <span key={section.id}>
                <span aria-hidden className="px-1.5 text-line-strong">
                  ·
                </span>
                <a href={`#${section.id}`} className="link-accent">
                  {section.title}
                </a>
              </span>
            ))}
          </nav>
        ) : null}

        {children}

        <LabFooter lab={lab} />
      </main>
      <Footer />
    </>
  );
}
