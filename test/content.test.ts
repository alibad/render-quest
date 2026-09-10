/**
 * Structural checks on the site's content data.
 *
 * These are not style opinions — they catch the class of rot where a term
 * cross-references another term that was renamed, a lab link points at a lab
 * that does not exist, or a technology page cites a reading-list entry that was
 * removed. All of it silently renders as a dead end otherwise.
 */
import assert from 'node:assert/strict';

import { GLOSSARY, GLOSSARY_SORTED, termId } from '../lib/glossary.ts';
import { LABS, LIVE_LABS, ORDERED_LABS, labNeighbours } from '../lib/labs.ts';
import type { Lab } from '../lib/labs.ts';
import { GLYPH_SLUGS } from '../components/site/LabGlyph.tsx';
import { ALL_RESOURCES, TRACKS } from '../lib/resources.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';
import {
  AUTHOR,
  REPO_URL,
  SITE_DESCRIPTION,
  SITE_TAGLINE,
  SITE_URL,
} from '../lib/site.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// tsconfig sets "jsx": "preserve", so tsx compiles every .tsx in this repo with
// the classic runtime — the page components below reference a global `React`
// that Next would otherwise have provided.
(globalThis as unknown as { React: typeof React }).React = React;

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('content');

const labSlugs = new Set(LABS.map((lab) => lab.slug));
const terms = new Set(GLOSSARY.map((entry) => entry.term));

check('every glossary "see also" points at a term that exists', () => {
  for (const entry of GLOSSARY) {
    for (const related of entry.see ?? []) {
      assert.ok(
        terms.has(related),
        `"${entry.term}" points at unknown term "${related}"`,
      );
    }
  }
});

check('no glossary term references itself', () => {
  for (const entry of GLOSSARY) {
    assert.ok(!(entry.see ?? []).includes(entry.term), `${entry.term} sees itself`);
  }
});

check('every glossary lab link points at a live lab', () => {
  for (const entry of GLOSSARY) {
    if (!entry.lab) continue;
    assert.ok(labSlugs.has(entry.lab), `${entry.term} -> unknown lab ${entry.lab}`);
    assert.ok(
      LIVE_LABS.some((lab) => lab.slug === entry.lab),
      `${entry.term} links to lab "${entry.lab}", which is not live`,
    );
  }
});

check('glossary terms are unique and produce unique anchors', () => {
  assert.equal(terms.size, GLOSSARY.length, 'duplicate term');
  const ids = new Set(GLOSSARY.map((entry) => termId(entry.term)));
  assert.equal(ids.size, GLOSSARY.length, 'two terms collapse to one anchor');
});

