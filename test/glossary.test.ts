/**
 * Every glossary demo, checked against the lab it claims to configure.
 *
 * A demo is a query string, and a query string fails silently. `decodeState`
 * drops a key the lab does not declare, a value of the wrong type, and a value
 * its guard refuses — no error, no console line, just the lab at its defaults
 * under a sentence describing something the reader cannot see. That is exactly
 * the failure `Term.demo` exists to remove, so it must not be reintroduced by
 * the thing that removes it.
 *
 * So this file reads the labs rather than trusting the glossary: the control
 * names, their defaults and their guards are parsed out of the lab and essay
 * sources, and every demo is run through the same `decodeState` the browser
 * runs, against the same defaults and the same guards. A renamed control, a
 * deleted figure, a tightened range or a value that happens to equal the
 * default all fail here.
 *
 * Not yet in `npm test`: package.json's test script needs
 * `&& tsx test/glossary.test.ts` on the end, beside the other nine suites.
 *
 * Why parse instead of import: a lab's `DEFAULTS` and its guard object are
 * module-private in every one of the ten lab components, and its figures'
 * defaults are arguments to a hook call inside a function body. None of them
 * can be imported, and exporting ten constants purely so a test can read them
 * would put a second, quieter copy of each lab's control surface in reach of
 * every importer. The parse is the price of that, and it is loud when it
 * breaks: the counts printed below drop, and the assertions under them fail.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEMONSTRATED, GLOSSARY, demoHref, type Term } from '../lib/glossary.ts';
import { LABS, LIVE_LABS } from '../lib/labs.ts';
import { decodeState, type LabState } from '../lib/url-state.ts';

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('glossary demos');

/* ------------------------------------------------------------- scanning ---
 * One character-level scanner, used for every literal below. Brace counting
 * alone is not enough: `PRESETS_SOURCE` is a record of GLSL held in template
 * literals full of `{` and `}`, and a naive count ends the object in the
 * middle of a shader.
 */

/** The balanced `{…}` or `(…)` starting at `at`, with strings and comments skipped. */
function balanced(source: string, at: number): string {
  const open = source[at];
  const close = open === '{' ? '}' : ')';
  let depth = 0;
  for (let i = at; i < source.length; i++) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i);
      if (i === -1) break;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i + 1) + 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      i = endOfString(source, i);
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return source.slice(at, i + 1);
    }
  }
  throw new Error(`unbalanced ${open} at offset ${at}`);
}

/** The index of the closing quote of the string opening at `at`. */
function endOfString(source: string, at: number): number {
  const quote = source[at];
  for (let i = at + 1; i < source.length; i++) {
    const c = source[i];
    if (c === '\\') {
      i++;
      continue;
    }
    // A `${` in a template literal can nest anything, braces and quotes alike.
    if (quote === '`' && c === '$' && source[i + 1] === '{') {
      const inner = balanced(source, i + 1);
      i += inner.length;
      continue;
    }
    if (c === quote) return i;
  }
  throw new Error(`unterminated string at offset ${at}`);
}

/**
 * `'nearest' as MagFilter` -> `'nearest'`, and `(value: number) =>` -> `(value) =>`.
 *
 * Four figure defaults and one guard annotate their literal so TypeScript reads
 * a string as its union type rather than as `string`. `new Function` is
 * JavaScript and chokes on the annotation, so it comes off first — outside
 * strings and comments only. Both exclusions are load-bearing: a shader source
 * containing the word would be truncated, and `ShadingEssay`'s guard is
 * preceded by a comment reading "which reads as a broken control", the middle
 * of which is a perfectly good type annotation to a regex that cannot tell.
 */
