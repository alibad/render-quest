import type { Metadata } from 'next';

import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { pageMetadata } from '@/lib/metadata';
import { REPO_URL } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy',
  description:
    'No accounts, no cookies, no analytics and no third-party requests — and a plain account of what the host logs on every request.',
  path: '/privacy',
});

export default function Privacy() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">Privacy</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          No accounts, no cookies, no analytics.
        </h1>
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-fg-muted">
          <p>
            Render Quest has no accounts, no sign-in, no newsletter and no comment
            section. It sets no cookies and runs no analytics, advertising or
            fingerprinting scripts. It makes no request to any third party either —
            the two typefaces are self-hosted at build time rather than fetched from
            Google — so opening a lab contacts the server the page came from and
            nothing else. Slider positions and camera angles live in page memory and
            are gone when you close the tab.
          </p>
          <p>
            Two things are remembered, both in your browser&rsquo;s local storage and
            neither sent anywhere: your light or dark preference, and which items you
            have ticked off on the{' '}
            <Link href="/learn" className="link-accent">
              Learn
            </Link>{' '}
            page. Those are the only two keys this site writes. Clearing your site
            data removes both, and the site works fine without them.
          </p>
          <p>
            What the site does not collect, its host still logs. The pages are static
            files served by{' '}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline-offset-4 hover:underline"
            >
              Vercel
            </a>
            , and like any web server it records each request it answers: the client
            IP address, the browser&rsquo;s user-agent string and the page you came
            from, held in operational logs for whatever period Vercel&rsquo;s own
            retention policy sets. Nothing here asks for that, nothing here reads it,
            and it is joined to nothing else — but it happens on every page you open,
            and a privacy page that left it out would be selling you something.
          </p>
          <p>
            If that ever changes — if a lab starts saving your work, for instance —
            this page changes with it, in plain language, before the feature ships.
          </p>
          <p className="text-fg-faint">
            Questions:{' '}
            <a
              href={`${REPO_URL}/issues`}
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
