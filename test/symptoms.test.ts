/**
 * Every symptom on /symptoms resolves, and every link on it actually does
 * something.
 *
 * A row on that page makes four promises at once: the lab exists, the paragraph
 * exists, the figure exists, and the query string puts the target into the state
 * the row says it will. The first three fail visibly enough. The fourth is the
 * dangerous one — a key the lab does not read, a boolean spelled `true` instead
 * of `1`, a number outside the guard, or a value that happens to equal the
 * default all produce the same result: the lab opens, renders perfectly, and
 * shows nothing the row promised. No 404, no console error, and the page reads
 * as a list of things that do not reproduce.
 *
 * So the control keys are not restated here. They are read out of the same
 * declarations the components hand to `useLabState` and `useFigureState`, and
 * the query strings are put back through `decodeState` — the real codec, the one
 * the lab will use on arrival — with those real defaults. What comes back has to
 * be exactly what the row declared.
 *
 * WHY THE PARSING
 *
 * The obvious alternative is to import the lab components and read their
 * defaults. They are `'use client'` modules that build WebGL and WebGPU scenes
 * at module scope; there is no adapter and no canvas in this process. The
 * defaults are also not exported, and exporting sixteen `DEFAULTS` objects to
 * satisfy a test would put a second public surface on ten components for no
 * reason the components themselves have. So this reads the sources, the way
 * `lib/essay-outline.ts` reads the essays for their headings, and the parser is
 * pinned by controls at the bottom of this file so it cannot go quietly vacuous.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { essayOutline } from '../lib/essay-outline.ts';
import { LIVE_LABS, getLab } from '../lib/labs.ts';
import {
  SYMPTOMS,
  symptomAnchor,
  symptomExplanationHref,
  symptomQuery,
  symptomReproduceHref,
  type Symptom,
} from '../lib/symptoms.ts';
import { decodeState, type LabState, type StateValue } from '../lib/url-state.ts';

// tsconfig sets "jsx": "preserve", so tsx compiles every .tsx in this repo with
// the classic runtime — the page rendered at the foot of this file references a
// global `React` that Next would otherwise have provided.
(globalThis as unknown as { React: typeof React }).React = React;

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('symptoms');

/* ------------------------------------------------------------ the scanner ---
 * Everything below needs one thing from the sources: the text of a literal that
 * starts at a known character. Getting that wrong quietly is the whole risk, so
 * the scanner tracks strings, template literals (including `${…}`) and both
 * comment forms rather than counting braces. The essays put comments inside
 * argument lists — several of the `useFigureState` calls explain their guard
 * between the second and third argument — and a brace or quote inside one of
 * those would otherwise end the literal in the wrong place.
 */

const OPENERS: Record<string, string> = { '{': '}', '[': ']', '(': ')' };

/** The index just past the literal that starts at `start`. */
function endOfLiteral(source: string, start: number): number {
  const first = source[start];
  // A string or a template. Read as one unit, or the first `;` inside a GLSL
  // program held in a template literal would be taken for the end of it.
  if (first === "'" || first === '"' || first === '`') return endOfString(source, start);

  const close = OPENERS[first];
  if (!close) {
    // A bare value — `const MAX_PARTICLES = 120_000;`. Runs to the semicolon.
    const end = source.indexOf(';', start);
    if (end === -1) throw new Error(`unterminated value at ${start}`);
    return end;
  }

  const stack: string[] = [];
  let i = start;
  while (i < source.length) {
    const char = source[i];
    if (char === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i === -1) throw new Error('unterminated line comment');
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i) + 2;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      i = endOfString(source, i);
      continue;
    }
    if (OPENERS[char]) stack.push(OPENERS[char]);
    else if (char === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return i + 1;
    }
    i += 1;
  }
  throw new Error(`unterminated literal at ${start}`);
}

