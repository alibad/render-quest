/**
 * Structural checks on the site's content data.
 *
 * These are not style opinions — they catch the class of rot where a term
 * cross-references another term that was renamed, a lab link points at a lab
 * that does not exist, or a technology page cites a reading-list entry that was
 * removed. All of it silently renders as a dead end otherwise.
 */
import assert from 'node:assert/strict';

import { GLOSSARY, GLOSSARY_SORTED, getTerm, termId } from '../lib/glossary.ts';
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
import { execFileSync } from 'node:child_process';
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

let skipped = 0;
/**
 * A check that cannot run here, counted and named.
 *
 * One check in this file needs the repository's history — the essays link
 * commits, and a link to a commit that does not exist is a 404 on somebody
 * else's site. `.github/workflows/ci.yml` checks out with `actions/checkout@v4`
 * and no `fetch-depth`, which fetches exactly one commit, so asking git about a
 * commit from August fails there and passes on every developer's machine. A
 * silent pass would be worse than either, so the skip prints and is counted,
 * following test/render.smoke.ts.
 */
const skip = (name: string, why: string) => {
  skipped++;
  console.log(`  --  ${name} (skipped: ${why})`);
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


/* ------------------------------------------------- reading a data literal ---
 * Four of the checks below have to read structures the runtime never exports:
 * the options inside a `<Check>` written in an essay, and the `PRESETS` array
 * declared `const` in each lab. Both are JSX-adjacent object literals, so the
 * scanners already in this file — which stop at a `>` — cannot see them, and a
 * regex over `note:` cannot tell a field of a preset from the same word inside
 * a caption three lines down.
 *
 * So these three walk brackets instead of matching text, in the same spirit as
 * `openingTag` above: skip quoted spans whole, track depth, and only believe a
 * key that sits at the depth it would sit at if it really were a field.
 */

const OPENERS: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
const CLOSERS = new Set([')', ']', '}']);

/** The bracket-balanced span starting at `open`, quoted spans skipped whole. */
function bracketed(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      const close = source.indexOf(c, i + 1);
      if (close === -1) break;
      i = close;
      continue;
    }
    if (OPENERS[c]) depth++;
    else if (CLOSERS.has(c)) {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/**
 * The bracket depth at every offset in `text`, so a key can be believed or not.
 *
 * A brace or bracket counts at its own offset; the character after a closer is
 * back at the outer depth. Everything inside a quoted span is pinned to the
 * depth the quote opened at, which is what stops an apostrophe in a note from
 * unbalancing the rest of the file.
 */
function depths(text: string): Int32Array {
  const out = new Int32Array(text.length);
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const close = text.indexOf(c, i + 1);
      if (close !== -1) {
        out.fill(depth, i, close + 1);
        i = close;
        continue;
      }
    }
    if (OPENERS[c]) out[i] = ++depth;
    else if (CLOSERS.has(c)) out[i] = depth--;
    else out[i] = depth;
  }
  return out;
}

/** Every top-level `{ … }` in an array literal, in source order. */
function objectsIn(arrayText: string): string[] {
  const depth = depths(arrayText);
  const out: string[] = [];
  for (let i = 1; i < arrayText.length; i++) {
    if (arrayText[i] !== '{' || depth[i] !== 2) continue;
    const object = bracketed(arrayText, i);
    out.push(object);
    i += object.length - 1;
  }
  return out;
}

/**
 * The named fields of one object literal, each as raw source.
 *
 * `keys` is a closed list rather than "anything before a colon" on purpose. A
 * `<Check>` option is a JSX fragment of ordinary prose, and ColourEssay's first
 * distractor opens "Nothing is: a mixture of two colours…" — a greedy key
 * pattern reads that as a field called `is` and truncates the option there. A
 * field ends where the NEXT known key begins, so an unlisted key would be read
 * as part of the value before it, which is why adding a field to `Preset` or to
 * `CheckOption` means adding it here too.
 */
