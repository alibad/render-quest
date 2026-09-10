import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AUTHOR, SITE_NAME, SITE_URL } from './site';

/**
 * What changed on the site, written for a reader.
 *
 * ── Why this list is typed out rather than derived ─────────────────────────
 *
 * Everything else on this site is derived from a registry, because a restated
 * copy is the one that goes stale. This module deliberately does the opposite,
 * and the reason is the one thing derivation cannot give you here: consent.
 *
 * The source material is `todo/YYYY-MM-DD.md` — a working note per day, written
 * to record what happened rather than to be read by strangers. Those notes name
 * commit shas, internal test counts, how the work was split up, settings changed
 * outside the repository, and a "Still open" section that is a list of things
 * currently broken. Every design that publishes them by default — the whole
 * file, the first section, everything above a marker — is opt-OUT: it publishes
 * the next note too, whatever ends up in it, and the mistake is only visible
 * after it is live.
 *
 * So publication is opt-in and manual, and the guarantee is absolute rather
 * than careful: **not one byte of `todo/` reaches this page or the feed.** The
 * entries below are written for publication. A future working note, however
 * candid, publishes nothing until someone sits down and writes an entry for it.
 *
 * ── What the files are still used for ─────────────────────────────────────
 *
 * Refusing to derive costs the usual thing — the two halves can drift — so the
 * seam is pinned instead. `verifyAgainstWorkingNotes()` asserts at build time
 * that every entry names a real day and real headings inside that day's note,
 * so a published entry cannot describe work that has no record behind it, and a
 * renamed note stops the build rather than quietly orphaning an entry. What it
 * deliberately does NOT assert is the reverse: notes may contain headings that
 * were never published, because that is exactly the opt-in this exists for.
 *
 * This module uses `node:fs`, so like `lib/essay-outline.ts` it may only be
 * reached from a Server Component or a Route Handler.
 */

export interface ChangelogEntry {
  /** ISO day, and the name of the working note it was written from. */
  date: string;
  /** Reader-facing. Not the working note's own heading. */
  title: string;
  summary: string;
  /** One line per change a reader would notice. */
  changes: string[];
  /**
   * The `# ` headings in `todo/<date>.md` this entry stands for. Checked to
   * exist; never read for their content.
   */
  notes: string[];
}

