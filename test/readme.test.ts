/**
 * Structural checks on the README.
 *
 * The README is the shop window, and it has drifted from the registries twice:
 * once advertising "32 numeric checks" against a suite that ran several times
 * that many, and once listing four technology guides as though all four
 * rendered, when two of them are `demo: 'code-only'` and say so on their own
 * pages. Both were the same failure — a number or a claim typed into prose,
 * next to a registry that already knew the answer.
 *
 * So every count and every claim the README makes about the site is checked
 * here against the data the site is built from. A lab renamed, a term added, a
 * technology whose demo status changes now fails a test rather than quietly
 * making the front page of the repository wrong.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { essayOutline } from '../lib/essay-outline.ts';
import { GLOSSARY } from '../lib/glossary.ts';
import { LABS, LIVE_LABS } from '../lib/labs.ts';
import { ALL_RESOURCES } from '../lib/resources.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '../lib/site.ts';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('readme');

/** Apostrophes are typographic in the registries and plain in the markdown. */
const README = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  .replace(/[‘’]/g, "'");

/** Small numbers are words in prose, and the prose is what has to stay true. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];
const spelled = (n: number) => WORDS[n] ?? String(n);

/**
 * The same text with markdown links flattened and wrapping undone, so a phrase
 * check reads what a person reads rather than where the lines happen to break.
 */
const PROSE = README.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ');

const API_LABEL: Record<string, string> = { webgl: 'WebGL', webgpu: 'WebGPU' };

/** Every row of the lab table, parsed rather than searched for. */
const TABLE_ROWS = [
  ...README.matchAll(/^\| (\d+) \| \[([^\]]+)\]\(([^)]+)\) \| (\S+) \| (.+?) \|$/gm),
].map((row) => ({
  order: Number(row[1]),
  title: row[2],
  url: row[3],
  api: row[4],
  takeaway: row[5],
}));

check('the README opens with the site name and the site\'s own tagline', () => {
  assert.ok(README.startsWith(`# ${SITE_NAME}\n`), 'the first line is not the site name');
  assert.ok(
    README.includes(SITE_TAGLINE),
    `the tagline in lib/site.ts ("${SITE_TAGLINE}") appears nowhere in the README`,
  );
});

check('the README sends people at the site itself', () => {
  assert.ok(README.includes(`(${SITE_URL})`), `no link to ${SITE_URL}`);
  assert.ok(
    README.includes(`(${SITE_URL}/labs/${LIVE_LABS[0].slug})`),
    'nothing links to the first lab, so a stranger has no way in',
  );
});

check('the lab table lists every live lab, and nothing else', () => {
  assert.equal(
    TABLE_ROWS.length,
    LIVE_LABS.length,
    `the table has ${TABLE_ROWS.length} rows for ${LIVE_LABS.length} live labs`,
  );
  TABLE_ROWS.forEach((row, index) => {
    const lab = LIVE_LABS[index];
    assert.equal(row.order, lab.order, `row ${index + 1} is numbered ${row.order}`);
    assert.equal(row.title, lab.title, `row ${row.order} calls "${lab.title}" "${row.title}"`);
    assert.equal(
      row.url,
      `${SITE_URL}/labs/${lab.slug}`,
      `row ${row.order} links to ${row.url}`,
    );
  });
});

check('the table names the API each lab actually runs on', () => {
  TABLE_ROWS.forEach((row, index) => {
    const lab = LIVE_LABS[index];
    assert.equal(
      row.api,
      API_LABEL[lab.technology],
      `${lab.title} is ${lab.technology} in the registry and ${row.api} in the README`,
    );
  });
});

check('the table quotes each lab\'s real takeaway', () => {
  TABLE_ROWS.forEach((row, index) => {
    const lab = LIVE_LABS[index];
    assert.equal(
      row.takeaway,
      lab.takeaway.replace(/[‘’]/g, "'"),
      `${lab.title} promises something the registry does not`,
    );
  });
});