/** The index just past the string or template literal opening at `start`. */
function endOfString(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const char = source[i];
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (quote === '`' && char === '$' && source[i + 1] === '{') {
      i = endOfLiteral(source, i + 1);
      continue;
    }
    if (char === quote) return i + 1;
    i += 1;
  }
  throw new Error(`unterminated string at ${start}`);
}

/** The top-level arguments of the call whose `(` is at `open`, as source text. */
function callArguments(source: string, open: number): string[] {
  const end = endOfLiteral(source, open);
  const inner = source.slice(open + 1, end - 1);
  const args: string[] = [];
  let depth = 0;
  let last = 0;
  let i = 0;
  while (i < inner.length) {
    const char = inner[i];
    if (char === '/' && inner[i + 1] === '/') {
      i = inner.indexOf('\n', i);
      continue;
    }
    if (char === '/' && inner[i + 1] === '*') {
      i = inner.indexOf('*/', i) + 2;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      i = endOfString(inner, i);
      continue;
    }
    if (OPENERS[char]) depth += 1;
    else if (char === '}' || char === ']' || char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      args.push(inner.slice(last, i));
      last = i + 1;
    }
    i += 1;
  }
  const tail = inner.slice(last);
  if (tail.trim()) args.push(tail);
  return args.map(stripComments).map((arg) => arg.trim());
}

function stripComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (text[i] === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i) + 2;
      continue;
    }
    if (text[i] === "'" || text[i] === '"' || text[i] === '`') {
      const end = endOfString(text, i);
      out += text.slice(i, end);
      i = end;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/* ---------------------------------------------------------- evaluating TS ---
 * The literals being read are TypeScript, and three constructs in them are not
 * JavaScript: `as` casts inside a defaults object, a type annotation on an arrow
 * parameter, and a reference to a constant declared elsewhere in the file. The
 * first two are removed; the third is resolved by finding the declaration and
 * evaluating it the same way, which is why this recurses.
 */

/** `{ mode: 'instanced' as 'instanced' | 'per-object' }` -> plain JavaScript. */
function stripTypes(text: string): string {
  return text
    .replace(/\bas\s+[^,}\n]+/g, '')
    .replace(/\(\s*([A-Za-z_$][\w$]*)\s*:\s*[^)]*\)/g, '($1)');
}

/**
 * The constants a literal reaches, by the one naming convention every one of
 * them follows: all-caps. `DEFAULTS`, `MAX_PARTICLES`, `PRESETS_SOURCE`,
 * `MAGNIFICATION_OPTIONS`, `GAMMA_RANGE`. Nothing else in these files is spelled
 * that way, and `Object` and `Number` are deliberately not matched.
 */
const CONSTANT = /\b[A-Z][A-Z0-9_]{2,}\b/g;

/**
 * The same text with the inside of every string blanked out.
 *
 * Only the code is scanned for constant names. `PRESETS_SOURCE` holds four
 * GLSL programs as template literals, and a shader is full of all-caps words —
 * without this, looking for the constants a literal reaches would go hunting
 * for a `const` declaration named after something inside a fragment shader.
 */
