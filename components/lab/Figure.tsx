'use client';

import type { ReactNode } from 'react';

import { ManualLink, useCopyLink } from '@/components/lab/CopyLink';
import { useFigureQuery } from '@/components/lab/useFigureState';

/**
 * One canvas, one idea, one control at most.
 *
 * The full lab instrument at the foot of each essay has sixteen controls and
 * answers every question at once, which is exactly why it cannot teach a single
 * one. A figure isolates the variable the paragraph above it just named, so
 * that moving the only thing there is to move demonstrates the only claim being
 * made. Ciechanowski's articles are built this way and it is the whole reason
 * they work.
 *
 * ---------------------------------------------------------------------------
 * THE FIGURE API — what an essay must do
 * ---------------------------------------------------------------------------
 *
 * Until issue #7 not one of the 46 figures on this site had an id. (46 read on
 * the page; 42 `<Figure>` elements in the essay sources, because `PipelineEssay`
 * renders one of them five times — see point 3.) The
 * instrument at the foot of each page was the only addressable thing on a lab
 * page — the one thing on it that cannot isolate a claim — so somebody answering
 * "why is my normal wrong?" could link to sixteen sliders and a paragraph of
 * preamble, or to nothing. The figure is the atomic unit of teaching here; it
 * now has an address, and `id` is required so that none can ship without one.
 *
 * 1. GIVE EVERY FIGURE AN ID.
 *
 *      <Figure id="order-matters" caption={…}>…</Figure>
 *
 *    - kebab-case, lowercase, no dots: `translate`, `order-matters`,
 *      `memory-layout`. `useFigureState` rejects anything else outright.
 *    - Scoped to the essay, not the site. `divide` may exist in two labs; it
 *      may not exist twice in one.
 *    - Name the idea, never the position. `second-figure` is a promise you
 *      break the day you insert a figure above it, and every link that was
 *      made to it then points at the wrong picture without breaking.
 *    - Ids are permanent. A published link to `#order-matters` is the whole
 *      point of having them, so renaming one is breaking somebody's link.
 *    - The id must match the heading it lives under closely enough that a
 *      reader who lands on it knows why. It is what the URL will say.
 *
 *    The id lands on the `<figure>` element, with `scroll-mt-24` so the target
 *    does not come to rest behind the sticky header, and the figcaption grows
 *    the same `#` permalink glyph that `ProseHeading` carries.
 *
 * 2. IF THE FIGURE HAS A CONTROL, PUT ITS STATE IN THE URL.
 *
 *    Use `useFigureState`, not `useState`. It is `useLabState` with a
 *    namespace, and it takes the figure's own id as that namespace:
 *
 *      const [s, setS] = useFigureState('translate', { tx: 0 });
 *      …
 *      <Figure id="translate"
 *        control={<Slider label="move along x" value={s.tx}
 *                         onChange={(tx) => setS((p) => ({ ...p, tx }))} />}
 *        caption={…}>…</Figure>
 *
 *    The id passed to the hook and the id passed to `<Figure>` MUST be the same
 *    string, or the address bar will describe a figure the link does not scroll
 *    to. That pairing is the entire contract; nothing enforces it but you.
 *
 *    Moving that slider writes `?translate.tx=1.5`. Only what differs from the
 *    defaults is written, so an untouched figure adds nothing to the URL, and a
 *    link says exactly what was changed and nothing else. Several figures and
 *    the instrument share one address bar without colliding.
 *
 *    A third return value gives this figure's own query fragment — `''` until
 *    the reader has moved something. `<Figure>` reads that same fragment back
 *    through `useFigureQuery`, and it is what makes a "copy link" appear in
 *    this figure's caption and nowhere else. Nothing to do at the call site.
 *    The address bar itself always carries the union of everything on the page,
 *    and that union is what any copy button on the page hands the reader.
 *
 * 3. A FIGURE THAT WRAPS `Figure` MUST FORWARD THE ID.
 *
 *    `PipelineEssay` defines a local `StageFigure` and uses it five times; a
 *    wrapper like that has to take an `id` and pass it straight through, or the
 *    five figures it renders share one address, which is worse than none.
 *
 * 4. WHAT NOT TO PUT IN A CAPTION.
 *
 *    The caption is prose, but it is not essay prose: `lib/essay-outline.ts`
 *    counts only what is inside the `<Prose>` block for the reading time, and
 *    captions sit outside it. Captions carry 182–423 words per lab as it is.
 *    An argument that belongs to the essay belongs in a paragraph, where it is
 *    counted, indexed and linkable on its own heading.
 */
export function Figure({
  id,
  children,
  control,
  caption,
  readout,
}: {
  /**
   * The figure's address. Required — see the API notes above. Unique within the
   * essay, kebab-case, and named after the idea rather than the position.
   */
  id: string;
  /** The canvas. */
  children: ReactNode;
  /** At most one control. If it needs two, it is two figures. */
  control?: ReactNode;
  /** What the reader should have just seen. Written after the fact, not before. */
  caption: ReactNode;
  /** Numbers beside the picture — a matrix, a measurement. */
  readout?: ReactNode;
}) {
  // Empty until this figure's own controls have been moved, and permanently
  // empty for a figure that has none.
  const share = useFigureQuery(id);
  // The one caller that asks for a fragment. A link to a figure that did not
  // land on the figure would be a link to the top of a long essay.
  const { copy, copied, manual } = useCopyLink(`#${id}`);

  return (
    <figure id={id} className="group !mt-8 !mb-8 w-full scroll-mt-24">
      <div className="panel overflow-hidden">
        <div className={readout ? 'grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto]' : 'p-4'}>
          <div className="min-w-0">{children}</div>
          {readout ? <div className="min-w-0 sm:pt-1">{readout}</div> : null}
        </div>
        {control ? (
          <div className="border-t border-line bg-ink-800/50 px-4 py-3">{control}</div>
        ) : null}
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-fg-faint">
        {caption}
        {/* The glyph appears on hover of the whole figure rather than of itself,
            because a mark nobody can see until the pointer is already on it is a
            mark nobody finds. Focus as well as hover, for the same reason
            ProseHeading gives: the hover hint is the only sign the link exists,
            and a keyboard never saw it.

            Labelled with the id rather than "this figure", because five figures
            on a page called "Link to this figure" are five links a screen reader
            reads out identically. */}
        <a
          href={`#${id}`}
          aria-label={`Link to this figure: ${id}`}
          className="ml-1.5 inline-block font-mono no-underline opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
        >
          #
        </a>
        {/* Not hidden until hover, unlike the `#` beside it. The glyph is
            always there and would be permanent noise; this appears only once
            the reader has moved this figure's control, which is the moment it
            is worth seeing — and hiding it behind hover would put it out of
            reach of a touch screen, where there is no hover to give.

            The accessible name names the figure and deliberately does not read
            "Copy link to this state". Six figures and an instrument all
            answering to one name is the defect the `#` comment above describes,
            and test/render.smoke.ts counts `getByRole('button', { name: /Copy
            link/ })` across the whole page to prove the instrument offers
            exactly one. */}
        {share ? (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy a link to figure ${id} in this state`}
            className="ml-2 font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:text-fg"
          >
            {copied ? 'copied ✓' : 'copy link'}
          </button>
        ) : null}
        {manual ? (
          <span className="mt-2 block">
            <ManualLink
              value={manual}
              label={`Link to figure ${id} in this state — select and copy`}
            />
            <span className="mt-1 block text-2xs leading-relaxed text-fg-faint">
              This browser will not let a page write to the clipboard, so here is
              the link to copy by hand.
            </span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