check('the README links to no lab that does not exist', () => {
  const slugs = new Set(LABS.map((lab) => lab.slug));
  for (const match of README.matchAll(/\/labs\/([a-z0-9-]+)/g)) {
    assert.ok(slugs.has(match[1]), `the README links to /labs/${match[1]}, which is not a lab`);
    assert.ok(
      LIVE_LABS.some((lab) => lab.slug === match[1]),
      `the README links to /labs/${match[1]}, which is not live`,
    );
  }
});

check('every lab count the README states is the number of live labs', () => {
  const stated = [...README.matchAll(/(\d+) labs\b/g)].map((m) => Number(m[1]));
  assert.ok(stated.length > 0, 'the README states no lab count at all');
  for (const count of stated) {
    assert.equal(count, LIVE_LABS.length, `the README says ${count} labs`);
  }
});

check('the glossary count in the README is the size of the glossary', () => {
  const stated = [
    ...README.matchAll(/(\d+)[- ]term glossary/g),
    ...README.matchAll(/(\d+) glossary terms/g),
  ].map((m) => Number(m[1]));
  assert.ok(stated.length > 0, 'the README states no glossary count');
  for (const count of stated) {
    assert.equal(count, GLOSSARY.length, `the README says ${count} glossary terms`);
  }
});

check('the resource count in the README is the size of the reading path', () => {
  const stated = [...README.matchAll(/(\d+) resources\b/g)].map((m) => Number(m[1]));
  assert.ok(stated.length > 0, 'the README states no resource count');
  for (const count of stated) {
    assert.equal(count, ALL_RESOURCES.length, `the README says ${count} resources`);
  }
});

check('the WebGPU caveat names the labs that actually need WebGPU', () => {
  const webgpu = LIVE_LABS.filter((lab) => lab.technology === 'webgpu');
  const webgl = LIVE_LABS.length - webgpu.length;
  assert.ok(
    PROSE.toLowerCase().includes(
      `${spelled(webgl)} of the ${spelled(LIVE_LABS.length)} run anywhere webgl does`,
    ),
    `${webgl} of ${LIVE_LABS.length} labs are WebGL, and the README does not say so`,
  );
  const named = `Labs ${webgpu.map((lab) => lab.order).join(' and ')} need WebGPU`;
  assert.ok(
    PROSE.includes(named),
    `the caveat should read "${named}" — a reader on Firefox is sent to whichever labs it names`,
  );
});

check('the README counts the technology guides correctly', () => {
  assert.ok(
    PROSE.includes(`${spelled(TECHNOLOGIES.length)} technology guides`),
    `there are ${TECHNOLOGIES.length} technologies in the registry`,
  );
  for (const tech of TECHNOLOGIES) {
    assert.ok(PROSE.includes(tech.name), `${tech.name} is in the registry and not in the README`);
  }
});

check('the README says how many technology pages render, and gets it right', () => {
  const running = TECHNOLOGIES.filter((tech) => tech.demo !== 'code-only').length;
  assert.ok(
    PROSE.toLowerCase().includes(
      `${spelled(running)} of the ${spelled(TECHNOLOGIES.length)} run on the page`,
    ),
    `${running} of ${TECHNOLOGIES.length} technology pages render live, and the README does not say so`,
  );
});

// The claim this repository can least afford to get wrong. Three.js and vgpu
// are not dependencies of this site; their pages show code and say plainly
// that nothing is running, and a README that implies otherwise would be the
// exact thing the site exists not to do.
check('the README never implies a code-only technology renders here', () => {
  const VERB = /\brenders?\b|\brendering\b|\bruns?\b|\brunning\b|\blive\b/;
  const DISCLAIMED = /not running|not a dependency|not dependencies|code only|show the code|shows the code|does not run/;
  const sentences = PROSE.split(/(?<=[.;])\s+/);
  for (const tech of TECHNOLOGIES) {
    if (tech.demo !== 'code-only') continue;
    for (const sentence of sentences) {
      if (!sentence.includes(tech.name) || !VERB.test(sentence)) continue;
      assert.match(
        sentence,
        DISCLAIMED,
        `"${tech.name}" is code-only, and this sentence says it renders: ${sentence.trim()}`,
      );
    }
  }
});

