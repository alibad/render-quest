import type { Metadata } from 'next';

import { SITE_NAME, SITE_URL } from './site';

/**
 * Per-page metadata, including the social card.
 *
 * Next merges metadata shallowly: a page that sets only `title` and
 * `description` inherits the ROOT layout's entire `openGraph` object. The root
 * set og:title, og:description and og:url, so every one of the 23 routes on
 * this site shared as the home page — a link to the shader lab posted the home
 * page's title, the home page's description and the home page's URL, with the
 * lab's own social card image attached underneath. Verified in production
 * before this existed.
 *
 * The fix is structural rather than a set of corrections: pages call this, so
 * the three fields cannot be forgotten one page at a time. test/content.test.ts
 * asserts every route uses it.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** As it appears in the tab, before the site name is appended. */
  title: string;
  description: string;
  /** Route path, leading slash, no trailing slash. '' for the home page. */
  path: string;
}): Metadata {
  // The root layout's title template appends the site name; social cards get no
  // template applied, so the resolved form is spelled out here.
  const social = path === '' ? title : `${title} — ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path === '' ? '/' : path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: `${SITE_URL}${path}`,
      title: social,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: social,
      description,
    },
  };
}
