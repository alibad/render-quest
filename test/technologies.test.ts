/**
 * Checks on the two things the technology comparison keeps getting wrong.
 *
 * Both are the same failure: a fact about the four technologies, typed into a
 * sentence, going stale where nothing looks. Sentences across the site claimed
 * all four rendered the reference scenes when two are code only (#11), and eight
 * hand-typed line counts drifted until two of them contradicted the listing
 * headers on the same page (#34). Neither is a style opinion — each is a claim
 * the registry can settle, so these checks settle it.
 */
import assert from 'node:assert/strict';

import {
  CODE_ONLY,
  REFERENCE_SCENES,
  RUNS_HERE,
  SHARED_SCENE,
  TECHNOLOGIES,
  inWords,
} from '../lib/technologies.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const failures: string[] = [];

/**
 * Every check here is independent, and the suite used to stop at the first one
 * that threw. Two pages that had been claiming the wrong thing for weeks were
 * therefore never printed at all — the run died on an earlier check and looked
 * like a single problem. Run them all, print them all, then fail.
 */
const check = (name: string, fn: () => void) => {
  try {
    fn();
  } catch (error) {
    failures.push(`${name}\n${error instanceof Error ? error.message : String(error)}`);
    console.log(`  FAIL  ${name}`);
    return;
  }
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('technologies');

/* --------------------------------------------------------- line counts ---
 * The table's numbers are the length of the listings printed under them, by
 * the same rule CodeBlock uses for a listing's own header. Where a listing is
 * an excerpt there is nothing to count, so the number is an estimate and says
 * so. Nothing in between is allowed: a bare number cannot get into the table.
 */

const SCENES = TECHNOLOGIES.flatMap((tech) => [
  { tech, scene: 'plasma', count: tech.plasmaLines, samples: tech.samples },
  { tech, scene: 'cube', count: tech.cubeLines, samples: tech.cubeSamples },
]);

check('every counted figure names listings that exist', () => {
  for (const { tech, scene, count, samples } of SCENES) {
    if (!count.counted) continue;
    assert.ok(count.listings.length > 0, `${tech.name} ${scene} counts nothing`);
    for (const label of count.listings) {
      assert.ok(
        samples.some((sample) => sample.label === label),
        `${tech.name} ${scene} counts a listing called "${label}", which no longer exists`,
      );
    }
  }
});

check('every counted figure equals the listings it counts', () => {
  for (const { tech, scene, count, samples } of SCENES) {
    if (!count.counted) continue;
    // Recomputed here rather than imported, so a change to the counting rule
    // has to be made in two places or this fails.
    const lines = count.listings.reduce((total, label) => {
      const sample = samples.find((candidate) => candidate.label === label)!;
      return total + sample.source.split('\n').length;
    }, 0);
    assert.equal(
      count.lines,
      lines,
      `${tech.name}'s ${scene} figure says ${count.lines}, the listing prints ${lines}`,
    );
  }
});

check('every estimate says what it is estimating', () => {
  for (const { tech, scene, count } of SCENES) {
    if (count.counted) continue;
    assert.ok(
      (count.estimates ?? '').length > 20,
      `${tech.name}'s ${scene} figure is a bare number with no stated basis — the one thing #34 was about`,
    );
  }
});

check('no estimate is smaller than the excerpt it estimates', () => {
  for (const { tech, scene, count, samples } of SCENES) {
    if (count.counted) continue;
    const shown = samples.reduce(
      (total, sample) => total + sample.source.split('\n').length,
      0,
    );
    assert.ok(
      count.lines > shown,
      `${tech.name}'s ${scene} estimate is ${count.lines}, under the ${shown} lines printed on the page — an excerpt cannot be longer than the whole`,
    );
  }
});

check('a technology with no implementation here has nothing estimated', () => {
  // Three.js and vgpu are not dependencies of this site, so there is no
  // implementation to estimate from — every one of their figures has to be the
  // listing itself. /tech/three said "~31 lines here" over a 24-line listing.
  for (const { tech, scene, count } of SCENES) {
    if (tech.demo !== 'code-only') continue;
    assert.ok(
      count.counted,
      `${tech.name}'s ${scene} figure is an estimate, but nothing here implements ${tech.name} to estimate from`,
    );
  }
});

check('the two pages that print a figure both take it from the registry', () => {
  const index = readFileSync(join(ROOT, 'app/tech/page.tsx'), 'utf8');
  const page = readFileSync(join(ROOT, 'app/tech/[slug]/page.tsx'), 'utf8');
  assert.match(
    index,
    /lineFigure\(tech\.plasmaLines\)[\s\S]*lineFigure\(tech\.cubeLines\)/,
    'the /tech table no longer prints the registry’s counts through lineFigure',
  );
  assert.match(
    page,
    /tech\.(linesForCube|cubeLines)/,
    'a technology page states a cube line count of its own, which is how it came to disagree with the table',
  );
  assert.match(
    page,
    /tech\.(linesForPlasma|plasmaLines)/,
    'a technology page states a plasma line count of its own, which is how it came to disagree with the table',
  );
});

check('every file an estimate cites still exists', () => {
  for (const { tech, scene, count } of SCENES) {
    for (const path of (count.estimates ?? '').match(/[\w./-]+\.tsx?/g) ?? []) {
      assert.ok(
        existsSync(join(ROOT, path)),
        `${tech.name}'s ${scene} estimate points at ${path}, which is not there any more`,
      );
    }
  }
});

/* ------------------------------------------------------- what runs here ---
 * The site says, in several places, that the four technologies render the same
 * scenes. Two of them do not render anything: they print code and say so. The
 * sentences are assembled from the registry now, and these checks fail on any
 * that are still typed.
 */

const RUNNING_VERB = /\b(render|renders|rendering|run|runs|running)\b/i;
/** What is being claimed to render, so "who has to run it" is not a claim. */
const A_SCENE = /\bscene\b|\bscenes\b|\bimage\b|\bpicture\b|identical thing|same thing/i;
const SAYS_NOT_RUNNING =
  /\bcode[- ]only\b|labelled as code|not running|print(s|ing)? the code|show(s|ing)? the code|are code\b/i;
/**
 * A sentence that says "every one of these renders the scene" is the same claim
 * as one that lists the four by name, and the check used to catch only the
 * second form: /tech/choose and /about both said it the first way and neither
 * was ever reported.
 */
const CLAIMS_THE_WHOLE_SET =
  /\bevery one of (these|them)\b|\ball four\b|\beach of (these|them)\b|\bfour ways\b|\ball of them\b/i;
const WHOLE_COMPARISON = /\bevery\b|\ball four\b|\bfour ways\b|\beach of (them|these)\b/i;
const SINGULAR_SCENE = /\b(same|identical)\b[^.]{0,20}\bscene\b/i;

/** Every source file that can carry a sentence about the comparison. */
function sources(dir: string, out: { file: string; text: string }[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) sources(child, out);
    else if (/\.tsx?$/.test(entry.name)) {
      out.push({ file: child.slice(ROOT.length), text: readFileSync(child, 'utf8') });
    }
  }
  return out;
}

