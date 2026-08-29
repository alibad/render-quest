/**
 * A flat search index over everything on the site.
 *
 * Built at module load from the same registries the pages render from, so it
 * cannot drift: a lab, technology, glossary term or resource that exists is
 * findable, and one that does not exist cannot be.
 */

import { GLOSSARY, termId } from './glossary';
import { LIVE_LABS } from './labs';
import { ALL_RESOURCES } from './resources';
import { TECHNOLOGIES } from './technologies';

export type SearchKind = 'lab' | 'technology' | 'term' | 'resource' | 'page';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  description: string;
  href: string;
  /** Lower-cased haystack, precomputed so filtering stays cheap while typing. */
  haystack: string;
  /** Set for links that leave the site. */
  external?: boolean;
}

const PAGES: { title: string; description: string; href: string }[] = [
  {
    title: 'Labs',
    description: 'Every interactive lab, one idea each.',
    href: '/labs',
  },
  {
    title: 'Technologies',
    description: 'WebGL, WebGPU, Three.js and vgpu compared on one scene.',
    href: '/tech',
  },
  {
    title: 'Learn',
    description: 'A curated reading path through graphics and game development.',
    href: '/learn',
  },
  {
    title: 'Glossary',
    description: 'The vocabulary, defined in plain language.',
    href: '/glossary',
  },
  { title: 'About', description: 'Why this site exists and how it is built.', href: '/about' },
];

function entry(
  kind: SearchKind,
  title: string,
  description: string,
  href: string,
  extra = '',
  external = false,
): SearchEntry {
  return {
    kind,
    title,
    description,
    href,
    external,
    haystack: `${title} ${description} ${extra}`.toLowerCase(),
  };
}

export const SEARCH_INDEX: SearchEntry[] = [
  ...LIVE_LABS.map((lab) =>
    entry(
      'lab',
      lab.title,
      lab.blurb,
      `/labs/${lab.slug}`,
      `${lab.concepts.join(' ')} ${lab.takeaway} ${lab.technology}`,
    ),
  ),
  ...TECHNOLOGIES.map((tech) =>
    entry('technology', tech.name, tech.tagline, `/tech/${tech.slug}`, tech.kind),
  ),
  ...GLOSSARY.map((term) =>
    entry(
      'term',
      term.term,
      term.definition,
      `/glossary#${termId(term.term)}`,
      (term.see ?? []).join(' '),
    ),
  ),
  ...ALL_RESOURCES.map((resource) =>
    entry(
      'resource',
      resource.title,
      resource.why,
      resource.url,
      `${resource.author} ${resource.kind}`,
      true,
    ),
  ),
  ...PAGES.map((page) => entry('page', page.title, page.description, page.href)),
];

export const KIND_LABEL: Record<SearchKind, string> = {
  lab: 'Lab',
  technology: 'Technology',
  term: 'Glossary',
  resource: 'Resource',
  page: 'Page',
};

/** Order results by where the match landed: title beats description beats tags. */
export function search(query: string, limit = 12): SearchEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const item of SEARCH_INDEX) {
    const title = item.title.toLowerCase();
    let score = 0;
    if (title === needle) score = 100;
    else if (title.startsWith(needle)) score = 60;
    else if (title.includes(needle)) score = 40;
    else if (item.haystack.includes(needle)) score = 10;
    else continue;

    // Nudge the site's own content above the outbound reading list.
    if (item.kind === 'lab' || item.kind === 'technology') score += 6;
    if (item.external) score -= 4;

    scored.push({ entry: item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map((item) => item.entry);
}
