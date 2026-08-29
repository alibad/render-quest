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
import { ALL_RESOURCES, TRACKS } from '../lib/resources.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';

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

check('ORDERED_LABS is actually ordered', () => {
  const orders = ORDERED_LABS.map((lab) => lab.order);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
});

console.log(`\n${passed} content checks passed`);