/**
 * The suite count is a number typed into prose beside a file that already knows
 * the answer — the same shape of drift as the "32 numeric checks" above. It
 * went wrong the moment two suites were added and the sentence was not.
 */
const SUITES = [
  ...(
    JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
      .scripts.test as string
  ).matchAll(/tsx (test\/[\w.-]+)/g),
].map((match) => match[1]);

check('the README states the number of suites npm test actually runs', () => {
  assert.ok(SUITES.length > 0, 'package.json runs no suites at all');
  const pattern = new RegExp(String.raw`\b(${WORDS.join('|')}|\d+) suites\b`, 'g');
  const stated = [...README.matchAll(pattern)].map((match) => match[1]);
  assert.ok(stated.length > 0, 'the README states no suite count');
  for (const count of stated) {
    assert.equal(
      count,
      spelled(SUITES.length),
      `npm test runs ${SUITES.length} suites (${SUITES.join(', ')}) and the README says ${count}`,
    );
  }
});

/**
 * The two word counts, which were the largest false numbers on this page and
 * survived because nothing could measure them. The README claimed 1,400–2,400
 * words a lab against essays that run 989–1,528, and 20,000 words in total
 * against 13,123 — an overstatement of roughly half, three lines under a
 * paragraph about what a static page cannot show you.
 *
 * `essayOutline` counts the text inside `<Prose>` and nothing else, so the
 * figure captions — 181 to 423 words a lab, 2,838 across the ten — are outside
 * both numbers. The README says which of the two it is counting rather than
 * leaving a reader to assume the larger one.
 *
 * Both stated numbers are rounded outward, to hundreds and to thousands, so
 * that ordinary editing does not falsify the prose: a lab has to cross a
 * hundred before the range moves.
 */
const ESSAYS = LIVE_LABS.map((lab) => ({ lab, words: essayOutline(lab.slug).words }));
const SHORTEST = ESSAYS.reduce((a, b) => (b.words < a.words ? b : a));
const LONGEST = ESSAYS.reduce((a, b) => (b.words > a.words ? b : a));
const TOTAL_WORDS = ESSAYS.reduce((sum, essay) => sum + essay.words, 0);

/** 1600 → "1,600". Grouped by hand, so the result cannot depend on the ICU build. */
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, ',');

check('the per-lab word range in the README is one the essays fit inside', () => {
  const low = Math.floor(SHORTEST.words / 100) * 100;
  const high = Math.ceil(LONGEST.words / 100) * 100;
  const stated = PROSE.match(/([\d,]+)–([\d,]+) words a lab/);
  assert.ok(stated, 'the README states no per-lab word range');
  const wanted =
    `the essays run ${grouped(SHORTEST.words)}–${grouped(LONGEST.words)} words ` +
    `(${SHORTEST.lab.title} shortest, ${LONGEST.lab.title} longest), so the README ` +
    `should say ${grouped(low)}–${grouped(high)} words a lab`;
  assert.equal(Number(stated[1].replace(/,/g, '')), low, wanted);
  assert.equal(Number(stated[2].replace(/,/g, '')), high, wanted);
});

check('the total the README gives is the total the essays add up to', () => {
  const rounded = Math.round(TOTAL_WORDS / 1000) * 1000;
  const stated = PROSE.match(/Around ([\d,]+) words of essay in total/);
  assert.ok(stated, 'the README states no total word count for the essays');
  assert.equal(
    Number(stated[1].replace(/,/g, '')),
    rounded,
    `the ${LIVE_LABS.length} essays are ${grouped(TOTAL_WORDS)} words, so this should ` +
      `read "Around ${grouped(rounded)} words of essay in total"`,
  );
});

console.log(`\n${passed} readme checks passed`);