function maskStrings(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === "'" || text[i] === '"' || text[i] === '`') {
      const end = endOfString(text, i);
      out += ' '.repeat(end - i);
      i = end;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

/** The value of `const NAME = …` in `source`, evaluated. */
function constantValue(source: string, name: string, file: string): unknown {
  const declaration = new RegExp(`\\bconst\\s+${name}\\b`).exec(source);
  if (!declaration) throw new Error(`${file}: no "const ${name}"`);
  const equals = source.indexOf('=', declaration.index + declaration[0].length);
  if (equals === -1) throw new Error(`${file}: "const ${name}" has no value`);
  let start = equals + 1;
  while (/\s/.test(source[start])) start += 1;
  return evaluate(source.slice(start, endOfLiteral(source, start)), source, file);
}

/** A literal's value, with its free constants resolved out of the same file. */
function evaluate(literal: string, source: string, file: string): unknown {
  const text = stripTypes(literal);
  const names = [...new Set(maskStrings(text).match(CONSTANT) ?? [])];
  const values = names.map((name) => constantValue(source, name, file));
  // `new Function` rather than a parser: the input is a literal out of this
  // repository's own committed source, read at test time, and writing an
  // expression evaluator to avoid it would be a second thing that can be wrong.
  return new Function(...names, `return (${text});`)(...values);
}

/* ------------------------------------------------- what a lab actually reads */

interface Controls {
  defaults: LabState;
  /** The per-key guards, when they could be evaluated. */
  allow: Record<string, (value: StateValue) => boolean>;
}

/** `transform` -> `TransformLab.tsx`. Nine of ten; `textures` is the exception. */
const LAB_FILE: Record<string, string> = { textures: 'TextureLab.tsx' };

function labFile(slug: string): string {
  return LAB_FILE[slug] ?? `${slug[0].toUpperCase()}${slug.slice(1)}Lab.tsx`;
}

function essayFile(slug: string): string {
  return `${slug[0].toUpperCase()}${slug.slice(1)}Essay.tsx`;
}

function read(file: string): string {
  return readFileSync(join(ROOT, 'components', 'labs', file), 'utf8');
}

function toControls(defaults: unknown, allow: unknown): Controls {
  return {
    defaults: defaults as LabState,
    allow: (allow ?? {}) as Record<string, (value: StateValue) => boolean>,
  };
}

/** The instrument at the foot of a lab page: what `useLabState` is handed. */
function instrumentControls(slug: string): Controls {
  const file = labFile(slug);
  const source = read(file);
  const call = source.indexOf('useLabState(');
  if (call === -1) throw new Error(`${file}: no useLabState call`);
  const args = callArguments(source, call + 'useLabState'.length);
  if (args.length === 0) throw new Error(`${file}: useLabState takes no defaults`);
  return toControls(
    evaluate(args[0], source, file),
    args[1] ? evaluate(args[1], source, file) : undefined,
  );
}

/**
 * Every figure in an essay, and the controls it reads.
 *
 * Two shapes have to be handled. Nine essays call `useFigureState('near-plane',
 * …)` with the id spelled out, one call per figure. `PipelineEssay` does not: it
 * defines a `StageFigure` wrapper that takes `id` as a prop and renders five
 * figures through it, so the id at the hook is a variable. Those keys therefore
 * belong to every figure in that file that no literal call claimed — which is
 * all five of them, and is asserted below rather than assumed.
 */
function figureControls(slug: string): Map<string, Controls> {
  const file = essayFile(slug);
  const source = read(file);

  // `<Figure id="…">`, and `<StageFigure id="…">` for the one essay that wraps
  // it. Keyed on the id being the first attribute, which is the convention all
  // 42 call sites keep and which the count at the foot of this file pins: a
  // figure whose id moved would drop out of this list and the total would fall.
  //
  // Not "every id in the file". ComputeEssay carries three `<marker id="cq-…">`
  // in its SVG defs, which are not figures and have no controls, and counting
  // them made the negative control below assert five figures against eight.
  const ids = [...source.matchAll(/<(?:[A-Z][A-Za-z0-9]*)?Figure\s+id="([^"]+)"/g)].map(
    (match) => match[1],
  );

  const out = new Map<string, Controls>();
  for (const id of ids) out.set(id, toControls({}, undefined));

  const unclaimed: Controls[] = [];
  // `exec` rather than `matchAll`, because the index of the `(` is what is
  // wanted and `lastIndex` gives it exactly.
  const hook = /useFigureState\s*(?:<[^(]*>)?\s*\(/g;
  for (;;) {
    const match = hook.exec(source);
    if (!match) break;
    const args = callArguments(source, hook.lastIndex - 1);
    const controls = toControls(
      evaluate(args[1], source, file),
      args[2] ? evaluate(args[2], source, file) : undefined,
    );
    const literal = /^'([^']+)'$/.exec(args[0]);
    if (literal) {
      assert.ok(out.has(literal[1]), `${file}: useFigureState('${literal[1]}') has no <Figure>`);
      out.set(literal[1], controls);
    } else {
      unclaimed.push(controls);
    }
  }

  // A wrapper's controls go to every figure still holding an empty record.
  for (const controls of unclaimed) {
    for (const [id, existing] of out) {
      if (Object.keys(existing.defaults).length === 0) out.set(id, controls);
    }
  }

  return out;
}

