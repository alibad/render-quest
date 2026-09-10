import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/site/ThemeProvider';
import { FEED_TITLE, FEED_URL } from '@/lib/changelog';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import {
  AUTHOR,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_CREATOR,
} from '@/lib/site';

import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'WebGL',
    'computer graphics',
    'matrix transformations',
    'projection matrix',
    'view frustum',
    'interactive learning',
    'graphics programming',
  ],
  authors: [{ name: AUTHOR }],
  // Only the home page's card. Next merges metadata shallowly, so a child that
  // sets `title` and `description` but no `openGraph` inherits this object
  // whole — which is exactly how all 23 routes came to share as the home page,
  // with the home page's title, description AND url. Every other route now
  // builds its own through lib/metadata.ts; this stays for `/` alone.
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Spread, not a plain field: while lib/site.ts has no handle TWITTER_CREATOR
  // is `{}`, so twitter:creator is absent rather than empty. This covers `/`
  // only — Next merges metadata shallowly, so a page that sets its own
  // `twitter` object replaces this one whole. The other 22 routes build theirs
  // in lib/metadata.ts and need the same spread there.
  twitter: {
    card: 'summary_large_image',
    ...TWITTER_CREATOR,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

/**
 * Site-level structured data. Deliberately modest: claims a search engine can
 * verify by reading the page, and nothing it cannot.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en',
  author: {
    '@type': 'Person',
    name: AUTHOR,
    url: REPO_URL,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08090b' },
    { media: '(prefers-color-scheme: light)', color: '#fbfcfd' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Stamps the theme before first paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {/* A literal tag rather than `alternates.types`, because this is the
            only place that reaches every route: Next merges metadata shallowly,
            so each page's own `alternates` would replace the root's whole and
            the feed would be advertised on `/` alone. /changelog also sets it in
            its own metadata; a duplicate link is harmless, a missing one is not. */}
        <link rel="alternate" type="application/atom+xml" title={FEED_TITLE} href={FEED_URL} />
      </head>
      <body className="min-h-screen font-sans">
        {/* First focusable element on every page, so keyboard users can jump
            the header instead of tabbing through it on each navigation. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-contrast"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
