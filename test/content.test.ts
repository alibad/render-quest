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
import { LABS, LIVE_LABS } from '../lib/labs.ts';
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

console.log(`\n${passed} content checks passed`);
