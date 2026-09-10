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

/**
 * Where a reader who found something wrong actually goes.
 *
 * For the whole public life of this site there was no route back: not one
 * `mailto:` across the 23 routes, Discussions switched off, and the lab
 * footer's only feedback link pointing into a repository that was still
 * private, so it returned a 404 to everyone who clicked it. The repository's
 * zero issues and zero stars measured a locked door, not an audience.
 *
 * Two doors rather than one, because they are not the same act. Saying "I did
 * not follow lab 4" in an issue tracker means filing a permanent, indexed
 * defect report under your own name; Q&A is the cheaper thing to do.
 */
export const DISCUSSIONS_URL = `${REPO_URL}/discussions`;
export const ASK_URL = `${REPO_URL}/discussions/new?category=q-a`;
export const REPORT_URL = `${REPO_URL}/issues/new`;

/**
 * The author's X/Twitter handle, with the leading @ — '@example'.
 *
 * Empty on purpose, and the one thing here nobody but the owner can fill in.
 * There is no handle anywhere in this repository — `grep -rniE
 * "twitter|x\.com|@alibad" app components lib README.md` finds only the two
 * `twitter:` metadata blocks and nothing that names an account — and a guessed
 * handle credits a stranger on every card the site has ever produced. Typed as
 * `string` rather than as the empty literal so that filling it in is a one-word
 * edit and not a type error.
 */
export const AUTHOR_X_HANDLE: string = '';

/**
 * Spread into a `Metadata['twitter']` object.
 *
 * Empty while the handle is empty, so the key is absent and no tag is written
 * at all. `twitter:creator=""` would be worse than silence: it is a claim about
 * an account with no name, and a card validator reads it as one.
 */
export const TWITTER_CREATOR: { creator?: string } = AUTHOR_X_HANDLE
  ? { creator: AUTHOR_X_HANDLE }
  : {};
