'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { ManualLink, useCopyLink } from '@/components/lab/CopyLink';
import { useFigureQuery } from '@/components/lab/useFigureState';
import { encodeState, stateHref, type LabState, type StateValue } from '@/lib/url-state';

/**
 * What a figure hands to the instrument at the foot of the page: the lab's own
 * control record, and the same record as this figure has it set.
 *
 * Both halves travel as one prop because neither is any use alone. The current
 * values say what to restore; the defaults say which of them are worth writing
 * down, since a link that repeated the whole record would say nothing about
 * what this figure was demonstrating. There is no call site that would want one
 * without the other, so there is no way to give one without the other.
 */
export type FigureState = {
  /** The lab's `DEFAULTS`, exported from `components/labs/<Name>Lab.tsx`. */
  defaults: object;
  /** The same record with this figure's controls applied. */
  current: object;
};

/**
 * The part of a lab's params that may be written into an address.
 *
 * `palette` is the reason this exists. It comes from the theme provider, and
 * every essay builds a figure's scene by spreading it in beside the controls —
 * so the record nearest to hand at the call site is the one that already has it.
 * `encodeState` walks the defaults, so a palette present only in `current` is
 * dropped for free; a palette that ever reached a lab's `DEFAULTS` would be
 * `String(value)`, and every reader would carry `?palette=[object+Object]` in
 * their address bar and in every link they shared. Seven essays pass these
 * records by hand across thirty-three figures, so this is filtered here rather
 * than trusted to each of them.
 *
 * The key is named as well as type-filtered. Today a palette is an object and
 * the type filter alone would catch it; the day one becomes a theme name it
 * would be a string, and a string is exactly what the codec is happy to write.
 *
 * Everything else that is not a string, number or boolean goes the same way:
 * those three are what `encodeState` and `decodeState` can round-trip, so
 * anything else in the record is a leak rather than a control.
 *
 * The parameter is `object`, not `Record<string, unknown>`, which would read
 * better. The params type of all seven labs whose essays have state to pass,
 * and five of the ten `DEFAULTS` types, are declared as interfaces — and an
 * interface has no implicit index signature, so the tighter type would refuse
 * exactly the records the essays have to hand.
 */
export function shareableControls(record: object): LabState {
  const out: LabState = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (key === 'palette') continue;
    const kind = typeof value;
    if (kind !== 'string' && kind !== 'number' && kind !== 'boolean') continue;
    out[key] = value as StateValue;
  }
  return out;
}

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
 *
 * 5. IF THE FIGURE DRIVES THE LAB'S OWN SCENE, HAND OVER ITS STATE.
 *
 *      <Figure id="translate" state={{ defaults: DEFAULTS, current: params }} …>
 *
 *    A figure isolates one control; the instrument at the foot has every one.
 *    A reader who has just watched one slider make a point and now wants to know
 *    what the rest do to that exact configuration had, until this prop, to
 *    scroll past the remaining essay and rebuild the state from memory. With it,
 *    the caption carries a link that opens the instrument already set that way.
 *
 *    `defaults` is the lab module's exported `DEFAULTS`; `current` is the params
 *    that figure is rendering. Pass the params object as it is — `palette` and
 *    anything else the codec cannot carry is stripped here, not at the call
 *    site; see `shareableControls`.
 *
 *    Optional, and that is what keeps it honest. The three WebGPU essays
 *    illustrate with inline SVG and have no lab state to hand over, so they pass
 *    nothing and render no link, rather than offering a button that lands on the
 *    defaults the reader could have reached by scrolling.
 */
export function Figure({
  id,
  children,
  control,
  caption,
  readout,
  state,
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
  /**
   * This figure's configuration in the lab's own terms — see point 5 above.
   * Given, the caption grows a link that opens the instrument set that way;
   * omitted, it does not.
   */
  state?: FigureState;
}) {
  // Empty until this figure's own controls have been moved, and permanently
  // empty for a figure that has none.
  const share = useFigureQuery(id);
  // The one caller that asks for a fragment. A link to a figure that did not
  // land on the figure would be a link to the top of a long essay.
  const { copy, copied, manual } = useCopyLink(`#${id}`);
  const pathname = usePathname();
  // Computed at render from the props alone. No window, no router, no new
  // route: these pages are prerendered, and the link has to be in the HTML
  // that ships rather than appear once a client has hydrated.
  //
  // It is rendered as a plain `<a>`, and not only for that reason. The link
  // usually points at the page it is already on, so `next/link` would treat it
  // as a same-route navigation and re-render without remounting — and
  // `useLabState` reads the address bar once, in a mount effect guarded by a
  // ref. The URL would change and the instrument's sliders would not move.
  //
  // Deliberately not the address bar's own query. That carries every other
  // figure on the page under its own namespace, and none of those keys mean
  // anything to the instrument — this link says "this figure, in the
  // instrument", and only the keys this figure differs from the lab's defaults
  // by can say it.
  const instrument = state
    ? `${stateHref(
        pathname,
        encodeState(shareableControls(state.defaults), shareableControls(state.current)),
      )}#instrument`
    : '';

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
        {/* Its own line, always, rather than trailing the caption sentence.
            The `#` and "copy link" beside it are glyph-scale marks about this
            figure; this is a sentence pointing away from it, and three of them
            on one row is a toolbar under a caption. Blocking it is also what
            satisfies the 375px rule everywhere at once — it wraps inside the
            figcaption, so it can never widen the figure.

            Labelled with the id for the reason the two above it are: five
            figures on a page all answering to "Open this in the full
            instrument" are five links a screen reader cannot tell apart. The
            arrow is hidden from that name; it is punctuation, not a word. */}
        {instrument ? (
          <a
            href={instrument}
            aria-label={`Open figure ${id} in the full instrument`}
            className="link-accent mt-2 block text-xs"
          >
            Open this in the full instrument <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </figcaption>
    </figure>
  );
}
