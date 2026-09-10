'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';

import { demoHref, getTerm, termId, type Term as GlossaryEntry } from '@/lib/glossary';
import { getLab } from '@/lib/labs';

/**
 * A word that defines itself where it stands.
 *
 * The essays say NDC, inverse-transpose and workgroup in the sentence that
 * needs them, and all 61 definitions lived on another page, at /glossary. A
 * reader who does not know the word could guess, or leave the middle of the
 * argument to go and look it up; the second is how people stop reading. This
 * puts the glossary entry under the paragraph instead, without moving the
 * reader off it.
 *
 * WRAP THE FIRST USE, NOT EVERY USE. A paragraph in which six words are buttons
 * reads worse than one in which none are.
 *
 *     Everything lands in <Term name="NDC">NDC</Term>, a cube two units wide.
 *
 * THE TRIGGER IS NOT A LINK, AND MUST NOT LOOK LIKE ONE. It carries a dotted
 * underline in whatever colour the surrounding text already is, and sets no
 * colour of its own. Prose.tsx paints links accent-blue through `[&_p_a]` and
 * `[&_li_a]` rather than `[&_a]`, deliberately narrowed — issue #43 records
 * what the unscoped rule did, which was to paint every essay heading blue. An
 * accent-tinted term would put that promise back in the middle of the
 * sentence, and it is a promise this control cannot keep: it navigates
 * nowhere, it opens two lines of text below the paragraph.
 *
 * Nothing is stored. `open` is component state and dies with the tab, so
 * /privacy's "there is nothing to collect" stays literally true.
 */
export function Term({
  name,
  variant = 'inline',
  children,
}: {
  name: string;
  /** `chip` is the bordered pill the lab footer's vocabulary list uses. */
  variant?: 'inline' | 'chip';
  children: ReactNode;
}) {
  const entry = getTerm(name);

  /*
   * A name that resolves to nothing takes the build down, here, at the file
   * that contains it.
   *
   * The alternative is what this component would do by default: render a
   * trigger whose panel is empty, which looks like a styling bug rather than a
   * missing entry and can sit in an essay unnoticed for as long as nobody
   * clicks it. Every route on this site is statically generated, so this line
   * runs at build time — a typo cannot reach a reader, and it cannot reach a
   * green test run either, because test/content.test.ts renders the essay
   * components through renderToStaticMarkup.
   *
   * A development-only assertion was the other candidate and is strictly worse:
   * the check that matters most is the one guarding the production build, and
   * that is exactly the build a `NODE_ENV` guard switches off.
   */
  if (!entry) {
    throw new Error(
      `<Term name="${name}"> names a term that is not in GLOSSARY. ` +
        'Add it to lib/glossary.ts, or fix the spelling — the lookup ignores ' +
        'case and nothing else.',
    );
  }

  return (
    <Disclosure entry={entry} variant={variant}>
      {children}
    </Disclosure>
  );
}

/**
 * The state half, split out so the lookup above can throw before any hook runs.
 *
 * Resolving and throwing inside this component would put an early return in
 * front of `useState`, which is a conditional hook call — the rule exists for a
 * real reason and the lint rule that enforces it would be right.
 */
function Disclosure({
  entry,
  variant,
  children,
}: {
  entry: GlossaryEntry;
  variant: 'inline' | 'chip';
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);

  /*
   * Escape listens on the document, not on the trigger, because by the time a
   * reader wants the panel gone their focus is usually somewhere else — they
   * clicked the word, read the definition, and moved on scrolling. A handler
   * bound to this element would only fire while focus was still inside it, so
   * Escape would appear to work in a keyboard test and do nothing in practice.
   */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      /*
       * Focus stays where the reader put it — except in the one case where
       * closing would destroy it. Escape pressed while focus is on a "see also"
       * link inside the panel unmounts the focused element, and the browser
       * drops focus to <body>: a keyboard reader loses their place in the essay
       * and tabs back in from the top of the page.
       */
      if (panel.current?.contains(document.activeElement)) button.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const trigger =
    variant === 'chip'
      ? `inline-block rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:border-line-strong hover:text-fg ${
          open ? 'border-line-strong text-fg' : 'border-line text-fg-muted'
        }`
      : // No text colour: it inherits the sentence's, which is the whole point.
        // `decoration-dotted` rather than a bottom border, so a term that wraps
        // across a line break is underlined on both fragments the way the text
        // around it would be.
        'underline decoration-dotted decoration-1 underline-offset-4 transition-colors hover:text-fg';

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={trigger}
        // The inline trigger is not a control that sits beside the prose — it
        // IS a word of the prose, and print hides every button so a widget
        // nobody enumerated cannot leave a stranded box. Without this hook the
        // blanket rule deletes the word from the middle of the sentence:
        // "It builds a UV from the vertex position" printed as "It builds a
        // from the vertex position", 114 times across the ten labs. The print
        // block in globals.css keys off this to print the word as plain text.
        data-term={variant}
      >
        {children}
      </button>
      {open ? <Panel id={panelId} ref={panel} entry={entry} variant={variant} /> : null}
    </>
  );
}

/**
 * The definition, the lab that performs it, and where to read next.
 *
 * Every element here is phrasing content carrying `block` or `flex`, never a
 * `<div>` or a `<p>`. The inline trigger sits inside an essay paragraph, and a
 * block-level element inside a `<p>` closes the paragraph in the HTML parser —
 * the server's markup and the browser's DOM then disagree, which is a hydration
 * error rather than a layout quirk. A `<span>` set to `display: block` lays out
 * identically and parses legally.
 *
 * Nothing has a fixed inline size in the inline variant, so the panel is as
 * wide as the `max-w-prose` column and no wider; test/render.smoke.ts fails the
 * build if anything on a lab route pushes 375px sideways.
 */
function Panel({
  id,
  ref,
  entry,
  variant,
}: {
  id: string;
  /* React 19 passes `ref` as an ordinary prop — no forwardRef wrapper. */
  ref: Ref<HTMLSpanElement>;
  entry: GlossaryEntry;
  variant: 'inline' | 'chip';
}) {
  const lab = entry.lab ? getLab(entry.lab) : undefined;
  // One link either way, and where there is a demo it is the demo's address —
  // the same choice the glossary page's entries make. Two links to the same lab
  // in a block three lines tall is a decision the reader should not have to
  // make, and the "what to look at" sentence below is what tells them the
  // controls have already been moved.
  const demo = demoHref(entry);

  return (
    <span
      id={id}
      ref={ref}
      className={`panel my-2 block space-y-2.5 p-3.5 ${variant === 'chip' ? 'max-w-[16rem]' : ''}`}
    >
      <span className="block text-sm leading-relaxed text-fg-muted">
        {entry.definition}
      </span>

      {lab ? (
        <span className="block">
          <Link
            href={demo ?? `/labs/${lab.slug}`}
            className="inline-block rounded border border-accent/35 bg-accent/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-accent no-underline transition-colors hover:bg-accent/20"
          >
            {demo ? 'See it happen' : 'See it'} · {lab.title}
          </Link>
        </span>
      ) : null}

      {entry.demo ? (
        <span className="block text-xs leading-relaxed text-fg-muted">
          <span className="mr-2 font-mono text-2xs uppercase tracking-wider text-fg-faint">
            What to look at
          </span>
          {entry.demo.look}
        </span>
      ) : null}

      {entry.see && entry.see.length > 0 ? (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
            See also
          </span>
          {entry.see.map((related) => (
            <Link
              key={related}
              href={`/glossary#${termId(related)}`}
              className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              {related}
            </Link>
          ))}
        </span>
      ) : null}
    </span>
  );
}
