import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * A lab's contents, read out of the essay that is already on the page.
 *
 * The sections are not registered anywhere. They are parsed at build time from
 * the `<ProseHeading id="…">` tags in `components/labs/<Name>Essay.tsx`, for
 * the same reason `lib/technologies.ts` sums its line counts from the listings
 * it prints rather than carrying eight constants: a restated outline is a
 * second copy of the truth, and the second copy is the one that goes stale.
 * Rename a heading and the contents line renames itself; add a section and it
 * appears without anyone remembering to add it.
 *
 * This module uses `node:fs`, so it may only be called from a Server Component.
 * `LabPage` takes the result as a prop rather than reading it itself, so that
 * nothing here can end up inside a `'use client'` boundary by accident.
 */

export interface EssaySection {
  /** The heading's own id — the anchor a link lands on. */
  id: string;
  /** The heading's text, with entities resolved. */
  title: string;
}

export interface EssayOutline {
  sections: EssaySection[];
  /** Words of essay prose. See `countWords` for what does and does not count. */
  words: number;
  /** Whole minutes, never zero. See READING_SPEED. */
  minutes: number;
}

/**
 * 200 words a minute.
 *
 * The usual figure quoted for adult reading is 200–250 wpm for ordinary prose.
 * These essays sit at the slow end of that and below it: the sentences carry
 * inline code (`gl.uniformMatrix4fv(location, false, m)` is one word by any
 * counter and several seconds by any reader), matrices are printed mid-argument,
 * and the reader is expected to stop at each figure and move something. 200 is
 * the honest end of the defensible range, and a stated time that turns out to
 * be short is worse than one that turns out to be generous.
 *
 * The figures themselves are deliberately NOT modelled — a number for "how long
 * you will play with a slider" would be invented. This is the reading time for
 * the words, and the words are what is counted.
 */
const READING_SPEED = 200;

/** `transform` → `TransformEssay.tsx`. True for all ten; verified by ESSAY_FILE. */
function essayFile(slug: string): string {
  return `${slug[0].toUpperCase()}${slug.slice(1)}Essay.tsx`;
}

/**
 * The entities the essays actually write. In JSX prose the house rule is that
 * an apostrophe is `&rsquo;` — there is not one raw ’ in any essay file — so
 * without this step `object&rsquo;s` splits into two words and every essay
 * gains thirty words it does not have.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  deg: '°',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  mdash: '—',
  minus: '−',
  nbsp: ' ',
  ndash: '–',
  rdquo: '”',
  rsquo: '’',
  times: '×',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#?\w+);/g, (match, name: string) => {
    if (name.startsWith('#')) {
      const code = Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    }
    return ENTITIES[name] ?? '';
  });
}

/**
 * Drop every `{…}` expression container, replacing each with a space.
 *
 * This is what separates essay prose from everything else in the file, and it
 * does the job in one pass: it removes JSX comments, the `{' '}` line-end
 * separators (which must become a real space or the words either side fuse),
 * every `className={…}`, and every bit of JavaScript. What survives is literal
 * JSX text — which in an essay body is exactly the sentences.
 */
function stripExpressions(source: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') {
      if (depth === 0) out += ' ';
      depth += 1;
    } else if (char === '}') {
      if (depth > 0) depth -= 1;
    } else if (depth === 0) {
      out += char;
    }
  }
  return out;
}

/**
 * Drop every tag, replacing each with a space.
 *
 * Quotes are tracked because an attribute may legally contain `>`; without that
 * a single `title=">"` would swallow the rest of the essay silently, which is
 * the failure mode this codebase treats as worse than a crash.
 */
function stripTags(source: string): string {
  let out = '';
  let inTag = false;
  let quote = '';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inTag) {
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        inTag = false;
      }
    } else if (char === '<') {
      inTag = true;
      out += ' ';
    } else {
      out += char;
    }
  }
  return out;
}

