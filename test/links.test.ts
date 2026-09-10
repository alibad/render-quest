/**
 * Every internal lab link lands somewhere that exists.
 *
 * The essays cross-reference each other sixteen times, and after this batch
 * most of those links carry a fragment: not "see Projection & the Frustum" but
 * "land on the paragraph where near and far are shown to be a clip". A wrong
 * fragment is the worst kind of dead link, because nothing is dead — the page
 * loads, the browser finds no such id, and the reader is left at the top of a
 * two-thousand-word essay looking for a sentence that was promised to be right
 * there. No 404, no console error, nothing to grep for.
 *
 * The section ids are not registered anywhere: `essayOutline` parses them out
 * of the `<ProseHeading id="…">` tags at build time. That removes the drift
 * between a registry and the headings it copies, and it leaves exactly one
 * thing left to check, which is this — a link naming a heading no essay has.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import { essayOutline } from '../lib/essay-outline.ts';
import { LIVE_LABS, labSectionHref } from '../lib/labs.ts';

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('links');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

interface LabLink {
  file: string;
  slug: string;
  /** Undefined for a link at a whole lab rather than a section of one. */
  section?: string;
}

/**
 * A literal `href="/labs/…"`, with or without a fragment.
 *
 * Only literals. The template form — `` href={`/labs/${lab.slug}`} `` in the
 * footer, the card, the glossary — is built from the registry itself and cannot
 * name a lab that is not in it, so there is nothing here to check. Matching on
 * `href="` rather than on `/labs/` is also what keeps the import specifiers out:
 * every essay imports from `@/components/labs/…`, which contains the same eight
 * characters.
 */
const HREF = /href="(\/labs\/([a-z-]+))(?:#([\w-]+))?"/g;

/** The same link built through the helper: `labSectionHref('depth', 'near')`. */
const HELPER = /labSectionHref\(\s*'([a-z-]+)'\s*,\s*'([\w-]+)'\s*\)/g;

const links: LabLink[] = [];
for (const dir of ['app', 'components', 'lib']) {
  for (const file of sourceFiles(join(ROOT, dir))) {
    const source = readFileSync(file, 'utf8');
    const name = relative(ROOT, file);
    for (const match of source.matchAll(HREF)) {
      links.push({ file: name, slug: match[2], section: match[3] });
    }
    for (const match of source.matchAll(HELPER)) {
      links.push({ file: name, slug: match[1], section: match[2] });
    }
  }
}

const liveSlugs = new Set(LIVE_LABS.map((lab) => lab.slug));

check('every literal lab link points at a live lab', () => {
  for (const link of links) {
    assert.ok(
      liveSlugs.has(link.slug),
      `${link.file} links to /labs/${link.slug}, which is not a live lab`,
    );
  }
});

check('every anchored lab link lands on a heading that exists', () => {
  for (const link of links) {
    if (!link.section) continue;
    const ids = essayOutline(link.slug).sections.map((section) => section.id);
    assert.ok(
      ids.includes(link.section),
      `${link.file} links to /labs/${link.slug}#${link.section}, and that essay ` +
        `has no such heading. It has: ${ids.join(', ')}`,
    );
  }
});

/**
 * The guard against the checks above passing because nothing was found.
 *
 * Both loops are vacuously true over an empty list, and the list is built by
 * regex over source files — one refactor of how an essay writes a link and this
 * file goes quietly green while checking nothing. Ten essays, sixteen outbound
 * links between them at the time of writing, one to three per essay; the floor
 * asserted is one, so deleting a link is allowed and losing the parse is not.
 */
check('every essay still links out to another lab', () => {
  for (const lab of LIVE_LABS) {
    const file = `components/labs/${lab.slug[0].toUpperCase()}${lab.slug.slice(1)}Essay.tsx`;
    const found = links.filter((link) => link.file === file);
    assert.ok(found.length > 0, `no cross-lab link parsed out of ${file}`);
    assert.ok(
      found.every((link) => link.slug !== lab.slug),
      `${file} links to its own page`,
    );
  }
});

check('labSectionHref refuses a lab that is not in the registry', () => {
  assert.equal(labSectionHref('depth', 'near'), '/labs/depth#near');
  assert.throws(() => labSectionHref('dpeth', 'near'), /no such lab/);
});

console.log(`\n${passed} link checks passed`);
