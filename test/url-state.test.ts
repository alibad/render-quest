/**
 * The URL codec.
 *
 * A shared link is user input reaching a uniform, so the interesting cases here
 * are the hostile ones: a NaN that would blank a canvas with no error, a key
 * that is not a control, a boolean that is neither. Every one of those must be
 * dropped rather than trusted.
 */

import assert from 'node:assert/strict';

import { shareableControls } from '../components/lab/Figure.tsx';
import { decodeState, encodeState, stateHref } from '../lib/url-state.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  NOT OK  ${name}`);
    throw error;
  }
}

console.log('url state');

const DEFAULTS = {
  count: 4000,
  mode: 'instanced',
  scale: 1,
  spinning: true,
};

check('an untouched lab has an empty query', () => {
  assert.equal(encodeState(DEFAULTS, { ...DEFAULTS }), '');
});

check('only what changed is written', () => {
  const query = encodeState(DEFAULTS, { ...DEFAULTS, count: 10_000 });
  assert.equal(query, 'count=10000');
});

check('the query is stable regardless of the order controls were moved', () => {
  const a = encodeState(DEFAULTS, { ...DEFAULTS, scale: 2, count: 10 });
  const b = encodeState(DEFAULTS, { ...DEFAULTS, count: 10, scale: 2 });
  assert.equal(a, b);
  assert.equal(a, 'count=10&scale=2');
});

check('booleans survive the round trip in both directions', () => {
  const off = encodeState(DEFAULTS, { ...DEFAULTS, spinning: false });
  assert.equal(off, 'spinning=0');
  assert.deepEqual(decodeState(DEFAULTS, off), { spinning: false });

  const flipped = { ...DEFAULTS, spinning: false };
  const on = encodeState(flipped, { ...flipped, spinning: true });
  assert.deepEqual(decodeState(flipped, on), { spinning: true });
});

check('every control makes it there and back unchanged', () => {
  const state = { count: 9999, mode: 'per-object', scale: 0.25, spinning: false };
  const restored = { ...DEFAULTS, ...decodeState(DEFAULTS, encodeState(DEFAULTS, state)) };
  assert.deepEqual(restored, state);
});

check('a value that is not a number is dropped, not passed to a uniform', () => {
  assert.deepEqual(decodeState(DEFAULTS, 'scale=banana'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'scale=NaN'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'scale=Infinity'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'scale='), {});
});

check('a boolean that is neither 0 nor 1 is dropped', () => {
  assert.deepEqual(decodeState(DEFAULTS, 'spinning=yes'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'spinning=true'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'spinning=1'), { spinning: true });
});

check('keys that are not controls are ignored', () => {
  assert.deepEqual(decodeState(DEFAULTS, 'utm_source=twitter&nonsense=1'), {});
  assert.deepEqual(decodeState(DEFAULTS, 'utm_source=x&count=7'), { count: 7 });
});

check('a guard can reject a value a type alone would accept', () => {
  const allow = { count: (value: number) => value >= 1 && value <= 10_000 };
  assert.deepEqual(decodeState(DEFAULTS, 'count=5000', allow), { count: 5000 });
  // Negative and absurd counts type-check as numbers and would still break the lab.
  assert.deepEqual(decodeState(DEFAULTS, 'count=-1', allow), {});
  assert.deepEqual(decodeState(DEFAULTS, 'count=999999999', allow), {});
});

check('float noise is rounded out so links stay short', () => {
  const query = encodeState(DEFAULTS, { ...DEFAULTS, scale: 1.23456789 });
  assert.equal(query, 'scale=1.235');
});

check('a value differing from the default only past the rounding is not written', () => {
  assert.equal(encodeState(DEFAULTS, { ...DEFAULTS, scale: 1.0000001 }), '');
});

check('stateHref leaves a clean path when nothing was changed', () => {
  assert.equal(stateHref('/labs/transform', ''), '/labs/transform');
  assert.equal(stateHref('/labs/transform', 'ty=1.5'), '/labs/transform?ty=1.5');
});

/* ------------------------------------- a figure, handed to the instrument ---
 * A figure isolates one control; the instrument at the foot of the essay has
 * all of them. `<Figure state=…>` bridges the two by encoding the figure's
 * configuration against the lab's own DEFAULTS, so the interesting cases are
 * the ones where the record the essay has to hand is wider than the lab's
 * controls — which it always is, because the scene params carry the palette.
 */

/** A lab's exported DEFAULTS, in miniature. */
const LAB = {
  order: 'trs',
  rx: 0,
  showGhost: true,
  tx: 0,
};

/** The same record as one figure sets it: one slider moved, one flag off. */
const FIGURE = { ...LAB, showGhost: false, tx: 1.2 };

check('a figure-shaped record round-trips into the instrument', () => {
  const query = encodeState(LAB, FIGURE);
  assert.equal(query, 'showGhost=0&tx=1.2');
  assert.equal(
    `${stateHref('/labs/transform', query)}#instrument`,
    '/labs/transform?showGhost=0&tx=1.2#instrument',
  );
  // What the instrument opens with has to be the figure, not a near miss.
  assert.deepEqual({ ...LAB, ...decodeState(LAB, query) }, FIGURE);
});

check('a key the lab has no default for is dropped on the way out', () => {
  // The essays hold the camera in the figure's params; a lab whose DEFAULTS do
  // not carry it must not have it appear in the address bar, or the link
  // promises a camera the instrument will not restore.
  const query = encodeState(
    shareableControls(LAB),
    shareableControls({ ...FIGURE, azimuth: 0.72 }),
  );
  assert.equal(query.includes('azimuth'), false);
  assert.equal(query, 'showGhost=0&tx=1.2');
});

check('a palette cannot survive into a query string', () => {
  // The failure this guard exists for: an essay passes the scene params it
  // already built, and those always have the palette from the theme provider
  // spread into them. `String({})` is `[object Object]`, so a palette that
  // reached the codec would be in the reader's address bar and in every link
  // they shared.
  const palette = { grid: '#333', ambient: [0.1, 0.1, 0.12] };
  const defaults = shareableControls({ ...LAB, palette });
  const current = shareableControls({ ...FIGURE, palette: { ...palette, grid: '#eee' } });

  assert.equal(Object.hasOwn(defaults, 'palette'), false);
  assert.equal(Object.hasOwn(current, 'palette'), false);
  assert.equal(encodeState(defaults, current), 'showGhost=0&tx=1.2');

  // Named as well as type-filtered, so a palette that ever becomes a theme name
  // rather than an object — a string, which the codec is happy to write — is
  // still not shareable state.
  assert.deepEqual(shareableControls({ palette: 'midnight' }), {});

  // Everything else the codec cannot round-trip goes the same way.
  assert.deepEqual(shareableControls({ colors: [1, 2, 3], onChange: () => {}, tx: 2 }), { tx: 2 });
});

console.log(`\n${passed} url-state checks passed`);