check('glossary is sorted alphabetically for rendering', () => {
  const names = GLOSSARY_SORTED.map((entry) => entry.term);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

check('every technology cites reading-list entries that exist', () => {
  const urls = new Set(ALL_RESOURCES.map((resource) => resource.url));
  for (const tech of TECHNOLOGIES) {
    for (const url of tech.learnUrls) {
      assert.ok(urls.has(url), `${tech.name} cites missing resource ${url}`);
    }
  }
});

check('technology slugs are unique', () => {
  const slugs = new Set(TECHNOLOGIES.map((tech) => tech.slug));
  assert.equal(slugs.size, TECHNOLOGIES.length);
});

check('lab slugs are unique', () => {
  assert.equal(labSlugs.size, LABS.length);
});

check('every resource URL is https and appears once', () => {
  const seen = new Set<string>();
  for (const resource of ALL_RESOURCES) {
    assert.ok(
      resource.url.startsWith('https://'),
      `${resource.title} is not https`,
    );
    assert.ok(!seen.has(resource.url), `${resource.url} listed twice`);
    seen.add(resource.url);
  }
});

check('every reading-list stage has at least one resource', () => {
  for (const track of TRACKS) {
    assert.ok(track.stages.length > 0, `${track.title} has no stages`);
    for (const stage of track.stages) {
      assert.ok(stage.resources.length > 0, `${stage.title} is empty`);
    }
  }
});

check('every live lab has concepts and a stated takeaway', () => {
  for (const lab of LIVE_LABS) {
    assert.ok(lab.concepts.length > 0, `${lab.title} has no concepts`);
    assert.ok(lab.takeaway.length > 20, `${lab.title} has no real takeaway`);
  }
});

check('lab order values are unique and every lab has one', () => {
  const orders = LABS.map((lab) => lab.order);
  assert.equal(new Set(orders).size, LABS.length, 'duplicate order value');
  for (const order of orders) assert.ok(Number.isInteger(order) && order > 0);
});

check('every prerequisite names a lab that exists and comes earlier', () => {
  const byslug = new Map(LABS.map((lab) => [lab.slug, lab]));
  for (const lab of LABS) {
    if (!lab.prereq) continue;
    const prereq = byslug.get(lab.prereq);
    assert.ok(prereq, `${lab.slug} requires unknown lab ${lab.prereq}`);
    assert.ok(
      prereq.order < lab.order,
      `${lab.slug} requires ${lab.prereq}, which comes later in the order`,
    );
  }
});

check('the prerequisite graph is acyclic', () => {
  const byslug = new Map(LABS.map((lab) => [lab.slug, lab]));
  for (const start of LABS) {
    const seen = new Set([start.slug]);
    let current = start.prereq;
    while (current) {
      assert.ok(!seen.has(current), `cycle through ${current}`);
      seen.add(current);
      current = byslug.get(current)?.prereq;
    }
  }
});

check('a live lab never depends on one that is not live', () => {
  for (const lab of LIVE_LABS) {
    if (!lab.prereq) continue;
    assert.ok(
      LIVE_LABS.some((other) => other.slug === lab.prereq),
      `${lab.slug} requires ${lab.prereq}, which is not live`,
    );
  }
});

check('neighbours chain through every live lab exactly once', () => {
  assert.equal(labNeighbours(LIVE_LABS[0].slug).previous, undefined);
  assert.equal(labNeighbours(LIVE_LABS[LIVE_LABS.length - 1].slug).next, undefined);
  const walked = [LIVE_LABS[0].slug];
  let cursor = labNeighbours(LIVE_LABS[0].slug).next;
  while (cursor) {
    walked.push(cursor.slug);
    cursor = labNeighbours(cursor.slug).next;
  }
  assert.deepEqual(walked, LIVE_LABS.map((lab) => lab.slug));
});

check('every live lab has at least one glossary term pointing at it', () => {
  for (const lab of LIVE_LABS) {
    const terms = GLOSSARY.filter((term) => term.lab === lab.slug);
    assert.ok(
      terms.length > 0,
      `${lab.slug} has no glossary terms, so its vocabulary panel would be empty`,
    );
  }
});

// This check used to sort `orders` and compare it against itself sorted, so it
// passed no matter what and proved nothing. Meanwhile the home page and the
// labs index both mapped over the raw `LABS` array, which was declared with
// compute (6) sitting before textures (5) — so the contents page of a site
// whose whole premise is a numbered sequence rendered 06 before 05.
check('the LABS declaration is itself in sequence order', () => {
  const orders = LABS.map((lab) => lab.order);
  assert.deepEqual(
    orders,
    [...orders].sort((a, b) => a - b),
    'LABS is declared out of order, so anything mapping it directly renders the sequence wrong',
  );
});

check('ORDERED_LABS covers every lab exactly once', () => {
  assert.equal(ORDERED_LABS.length, LABS.length);
  assert.deepEqual(
    [...ORDERED_LABS].map((lab) => lab.slug).sort(),
    [...LABS].map((lab) => lab.slug).sort(),
  );
});

// Three labs shipped with an empty plate on their card because LabGlyph was a
// `switch` whose `default` returned null: adding a lab could not fail, it just
// drew nothing. The glyphs are a record now, so the keys are countable.
check('every lab has a diagram', () => {
  for (const lab of LABS) {
    assert.ok(
      GLYPH_SLUGS.includes(lab.slug),
      `${lab.slug} has no glyph, so its card renders an empty plate`,
    );
  }
});

check('no glyph exists for a lab that is not in the registry', () => {
  for (const slug of GLYPH_SLUGS) {
    assert.ok(
      LABS.some((lab) => lab.slug === slug),
      `glyph "${slug}" matches no lab, so it is dead code`,
    );
  }
});


/* --------------------------------------------------------------- routes ---
 * Metadata bugs are invisible from inside the site: the pages look right, and
 * the damage only shows when somebody shares a link. Every route on this site
 * shared as the home page for weeks — Next merges metadata shallowly, so pages
 * that set only `title` and `description` inherited the root layout's whole
 * `openGraph` block, url included. These checks make that unrepeatable.
 */

const APP = join(ROOT, 'app');

/** Every directory under app/ that renders a page, as a route path. */
function pageRoutes(dir = APP, prefix = ''): { route: string; dir: string }[] {
  const out: { route: string; dir: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(dir, entry.name);
    // Dynamic segments are included, not skipped. Excluding them is how
    // /tech/[slug] stayed broken through the first pass of this very check: it
    // builds its metadata in generateMetadata, which needs the helper just as
    // much as a static page does.
    const segment = `${prefix}/${entry.name}`;
    if (existsSync(join(child, 'page.tsx'))) out.push({ route: segment, dir: child });
    out.push(...pageRoutes(child, segment));
  }
  return out;
}

const ROUTES = [
  { route: '/', dir: APP },
  ...pageRoutes(),
];

check('every route builds its metadata through the shared helper', () => {
  for (const { route, dir } of ROUTES) {
    if (route === '/') continue; // the root layout carries the home page's own
    const source = readFileSync(join(dir, 'page.tsx'), 'utf8');
    assert.ok(
      source.includes('pageMetadata('),
      `${route} sets metadata by hand — it will inherit the root layout's openGraph and share as the home page`,
    );
  }
});

check('every route has its own social card', () => {
  for (const { route, dir } of ROUTES) {
    assert.ok(
      existsSync(join(dir, 'opengraph-image.tsx')),
      `${route} has no opengraph-image.tsx, so it falls back to the home page's card`,
    );
  }
});

check('nothing in the sitemap is unreachable from the site', () => {
  const sitemap = readFileSync(join(ROOT, 'app/sitemap.ts'), 'utf8');
  const listed = [...sitemap.matchAll(/path: '([^']*)'/g)].map((m) => m[1] || '/');

  // Every href written anywhere in the app or the components.
  const searched = [join(ROOT, 'app'), join(ROOT, 'components'), join(ROOT, 'lib')];
  let hrefs = '';
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (/\.tsx?$/.test(entry.name)) hrefs += readFileSync(child, 'utf8');
    }
  };
  for (const dir of searched) walk(dir);

  for (const route of listed) {
    if (route === '/') continue;
    assert.ok(
      hrefs.includes(`href="${route}"`) || hrefs.includes(`href: '${route}'`) || hrefs.includes(`'${route}'`),
      `${route} is in the sitemap but nothing on the site links to it`,
    );
  }
});


