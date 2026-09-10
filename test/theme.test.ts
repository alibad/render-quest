/**
 * The canvas palette against the CSS tokens it mirrors.
 *
 * The site's whole claim is that the matrix, the geometry and the pixels move
 * together, so a scene drawn in a colour the page around it does not use is a
 * quiet lie. The two halves cannot be generated from one source — lib/theme.ts
 * is bundled for the browser and cannot read a file, and Tailwind emits
 * `rgb(var(--token))` rather than values, so the channels only ever live in
 * app/globals.css. This file is what stands in for that missing mechanism.
 *
 * It exists because --accent-dim had already drifted 0.14 in the blue channel
 * and nothing said so for months.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CANVAS_ONLY,
  CANVAS_PALETTE,
  MIRRORED_TOKENS,
  type CanvasPalette,
  type Theme,
} from '../lib/theme.ts';

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('theme');

const CSS = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');

/**
 * The two theme blocks, as `--token` -> [r, g, b] in 0-255.
 *
 * Only the space-separated RGB tokens are collected; --grid-alpha and
 * --shadow-panel are not colours and have nothing to compare against.
 */
function tokenBlock(selector: string): Record<string, [number, number, number]> {
  const start = CSS.indexOf(selector);
  assert.notEqual(start, -1, `app/globals.css no longer contains ${selector}`);
  const open = CSS.indexOf('{', start);
  const end = CSS.indexOf('\n  }', open);
  assert.ok(end > open, `could not find the end of ${selector}`);

  const found: Record<string, [number, number, number]> = {};
  for (const m of CSS.slice(open, end).matchAll(
    /(--[\w-]+):\s*(\d+)\s+(\d+)\s+(\d+);/g,
  )) {
    found[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return found;
}

const TOKENS: Record<Theme, Record<string, [number, number, number]>> = {
  dark: tokenBlock(':root,'),
  light: tokenBlock(":root[data-theme='light']"),
};

/**
 * How far a mirrored channel may sit from its token.
 *
 * The palette is written at two or three decimal places because that is what a
 * human can read and edit, and 137/255 is 0.5372549…, so an exact match is not
 * on offer. 0.005 is half a step at two decimal places: it admits every honest
 * rounding of a byte and nothing else. The drift it was written to catch was
 * 0.14, twenty-eight times this.
 */
const TOLERANCE = 0.005;

check('both themes declare the same tokens', () => {
  const dark = Object.keys(TOKENS.dark).sort();
  const light = Object.keys(TOKENS.light).sort();
  assert.deepEqual(
    dark,
    light,
    'a token declared in one theme and not the other is a hole that only shows in that theme',
  );
  assert.ok(dark.length > 0, 'no RGB tokens parsed out of app/globals.css');
});

check('every mirrored canvas colour matches its CSS token in both themes', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const [key, name] of Object.entries(MIRRORED_TOKENS)) {
      const css = TOKENS[theme][name];
      assert.ok(css, `${theme}.${key} mirrors ${name}, which globals.css no longer declares`);
      const canvas = CANVAS_PALETTE[theme][key as keyof CanvasPalette] as number[];
      for (let i = 0; i < 3; i++) {
        const drift = Math.abs(canvas[i] - css[i] / 255);
        assert.ok(
          drift <= TOLERANCE,
          `${theme}.${key} channel ${'rgb'[i]} is ${drift.toFixed(4)} from ${name}: ` +
            `canvas draws ${canvas[i]}, the page draws ${(css[i] / 255).toFixed(4)} (${css.join(' ')})`,
        );
      }
    }
  }
});

check('every palette entry is either mirrored or declared canvas-only', () => {
  const mirrored = Object.keys(MIRRORED_TOKENS);
  const only = [...CANVAS_ONLY] as string[];
  for (const key of Object.keys(CANVAS_PALETTE.dark)) {
    assert.ok(
      mirrored.includes(key) || only.includes(key),
      `"${key}" is in the palette but in neither MIRRORED_TOKENS nor CANVAS_ONLY — ` +
        'say which CSS token it answers to, or say it answers to none',
    );
  }
  for (const key of [...mirrored, ...only]) {
    assert.ok(key in CANVAS_PALETTE.dark, `"${key}" is listed but not in the palette`);
  }
  assert.equal(
    new Set([...mirrored, ...only]).size,
    mirrored.length + only.length,
    'an entry is claimed as both mirrored and canvas-only',
  );
});

check('the two themes carry the same palette entries', () => {
  assert.deepEqual(
    Object.keys(CANVAS_PALETTE.dark).sort(),
    Object.keys(CANVAS_PALETTE.light).sort(),
  );
});

// The browser paints its own chrome — the address bar on Android, the title bar
// on desktop Safari — from themeColor. It is written as a hex literal in
// app/layout.tsx because Next wants one there, so it is the one colour on the
// site that is transcribed rather than referenced.
check('the browser chrome colour matches --bg in both themes', () => {
  const layout = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8');
  const declared = new Map(
    [...layout.matchAll(
      /media:\s*'\(prefers-color-scheme:\s*(dark|light)\)',\s*color:\s*'#([0-9a-fA-F]{6})'/g,
    )].map((m) => [m[1] as Theme, m[2].toLowerCase()]),
  );
  assert.equal(declared.size, 2, 'app/layout.tsx no longer sets a themeColor per scheme');

  for (const theme of ['dark', 'light'] as const) {
    const bg = TOKENS[theme]['--bg'];
    const hex = bg.map((c) => c.toString(16).padStart(2, '0')).join('');
    assert.equal(
      declared.get(theme),
      hex,
      `${theme} themeColor is #${declared.get(theme)} but --bg is ${bg.join(' ')} (#${hex}), ` +
        'so the browser chrome will not match the page',
    );
  }
});

// A class pointing at a token that was deleted or renamed compiles to
// `rgb(var(--gone) / 1)`, which browsers discard as an invalid declaration:
// the element keeps whatever colour it inherited and nothing anywhere reports
// a problem. Cheap to check, invisible otherwise.
check('every token Tailwind references is declared in globals.css', () => {
  const config = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');
  const referenced = [...config.matchAll(/token\('(--[\w-]+)'\)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, 'no tokens parsed out of tailwind.config.ts');
  for (const name of referenced) {
    for (const theme of ['dark', 'light'] as const) {
      assert.ok(
        TOKENS[theme][name],
        `tailwind.config.ts exposes ${name} as a colour, but the ${theme} theme does not declare it`,
      );
    }
  }
});

console.log(`\n${passed} theme checks passed`);