const SOURCES = ['app', 'components', 'lib'].flatMap((dir) => sources(join(ROOT, dir)));

/* ------------------------------------------------------------- the tilde ---
 * A tilde means the number is an estimate, so only lineFigure may print one.
 * Issue #34 was closed with the table fixed and the two pages underneath it
 * still typing the tilde in by hand: /tech/three printed "~24 lines" over a
 * listing header reading "24 lines", and the home page put a tilde on four
 * figures that are all counted.
 */

check('no page hand-types the tilde that marks an estimate', () => {
  const wrong: string[] = [];
  for (const { file, text } of SOURCES) {
    for (const printed of text.match(/~\s*\{[^}]*[Ll]ines[^}]*\}/g) ?? []) {
      wrong.push(`${file}: ${printed}`);
    }
  }
  assert.deepEqual(
    wrong,
    [],
    'these print a tilde of their own next to a line count — the tilde says the ' +
      'number is an estimate, and only lineFigure knows which are\n    ' +
      wrong.join('\n    '),
  );
});

check('every page that prints a line count goes through lineFigure', () => {
  const PRINTS_A_COUNT = /\btech\.(plasmaLines|cubeLines|linesForPlasma|linesForCube)\b/;
  for (const { file, text } of SOURCES) {
    if (!file.startsWith('app/')) continue;
    if (!PRINTS_A_COUNT.test(text)) continue;
    assert.match(
      text,
      /\blineFigure\(/,
      `${file} states a line count without lineFigure, which is how three pages ` +
        `came to disagree with the registry about which figures are estimates`,
    );
  }
});

/**
 * Prose as a reader meets it: tags gone, JSX spaces closed up, one line. Calls
 * go too — `renderOgImage(` is not a sentence about an image, and reading it as
 * one flagged a file that says nothing about what renders at all.
 */
const sentences = (text: string) =>
  text
    .replace(/\{'\s*'\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\b[A-Za-z_$][\w$]*\(/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.;])\s/);

const codeOnlyNames = CODE_ONLY.map((tech) => tech.name).join(' and ');

/**
 * The honest form of the claim: name the ones that do render, and leave the
 * ones that do not out of the sentence. A sentence that names all four is
 * making the claim about all four, so this cannot let it through.
 */
const saysWhichRender = (sentence: string) =>
  RUNS_HERE.every((tech) => sentence.includes(tech.name)) &&
  !CODE_ONLY.some((tech) => sentence.includes(tech.name));

const names = (sentence: string) =>
  TECHNOLOGIES.filter((tech) => sentence.includes(tech.name)).length;

check('nothing claims every technology renders the scenes', () => {
  const wrong: string[] = [];
  for (const { file, text } of SOURCES) {
    for (const sentence of sentences(text)) {
      const enumerates =
        (CODE_ONLY.every((tech) => sentence.includes(tech.name)) && names(sentence) > 2) ||
        CLAIMS_THE_WHOLE_SET.test(sentence);
      if (!enumerates) continue;
      if (!RUNNING_VERB.test(sentence) || !A_SCENE.test(sentence)) continue;
      if (SAYS_NOT_RUNNING.test(sentence) || saysWhichRender(sentence)) continue;
      wrong.push(`${file}: ${sentence.trim()}`);
    }
  }
  assert.deepEqual(
    wrong,
    [],
    `these sentences name ${codeOnlyNames} and say they render, but ${codeOnlyNames} ` +
      `render nothing — say what /about says: "the first two actually running on the ` +
      `page, the other two honestly labelled as code"\n    ${wrong.join('\n    ')}`,
  );
});

check('nothing calls the comparison one scene', () => {
  const wrong: string[] = [];
  for (const { file, text } of SOURCES) {
    for (const sentence of sentences(text)) {
      if (!SINGULAR_SCENE.test(sentence)) continue;
      if (names(sentence) < 3 && !WHOLE_COMPARISON.test(sentence)) continue;
      wrong.push(`${file}: ${sentence.trim()}`);
    }
  }
  assert.deepEqual(
    wrong,
    [],
    `there are ${inWords(REFERENCE_SCENES.length)} reference scenes — ` +
      `${REFERENCE_SCENES.map((scene) => scene.short).join(' and ')} — so these read as ` +
      `one scene short\n    ${wrong.join('\n    ')}`,
  );
});

check('the /tech intro counts the scenes and the demos from the registry', () => {
  for (const tech of RUNS_HERE) {
    assert.ok(
      SHARED_SCENE.description.includes(tech.name),
      `${tech.name} runs on its page and the intro does not say so`,
    );
  }
  for (const tech of CODE_ONLY) {
    assert.ok(
      SHARED_SCENE.description.includes(tech.name),
      `${tech.name} renders nothing and the intro does not say so`,
    );
  }
  assert.ok(
    SHARED_SCENE.description.includes(`same ${inWords(REFERENCE_SCENES.length)} reference scenes`),
    'the intro states a number of scenes that REFERENCE_SCENES does not agree with',
  );
});

check('the technology registry is not all one kind of demo', () => {
  // Both halves of the sentence above are only true while both lists have
  // something in them. If a library ever does run here, the copy changes with
  // it — but silently rendering "and " with nothing after it would not.
  assert.ok(RUNS_HERE.length > 0, 'nothing renders on any technology page');
  assert.ok(CODE_ONLY.length > 0, 'nothing is code-only, so the caveat is now a lie');
  assert.equal(RUNS_HERE.length + CODE_ONLY.length, TECHNOLOGIES.length);
});

if (failures.length > 0) {
  console.error(`\n${failures.length} of ${failures.length + passed} technology checks failed\n`);
  for (const failure of failures) console.error(`${failure}\n`);
  process.exit(1);
}

console.log(`\n${passed} technology checks passed`);