/* ------------------------------------------------------------ lab parity ---
 * Ten labs should feel like one product. They drifted instead: three had no
 * presets, three had a camera and no way to move it, and one showed none of its
 * own source — each gap arriving quietly with a new lab rather than as a
 * decision. Affordances a reader learns on one lab should be on all of them.
 */
const LAB_SOURCES = new Map(
  LABS.map((lab) => {
    // TextureLab and ColourLab are the two whose file is not <Title>Lab.tsx.
    const guesses = [
      `${lab.slug[0].toUpperCase()}${lab.slug.slice(1)}Lab.tsx`,
      `${lab.slug[0].toUpperCase()}${lab.slug.slice(1).replace(/s$/, '')}Lab.tsx`,
    ];
    const file = guesses.find((name) =>
      existsSync(join(ROOT, 'components/labs', name)),
    );
    assert.ok(file, `no component found for lab "${lab.slug}"`);
    return [lab.slug, readFileSync(join(ROOT, 'components/labs', file!), 'utf8')];
  }),
);

check('every lab opens with named presets', () => {
  for (const [slug, source] of LAB_SOURCES) {
    assert.ok(
      source.includes('<Presets'),
      `${slug} has no "Start here" presets — every other lab opens with somewhere to start`,
    );
  }
});

check('every lab shows the code it runs', () => {
  for (const [slug, source] of LAB_SOURCES) {
    assert.ok(
      source.includes('<LabSource'),
      `${slug} never shows its own source, on a site whose thesis is that the plumbing is the subject`,
    );
  }
});

