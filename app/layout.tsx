import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/site/ThemeProvider';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { AUTHOR, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

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
    default: 'Render Quest — learn graphics by moving the numbers',
    template: '%s — Render Quest',
  },
  description:
    'Interactive labs for computer graphics. Drag a matrix and watch the geometry move; open a camera frustum and watch what falls out of it. Real WebGL, running live in the browser.',
  keywords: [
    'WebGL',
    'computer graphics',
    'matrix transformations',
    'projection matrix',
    'view frustum',
    'interactive learning',
    'graphics programming',
  ],
  authors: [{ name: 'Ali Bader Eddin' }],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Render Quest',
    title: 'Render Quest — learn graphics by moving the numbers',
    description:
      'Interactive labs for computer graphics. Drag a matrix and watch the geometry move. Real WebGL, running live in the browser.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Render Quest — learn graphics by moving the numbers',
    description:
      'Interactive labs for computer graphics. Drag a matrix and watch the geometry move.',
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
