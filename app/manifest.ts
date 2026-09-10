import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/lib/site';

/**
 * The manifest's colours are the page's colours, read out of the stylesheet at
 * build time rather than transcribed. lib/theme.ts carries only the canvas
 * palette — normalised floats for WebGL, which do not round-trip to the exact
 * token (0.78 × 255 is 198.9, and --accent is 200) — and the page background it
 * does not carry at all. So the tokens come from where they are defined.
 *
 * A manifest has one background and one theme colour with no media query, and
 * dark is what an unconfigured visitor gets (see resolveInitialTheme), so the
 * dark block is the one to read.
 */
function darkToken(name: string): string {
  const css = readFileSync(
    path.join(process.cwd(), 'app', 'globals.css'),
    'utf8',
  );
  const block = css.match(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/)?.[1];
  const channels = block
    ?.match(new RegExp(`${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s*;`))
    ?.slice(1, 4);

  if (!channels) {
    throw new Error(
      `manifest: ${name} is not in the dark block of app/globals.css`,
    );
  }

  return `#${channels.map((c) => Number(c).toString(16).padStart(2, '0')).join('')}`;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: darkToken('--bg'),
    theme_color: darkToken('--bg'),
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
    ],
  };
}