function fieldsOf(objectText: string, keys: string[]): Record<string, string> {
  const depth = depths(objectText);
  const pattern = new RegExp(`(?:^|[\\s,{])(${keys.join('|')})\\s*:`, 'g');
  const found: { key: string; from: number; valueAt: number }[] = [];
  for (const match of objectText.matchAll(pattern)) {
    const at = match.index! + match[0].indexOf(match[1]);
    if (depth[at] !== 1) continue;
    found.push({ key: match[1], from: at, valueAt: match.index! + match[0].length });
  }
  const out: Record<string, string> = {};
  found.forEach((field, index) => {
    const end = index + 1 < found.length ? found[index + 1].from : objectText.length - 1;
    out[field.key] = objectText
      .slice(field.valueAt, end)
      .trim()
      .replace(/,$/, '')
      .trim();
  });
  return out;
}

/**
 * What a reader sees, from a value that may be a string literal or JSX.
 *
 * Only ever used to compare two pieces of prose against each other or against
 * zero, so it does not have to be a renderer — it has to stop markup counting
 * as words. `{' '}` becomes the space it stands for rather than three
 * characters, tags go, and `&rsquo;` counts as the one apostrophe it draws.
 */
function visibleText(value: string): string {
  let text = value.trim();
  // A wrapper the author added for the line break, not something on the page.
  while (/^[('"`]/.test(text) && bracketed(text, 0).length === text.length) {
    text = text.slice(1, -1).trim();
  }
  if (/^['"`]/.test(text) && text.endsWith(text[0])) text = text.slice(1, -1);
  return text
    .replace(/\{'\s*'\}|\{"\s*"\}/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&rsquo;|&lsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A literal string attribute on an opening tag; null when it is not literal. */
function attributeOn(tag: string, key: string): string | null {
  const match = new RegExp(`(?:^|\\s)${key}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
}

/** The `components/labs` file for a lab, by the two spellings that exist. */
function labComponent(slug: string, suffix: 'Lab' | 'Essay'): string {
  const guesses = [
    `${slug[0].toUpperCase()}${slug.slice(1)}${suffix}.tsx`,
    `${slug[0].toUpperCase()}${slug.slice(1).replace(/s$/, '')}${suffix}.tsx`,
  ];
  const file = guesses.find((name) => existsSync(join(ESSAY_DIR, name)));
  assert.ok(file, `no ${suffix} component found for lab "${slug}"`);
  return file!;
}

/** slug -> its essay: the file name, the source, and the headings in it. */
const ESSAY_BY_SLUG = new Map(
  LIVE_LABS.map((lab) => {
    const file = labComponent(lab.slug, 'Essay');
    const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
    const headings = new Set(
      tagsNamed(source, 'ProseHeading')
        .map((tag) => attributeOn(tag.text, 'id'))
        .filter((id): id is string => id !== null),
    );
    return [lab.slug, { file, source, headings }];
  }),
);


/* --------------------------------------------- definitions in the prose ---
 * Issue #43 put the glossary inside the sentence: `<Term name="NDC">NDC</Term>`
 * resolves its entry out of GLOSSARY at render time and opens it under the
 * paragraph, so a reader who does not know the word does not have to leave the
 * argument to find out.
 *
 * Term.tsx throws on a name that is not there, which is the stronger guard and
 * not the reason this exists. That throw only fires in a build that actually
 * renders the essay, and nothing in `npm test` does: the render harness further
 * down this file mounts /labs, /about and /roadmap, none of which is a lab
 * page. So a misspelled name today survives every suite and takes down
 * `next build` — on Vercel, on a push, which for this repository is a
 * deployment. This is the check that catches it a minute earlier and names the
 * file and the line.
 *
 * The second check is one the runtime cannot make at all, because it is about
 * a page rather than an element. A term defines itself at its FIRST use; a
 * second disclosure on the same word three paragraphs down is a button with
 * nothing behind it the reader has not already read, and the paragraph it sits
 * in is the one that gets worse.
 */

const TERM_USES = ESSAY_FILES.flatMap((file) => {
  const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
  return tagsNamed(source, 'Term').map((tag) => ({
    file,
    line: lineOf(source, tag.at),
    name: attributeOn(tag.text, 'name'),
  }));
});

console.log(
  `  ${TERM_USES.length} inline definitions across ${ESSAY_FILES.length} essays\n`,
);

check('the essays define terms in place', () => {
  assert.ok(
    TERM_USES.length > 0,
    'no <Term> in any essay — either the inline definitions are gone, or this scan ' +
      'has stopped seeing them and the two checks below prove nothing',
  );
});

check('every term an essay defines in place is in the glossary', () => {
  const offences: string[] = [];
  for (const use of TERM_USES) {
    if (use.name === null) {
      offences.push(
        `${use.file}:${use.line} <Term> has no literal name="…" — the entry it asks ` +
          'for cannot be read from here, so nothing checks it until the build runs',
      );
      continue;
    }
    if (getTerm(use.name)) continue;
    offences.push(
      `${use.file}:${use.line} names "${use.name}", which is not in GLOSSARY — add it ` +
        'to lib/glossary.ts or fix the spelling; the lookup folds case and nothing else',
    );
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});

check('no essay wraps the same term twice', () => {
  const offences: string[] = [];
  for (const file of ESSAY_FILES) {
    const lines = new Map<string, number[]>();
    for (const use of TERM_USES) {
      if (use.file !== file || use.name === null) continue;
      // Folded, because getTerm folds: "NDC" and "ndc" open the same panel.
      const key = use.name.trim().toLowerCase();
      lines.set(key, [...(lines.get(key) ?? []), use.line]);
    }
    for (const [name, at] of lines) {
      if (at.length < 2) continue;
      offences.push(
        `${file}: "${name}" is wrapped ${at.length} times, at lines ${at.join(' and ')}` +
          ' — wrap the first use and leave the rest as ordinary words',
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* -------------------------------------------- presets that show a failure ---
 * Issue #44 gave `Preset` an optional `shows: 'the failure'`, which puts an
 * amber marker on the button and a sentence above the note saying the render is
 * meant to look wrong. It is the note that carries the actual teaching, and
 * `note` is a required field, so the type appears to have this covered — until
 * somebody writes `note: ''` to get a preset onto the page, which compiles.
 *
 * That is the whole failure mode and it is not hypothetical in kind: a marked
 * preset with no note is a button that says "this is broken on purpose" and
 * then does not say what to look at, which leaves the reader exactly where
 * todo/2026-09-08.md found them — looking at a wrong picture with nothing on
 * the page distinguishing the lesson from a bug.
 *
 * No registry was introduced by that issue: each lab still declares its own
 * `const PRESETS`, which is the thing scanned here.
 */

const MARKED_PRESETS = [...LAB_SOURCES].flatMap(([slug, source]) => {
  // The `=` matters. `const PRESETS: Preset<ColourControls>[] = [` puts an
  // empty `[]` in the type annotation before the array literal, and taking the
  // first bracket after the name reads that instead — which parses cleanly,
  // finds no presets at all, and would have made this whole section vacuous.
  const declared = /const\s+PRESETS\b[^=]*=\s*/.exec(source);
  if (!declared) return [];
  const array = bracketed(source, declared.index + declared[0].length);
  return objectsIn(array)
    .map((object) => fieldsOf(object, ['label', 'note', 'values', 'shows']))
    .filter((preset) => preset.shows !== undefined)
    .map((preset) => ({
      slug,
      label: visibleText(preset.label ?? ''),
      note: visibleText(preset.note ?? ''),
      hasNote: preset.note !== undefined,
    }));
});

console.log(
  `  ${MARKED_PRESETS.length} presets marked "wrong on purpose": ` +
    `${[...new Set(MARKED_PRESETS.map((preset) => preset.slug))].join(', ')}\n`,
);

check('the presets marked wrong on purpose were found', () => {
  assert.ok(
    MARKED_PRESETS.length > 0,
    'no preset anywhere carries `shows`, so the check below reads an empty list — ' +
      'either the markers have gone, or `const PRESETS` is no longer how a lab declares them',
  );
});

check('every preset marked wrong on purpose still says what to look at', () => {
  const offences: string[] = [];
  for (const preset of MARKED_PRESETS) {
    if (preset.hasNote && preset.note.length > 0) continue;
    offences.push(
      `${preset.slug}: "${preset.label}" is marked wrong on purpose and ` +
        (preset.hasNote ? 'its note is empty' : 'carries no note') +
        ' — the marker says the picture is meant to look wrong, and the note is the ' +
        'only thing that says what the failure is',
    );
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* ------------------------------------- controls pointing back at the essay ---
 * Issue #46 gave `ControlGroup` an optional `explains`, the id of a heading in
 * that lab's essay: a returning reader who scrolls straight to the instrument
 * gets sixteen controls and none of the argument, and this is the way back.
 *
 * The link is an `<a href="#…">` on a statically generated page, so a heading
 * that has been renamed produces no error anywhere — the anchor resolves to
 * nothing, the browser stays where it is, and the control quietly links to the
 * top of the page. This is the same shape as test/shader.test.ts's check that
 * every uniform the TypeScript asks for exists in the shader it compiles
 * against, and it catches the same class of rot: two files that have to agree
 * about a name, with nothing at runtime comparing them.
 */

const EXPLAINS = [...LAB_SOURCES].flatMap(([slug, source]) =>
  tagsNamed(source, 'ControlGroup')
    .map((tag) => ({
      slug,
      file: labComponent(slug, 'Lab'),
      line: lineOf(source, tag.at),
      title: attributeOn(tag.text, 'title'),
      explains: attributeOn(tag.text, 'explains'),
    }))
    .filter((group) => group.explains !== null),
);

console.log(
  `  ${EXPLAINS.length} control groups link back to a section of their essay\n`,
);

check('the control groups that link back to the essay were found', () => {
  assert.ok(
    EXPLAINS.length > 0,
    'no ControlGroup anywhere sets `explains`, so the check below reads an empty list',
  );
});

check('every control group links to a heading its essay actually has', () => {
  const offences: string[] = [];
  for (const group of EXPLAINS) {
    const essay = ESSAY_BY_SLUG.get(group.slug);
    assert.ok(essay, `${group.slug} has a control group and no essay`);
    if (essay!.headings.has(group.explains!)) continue;
    offences.push(
      `${group.file}:${group.line} points the "${group.title}" controls at ` +
        `#${group.explains}, and ${essay!.file} has no <ProseHeading id="${group.explains}"> — ` +
        `the link lands on nothing and the reader stays where they are. Its headings are: ` +
        `${[...essay!.headings].join(', ')}`,
    );
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* ----------------------------------------------------- the essays' checks ---
 * Issue #49 put one question at the paragraph making the claim, with a reason
 * written for every wrong answer. The wrong answers are the content, so the
 * three things asserted here are the three ways a check silently stops being
 * one:
 *
 *  - Two options marked correct, or none. `Check` marks the correct option
 *    only after something has been chosen, so a second `correct: true` renders
 *    as two options both marked right and no error anywhere; none renders as a
 *    check that never tells the reader the answer.
 *  - An empty response. The response is what the aria-live region announces —
 *    an empty one is silence to a screen reader and a blank box to everyone
 *    else, and the reader is left with less than they had before they clicked.
 *  - A response shorter than the option it answers. This is the filler
 *    detector. A distractor is only worth writing if somebody would choose it,
 *    and the response has to say what they were thinking and where it breaks;
 *    "Not quite" cannot do that in fewer characters than the option took. The
 *    real twelve run from 3.3x to 8.2x the length of their option, so parity is
 *    a floor nothing honest comes near.
 *
 * Length is measured on what a reader sees rather than on source: options carry
 * <code> and responses carry <a href>, and counting the markup would let a
 * filler response pass on the strength of a link.
 */

interface ParsedCheck {
  file: string;
  line: number;
  options: { option: string; response: string; correct: boolean; hasResponse: boolean }[];
}

const CHECKS: ParsedCheck[] = ESSAY_FILES.flatMap((file) => {
  const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
  return tagsNamed(source, 'Check').map((tag) => {
    const at = source.indexOf('options={', tag.at);
    assert.ok(
      at !== -1 && at < tag.at + tag.text.length,
      `${file}:${lineOf(source, tag.at)} <Check> has no options={[…]}`,
    );
    const array = bracketed(source, source.indexOf('[', at));
    return {
      file,
      line: lineOf(source, tag.at),
      options: objectsIn(array).map((object) => {
        const fields = fieldsOf(object, ['option', 'correct', 'response']);
        return {
          option: visibleText(fields.option ?? ''),
          response: visibleText(fields.response ?? ''),
          correct: fields.correct === 'true',
          hasResponse: fields.response !== undefined,
        };
      }),
    };
  });
});

console.log(
  `  ${CHECKS.length} checks in the essays, ` +
    `${CHECKS.reduce((n, c) => n + c.options.length, 0)} options between them\n`,
);

check('the checks in the essays were parsed', () => {
  assert.ok(CHECKS.length > 0, 'no <Check> in any essay — this scan read nothing');
  for (const parsed of CHECKS) {
    assert.ok(
      parsed.options.length > 0,
      `${parsed.file}:${parsed.line} parsed as a check with no options`,
    );
  }
});

check('every check has exactly one correct option', () => {
  const offences: string[] = [];
  for (const parsed of CHECKS) {
    const correct = parsed.options.filter((entry) => entry.correct);
    if (correct.length === 1) continue;
    offences.push(
      `${parsed.file}:${parsed.line} has ${correct.length} options marked correct out of ` +
        `${parsed.options.length}` +
        (correct.length === 0
          ? ' — nothing on the page ever tells the reader which one it is'
          : ` (${correct.map((entry) => `"${entry.option.slice(0, 40)}…"`).join(', ')}) — ` +
            'both render marked, and a reader who picked one of them is told they are right twice'),
    );
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});

check('every option in a check has a response', () => {
  const offences: string[] = [];
  for (const parsed of CHECKS) {
    for (const [index, entry] of parsed.options.entries()) {
      if (entry.hasResponse && entry.response.length > 0) continue;
      offences.push(
        `${parsed.file}:${parsed.line} option ${index + 1} ("${entry.option.slice(0, 50)}") ` +
          (entry.hasResponse ? 'has an empty response' : 'has no response') +
          ' — choosing it announces nothing through the live region and shows a blank box',
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});

check('no response is shorter than the option it answers', () => {
  const offences: string[] = [];
  for (const parsed of CHECKS) {
    for (const entry of parsed.options) {
      if (entry.response.length >= entry.option.length) continue;
      offences.push(
        `${parsed.file}:${parsed.line} answers "${entry.option.slice(0, 50)}" ` +
          `(${entry.option.length} characters) with ${entry.response.length} — a response has ` +
          'to say what the reader was thinking and where it breaks, which is not something ' +
          'that fits in less room than the option took',
      );
    }
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* ----------------------------------------------- the receipt and the boundary ---
 * Issue #51 closed every lab with two sentences: the takeaway restated as
 * something now true, and one naming what the page did NOT teach and why.
 *
 * The boundary is the one worth guarding. It is the harder sentence to write,
 * and the cheap way to write it is to negate the takeaway — "This did not teach
 * you why a matrix chain reads right to left" — which reads like a boundary,
 * renders like a boundary and tells the reader nothing they did not just spend
 * 1,400 words on. Nothing about that is visible on the page.
 *
 * So the boundary is measured against the takeaway: what share of the
 * takeaway's own content words come back in it. Measured on the ten that
 * shipped, that share runs 0.000 to 0.333, and 0.333 is two labs where the
 * boundary names an adjacent subject in the same vocabulary — the transform
 * lab's boundary is about scene graphs and says "matrix" and "chain" because
 * that is what a scene graph is made of. The negated takeaway scores 1.000 on
 * all ten. The bar below sits between the two, nearly twice the worst honest
 * reading and well under a restatement.
 *
 * What this cannot see is a restatement in different words, and no token metric
 * can. It catches the cheap version, which is the one that gets written.
 */

/**
 * Words that carry no subject. Deliberately short: every word dropped here is
 * one a lazy boundary could reuse for free, so the list holds function words
 * and the site's own filler verbs and nothing that names a thing.
 */
const FUNCTION_WORDS = new Set([
  'the', 'and', 'but', 'for', 'from', 'into', 'onto', 'out', 'with', 'without',
  'that', 'this', 'these', 'those', 'which', 'what', 'when', 'where', 'why',
  'how', 'you', 'your', 'its', 'their', 'them', 'they', 'not', 'nothing',
  'are', 'was', 'were', 'been', 'being', 'has', 'have', 'had', 'can', 'could',
  'will', 'would', 'does', 'did', 'done', 'here', 'there', 'than', 'then',
  'because', 'rather', 'still', 'just', 'only', 'each', 'every', 'all', 'any',
  'some', 'more', 'most', 'less', 'least', 'same', 'other', 'another', 'while',
  'before', 'after', 'once', 'never', 'always', 'also', 'about', 'over',
  'under', 'one', 'two', 'say', 'says', 'said', 'see', 'seen', 'look', 'looks',
  'make', 'makes', 'made', 'get', 'gets', 'got', 'now', 'teach', 'taught',
  'thing', 'things', 'something', 'anything', 'everything', 'lab', 'page',
]);

/** The content words of a sentence, folded and stripped of punctuation. */
const contentWords = (sentence: string) =>
  new Set(
    sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s’'-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !FUNCTION_WORDS.has(word)),
  );

/**
 * The share of the takeaway's content words that come back in the boundary.
 *
 * Not Jaccard: the boundaries are two to four times longer than the takeaways,
 * so a boundary that quoted the takeaway whole and then said more would still
 * score low on symmetric overlap. What matters is how much of the takeaway is
 * being said again, which is a one-directional question.
 */
function restatement(takeaway: string, boundary: string): number {
  const wanted = contentWords(takeaway);
  if (wanted.size === 0) return 0;
  const said = contentWords(boundary);
  return [...wanted].filter((word) => said.has(word)).length / wanted.size;
}

/**
 * Measured: the ten real boundaries score 0.000 to 0.333, and the takeaway
 * negated scores 1.000 on every one of them. Anything at or above this is a
 * boundary that has given the takeaway back rather than drawn a line around it.
 */
const RESTATES_THE_TAKEAWAY = 0.6;

console.log('\n  boundary against takeaway, share of the takeaway restated');
for (const lab of LIVE_LABS) {
  console.log(
    `    ${lab.slug.padEnd(12)} ${restatement(lab.takeaway, lab.boundary).toFixed(3)}`,
  );
}
console.log(`    ${'fails at'.padEnd(12)} ${RESTATES_THE_TAKEAWAY.toFixed(3)}\n`);

check('every lab closes with a receipt and a boundary', () => {
  for (const lab of LABS) {
    assert.ok(
      lab.receipt.trim().length > 20,
      `${lab.title} has no real receipt, so its page ends with the instrument and no ` +
        'evidence that anything happened',
    );
    assert.ok(
      lab.boundary.trim().length > 20,
      `${lab.title} has no real boundary, so nothing tells the reader where the ` +
        'evidence they have just seen stops',
    );
  }
});

check('no boundary merely restates the takeaway', () => {
  const offences: string[] = [];
  for (const lab of LABS) {
    const share = restatement(lab.takeaway, lab.boundary);
    if (share < RESTATES_THE_TAKEAWAY) continue;
    const shared = [...contentWords(lab.takeaway)].filter((word) =>
      contentWords(lab.boundary).has(word),
    );
    offences.push(
      `${lab.slug}: the boundary gives back ${(100 * share).toFixed(0)}% of the takeaway’s ` +
        `own words (${shared.join(', ')}) — it is the takeaway negated, not a line around ` +
        'it. Name a real neighbouring subject and say why it is absent',
    );
  }
  assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
});


/* ---------------------------------------- the commits the essays point at ---
 * Issue #52 gave four labs a "what I got wrong here" section, and each one ends
 * by naming the commit that fixed it and the check that holds it now. Both of
 * those are claims about things outside the essay, and both rot in silence: a
 * rebase or a squash turns the commit link into somebody else's 404, and
 * renaming a check leaves a paragraph citing a guard that no longer exists —
 * which on a page whose whole argument is "this is guarded now" is the worst
 * sentence on the site to have wrong.
 *
 * The shallow-clone problem is real and is handled by skipping rather than by
 * deepening: `.github/workflows/ci.yml` checks out with `actions/checkout@v4`
 * and no `fetch-depth`, so CI has exactly one commit and cannot resolve
 * anything else. That file is not this agent's to edit — adding
 * `fetch-depth: 0` to both jobs would let the check run there, and is worth
 * doing — so until it is, CI reports the skip by name and every developer
 * machine, which has the full history, runs it for real. The test names that
 * are checked alongside need no history and run everywhere.
 */

/** `href={`${REPO_URL}/commit/<sha>`}` — the link a reader can click. */
const COMMIT_LINKS = ESSAY_FILES.flatMap((file) => {
  const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
  return [...source.matchAll(/\/commit\/([0-9a-f]{4,40})/g)].map((match) => ({
    file,
    line: lineOf(source, match.index!),
    sha: match[1],
  }));
});

/**
 * `the check <code>NAME</code> in <code>test/FILE</code>`, which is the shape
 * all four sections write. The pair is matched together rather than separately
 * so that the name is checked against the file the essay itself names.
 */
const TEST_CITATIONS = ESSAY_FILES.flatMap((file) => {
  const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
  return [
    ...source.matchAll(
      /<code>([^<]+)<\/code>\s*,?\s*in\{' '\}\s*<code>(test\/[^<]+)<\/code>/g,
    ),
  ].map((match) => ({
    file,
    line: lineOf(source, match.index!),
    name: match[1].replace(/\s+/g, ' ').trim(),
    suite: match[2].trim(),
  }));
});

console.log(
  `  ${COMMIT_LINKS.length} commits and ${TEST_CITATIONS.length} named checks cited by the essays\n`,
);

check('the essays cite commits and checks by name', () => {
  assert.ok(
    COMMIT_LINKS.length > 0,
    'no essay links a commit — the "what I got wrong here" sections have gone, or this ' +
      'scan no longer sees the links and the check below proves nothing',
  );
  assert.ok(
    TEST_CITATIONS.length > 0,
    'no essay names the check that guards its mistake — the sections say a test holds it ' +
      'now, and the sentence that says which one is what this reads',
  );
});

const gitSays = (...args: string[]) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

let history: 'full' | 'shallow' | 'absent';
try {
  history = gitSays('rev-parse', '--is-shallow-repository') === 'true' ? 'shallow' : 'full';
} catch {
  history = 'absent';
}

if (history !== 'full') {
  skip(
    'every commit an essay links resolves',
    history === 'shallow'
      ? 'this clone is shallow, so nothing but the tip commit can be resolved'
      : 'there is no git repository here',
  );
} else {
  check('every commit an essay links resolves', () => {
    const offences: string[] = [];
    for (const link of COMMIT_LINKS) {
      try {
        gitSays('cat-file', '-e', `${link.sha}^{commit}`);
      } catch {
        offences.push(
          `${link.file}:${link.line} links commit ${link.sha}, which is not in this ` +
            'repository — the paragraph around it describes that commit, so a rebase that ' +
            'rewrote it has taken the evidence with it',
        );
      }
    }
    assert.deepEqual(offences, [], `\n  ${offences.join('\n  ')}\n`);
  });
}

check('every check an essay names still exists in the suite it names', () => {
  const offences: string[] = [];
  for (const citation of TEST_CITATIONS) {
    const path = join(ROOT, citation.suite);
    if (!existsSync(path)) {
      offences.push(
        `${citation.file}:${citation.line} cites ${citation.suite}, which is not a file ` +
          'in this repository',
      );
      continue;
    }
    if (readFileSync(path, 'utf8').includes(citation.name)) continue;
    offences.push(
      `${citation.file}:${citation.line} says the check "${citation.name}" in ` +
        `${citation.suite} holds this, and no check in that file is called that — either ` +
        'the check was renamed and the essay now cites a guard that does not exist, or it ' +
        'was deleted and the paragraph is claiming a guarantee nothing provides',
    );
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
  // Required on Lab since issue #51, and this fixture is the one Lab in the
  // repository that no page renders these two fields for — /labs, /about and
  // /roadmap show a building lab's title and takeaway and never its closing
  // section, because a lab that is not live has no page to close. They are
  // written out rather than stubbed anyway: `next build` type-checks this
  // directory, so the placeholder that seemed harmless is what took the build
  // down the first time these fields landed.
  receipt:
    'You can now be sure the four layouts that branch on an unfinished lab still render, which nothing on the live site has exercised since 0f77054.',
  boundary:
    'This did not teach you anything: it is a fixture, its only reader is the harness at the foot of this file, and it is popped off the registry before the run ends.',
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
    console.log(
      `\n${passed} content checks passed${skipped > 0 ? `, ${skipped} skipped` : ''}`,
    );
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
