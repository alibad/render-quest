/**
 * The URL codec.
 *
 * A shared link is user input reaching a uniform, so the interesting cases here
 * are the hostile ones: a NaN that would blank a canvas with no error, a key
 * that is not a control, a boolean that is neither. Every one of those must be
 * dropped rather than trusted.
 */

import assert from 'node:assert/strict';

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

console.log(`\n${passed} url-state checks passed`);
