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
import { GLYPH_SLUGS } from '../components/site/LabGlyph.tsx';
import { ALL_RESOURCES, TRACKS } from '../lib/resources.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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

console.log(`\n${passed} content checks passed`);