const INSTRUMENTS = new Map(LIVE_LABS.map((lab) => [lab.slug, instrumentControls(lab.slug)]));
const FIGURES = new Map(LIVE_LABS.map((lab) => [lab.slug, figureControls(lab.slug)]));

/** The controls a symptom's link is aimed at, and the prefix its keys carry. */
function target(symptom: Symptom): { controls: Controls; prefix: string } {
  if (!symptom.figure) return { controls: INSTRUMENTS.get(symptom.lab)!, prefix: '' };
  const figures = FIGURES.get(symptom.lab)!;
  const controls = figures.get(symptom.figure);
  // A throw rather than assert.ok: the caller wants a Controls, and every check
  // below would otherwise have to cope with the undefined case.
  if (!controls) {
    throw new Error(`${symptom.id}: no figure "${symptom.figure}" in the ${symptom.lab} essay`);
  }
  return { controls, prefix: `${symptom.figure}.` };
}

/* --------------------------------------------------------------- the checks */

check('every symptom has a unique, permanent id', () => {
  const ids = new Set<string>();
  for (const symptom of SYMPTOMS) {
    assert.match(symptom.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad id "${symptom.id}"`);
    assert.ok(!ids.has(symptom.id), `duplicate id "${symptom.id}"`);
    ids.add(symptom.id);
  }
});

check('every symptom points at a lab that is live', () => {
  const live = new Set(LIVE_LABS.map((lab) => lab.slug));
  for (const symptom of SYMPTOMS) {
    const lab = getLab(symptom.lab);
    assert.ok(lab, `${symptom.id} -> unknown lab "${symptom.lab}"`);
    assert.ok(live.has(symptom.lab), `${symptom.id} -> lab "${symptom.lab}" is not live`);
  }
});

check('every symptom names a section that exists in that essay', () => {
  for (const symptom of SYMPTOMS) {
    const ids = essayOutline(symptom.lab).sections.map((section) => section.id);
    assert.ok(
      ids.includes(symptom.section),
      `${symptom.id} -> /labs/${symptom.lab}#${symptom.section}, which is not a heading. ` +
        `That essay has: ${ids.join(', ')}`,
    );
  }
});

check('every symptom that names a figure names one that exists', () => {
  for (const symptom of SYMPTOMS) {
    if (!symptom.figure) continue;
    const figures = FIGURES.get(symptom.lab)!;
    assert.ok(
      figures.has(symptom.figure),
      `${symptom.id} -> #${symptom.figure}, which is not a figure in the ${symptom.lab} ` +
        `essay. It has: ${[...figures.keys()].join(', ')}`,
    );
  }
});

check('a symptom without a figure lands on the instrument, which every essay has', () => {
  for (const symptom of SYMPTOMS) {
    if (symptom.figure) continue;
    const ids = essayOutline(symptom.lab).sections.map((section) => section.id);
    assert.ok(ids.includes(symptomAnchor(symptom)), `${symptom.lab} has no #instrument heading`);
  }
});

check('every control key a symptom sets is one the target actually reads', () => {
  for (const symptom of SYMPTOMS) {
    const { controls } = target(symptom);
    const known = Object.keys(controls.defaults);
    assert.ok(known.length > 0, `${symptom.id}: parsed no controls for its target`);
    for (const key of Object.keys(symptom.state)) {
      assert.ok(
        known.includes(key),
        `${symptom.id} sets "${key}", which ${symptom.figure ?? 'the instrument'} does not ` +
          `read. It reads: ${known.join(', ')}`,
      );
    }
  }
});

