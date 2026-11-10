import { Fraunces, Instrument_Sans } from 'next/font/google';

/**
 * The Human Quest family type, self-hosted.
 *
 * The family kit fetches these from Google Fonts at runtime. This site cannot:
 * /privacy says it makes no request to any third party, and next/font downloads
 * the files at build time and serves them from this origin instead. JetBrains
 * Mono, the kit's third face, is already loaded by the root layout as
 * --font-mono.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-fraunces',
});

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument',
});
