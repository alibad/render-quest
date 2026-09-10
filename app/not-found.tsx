import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LIVE_LABS } from '@/lib/labs';

/**
 * The one route that does not go through `pageMetadata()`, deliberately.
 *
 * That helper exists so every indexable page gets its own canonical URL and its
 * own og:title, og:description and og:url — without it a page inherits the root
 * layout's and shares as the home page. None of that applies here: this page is
 * `noindex`, it has no canonical address to claim (every wrong URL renders it),
 * and it has no `opengraph-image.tsx` for the same reason. Inheriting the root's
 * social card is the right answer, not an oversight of file naming.
 *
 * `robots` has to stay written out. The root layout sets `index, follow` and
 * Next merges metadata shallowly, so dropping this line would leave the page
 * carrying Next's own injected `noindex` alongside an inherited `index, follow`
 * — two tags contradicting each other. With it, both tags in the served HTML
 * agree; test/render.smoke.ts asserts that they do.
 *
 * A static `metadata` object is what works in a `not-found.tsx`. Verified
 * against the built page: it serves `<title>Page not found — Render Quest`,
 * with the root layout's title template applied. The 404 inheriting the site's
 * default title is a bug this project has already had once.
 */
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-20">
        <p className="eyebrow">404 · clipped</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
          This one fell outside the frustum.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          There is no page at that address. It may have moved in a rebuild, or it may
          never have existed — either way, everything that does exist is one click
          away.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {LIVE_LABS.map((lab) => (
            <Link
              key={lab.slug}
              href={`/labs/${lab.slug}`}
              className="panel group p-4 transition-colors hover:border-line-strong hover:bg-ink-600/50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-fg">
                  {lab.title}
                </h2>
                <span className="font-mono text-2xs uppercase tracking-wider text-accent">
                  →
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                {lab.blurb}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-contrast transition-colors hover:bg-accent/85"
          >
            Back to the start
          </Link>
          <Link
            href="/learn"
            className="rounded-lg border border-line px-5 py-2.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            Reading path
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