/** Newest first, which is the order both the page and the feed want. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-09-10',
    title: 'A licence, and an address for every figure',
    summary:
      'The repository went public, so the site got the two things a public project needs and did not have: terms you can rely on, and links that point at the exact thing being discussed.',
    changes: [
      'Every figure in every essay now has its own link, and the ones with a control write that control into the address bar under the figure’s own name. An answer can point at one picture in one state instead of at a two-thousand-word page.',
      'Each lab lists its own sections and how long the essay takes to read, both read out of the essay rather than typed beside it.',
      'The code is under the MIT licence and the prose under CC BY 4.0, so a lecturer can lift a paragraph into their own slides without asking anyone.',
      'A shared figure link used to lose the figure it named, and the instrument at the foot of a lab used to wipe every figure setting above it out of the address bar. Both are fixed, and the reader’s actual round trip is now tested on all ten labs.',
      'The README opens with captures of the real site instead of asking you to imagine it, and a contributing guide says plainly what this project will and will not take.',
    ],
    notes: [
      'The repo went public with no terms, and the README asked you to imagine WebGL',
      'Every figure got an address, and the address bar kept losing half of it',
    ],
  },
  {
    date: '2026-09-08',
    title: 'Somebody drove the controls instead of loading the page',
    summary:
      'The rendering test proved every lab drew something. It had never proved that a single control did anything. Driving all of them, and measuring the canvas before and after, found four labs telling the reader something untrue.',
    changes: [
      'The texture lab’s magnification filter did nothing in any state the lab offered by name — every preset tiled the plane further, so every texel was already smaller than a pixel. There is now a preset that goes up close, where flipping the control moves the picture.',
      'The technology chooser printed the points against a recommendation as though they were points for it, and once recommended a library directly above the same library marked impossible for that job.',
      'The instancing lab kept your camera out of the shareable state, so orbiting it offered no link and reopening the page threw the framing away.',
      'Eight keyboard and screen-reader defects, the largest being that the camera could only be moved with a pointer in all eight labs that have one.',
      'Lab 1 was the thinnest page on the site and it is the front door. It now has the section it was missing, on how a matrix is actually laid out in memory — and the two premises that section rests on are checked by the test suite, so the prose cannot go quietly wrong.',
      'The compute lab made you read most of a page before anything appeared. It now opens on a diagram of who calls each kind of shader.',
    ],
    notes: [
      'Two pacing fixes, both measured before and after',
      'The one sentence nothing checked',
      'Driving the interface instead of loading it',
    ],
  },
  {
    date: '2026-09-07',
    title: 'The labs became essays',
    summary:
      'A review found that the gap here was prose, not features: the arguments were real and correctly ordered, and they existed as slider labels with every sentence between them unwritten. All ten labs are now essays with the figures inside them.',
    changes: [
      'Every lab opens with an argument and five or six linkable headings, and carries figures that isolate one variable each. The full instrument stays where it was, at the foot of the page, because a panel that answers every question at once cannot teach any single one.',
      'The figures drive the lab’s own scene, so a figure cannot show something different from the instrument it introduces.',
      'The editing pass checked the numbers against the source and found claims it does not support — a quoted range taken from part of a slider, a highlight described as smaller than a triangle when it is not. Those were corrected in the labs, not only in the prose.',
      'A forty-four-character identifier in inline code was pushing a phone sideways by two pixels.',
    ],
    notes: [
      'The first lab becomes an essay',
      'The other nine labs become essays',
      'Closing the loose ends',
    ],
  },
  {
    date: '2026-09-06',
    title: 'A claim that did not survive being checked',
    summary:
      'The belief that nobody else teaches graphics by direct manipulation shaped a fortnight of work, and it is false. It is recorded here rather than quietly dropped, because a silently edited belief teaches nothing and invites the same reasoning again.',
    changes: [
      'LearnWebGL has been teaching transforms, cameras and projections through slider-driven demos since 2016 — including the camera-drawn-beside-its-own-view diagram this site thought it was first at. The honest claim is much narrower: the position is occupied by something dated and hard to find.',
      'No eleventh lab. Another chapter would move coverage by three percentage points and change nothing about whether anyone arrives. The missing thing was words.',
      'The README was still describing the site as it stood on day one, advertising two labs when there were ten.',
    ],
    notes: ['Positioning review — and the README that was advertising two labs'],
  },
  {
    date: '2026-08-30',
    title: 'Three more labs, and a colour bug in every shader on the site',
    summary:
      'Colour, depth and a shader you write yourself — plus the discovery, while building the first of those, that every shader here had been doing its arithmetic in the wrong colour space.',
    changes: [
      'Colour & gamma, depth & transparency, and write a shader: labs 8, 9 and 10.',
      'Every shader on the site multiplied sRGB-encoded numbers and wrote them straight to the screen. It is the most common bug in real renderers precisely because it does not look like one — it darkens midtones and hardens the terminator, which reads as a lighting choice. Fixed in the shared lit shader and in both of the shading lab’s stages.',
      'Every lab’s controls now serialise into the address bar and restore from it, with a copy button that appears once something has been moved. Only what differs from the defaults is written, so a link says what was changed and nothing else.',
      'A lit, depth-tested, spinning cube now sits alongside the plasma on all four technology pages. A fullscreen effect has no geometry, no camera and no depth buffer, so it compares almost nothing.',
      'Every page on the site had been sharing as the home page — the same title, description and URL on every link anyone posted.',
      'A test that loads every lab in a real browser and reads the canvas to see whether it drew anything. Its first version passed while every lab was blank, which is the best argument for it existing.',
    ],
    notes: [
      '2026-08-30 — The rest of the roadmap',
      '2026-08-30 (later) — Covering it everywhere',
      '2026-08-30 (last) — Closing the parity gaps',
    ],
  },
  {
    date: '2026-08-29',
    title: 'A sequence, not a gallery',
    summary:
      'Six labs were six unconnected pages. They are now numbered, each assuming the one before it, and each one ends somewhere.',
    changes: [
      'Labs are numbered with stated prerequisites, and every lab closes with its vocabulary, the previous lab, the next one, and a way to report confusion.',
      'Every lab shows the code that draws it. It was possible to finish a lab having never seen a line of source, on a site whose whole claim is that the plumbing is the subject.',
      'Presets: three or four saved states per lab, each with a sentence on what to look at once it lands. Some labs opened with sixteen controls and no indication which one was worth moving.',
      'Textures & sampling, and draw calls & instancing — where one instanced call and ten thousand separate ones produce the identical picture from the identical buffer, and the measured CPU cost differs by more than ten times.',
      'A layout that works on a phone. The slider used to sit two screens below the render it changed, on a page that refused to scroll if you started the gesture on a canvas.',
      'The roadmap, published — including the proposals that were turned down and the reason for each.',
    ],
    notes: [
      '2026-08-29 — A roadmap, and most of its first phase',
      '2026-08-29 (later) — The contents page was lying twice',
      '2026-08-29 (later still) — No gaps left',
    ],
  },
  {
    date: '2026-08-28',
    title: 'Render Quest rebuilt around interactive labs',
    summary:
      'The site stopped being a landing page with a tutorial bolted on. Drag the numbers, and the matrix, the geometry and the rendered pixels move together.',
    changes: [
      'The first labs: the model matrix, the frustum, the coordinate spaces a vertex passes through, and a lit sphere with the normal-matrix bug reproducible in two clicks.',
      'Every image on the site was replaced by something actually rendering. The hero is a camera frustum you can orbit, not a picture of one.',
      'A lab WebGL cannot run at all: a hundred and twenty thousand particles whose position and velocity live in a GPU buffer and are stepped by a compute shader, so the answer to "what is WebGPU for" is a page rather than an argument.',
      'The four technologies compared on one identical scene, a curated reading path, a glossary, and search across the lot.',
      'The site had been advertising six tutorials and shipping one, with five live 404s. Anything unbuilt now says so and is not a link.',
      'Light mode, with the canvases taking their colours from the page instead of sitting on it as dark rectangles.',
    ],
    notes: [
      '2026-08-28 — Render Quest rebuilt around interactive labs',
      '2026-08-28 (part two) — All four labs, light mode, and a reading path',
      '2026-08-28 (part three) — Technologies compared, and a header worth using',
      '2026-08-28 (part four) — Finishing the site',
      '2026-08-28 (part five) — Rebalanced around technologies, not around WebGL',
    ],
  },
];

const NOTES_DIR = path.join(process.cwd(), 'todo');

/** A working note for one day. `2026-09-10-search-index.md` counts as the 10th. */
const DATED_NOTE = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Build-time check that the published entries and the working notes still
 * describe the same days. Throws rather than warning: a changelog entry with no
 * record behind it is the failure this is here to prevent, and a warning in a
 * build log is a failure nobody reads.
 */
