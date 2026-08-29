import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { ThemeProvider } from '@/components/site/ThemeProvider';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

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

const SITE_URL = 'https://www.render-quest.com';

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
      </head>
      <body className="min-h-screen font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