/**
 * The check the rest of this file exists for.
 *
 * `decodeState` is what the lab itself will run on the query string when the
 * reader arrives — the same coercion, the same refusal of an empty value, the
 * same silent drop of anything whose type does not match the default. Handing it
 * the real defaults and asserting the result is exactly the declared state
 * catches the encoding bugs no eye catches: a boolean written as `true` rather
 * than `1` is dropped and the lab opens with the control where it was.
 */
check('every link decodes back to exactly the state the row declared', () => {
  for (const symptom of SYMPTOMS) {
    const { controls, prefix } = target(symptom);
    const prefixed: LabState = {};
    for (const [key, value] of Object.entries(controls.defaults)) prefixed[prefix + key] = value;

    const decoded = decodeState(prefixed, symptomQuery(symptom));
    const expected: LabState = {};
    for (const [key, value] of Object.entries(symptom.state)) expected[prefix + key] = value;

    assert.deepEqual(
      decoded,
      expected,
      `${symptom.id}: ?${symptomQuery(symptom)} does not decode to what the row declares`,
    );
  }
});

check('no symptom sets a control to the value it already has', () => {
  for (const symptom of SYMPTOMS) {
    const { controls } = target(symptom);
    for (const [key, value] of Object.entries(symptom.state)) {
      assert.notEqual(
        value,
        controls.defaults[key],
        `${symptom.id} sets ${key} to ${JSON.stringify(value)}, which is already the default — ` +
          'the link would open the lab exactly as an untouched visit does',
      );
    }
  }
});

/**
 * Range and enum guards, where the guard could be evaluated.
 *
 * `decodeState` drops a value its guard rejects, silently and by design — a URL
 * is user input. That is the same failure as a wrong key: the lab opens at its
 * defaults under a link that promised otherwise. Every guard in these files is
 * either an inline arrow or a SCREAMING_CASE constant holding one, so all of
 * them evaluate today; the count is asserted rather than the coverage, so this
 * degrades to a smaller number rather than to nothing if a guard is one day
 * written in a form this cannot read.
 */
let guarded = 0;
check('every value a symptom sets is one its guard accepts', () => {
  for (const symptom of SYMPTOMS) {
    const { controls } = target(symptom);
    for (const [key, value] of Object.entries(symptom.state)) {
      const guard = controls.allow[key];
      if (typeof guard !== 'function') continue;
      guarded += 1;
      assert.ok(
        guard(value),
        `${symptom.id} sets ${key} to ${JSON.stringify(value)}, which the target's own guard ` +
          'rejects — decodeState would drop it and the control would not move',
      );
    }
  }
  // 31 of the values set across the page reach a guard today.
  assert.ok(guarded >= 25, `only ${guarded} values reached a guard; the parse has lost something`);
});

check('every live lab is reachable from a symptom', () => {
  const covered = new Set(SYMPTOMS.map((symptom) => symptom.lab));
  for (const lab of LIVE_LABS) {
    assert.ok(covered.has(lab.slug), `no symptom leads to /labs/${lab.slug}`);
  }
});

check('the page carries more symptoms than it has labs', () => {
  // The issue's floor is fifteen. The point of the floor is that the page is not
  // one row per lab wearing a different hat — that would be the curriculum again.
  assert.ok(SYMPTOMS.length >= 15, `only ${SYMPTOMS.length} symptoms`);
  assert.ok(
    SYMPTOMS.length > LIVE_LABS.length * 2,
    `${SYMPTOMS.length} symptoms across ${LIVE_LABS.length} labs is barely more than one each`,
  );
});

check('no correction merely restates the lab takeaway it sits under', () => {
  for (const symptom of SYMPTOMS) {
    const takeaway = getLab(symptom.lab)!.takeaway;
    assert.notEqual(symptom.correction, takeaway, `${symptom.id} copies its lab's takeaway`);
    assert.ok(
      !takeaway.includes(symptom.correction),
      `${symptom.id}'s correction is a slice of its lab's takeaway`,
    );
  }
});