/** JSX text, with the markup and the code taken out. */
function plainText(jsx: string): string {
  return decodeEntities(stripTags(stripExpressions(jsx)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A token counts as a word only if it contains a letter or a digit.
 *
 * Without that, the em dashes the house voice is full of and the stray
 * punctuation left where a tag used to be each count as a word. `m[0]–m[3]`
 * counts as one, which is what a reader does with it.
 */
function countWords(text: string): number {
  return text.split(' ').filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * The `<Prose>…</Prose>` block, which is the essay and nothing else.
 *
 * This is the whole answer to what counts as essay prose. Everything above it
 * in the file is the figures — their captions, their control labels, their
 * readouts, their tinted memory blocks — and a caption is a text node exactly
 * like a paragraph is. Counting the file would have added several hundred words
 * to every lab and quietly moved each reading time up by two or three minutes.
 * Each of the ten files contains exactly one `<Prose>`, inside the exported
 * component, so the slice needs no parsing beyond finding it; both the "exactly
 * one" and the "inside the export" are asserted, because a second one appearing
 * later would silently halve or double a count.
 */
function essayBody(source: string, slug: string, file: string): string {
  const name = `${slug[0].toUpperCase()}${slug.slice(1)}Essay`;
  const exported = source.indexOf(`export function ${name}(`);
  if (exported === -1) {
    throw new Error(`essayOutline("${slug}"): ${file} has no "export function ${name}"`);
  }

  const open = source.indexOf('<Prose>');
  const close = source.indexOf('</Prose>');
  if (open === -1 || close === -1 || close < open) {
    throw new Error(`essayOutline("${slug}"): ${file} has no <Prose>…</Prose> block`);
  }
  if (open < exported) {
    throw new Error(
      `essayOutline("${slug}"): a <Prose> block in ${file} sits outside ${name} — ` +
        `the word count would include text that is not the essay`,
    );
  }
  if (source.indexOf('<Prose>', open + 1) !== -1) {
    throw new Error(`essayOutline("${slug}"): ${file} has more than one <Prose> block`);
  }

  return source.slice(open + '<Prose>'.length, close);
}

const CACHE = new Map<string, EssayOutline>();

/**
 * The contents and reading time for one lab, from its essay source.
 *
 * Throws rather than degrading. An outline that comes back empty because the
 * parse broke would render as a lab that simply has no contents line, and
 * nobody would ever find out — every essay on this site has five or six
 * headings and several hundred words, so zero of either means the parser is
 * wrong, not the essay.
 */
export function essayOutline(slug: string): EssayOutline {
  const cached = CACHE.get(slug);
  if (cached) return cached;

  const file = essayFile(slug);
  const full = path.join(process.cwd(), 'components', 'labs', file);
  let source: string;
  try {
    source = readFileSync(full, 'utf8');
  } catch {
    throw new Error(`essayOutline("${slug}"): cannot read ${full}`);
  }

  const body = essayBody(source, slug, file);

  const sections: EssaySection[] = [];
  const heading = /<ProseHeading\s+id="([^"]+)"\s*>([\s\S]*?)<\/ProseHeading>/g;
  let match: RegExpExecArray | null;
  while ((match = heading.exec(body)) !== null) {
    const id = match[1];
    // The ten essays all close on a heading called `instrument`, and all ten of
    // those headings are an instruction rather than a name — "Now move all of
    // it at once", which reads correctly directly above the canvas and reads as
    // nothing in a list of sections. The id is the name, so the id is used.
    // Keyed on the id and not on the lab, so renaming the heading turns this
    // off rather than leaving ten labs mislabelled.
    const title = id === 'instrument' ? 'the instrument' : plainText(match[2]);
    if (!title) {
      throw new Error(`essayOutline("${slug}"): heading "${id}" has no text`);
    }
    sections.push({ id, title });
  }

  if (sections.length === 0) {
    throw new Error(`essayOutline("${slug}"): no <ProseHeading id="…"> in ${file}`);
  }

  const words = countWords(plainText(body));
  if (words === 0) {
    throw new Error(`essayOutline("${slug}"): counted no prose in ${file}`);
  }

  const outline: EssayOutline = {
    sections,
    words,
    minutes: Math.max(1, Math.round(words / READING_SPEED)),
  };
  CACHE.set(slug, outline);
  return outline;
}
