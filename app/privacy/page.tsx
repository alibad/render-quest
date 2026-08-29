import type { Metadata } from 'next';

import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Render Quest collects: nothing.',
};

export default function Privacy() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          There is nothing to collect.
        </h1>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-fg-muted">
          <p>
            Render Quest has no accounts, no sign-in, no newsletter and no comment
            section. It sets no cookies and runs no analytics, advertising or
            fingerprinting scripts. Nothing you do here leaves your browser — slider
            positions and camera angles live in page memory and are gone when you
            close the tab.
          </p>
          <p>
            Two things are remembered, both in your browser&rsquo;s local storage and
            neither sent anywhere: your light or dark preference, and which items you
            have ticked off on the{' '}
            <Link href="/learn" className="link-accent">
              Learn
            </Link>{' '}
            page. Clearing your site data removes both, and the site works fine
            without them.
          </p>
          <p>
            The site is served as static files by{' '}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline-offset-4 hover:underline"
            >
              Vercel
            </a>
            , which keeps its own operational request logs, and the two typefaces are
            self-hosted at build time rather than fetched from Google. That is the
            entire data story.
          </p>
          <p>
            If that ever changes — if a lab starts saving your work, for instance —
            this page changes with it, in plain language, before the feature ships.
          </p>
          <p className="text-fg-faint">
            Questions:{' '}
            <a
              href="https://github.com/alibad/render-quest/issues"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline-offset-4 hover:underline"
            >
              open an issue
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