check('every symptom is written as a sentence rather than a topic', () => {
  for (const symptom of SYMPTOMS) {
    for (const [field, text] of Object.entries({
      symptom: symptom.symptom,
      belief: symptom.belief,
      correction: symptom.correction,
    })) {
      assert.ok(text.trim().length > 30, `${symptom.id}.${field} is too short to be a sentence`);
      assert.match(text, /\.$/, `${symptom.id}.${field} does not end in a full stop`);
      assert.ok(!/['"]/.test(text), `${symptom.id}.${field} uses a typewriter quote`);
    }
    assert.ok(Object.keys(symptom.state).length > 0, `${symptom.id} has no state to reproduce`);
  }
});

check('the two hrefs a row renders are well formed', () => {
  for (const symptom of SYMPTOMS) {
    assert.equal(
      symptomExplanationHref(symptom),
      `/labs/${symptom.lab}#${symptom.section}`,
    );
    const reproduce = symptomReproduceHref(symptom);
    assert.equal(
      reproduce,
      `/labs/${symptom.lab}?${symptomQuery(symptom)}#${symptomAnchor(symptom)}`,
    );
    assert.notEqual(symptomQuery(symptom), '', `${symptom.id} builds an empty query`);
  }
});

/* -------------------------------------------------------- parser controls ---
 * Everything above is only as good as the two parsers, and both loop over lists
 * the parsers built. Empty lists pass every one of them. These pin the shapes
 * the parsers must keep finding, positive and negative: a figure whose controls
 * are known, a figure that genuinely has none, the wrapper case, and the one
 * lab whose file is not named after its slug.
 */

check('the instrument parser finds the controls it is meant to', () => {
  const depth = INSTRUMENTS.get('depth')!;
  assert.equal(depth.defaults.near, 0.1);
  assert.equal(depth.defaults.scene, 'zfight');
  assert.equal(depth.defaults.depthWrite, false);
  assert.equal(typeof depth.allow.near, 'function');
  assert.ok(!depth.allow.near(0.005) && depth.allow.near(0.02));

  // The one lab whose component is not <Slug>Lab.tsx.
  assert.equal(INSTRUMENTS.get('textures')!.defaults.minFilter, 'linear-mip-linear');

  // A guard that reaches a constant elsewhere in the file, and one that reaches
  // a constant which itself reaches another.
  assert.ok(INSTRUMENTS.get('instancing')!.allow.count(10000));
  assert.ok(!INSTRUMENTS.get('instancing')!.allow.count(10001));
  assert.ok(INSTRUMENTS.get('shader')!.allow.preset('broken'));
  assert.ok(!INSTRUMENTS.get('shader')!.allow.preset('nonesuch'));
});

check('the figure parser pairs every figure with its own controls', () => {
  const shading = FIGURES.get('shading')!;
  assert.deepEqual(shading.get('inverse-transpose')!.defaults, { correctNormals: false });
  assert.deepEqual(shading.get('stretched-normals')!.defaults, { stretch: 0.6 });
  assert.ok(shading.get('shading-models')!.allow.model('flat'));
  assert.ok(!shading.get('shading-models')!.allow.model('phone'));

  // A cast in the defaults, and a guard that closes over an options array.
  const textures = FIGURES.get('textures')!;
  assert.deepEqual(textures.get('magnification-filter')!.defaults, { magFilter: 'nearest' });
  assert.ok(textures.get('mip-handover')!.allow.minFilter('linear-mip-nearest'));
  assert.ok(!textures.get('mip-handover')!.allow.minFilter('linear'));

  // Guards held in a named constant rather than written inline.
  assert.ok(FIGURES.get('colour')!.get('grey-test')!.allow.gamma(1));
  assert.ok(!FIGURES.get('colour')!.get('grey-test')!.allow.gamma(0.9));

  // The negative control: five figures that have no controls at all, so a
  // symptom naming a key on one of them must fail rather than pass.
  const compute = FIGURES.get('compute')!;
  assert.equal(compute.size, 5);
  for (const [, controls] of compute) assert.deepEqual(controls.defaults, {});

  // The wrapper case: one hook, five figures, all five carrying its `t`.
  const pipeline = FIGURES.get('pipeline')!;
  assert.deepEqual(
    [...pipeline.keys()].sort(),
    ['clip-to-ndc', 'model-to-world', 'ndc-to-screen', 'view-to-clip', 'world-to-view'],
  );
  for (const [id, controls] of pipeline) {
    assert.deepEqual(controls.defaults, { t: 0.6 }, `${id} lost the wrapper's controls`);
  }

  // 46 figures render across the ten essays, from 42 <Figure> elements — the
  // difference is PipelineEssay rendering one of them five times.
  const total = [...FIGURES.values()].reduce((sum, figures) => sum + figures.size, 0);
  assert.equal(total, 46, 'the essays no longer parse to 46 figures');
});

/* ------------------------------------------------------------- the page ---
 * Everything above checks the registry. This checks that the page built from it
 * actually renders, and that every row reached the markup — a registry that is
 * correct and a page that quietly maps over the wrong thing would pass all
 * sixteen checks above and ship a blank list.
 */
async function checkThePage() {
  // `Header` is a client component that calls `usePathname`, which needs a
  // router this process does not have. content.test.ts stubs it the same way.
  const require_ = createRequire(import.meta.url);
  const navigation = require_.resolve('next/navigation');
  require_.cache[navigation] = {
    id: navigation,
    filename: navigation,
    loaded: true,
    exports: {
      usePathname: () => '/symptoms',
      useRouter: () => ({
        push() {},
        replace() {},
        prefetch() {},
        back() {},
        forward() {},
        refresh() {},
      }),
      useSearchParams: () => new URLSearchParams(),
      useParams: () => ({}),
    },
  } as unknown as NodeModule;

  const { ThemeProvider } = await import('../components/site/ThemeProvider.tsx');
  const Page = (await import('../app/symptoms/page.tsx')).default;
  const html = renderToStaticMarkup(
    React.createElement(ThemeProvider, null, React.createElement(Page)),
  );

  check('the page renders every symptom, with both of its links', () => {
    for (const symptom of SYMPTOMS) {
      assert.ok(html.includes(symptom.symptom), `"${symptom.symptom}" is not on the page`);
      assert.ok(
        html.includes(escaped(symptomReproduceHref(symptom))),
        `${symptom.id} renders no link that reproduces it`,
      );
      assert.ok(
        html.includes(escaped(symptomExplanationHref(symptom))),
        `${symptom.id} renders no link to the paragraph that explains it`,
      );
      assert.ok(html.includes(`id="${symptom.id}"`), `${symptom.id} is not addressable`);
    }
  });

  check('the page names each lab from the registry rather than restating it', () => {
    for (const slug of new Set(SYMPTOMS.map((symptom) => symptom.lab))) {
      assert.ok(
        html.includes(escaped(getLab(slug)!.title)),
        `${slug}'s registry title is not rendered`,
      );
    }
  });

  check('the symptoms come before the framing, not after it', () => {
    // A reader in this state does not read an introduction. If the explanation
    // ever drifts above the list, this is what says so.
    assert.ok(
      html.indexOf(SYMPTOMS[0].symptom) < html.indexOf('Why the links carry state'),
      'the framing section has moved above the symptoms',
    );
  });
}

/**
 * React escapes `&` on the way into the markup, so neither a query string with
 * two keys in it nor a lab title like "Depth & Transparency" appears in the HTML
 * as the string this module holds.
 */
function escaped(text: string): string {
  return text.replace(/&/g, '&amp;');
}

checkThePage().then(
  () => {
    console.log(
      `\n${passed} symptom checks passed (${guarded} values checked against a guard)`,
    );
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