function stripTypeAssertions(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      const end =
        text[i + 1] === '/'
          ? (text.indexOf('\n', i) + 1 || text.length) - 1
          : text.indexOf('*/', i + 2) + 1;
      out += text.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const end = endOfString(text, i);
      out += text.slice(i, end + 1);
      i = end;
      continue;
    }
    const assertion = /^\s+as\s+(?:[^,}'"`]|'[^']*')+/.exec(text.slice(i));
    if (assertion) {
      i += assertion[0].length - 1;
      continue;
    }
    // A guard's own parameter is annotated too — `ColourEssay` holds its three
    // ranges in named constants written `(value: number) => …`.
    const parameter = /^\(\s*([A-Za-z_$][\w$]*)\s*:\s*[\w$.<>[\]| ]+\)/.exec(text.slice(i));
    if (parameter) {
      out += `(${parameter[1]})`;
      i += parameter[0].length - 1;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Evaluate a source-level expression in the scope of the file it came from.
 *
 * The guards are the reason this exists. They are arrow functions, and two of
 * them close over module constants — `MAX_PARTICLES`, `PRESETS_SOURCE`,
 * `MAGNIFICATION_OPTIONS` — so they cannot be evaluated in a vacuum. A `with`
 * over a Proxy resolves each free identifier the moment the guard runs, from
 * the same file's own `const` declarations, falling back to the real global for
 * `Object` and `Number`. An identifier it cannot find throws by name, which is
 * the parser saying it has fallen behind rather than passing vacuously.
 */
function evaluateIn(source: string, expression: string): unknown {
  const resolved = new Map<string, unknown>();

  const scope = new Proxy(
    {},
    {
      has: () => true,
      get: (_target, key: string | symbol) => {
        // `with` asks for Symbol.unscopables before any identifier; answering
        // it with a lookup would send the scanner hunting for a const of that
        // name and throw on the first expression evaluated.
        if (typeof key !== 'string') return undefined;
        if (resolved.has(key)) return resolved.get(key);
        if (key in globalThis) return (globalThis as Record<string, unknown>)[key];
        const declaration = new RegExp(
          `(?:^|\\n)(?:export )?const ${key}(?::[^=\\n]+)?\\s*=\\s*`,
        ).exec(source);
        if (!declaration) {
          throw new Error(
            `test/glossary.test.ts cannot resolve "${key}" — the parse has fallen behind the lab`,
          );
        }
        const at = declaration.index + declaration[0].length;
        const literal = literalAt(source, at);
        const value = evaluateIn(source, literal);
        resolved.set(key, value);
        return value;
      },
    },
  );

  // Sloppy mode, which `new Function` gives and a module does not: `with` is
  // the only construct that can intercept an identifier that is not there.
  // eslint-disable-next-line no-new-func
  return new Function(
    'scope',
    `with (scope) { return (${stripTypeAssertions(expression)}); }`,
  )(scope);
}

/**
 * The whole of the value a `const` is declared with, from its first character.
 *
 * The string branch is not for tidiness. `ShaderLab`'s preset guard reaches
 * `PRESETS_SOURCE`, whose entries are GLSL held in template literals, and every
 * one of those shaders contains semicolons — reading to the first `;` cut a
 * shader in half and left an unterminated string behind.
 */
function literalAt(source: string, at: number): string {
  if (source[at] === '{' || source[at] === '[') return bracketed(source, at);
  if (source[at] === '"' || source[at] === "'" || source[at] === '`') {
    return source.slice(at, endOfString(source, at) + 1);
  }
  return source.slice(at, source.indexOf(';', at));
}

/** `balanced`, extended to `[…]` for the arrays a couple of guards read. */
function bracketed(source: string, at: number): string {
  if (source[at] !== '[') return balanced(source, at);
  let depth = 0;
  for (let i = at; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      i = endOfString(source, i);
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return source.slice(at, i + 1);
    }
  }
  throw new Error(`unbalanced [ at offset ${at}`);
}

type Guards = Record<string, ((value: never) => boolean) | undefined>;
type Controls = { defaults: LabState; guards: Guards; where: string };

/* ------------------------------------------------------------ the labs ---
 * Which component is a lab's instrument and which is its essay comes from the
 * route that renders them, not from a table here. `textures` renders
 * `TextureLab` beside `TexturesEssay`, so any naming rule invented in this file
 * would already be wrong for one lab in ten.
 */
function componentsOf(slug: string): { lab: string; essay: string } {
  const page = readFileSync(join(ROOT, `app/labs/${slug}/page.tsx`), 'utf8');
  const imported = [...page.matchAll(/from '@\/components\/labs\/(\w+)'/g)].map((m) => m[1]);
  const essay = imported.find((name) => name.endsWith('Essay'));
  const lab = imported.find((name) => !name.endsWith('Essay'));
  assert.ok(essay && lab, `app/labs/${slug}/page.tsx renders no essay + lab pair`);
  return {
    lab: readFileSync(join(ROOT, `components/labs/${lab}.tsx`), 'utf8'),
    essay: readFileSync(join(ROOT, `components/labs/${essay}.tsx`), 'utf8'),
  };
}

/** The instrument's controls: `const DEFAULTS = {…}` and `useLabState`'s guards. */
function instrumentControls(source: string, slug: string): Controls {
  const at = source.search(/const DEFAULTS(?::[^=\n]+)?\s*=\s*\{/);
  assert.notEqual(at, -1, `${slug}: no const DEFAULTS in the lab component`);
  const defaults = evaluateIn(
    source,
    balanced(source, source.indexOf('{', at)),
  ) as LabState;

  const call = source.indexOf('useLabState(DEFAULTS,');
  const guards =
    call === -1
      ? {}
      : (evaluateIn(source, balanced(source, source.indexOf('{', call))) as Guards);

  return { defaults, guards, where: `${slug} instrument` };
}

/**
 * Every figure that has state, by id, from the `useFigureState` calls.
 *
 * `PipelineEssay` is why the id can be an identifier: one `StageFigure` wrapper
 * calls the hook with its own `id` prop and is rendered five times, so those
 * five ids live at the call sites and share one set of defaults.
 */
function figureControls(source: string, slug: string): Map<string, Controls> {
  const out = new Map<string, Controls>();

  for (const match of source.matchAll(/useFigureState(?:<[^>]*>)?\(/g)) {
    const args = balanced(source, match.index! + match[0].length - 1);
    const inner = args.slice(1, -1);
    const first = /^\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*,/.exec(inner);
    assert.ok(first, `${slug}: cannot read the figure id in ${inner.slice(0, 40)}`);

    const defaultsAt = inner.indexOf('{', first[0].length);
    const defaults = evaluateIn(source, balanced(inner, defaultsAt)) as LabState;
    const after = defaultsAt + balanced(inner, defaultsAt).length;
    const rest = inner.slice(after).replace(/^\s*,/, '').trim();
    const guardText = rest.replace(/,\s*$/, '');
    const guards = guardText === '' ? {} : (evaluateIn(source, guardText) as Guards);

    const ids = first[1] ? [first[1]] : wrapperCallSites(source, match.index!, slug);
    for (const id of ids) {
      assert.ok(!out.has(id), `${slug}: two figures answer to "${id}"`);
      out.set(id, { defaults, guards, where: `${slug} figure #${id}` });
    }
  }

  return out;
}

/** The ids a wrapper is rendered with, when the hook is called with a prop. */
function wrapperCallSites(source: string, at: number, slug: string): string[] {
  const enclosing = [...source.slice(0, at).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  const wrapper = enclosing[enclosing.length - 1]?.[1];
  assert.ok(wrapper, `${slug}: a forwarded figure id outside any named function`);
  const ids = [...source.matchAll(new RegExp(`<${wrapper}\\b[\\s\\S]{0,200}?id="([^"]+)"`, 'g'))]
    .map((m) => m[1]);
  assert.ok(ids.length > 0, `${slug}: <${wrapper}> is never rendered with an id`);
  return ids;
}

const LABS_BY_SLUG = new Map(
  LIVE_LABS.map((lab) => {
    const { lab: labSource, essay } = componentsOf(lab.slug);
    return [
      lab.slug,
      {
        instrument: instrumentControls(labSource, lab.slug),
        figures: figureControls(essay, lab.slug),
        headings: new Set(
          [...essay.matchAll(/<ProseHeading id="([^"]+)"/g)].map((m) => m[1]),
        ),
      },
    ];
  }),
);

/* Printed, not asserted: a scanner that quietly stopped seeing the controls
 * would satisfy every check below while proving nothing, and these totals say
 * so. The demo counts are meant to grow, so they are not pinned either. */
console.log('\n  controls read per lab');
for (const lab of LIVE_LABS) {
  const parsed = LABS_BY_SLUG.get(lab.slug)!;
  const demos = DEMONSTRATED.filter((entry) => entry.lab === lab.slug).length;
  const terms = GLOSSARY.filter((entry) => entry.lab === lab.slug).length;
  console.log(
    `    ${lab.slug.padEnd(11)} ${String(Object.keys(parsed.instrument.defaults).length).padStart(2)} instrument controls` +
      `  ${String(parsed.figures.size).padStart(2)} figures with state` +
      `  ${String(demos).padStart(2)}/${terms} terms demonstrated`,
  );
}
console.log(
  `    ${'total'.padEnd(11)} ${String(DEMONSTRATED.length).padStart(2)} demos across ${LABS_BY_SLUG.size} labs\n`,
);

check('every lab was parsed and yielded controls', () => {
  assert.equal(LABS_BY_SLUG.size, LIVE_LABS.length);
  for (const [slug, parsed] of LABS_BY_SLUG) {
    assert.ok(
      Object.keys(parsed.instrument.defaults).length >= 2,
      `${slug}: parsed ${Object.keys(parsed.instrument.defaults).length} instrument controls, which no lab on this site has`,
    );
    assert.ok(parsed.headings.has('instrument'), `${slug}: no <ProseHeading id="instrument">`);
  }
});

check('a demo only exists on a term that names a live lab', () => {
  for (const entry of GLOSSARY) {
    if (!entry.demo) continue;
    assert.ok(entry.lab, `${entry.term} has a demo but no lab`);
    assert.ok(
      LABS_BY_SLUG.has(entry.lab!),
      `${entry.term} demonstrates "${entry.lab}", which is not a live lab`,
    );
  }
  assert.equal(DEMONSTRATED.length, GLOSSARY.filter((e) => e.demo).length);
});

/** The controls a demo is addressing: one figure's, or the instrument's. */
function targetOf(entry: Term): Controls {
  const parsed = LABS_BY_SLUG.get(entry.lab!)!;
  const figure = entry.demo!.figure;
  if (!figure) return parsed.instrument;
  const controls = parsed.figures.get(figure);
  assert.ok(
    controls,
    `${entry.term} -> ${entry.lab}#${figure}: no figure by that id calls useFigureState`,
  );
  return controls!;
}

check('every demo names controls the lab actually has', () => {
  for (const entry of DEMONSTRATED) {
    const { defaults, where } = targetOf(entry);
    const state = entry.demo!.state;
    assert.ok(Object.keys(state).length > 0, `${entry.term}: a demo with no state is a bare link`);
    for (const [key, value] of Object.entries(state)) {
      assert.ok(key in defaults, `${entry.term} sets "${key}", which ${where} does not have`);
      assert.equal(
        typeof value,
        typeof defaults[key],
        `${entry.term} sets ${key}=${String(value)}, but ${where} declares it ${typeof defaults[key]}`,
      );
    }
  }
});

check('no demo sets a control to the value it already has', () => {
  // The one failure mode a live page could not report. `encodeState` writes only
  // what differs from the defaults, so `useLabState` drops a key already at its
  // default on arrival — the link would open the lab looking exactly as it does
  // with no query at all, under a sentence describing a change.
  for (const entry of DEMONSTRATED) {
    const { defaults, where } = targetOf(entry);
    for (const [key, value] of Object.entries(entry.demo!.state)) {
      assert.notEqual(
        value,
        defaults[key],
        `${entry.term} sets ${key}=${String(value)}, which is already ${where}'s default`,
      );
    }
  }
});

check('every demo survives the guard the lab hands decodeState', () => {
  for (const entry of DEMONSTRATED) {
    const { guards, where } = targetOf(entry);
    for (const [key, value] of Object.entries(entry.demo!.state)) {
      const guard = guards[key];
      if (!guard) continue;
      assert.ok(
        (guard as (v: unknown) => boolean)(value),
        `${entry.term} sets ${key}=${String(value)}, which ${where}'s own guard rejects — the reader would get the default`,
      );
    }
  }
});

check('every demo href decodes back to the state it was written from', () => {
  // The end-to-end check, on the exact string the reader clicks: the href is
  // parsed as a URL and run through the same codec `useLabState` and
  // `useFigureState` run on arrival, against the same defaults and guards.
  // Prefixing the defaults with the figure's id is what those hooks do to read
  // a namespaced key, and doing it here means a demo that names a figure but
  // writes an unprefixed key fails rather than half-arriving.
  for (const entry of DEMONSTRATED) {
    const { defaults, guards } = targetOf(entry);
    const href = demoHref(entry);
    assert.ok(href, `${entry.term}: demoHref returned nothing`);
    const url = new URL(href!, 'https://www.render-quest.com');

    assert.equal(
      url.pathname,
      `/labs/${entry.lab}`,
      `${entry.term}: href points at ${url.pathname}`,
    );
    assert.equal(
      url.hash,
      `#${entry.demo!.figure ?? 'instrument'}`,
      `${entry.term}: href lands on ${url.hash || 'nothing'}`,
    );

    const prefix = entry.demo!.figure ? `${entry.demo!.figure}.` : '';
    const keyed = (source: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(source).map(([k, v]) => [`${prefix}${k}`, v]));

    const decoded = decodeState(
      keyed(defaults) as LabState,
      url.search,
      keyed(guards) as never,
    );
    const wanted = keyed(entry.demo!.state);

    assert.deepEqual(
      decoded,
      wanted,
      `${entry.term}: ${url.search} decodes to ${JSON.stringify(decoded)}, not ${JSON.stringify(wanted)}`,
    );
  }
});

check('every look is a sentence about what to look at', () => {
  for (const entry of DEMONSTRATED) {
    const look = entry.demo!.look;
    assert.ok(
      look.length >= 60 && look.split(' ').length >= 12,
      `${entry.term}: "${look}" is a label, not a sentence — say what to look at`,
    );
    assert.ok(look.endsWith('.'), `${entry.term}: look does not end in a full stop`);
    assert.ok(
      look[0] === look[0].toUpperCase(),
      `${entry.term}: look does not start with a capital`,
    );
    assert.notEqual(
      look.trim(),
      entry.definition.trim(),
      `${entry.term}: look restates the definition`,
    );
    assert.ok(
      !/^See /.test(look),
      `${entry.term}: look reads as a second link label rather than a sentence`,
    );
  }
});

check('no two demos of the same lab open the identical state', () => {
  // Two terms may share a figure, and several do — but if two of them set it
  // the same way, one of the two sentences is describing a picture that was put
  // there for the other term.
  const seen = new Map<string, string>();
  for (const entry of DEMONSTRATED) {
    const href = demoHref(entry)!;
    const first = seen.get(href);
    assert.equal(first, undefined, `${entry.term} and ${first} open the same address: ${href}`);
    seen.set(href, entry.term);
  }
});

check('the glossary prose counts the demos it actually has', () => {
  // app/glossary/page.tsx states both totals in its opening paragraph; they are
  // derived there, and this is the check that the derivation stayed derived.
  const page = readFileSync(join(ROOT, 'app/glossary/page.tsx'), 'utf8');
  assert.ok(
    page.includes('DEMONSTRATED'),
    'the glossary page states a count of demonstrated terms without deriving it',
  );
  assert.ok(
    !/\b\d\d of them\b/.test(page),
    'the glossary page has a hand-typed count in its prose',
  );
});

check('terms deliberately left bare still link to their lab', () => {
  // The half-finished rollout has to stay honest: a lab-tagged term with no
  // demo is not broken, it is the plain link it always was.
  const bare = GLOSSARY.filter((entry) => entry.lab && !entry.demo);
  for (const entry of bare) {
    assert.ok(LABS.some((lab) => lab.slug === entry.lab), `${entry.term} -> unknown lab`);
    assert.equal(demoHref(entry), undefined, `${entry.term} has no demo but yields a demo href`);
  }
  console.log(
    `      ${bare.length} lab-tagged terms left bare: ${bare.map((e) => e.term).join(', ')}`,
  );
});

console.log(`\n  ${passed} checks passed\n`);