function verifyAgainstWorkingNotes(): void {
  // Structure first, so that a swapped or duplicated date is reported as what
  // it is rather than as a missing file further down.
  const dates = CHANGELOG.map((entry) => entry.date);
  if (new Set(dates).size !== dates.length) {
    throw new Error('lib/changelog.ts: two entries share a date, so their permalinks and feed ids collide.');
  }
  if (dates.join() !== [...dates].sort().reverse().join()) {
    throw new Error('lib/changelog.ts: entries are not newest-first, which is the order the page and the feed publish in.');
  }

  for (const entry of CHANGELOG) {
    const file = path.join(NOTES_DIR, `${entry.date}.md`);
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      throw new Error(
        `lib/changelog.ts: entry "${entry.title}" is dated ${entry.date}, but todo/${entry.date}.md does not exist.`,
      );
    }

    // Only `# ` headings, matched whole: the notes also use `## ` for sections
    // inside an entry, and a prefix match would accept one of those.
    const headings = new Set(
      [...source.matchAll(/^# (.+)$/gm)].map((match) => match[1].trim()),
    );
    for (const note of entry.notes) {
      if (!headings.has(note)) {
        throw new Error(
          `lib/changelog.ts: entry "${entry.title}" cites the working note "${note}", which is not a heading in todo/${entry.date}.md. ` +
            'Either the note was renamed, or the published entry now describes work that has no record behind it.',
        );
      }
    }
  }
}

verifyAgainstWorkingNotes();

/** Days of working notes on disk, published or not. See the header. */
export const WORKING_NOTE_DAYS = new Set(
  readdirSync(NOTES_DIR)
    .map((name) => DATED_NOTE.exec(name)?.[1])
    .filter((date): date is string => Boolean(date)),
).size;

/** The newest published entry. What the site answers "is this alive?" with. */
export const LAST_UPDATED = CHANGELOG[0].date;

/**
 * Spelled out rather than passed to `Intl.DateTimeFormat`, which resolves
 * against whatever ICU data the build machine happens to carry — a date that
 * renders "10 September 2026" locally and "September 10, 2026" on the builder
 * is a difference nobody notices until it is deployed.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/* ---------------------------------------------------------------- the feed ---
 * Atom rather than RSS 2.0, for three reasons that are all about the reader's
 * client rather than about taste.
 *
 * 1. Atom requires a per-entry `<id>` and `<updated>`. RSS's `<guid>` is
 *    optional, and a feed without one leaves the reader to identify entries by
 *    title or link — which is how an edited entry comes back as unread.
 * 2. Atom dates are RFC 3339, which is what these already are. RSS 2.0 wants
 *    RFC 822 — "Thu, 10 Sep 2026 00:00:00 GMT" — whose day and month names are
 *    English, so it has to be built from a hand-written table or from `Intl`,
 *    where the build machine's locale decides what a subscriber receives.
 * 3. Atom mandates `<link rel="self">`, so a feed that has been copied or
 *    proxied still says where it actually lives.
 *
 * The times are all midnight UTC because the working notes carry a day and not
 * a time. Stamping them with the build time instead would move every entry's
 * `<updated>` on every deploy, and a well-behaved reader would show the whole
 * history as new each time the site was touched.
 */

/** `&` first, or it re-escapes the ampersands the later replacements introduce. */
function xmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlAttr(value: string): string {
  return xmlText(value).replace(/"/g, '&quot;');
}

const FEED_PATH = '/feed.xml';
const PAGE_PATH = '/changelog';

/**
 * Where an entry lives on the site: its permalink, its Atom id and its Atom
 * link are all this one string, so a reader's client and the page agree on what
 * an entry is. The page's own anchors are the same `date`, from the same list.
 */
function entryUrl(date: string): string {
  return `${SITE_URL}${PAGE_PATH}#${date}`;
}

export const FEED_URL = `${SITE_URL}${FEED_PATH}`;

export const FEED_CONTENT_TYPE = 'application/atom+xml; charset=utf-8';

/**
 * The feed's own <title>, and the `title` on the <link rel="alternate"> in the
 * document head. One constant because a feed reader shows the link's title
 * until it has fetched the feed and the feed's title afterwards, and two
 * different names for one thing reads as two feeds.
 */
export const FEED_TITLE = SITE_NAME;

export function atomFeed(): string {
  const entries = CHANGELOG.map((entry) => {
    const url = entryUrl(entry.date);
    const stamp = `${entry.date}T00:00:00Z`;
    const html = [
      `<p>${xmlText(entry.summary)}</p>`,
      '<ul>',
      ...entry.changes.map((change) => `<li>${xmlText(change)}</li>`),
      '</ul>',
    ].join('');

    return [
      '  <entry>',
      `    <title>${xmlText(entry.title)}</title>`,
      `    <id>${xmlText(url)}</id>`,
      `    <link rel="alternate" type="text/html" href="${xmlAttr(url)}"/>`,
      `    <updated>${stamp}</updated>`,
      `    <published>${stamp}</published>`,
      `    <summary type="text">${xmlText(entry.summary)}</summary>`,
      `    <content type="html">${xmlText(html)}</content>`,
      '  </entry>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <title>${xmlText(FEED_TITLE)}</title>`,
    '  <subtitle>What changed on the site, and when.</subtitle>',
    `  <id>${xmlText(`${SITE_URL}${PAGE_PATH}`)}</id>`,
    `  <link rel="self" type="application/atom+xml" href="${xmlAttr(FEED_URL)}"/>`,
    `  <link rel="alternate" type="text/html" href="${xmlAttr(`${SITE_URL}${PAGE_PATH}`)}"/>`,
    `  <updated>${LAST_UPDATED}T00:00:00Z</updated>`,
    `  <author><name>${xmlText(AUTHOR)}</name></author>`,
    '  <rights>Prose under CC BY 4.0, code under the MIT licence.</rights>',
    ...entries,
    '</feed>',
    '',
  ].join('\n');
}