check('every lab with a camera lets you move it', () => {
  // Two labs legitimately have no camera: the particle field is drawn straight
  // in clip space, and a full-screen fragment shader has no scene to orbit.
  const CAMERALESS = new Set(['compute', 'shader']);
  for (const [slug, source] of LAB_SOURCES) {
    if (CAMERALESS.has(slug)) {
      assert.ok(
        !source.includes('lookAt('),
        `${slug} is listed as having no camera but calls lookAt() — the list is now wrong`,
      );
      continue;
    }
    assert.ok(
      /onDrag|onPointerDown/.test(source),
      `${slug} builds a camera and gives no way to move it`,
    );
  }
});


check('every lab with a camera puts it in the shareable state', () => {
  // The instancing lab kept its camera in a ref — the obvious place, since the
  // render loop is the only reader — and the reader silently lost it: the
  // copy-link button is gated on a non-empty query, so orbiting wrote nothing
  // to the address bar, offered no link, and reopening the page threw the
  // framing away. Seven labs did it right and one did not, which is exactly the
  // kind of divergence nothing notices.
  for (const [slug, source] of LAB_SOURCES) {
    if (!source.includes('azimuth')) continue;
    assert.ok(
      !/useRef\(\{\s*azimuth/.test(source),
      `${slug} holds its camera in a ref, so orbiting never reaches the URL`,
    );
    assert.match(
      source,
      /azimuth: [-\d.]+,/,
      `${slug} has a camera that is not part of the control state the URL encodes`,
    );
  }
});

check('every camera can be moved from the keyboard', () => {
  // "Drag to orbit" is the whole invitation, and a pointer was the only way to
  // accept it. The shared canvas answers for the seven WebGL labs; the
  // instancing lab draws its own, so it has to answer for itself.
  const shared = readFileSync(join(ROOT, 'components/lab/GLCanvas.tsx'), 'utf8');
  assert.match(shared, /tabIndex=\{onDrag \? 0 : undefined\}/);
  assert.match(shared, /ArrowLeft:/);
  for (const [slug, source] of LAB_SOURCES) {
    if (!source.includes('<canvas') || !source.includes('azimuth')) continue;
    assert.match(
      source,
      /onKeyDown=/,
      `${slug} draws its own orbiting canvas and answers no key`,
    );
  }
});

check('every reading-path stage has somewhere to start', () => {
  for (const track of TRACKS) {
    for (const stage of track.stages) {
      const starts = stage.resources.filter((r) => r.level === 'start here');
      assert.ok(
        starts.length > 0,
        `"${stage.title}" has no "start here" resource, so a reader arriving at it has no way in`,
      );
    }
  }
});


/* ------------------------------------------------------- figure addresses ---
 * Issue #7 gave the in-prose figures ids, and an id is only worth having if it
 * is unique in the document it lives in. Two figures called `near-plane` on one
 * page are two `#near-plane` links that both land on the first, and two
 * `useFigureState` namespaces writing each other's keys — so moving one figure
 * moves the other. Neither failure shows on the page, which is why neither
 * would be found.
 *
 * The runtime does not cover this. `useFigureState` throws on a malformed id,
 * but only for a figure that has controls to move; a figure with none never
 * calls the hook, and no two ids on a page are ever compared to each other at
 * all. Headings are checked alongside, because they share the document: `#near`
 * reaching a figure instead of the section it names is the same defect.
 *
 * `PipelineEssay` is why this counts call sites and not elements. It declares
 * one `<Figure id={id}>` inside a `StageFigure` wrapper and renders it five
 * times, so one element carries five addresses.
 */

const ESSAY_DIR = join(ROOT, 'components/labs');
const ESSAY_FILES = readdirSync(ESSAY_DIR)
  .filter((name) => name.endsWith('Essay.tsx'))
  .sort();

/** The id rule useFigureState enforces at runtime, applied here to all of them. */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Whether the tag at `at` is prose about JSX rather than JSX.
 *
 * Three of these exist today and each would be a phantom figure or heading:
 * two JSDoc lines mentioning `<Figure>`, and ProjectionEssay.tsx:190, a line
 * comment that spells out `<ProseHeading id="divide">` to explain why the
 * figure beneath it is not called `divide`. Taking that comment at its word
 * would invent a heading the page does not have.
 */
function isCommentedOut(source: string, at: number): boolean {
  const lastOpen = source.lastIndexOf('/*', at);
  const lastClose = source.lastIndexOf('*/', at);
  if (lastOpen > lastClose) return true;
  const lineStart = source.lastIndexOf('\n', at) + 1;
  return source.slice(lineStart, at).includes('//');
}

/**
 * The text of the JSX opening tag that starts at `at`, `<Figure` included.
 *
 * Stopping at the first `>` is not good enough: every figure on this site
 * passes `control={<Slider … />}` and a `caption={<>…</>}`, so the first `>`
 * after `<Figure` is usually inside a nested element. Brace depth is tracked
 * instead, and quoted spans are skipped whole, so that a `>` or a `}` inside a
 * caption or an aria-label cannot end the tag early.
 */
function openingTag(source: string, at: number): string {
  let depth = 0;
  for (let i = at + 1; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      const close = source.indexOf(c, i + 1);
      if (close === -1) break;
      i = close;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return source.slice(at, i + 1);
  }
  return source.slice(at);
}

/** Every real `<Name` opening tag in `source`, with the offset it starts at. */
function tagsNamed(source: string, name: string): { at: number; text: string }[] {
  const out: { at: number; text: string }[] = [];
  for (const match of source.matchAll(new RegExp(`<${name}(?=[\\s/>])`, 'g'))) {
    const at = match.index!;
    if (isCommentedOut(source, at)) continue;
    out.push({ at, text: openingTag(source, at) });
  }
  return out;
}

/** `id="translate"` -> the string; `id={id}` -> the identifier, flagged. */
function idOn(tag: string): { value: string; literal: boolean } | null {
  const match = /(?:^|\s)id=(?:"([^"]*)"|\{\s*([A-Za-z_$][\w$]*)\s*\})/.exec(tag);
  if (!match) return null;
  return match[1] !== undefined
    ? { value: match[1], literal: true }
    : { value: match[2], literal: false };
}

/** The function an offset sits inside, which is how a wrapper gets named. */
function enclosingFunction(source: string, at: number): string | null {
  const found = [...source.slice(0, at).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  return found.length > 0 ? found[found.length - 1][1] : null;
}

const lineOf = (source: string, at: number) => source.slice(0, at).split('\n').length;

type Address = { id: string; line: number };

const ESSAYS = ESSAY_FILES.map((file) => {
  const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
  const elements = tagsNamed(source, 'Figure');
  const addresses: Address[] = [];
  const idless: string[] = [];

  for (const element of elements) {
    const id = idOn(element.text);
    if (!id) {
      idless.push(`${file}:${lineOf(source, element.at)} <Figure> has no id`);
      continue;
    }
    if (id.literal) {
      addresses.push({ id: id.value, line: lineOf(source, element.at) });
      continue;
    }
    // The id is forwarded from a wrapper's own prop, so this element's
    // addresses are its wrapper's call sites — one each, however many there are.
    const wrapper = enclosingFunction(source, element.at);
    assert.ok(
      wrapper,
      `${file}:${lineOf(source, element.at)} forwards id={${id.value}} out of no named function`,
    );
    for (const call of tagsNamed(source, wrapper!)) {
      const forwarded = idOn(call.text);
      if (!forwarded) {
        idless.push(`${file}:${lineOf(source, call.at)} <${wrapper}> has no id to forward`);
        continue;
      }
      assert.ok(
        forwarded.literal,
        `${file}:${lineOf(source, call.at)} passes <${wrapper} id={${forwarded.value}}> — a wrapper's call site has to spell the id out, or the address is unreadable from here`,
      );
      addresses.push({ id: forwarded.value, line: lineOf(source, call.at) });
    }
  }

  const headings = tagsNamed(source, 'ProseHeading').map((tag) => ({
    id: idOn(tag.text)?.value ?? '',
    line: lineOf(source, tag.at),
  }));

  return { file, elements: elements.length, addresses, headings, idless };
});

// Printed, not asserted. The count is meant to grow with the site, so pinning
// it would be a chore every new figure pays. What the print is for is the
// parse: a scanner that quietly stopped seeing half the figures would pass
// every check below while proving nothing, and a total that dropped says so.
console.log('\n  figures per essay');
for (const essay of ESSAYS) {
  const extra = essay.addresses.length - essay.elements;
  console.log(
    `    ${essay.file.padEnd(20)} ${String(essay.elements).padStart(2)}` +
      (extra > 0 ? `  -> ${essay.addresses.length} addresses, one wrapper rendered ${extra + 1} times` : ''),
  );
}
console.log(
  `    ${'total'.padEnd(20)} ${String(ESSAYS.reduce((n, e) => n + e.elements, 0)).padStart(2)}` +
    `  -> ${ESSAYS.reduce((n, e) => n + e.addresses.length, 0)} addresses across ${ESSAYS.length} essays\n`,
);

check('every essay was parsed and renders figures', () => {
  assert.ok(ESSAYS.length > 0, 'no *Essay.tsx found — this check read nothing');
  for (const essay of ESSAYS) {
    assert.ok(
      essay.elements > 0,
      `${essay.file} renders no <Figure>, which no lab essay on this site does`,
    );
  }
});

check('every figure has an id', () => {
  const offences = ESSAYS.flatMap((essay) => essay.idless);
  assert.deepEqual(
    offences,
    [],
    `\n  ${offences.join('\n  ')}\n  a figure with no id has no address, and its "#" links to the top of the page\n`,
  );
});

check('no two figures in one essay share an id', () => {
  const offences: string[] = [];
  for (const essay of ESSAYS) {
    const lines = new Map<string, number[]>();
    for (const address of essay.addresses) {
      lines.set(address.id, [...(lines.get(address.id) ?? []), address.line]);
    }
    for (const [id, at] of lines) {
      if (at.length < 2) continue;
      offences.push(
        `${essay.file}: "${id}" is used ${at.length} times, at lines ${at.join(' and ')}` +
          ` — #${id} reaches only the first, and both write the same useFigureState keys`,
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});

check('no figure id collides with a heading id in the same essay', () => {
  const offences: string[] = [];
  for (const essay of ESSAYS) {
    const figures = new Map(essay.addresses.map((address) => [address.id, address.line]));
    for (const heading of essay.headings) {
      const line = figures.get(heading.id);
      if (line === undefined) continue;
      offences.push(
        `${essay.file}: "${heading.id}" is a heading at line ${heading.line} and a figure at line ${line}` +
          ' — one document, two destinations, one anchor',
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});

check('every figure id is kebab-case', () => {
  const offences: string[] = [];
  for (const essay of ESSAYS) {
    for (const address of essay.addresses) {
      if (KEBAB.test(address.id)) continue;
      offences.push(
        `${essay.file}:${address.line} has id "${address.id}" — expected kebab-case, e.g. "order-matters"`,
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* ---------------------------------------------- one place per constant ---
 * lib/site.ts opens by calling itself "One place for the things that must
 * agree across metadata, OG images and the sitemap", and then five files
 * pasted the repository URL in anyway and the root layout restated three of
 * its own imports as literals. That is not a tidiness complaint: while the
 * repo was private every one of those links 404'd, and fixing them meant
 * grepping for a string instead of following an import.
 *
 * So any file under the directories below that writes one of these values
 * verbatim fails this check, and the only way to be excused is to be named in
 * LITERAL_EXEMPT with a reason a reader can weigh.
 *
 * SITE_NAME is deliberately absent from the list. "Render Quest" is a
 * two-word phrase that appears as ordinary prose and as social-card alt text
 * in roughly thirty files, where an import buys nothing and the check would
 * only teach people to add exemptions.
 */

const SINGLE_SOURCED: { name: string; value: string }[] = [
  { name: 'REPO_URL', value: REPO_URL },
  { name: 'SITE_URL', value: SITE_URL },
  { name: 'SITE_TAGLINE', value: SITE_TAGLINE },
  { name: 'SITE_DESCRIPTION', value: SITE_DESCRIPTION },
  { name: 'AUTHOR', value: AUTHOR },
];

const LITERAL_SEARCH_DIRS = ['app', 'components', 'lib', 'scripts'];

/**
 * Path (relative to the repo root) -> why that file may write the literal.
 * Anything added here should be a case where the import genuinely cannot be
 * made, not a case where it was inconvenient.
 */
const LITERAL_EXEMPT: Record<string, string> = {
  // The definitions themselves. Every other exemption would need an argument;
  // this one is the point of the file.
  'lib/site.ts': 'declares the constants',
};

function sourceFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFilesUnder(child));
    else if (/\.tsx?$/.test(entry.name)) out.push(child);
  }
  return out;
}

check('nothing restates a lib/site.ts constant as a literal', () => {
  const offences: string[] = [];
  for (const dir of LITERAL_SEARCH_DIRS) {
    for (const file of sourceFilesUnder(join(ROOT, dir))) {
      const rel = relative(ROOT, file);
      if (rel in LITERAL_EXEMPT) continue;
      const source = readFileSync(file, 'utf8');
      for (const { name, value } of SINGLE_SOURCED) {
        const at = source.indexOf(value);
        if (at === -1) continue;
        const line = source.slice(0, at).split('\n').length;
        offences.push(`${rel}:${line} writes ${name} out in full — import it from lib/site.ts`);
      }
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* --------------------------------------------- the 'building' lab state ---
 * `Lab['status']` has two values and all ten labs use one of them. The other
 * is not decoration: /labs grows an "In progress" section, /about names the
 * unfinished labs in a sentence, /roadmap adds a "Labs in progress" list, and
 * LabCard renders such a lab as a dimmed panel with a badge instead of a link.
 * None of that has run since 0f77054 (2026-08-29), the commit that made the
 * last planned lab live — so the eleventh lab would be the first thing to
 * exercise four layouts at once, which is a poor moment to find out.
 *
 * Rendering Next's page components outside Next needs three arrangements,
 * each a property of the harness rather than of the pages:
 *   - a global `React`, set at the top of this file, because tsconfig's
 *     "jsx": "preserve" leaves tsx compiling JSX with the classic runtime;
 *   - a stub for next/navigation, installed in require.cache before any page
 *     is loaded, because Header calls usePathname() and the real hook returns
 *     null with no router above it, which takes the render down inside
 *     `pathname.startsWith`;
 *   - a real ThemeProvider around the tree, exactly as app/layout.tsx wraps
 *     it, because the header's theme toggle throws without one.
 * The pages read LABS and ORDERED_LABS at render time, so the synthetic lab
 * is pushed and popped around the render rather than mocked.
 */

const PLANNED_LAB: Lab = {
  slug: 'not-a-real-lab',
  order: 99,
  title: 'A Lab That Does Not Exist Yet',
  technology: 'webgl',
  blurb: 'Exists only inside this test, to prove the unfinished state renders.',
  takeaway: 'That the branch nothing on the live site reaches still works.',
  concepts: ['synthetic'],
  status: 'building',
};

async function checkTheBuildingState() {
  const require_ = createRequire(import.meta.url);
  const navigation = require_.resolve('next/navigation');
  require_.cache[navigation] = {
    id: navigation,
    filename: navigation,
    loaded: true,
    exports: {
      usePathname: () => '/labs',
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
  const Labs = (await import('../app/labs/page.tsx')).default;
  const About = (await import('../app/about/page.tsx')).default;
  const Roadmap = (await import('../app/roadmap/page.tsx')).default;

  const render = (Page: React.ComponentType) =>
    renderToStaticMarkup(
      React.createElement(ThemeProvider, null, React.createElement(Page)),
    );
  const renderAll = () => ({
    labs: render(Labs),
    about: render(About),
    roadmap: render(Roadmap),
  });

  const asShipped = renderAll();
  LABS.push(PLANNED_LAB);
  ORDERED_LABS.push(PLANNED_LAB);
  let withPlanned: ReturnType<typeof renderAll>;
  try {
    withPlanned = renderAll();
  } finally {
    LABS.pop();
    ORDERED_LABS.pop();
  }

  check('with nothing building, no page renders an in-progress section', () => {
    // /roadmap says "Nothing is in progress" in this state, which is why these
    // match the section headings exactly rather than the phrase.
    assert.ok(!asShipped.labs.includes('>In progress<'), '/labs');
    assert.ok(!asShipped.about.includes('still in progress'), '/about');
    assert.ok(!asShipped.roadmap.includes('Labs in progress'), '/roadmap');
    assert.ok(asShipped.about.includes('Everything planned there has shipped'));
  });

  check('a building lab appears on /labs, unfinished and not a link', () => {
    assert.ok(withPlanned.labs.includes('>In progress<'), 'no "In progress" heading');
    assert.ok(withPlanned.labs.includes(PLANNED_LAB.title), 'the lab is not listed');
    assert.ok(withPlanned.labs.includes('>Building<'), 'the card carries no badge');
    assert.ok(
      !withPlanned.labs.includes(`/labs/${PLANNED_LAB.slug}`),
      'the card links to a page that does not exist',
    );
  });

  check('a building lab is named on /about, and the finished wording drops', () => {
    assert.ok(withPlanned.about.includes('still in progress'));
    assert.ok(withPlanned.about.includes(PLANNED_LAB.title));
    assert.ok(
      !withPlanned.about.includes('Everything planned there has shipped'),
      'both halves of the sentence rendered at once',
    );
  });

  check('a building lab gets a section on /roadmap', () => {
    assert.ok(withPlanned.roadmap.includes('Labs in progress'));
    assert.ok(withPlanned.roadmap.includes(PLANNED_LAB.title));
    assert.ok(withPlanned.roadmap.includes(PLANNED_LAB.takeaway));
  });

  check('the synthetic lab leaves no trace in the registry', () => {
    assert.ok(!LABS.some((lab) => lab.slug === PLANNED_LAB.slug));
    assert.ok(!ORDERED_LABS.some((lab) => lab.slug === PLANNED_LAB.slug));
  });
}

checkTheBuildingState().then(
  () => {
    console.log(`\n${passed} content checks passed`);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
