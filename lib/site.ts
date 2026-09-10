/** One place for the things that must agree across metadata, OG images and the sitemap. */
export const SITE_URL = 'https://www.render-quest.com';

export const SITE_NAME = 'Render Quest';

/**
 * The one-liner. Change it here and it changes in the <h1>, the page titles, the
 * social cards and the Open Graph metadata — it used to be pasted in five places.
 */
export const SITE_TAGLINE = 'Learn graphics by moving the numbers.';

/** The tagline as it appears in a page title, after the site name. */
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE.replace(/\.$/, '').replace(/^./, (c) => c.toLowerCase())}`;

/** Sits under the tagline on the home page. */
export const SITE_SUBHEAD =
  'A transform is not a table of sixteen numbers — it is a motion, so here the numbers are under your fingers, and the matrix, the geometry and the pixels move together.';

export const SITE_DESCRIPTION =
  'Interactive labs for computer graphics. Drag a matrix and watch the geometry move; open a camera frustum and watch what falls out of it. Real WebGL, running live in the browser.';

export const AUTHOR = 'Ali Bader Eddin';

export const REPO_URL = 'https://github.com/alibad/render-quest';
