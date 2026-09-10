'use client';

import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
// React 19 removed the global `JSX` namespace: it lives on the `react` package
// now, and a bare `JSX.Element` no longer resolves.
import type { JSX } from 'react';

import { Slider } from '@/components/lab/Controls';
import { useLabState } from '@/components/lab/useLabState';
import { LabGlyph } from '@/components/site/LabGlyph';
import { getLab, type Lab } from '@/lib/labs';
import {
  KIND_LABEL,
  LEVELS,
  LEVEL_LABEL,
  TRACKS,
  WEIGHT_EVENINGS,
  WEIGHT_LABEL,
  resourceId,
  trackEvenings,
  trackPath,
  type Level,
  type Resource,
  type ResourceKind,
  type Stage,
  type Track,
  type Weight,
} from '@/lib/resources';
import { buildRoute, type Route, type RouteSize } from '@/lib/route';

const PROGRESS_KEY = 'rq-progress';

type KindFilter = ResourceKind | 'all';

/**
 * The four cost buckets in ascending order, derived from the evenings the
 * registry assigns them rather than restated here. A fifth bucket added to
 * `WEIGHT_EVENINGS` gets a gauge cell without anyone editing this file.
 */
const WEIGHTS = (Object.keys(WEIGHT_EVENINGS) as Weight[]).sort(
  (a, b) => WEIGHT_EVENINGS[a] - WEIGHT_EVENINGS[b],
);

/* ------------------------------------------------------------------ marks ---
 *
 * Three properties, three channels, and none of them a hue.
 *
 * Until now `kind` and `level` were both coloured chips, which asked the reader
 * to learn nine arbitrary colour-to-word mappings before the page told them
 * anything — and three of the six kind colours were the reserved X, Y and Z
 * hues, which on this site mean those three axes and nothing else.
 * tailwind.config.ts says so in as many words: they "are a convention, not
 * decoration". (The class names are deliberately not spelled here: a source
 * grep asserting /learn no longer spends them would match this comment.)
 *
 * So:
 *
 *   kind   → SHAPE. Six unordered categories. Shape is the channel for nominal
 *            data; it is also the only one of the three that carries no
 *            magnitude, so spending position or length on it would be a lie.
 *   level  → POSITION (which band of the plate a station sits in) and, in the
 *            list, an ordinal three-bar mark. Depth is ordered, and vertical
 *            position is the strongest ordered channel there is.
 *   weight → LENGTH. The capsule in the plate is as long as the resource is
 *            expensive, so Physically Based Rendering is visibly four times Ray
 *            Tracing in One Weekend instead of the identical card it used to be.
 *
 * Colour is left to say one thing: state. Accent means done or focused, amber
 * means the budget gate. Nothing else on this page is coloured.
 *
 * The depth mark deliberately does NOT use `fill-accent`, which issue #22 asked
 * for. On this page accent already means "you have done this", and three accent
 * bars beside an unread resource reads as a tick. The mark uses `fg-muted` on
 * `line-strong`, which is still ordinal — the property #22 actually wanted from
 * it — without borrowing the one colour that is spoken for.
 */

/**
 * Keyed by kind in one record rather than a switch, for the reason
 * `components/site/LabGlyph.tsx:31` records: a switch silently returns nothing
 * for a key it was never taught, and three labs shipped with a hole where the
 * diagram goes. `KIND_MARK_KINDS` is countable, so a seventh kind added to the
 * registry without a mark fails a test instead of rendering an empty 16px box.
 */
const KIND_MARK: Record<ResourceKind, () => JSX.Element> = {
  // A curve with a grab handle on it: the thing you drag.
  interactive: () => (
    <>
      <path d="M2 12.6C5.4 12.6 5.4 3.4 8.9 3.4S12.6 8 14 8" />
      <circle cx="8.9" cy="3.4" r="1.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Three lessons, the last one filled: a syllabus you work down.
  course: () => (
    <>
      <rect x="2" y="3" width="6" height="2.4" rx="1.2" />
      <rect x="2" y="6.8" width="9" height="2.4" rx="1.2" />
      <rect x="2" y="10.6" width="12" height="2.4" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // A cover, its spine rule, and a filled ribbon.
  book: () => (
    <>
      <rect x="2.6" y="2.4" width="10.8" height="11.2" rx="1.2" />
      <path d="M5.4 2.4v11.2" />
      <path d="M8.6 2.4h3.2v5.2l-1.6-1.3-1.6 1.3z" fill="currentColor" stroke="none" />
    </>
  ),
  // A screen and a filled play triangle.
  video: () => (
    <>
      <rect x="1.6" y="3.2" width="12.8" height="9.6" rx="2" />
      <path d="M6.6 5.9 10.8 8l-4.2 2.1z" fill="currentColor" stroke="none" />
    </>
  ),
  // A page with two rules and a filled folded corner.
  reference: () => (
    <>
      <path d="M3.4 2h6.3l2.9 2.9V14H3.4z" />
      <path d="M9.7 2l2.9 2.9H9.7z" fill="currentColor" stroke="none" />
      <path d="M5.8 8.6h4.4M5.8 11.2h4.4" />
    </>
  ),
  // A dial with four ticks and a filled hub — the site's own control idiom.
  tool: () => (
    <>
      <circle cx="8" cy="8" r="4.8" />
      <path d="M8 1.4v1.6M14.6 8H13M8 14.6V13M1.4 8H3" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Every kind that has a mark. Asserted against the registry's kinds in tests. */
export const KIND_MARK_KINDS = Object.keys(KIND_MARK);

function KindMark({ kind, className = 'h-4 w-4' }: { kind: ResourceKind; className?: string }) {
  const Mark = KIND_MARK[kind];
  if (!Mark) return null;
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <Mark />
    </svg>
  );
}

/** Three bars filled from the bottom: one, two or three by level. Ordinal. */
function DepthMark({ level }: { level: Level }) {
  const filled = LEVELS.indexOf(level) + 1;
  return (
    <svg viewBox="0 0 8 8" className="h-3 w-3 shrink-0" aria-hidden>
      {LEVELS.map((_, index) => (
        <rect
          key={index}
          x="0"
          y={6 - index * 3}
          width="8"
          height="2"
          rx="0.6"
          className={index < filled ? 'fill-fg-muted' : 'fill-line-strong'}
        />
      ))}
    </svg>
  );
}

/** Four cells filled to the cost bucket. */
function CostGauge({ weight }: { weight: Weight }) {
  const filled = WEIGHTS.indexOf(weight) + 1;
  return (
    <svg
      viewBox={`0 0 ${WEIGHTS.length * 4 - 1} 10`}
      className="h-2.5 w-4 shrink-0"
      aria-hidden
    >
      {WEIGHTS.map((bucket, index) => (
        <rect
          key={bucket}
          x={index * 4}
          y="0"
          width="3"
          height="10"
          rx="0.7"
          className={index < filled ? 'fill-fg-muted' : 'fill-line-strong'}
        />
      ))}
    </svg>
  );
}

/**
 * How a stage is shaped: how many of it are an invitation, how many the body of
 * the work, how many a warning. "One start, no core, three deep" is a real
 * difference between two stages of four, and counting the rows was the only way
 * to see it.
 */
function LevelHistogram({ resources }: { resources: Resource[] }) {
  const counts = LEVELS.map((level) => resources.filter((r) => r.level === level).length);
  const most = Math.max(...counts, 1);
  return (
    <svg
      viewBox="0 0 16 10"
      className="h-2.5 w-4 shrink-0"
      role="img"
      aria-label={LEVELS.map(
        (level, index) => `${counts[index]} ${LEVEL_LABEL[level].toLowerCase()}`,
      ).join(', ')}
    >
      {counts.map((count, index) => {
        // A zero keeps a 0.8-unit stub rather than vanishing: a stage with no
        // "go deep" reading should look different from one the histogram
        // failed to draw.
        const height = Math.max(0.8, (count / most) * 10);
        return (
          <rect
            key={index}
            x={index * 6}
            y={10 - height}
            width="4"
            height={height}
            className="fill-line-strong"
          />
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------- route map ---*/

interface RouteMapProps {
  track: Track;
  size: RouteSize;
  done: Set<string>;
  /** URLs the current filters keep. Everything else dims in place. */
  filteredUrls: Set<string>;
  budget: number;
  loaded: boolean;
  hoverUrl: string | null;
  onHover: (url: string | null) => void;
}

/**
 * The page's figure: the reading path drawn as a section, order left to right,
 * depth top to bottom, each resource a station whose length is its cost.
 *
 * Every label inside the plate is an SVG `<text>`. An HTML grid hand-locked to
 * an SVG viewBox is a standing alignment contract that nothing enforces; a
 * label in the same coordinate system as the thing it labels cannot slide.
 *
 * The cost is that SVG text only stays legible while the box is wide, so the
 * hero plate is `hidden lg:block`: at 1024px the container is 984px and a
 * 932-unit viewBox renders at 1.06px per unit, so 8-unit type is 8.5px. Below
 * that the compact plate takes over — the same component, not a shrunk copy.
 * Do not relax the breakpoint on the grounds that it nearly fits at 800px.
 *
 * Both plates are always in the DOM with one `display:none`, so the phone and
 * the desktop share one route and one set of station anchors. `display:none`
 * contributes nothing to `scrollWidth` and zero-width elements are skipped by
 * the smoke test's overflow loop, so the hidden twin cannot trip the 375px
 * assertion. Each plate carries `data-plate`, which is how a test tells them
 * apart — scope selectors to the visible one, or you will count both.
 */
function RouteMap({
  track,
  size,
  done,
  filteredUrls,
  budget,
  loaded,
  hoverUrl,
  onHover,
}: RouteMapProps) {
  const titleId = useId();
  const hero = size === 'hero';
  const route: Route = useMemo(
    () => buildRoute(track, { size, done, budget }),
    [track, size, done, budget],
  );

  const capsule = route.capsuleHeight;
  const stroke = hero ? 2 : 1.4;
  /**
   * The tap target, which is not the capsule.
   *
   * A compact `afternoon` capsule is 4 by 6 units, and at the 0.94 units per
   * pixel a 335px phone column gives, that is 3.8 by 5.6 CSS pixels — a link no
   * thumb can hit. Every station therefore carries a transparent rect one pitch
   * wide and eight tenths of a band tall — measured in the browser at 15 by
   * 16.5px on a 375px phone and 46 by 42px at the 1024px breakpoint. One pitch exactly, so neighbouring targets tile without
   * overlapping and the wrong station can never be hit.
   */
  const bandGap = Math.min(
    ...route.bands.slice(1).map((band, index) => band.y - route.bands[index].y),
  );
  const hitHeight = bandGap * 0.8;
  /**
   * Type size, in viewBox units — the one number that decides whether the
   * labels are readable, because the plate is scaled by its container and not
   * by a font size. At the 1024px breakpoint the hero box measures 984px, so a
   * 932-unit viewBox renders at 1.055px per unit and 9.5 units is 10px. Below
   * that breakpoint the compact plate takes over and drops every label but the
   * stage number, which at 7 units is 6.6px on a 335px phone column.
   *
   * ⚠️ This used to end "and the reason the compact plate says nothing else",
   * which read as a reason to say nothing and was taken as one. Type that small
   * is a reason to keep labels OUT OF the drawing, not to leave the drawing
   * unlabelled: for a month the phone plate was three channels with no key to
   * any of them. The caption under the SVG says them in HTML instead, where
   * 11px is 11px whatever the container is doing.
   */
  const textSize = hero ? 9.5 : 7;
  // 158 baseline in a 168-unit box leaves 10 units for the labels under it, so
  // this is the largest offset that still fits a descender inside the viewBox.
  const labelY = route.baselineY + (hero ? 7 : 5.5);

  // Forced to zero until localStorage has been read, so the server's markup and
  // the first client render agree on a line of length nothing.
  const fraction = loaded ? route.fraction : 0;

  // The station the reader is standing at: the first one not ticked. Not drawn
  // until progress has loaded, because before then every station looks unread.
  const nextIndex = loaded ? route.stations.findIndex((s) => !done.has(s.url)) : -1;
  const next = nextIndex >= 0 ? route.stations[nextIndex] : null;

  const resourceByUrl = new Map(
    track.stages.flatMap((stage) => stage.resources.map((r) => [r.url, r] as const)),
  );

  return (
    <div
      data-plate={size}
      className={`${hero ? 'hidden lg:block' : 'lg:hidden'} relative overflow-hidden rounded-xl border border-line/70 bg-ink-800/70`}
    >
      {/* The same blueprint grid the lab cards use, so the plate reads as a
          drawing surface rather than an empty box. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--grid-line) / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--grid-line) / 0.07) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
      <svg
        viewBox={route.viewBox}
        className="relative block h-auto w-full"
        aria-labelledby={titleId}
      >
        {/* React coerces `<title>` children to one string and warns loudly for
            an array of nodes — even inside an SVG. A template literal is the
            only shape it accepts here. */}
        <title id={titleId}>{`${track.title} route map — ${route.stations.length} resources across ${route.stageBands.length} stages, ordered left to right and banded by depth. Each station links to its entry below.`}</title>

        {/* Depth bands. Position is the level channel. The rule shows that the
            channel EXISTS; on the hero the labels beside it say what it means,
            and on the compact plate the caption underneath does. The rule alone
            never did — that assumption is what shipped an undecodable plate to
            every phone reader. */}
        {route.bands.map((band) => (
          <g key={band.level}>
            <line
              x1={0}
              x2={route.width}
              y1={band.y}
              y2={band.y}
              className="stroke-line"
              strokeWidth={0.5}
              strokeDasharray="2 5"
            />
            {hero ? (
              <text
                x={3}
                // 11 units above the rule, not 6: at 6 the "Start here" label
                // ran straight through the dashed crosshair ring on station 01,
                // which sits 4 units clear of a 9-unit capsule on that same band.
                y={band.y - 11}
                fontSize={textSize}
                className="fill-fg-faint font-mono uppercase tracking-wider"
              >
                {band.label}
              </text>
            ) : null}
          </g>
        ))}

        {/* Stage divisions. The wash alternates so a stage boundary is legible
            even where the divider falls behind a wide capsule. */}
        {route.stageBands.map((band, index) => (
          <g key={band.number}>
            {index % 2 === 1 ? (
              <rect
                x={band.x0}
                y={0}
                width={band.x1 - band.x0}
                height={route.baselineY}
                className="fill-fg-faint/[0.05]"
              />
            ) : null}
            <line
              x1={band.x0}
              x2={band.x0}
              y1={0}
              y2={route.baselineY}
              className="stroke-line"
              strokeWidth={0.5}
            />
            <text
              // 6 units on the compact plate, not 2. The first stage band's x0
              // IS the viewBox edge — x0 8 less half a 16 pitch — so at 2 the
              // `01` sat 1.9px inside a box whose corner is rounded by 12px,
              // and the corner clipped the left half of the zero: at 375px the
              // label read `91`, while at 1440 it was clean, so only a phone
              // reader ever saw it. The legend under the SVG is what carries
              // this row out of the corner's reach; the inset is what keeps the
              // number off the border. The narrowest stage band is 48 units, so
              // 6 plus two digits of 7-unit mono still sits well inside its own
              // band.
              x={band.x0 + (hero ? 4 : 6)}
              y={labelY}
              fontSize={textSize}
              className="fill-fg-faint font-mono"
            >
              {String(band.number).padStart(2, '0')}
            </text>
            {hero ? (
              <text x={band.x0 + 19} y={labelY} fontSize={textSize} className="fill-fg-muted">
                {band.title}
              </text>
            ) : null}
          </g>
        ))}
        {route.stageBands.length > 0 ? (
          <line
            x1={route.stageBands[route.stageBands.length - 1].x1}
            x2={route.stageBands[route.stageBands.length - 1].x1}
            y1={0}
            y2={route.baselineY}
            className="stroke-line"
            strokeWidth={0.5}
          />
        ) : null}
        <line
          x1={0}
          x2={route.width}
          y1={route.baselineY}
          y2={route.baselineY}
          className="stroke-line-strong"
          strokeWidth={0.75}
        />

        {/*
          Progress IS the drawing: one path drawn twice on an identical `d`, the
          second clipped by a dash offset to the length the reader has walked.
          `pathLength="1000"` makes that exact by declaration rather than by
          measuring the path, so server and client agree to the unit.

          `route.fraction` is cost-weighted and measured to the FURTHEST station
          ticked, not summed over the ticked ones — a line cannot show holes, so
          a skipped item reads as a hollow capsule sitting on an accent segment.
          That is honest in a way the percentage ring it replaces could not be.

          The transition is CSS, so app/globals.css's prefers-reduced-motion
          block already collapses it to 0.01ms; there is no second code path.
        */}
        {route.d ? (
          <>
            <path
              d={route.d}
              fill="none"
              className="stroke-line-strong"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            <path
              d={route.d}
              fill="none"
              className="stroke-accent"
              strokeWidth={stroke}
              strokeLinecap="round"
              pathLength={1000}
              strokeDasharray={1000}
              strokeDashoffset={1000 - 1000 * fraction}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </>
        ) : null}

        {/* The budget gate. Amber is the only other colour this page spends. */}
        {route.budgetX !== null ? (
          <g>
            <line
              x1={route.budgetX}
              x2={route.budgetX}
              y1={2}
              y2={route.baselineY}
              className="stroke-amber"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {hero ? (
              <text
                x={route.budgetX > route.width * 0.7 ? route.budgetX - 4 : route.budgetX + 4}
                textAnchor={route.budgetX > route.width * 0.7 ? 'end' : 'start'}
                y={route.baselineY - 6}
                fontSize={textSize}
                className="fill-amber font-mono uppercase tracking-wider"
              >
                ≈ {budget} evenings
              </text>
            ) : null}
          </g>
        ) : null}

        {/* Stations. A native anchor each, so the plate is jump navigation with
            no JavaScript at all and is keyboard-operable by construction. */}
        {route.stations.map((station) => {
          const resource = resourceByUrl.get(station.url);
          const filteredOut = !filteredUrls.has(station.url);
          const isDone = loaded && done.has(station.url);
          const pastGate = route.budgetX !== null && station.x > route.budgetX;
          const hovered = hoverUrl === station.url;
          const x = station.x - station.w / 2;
          const y = station.y - capsule / 2;
          return (
            <a
              key={station.url}
              href={`#res-${resourceId(station.url)}`}
              className="group focus:outline-none"
              tabIndex={0}
              // `opacity` as an attribute is not in React's typing for an
              // anchor, SVG-namespaced or not; the CSS property is the same
              // thing to the renderer and is typed.
              style={{ opacity: filteredOut ? 0.25 : pastGate ? 0.45 : 1 }}
              onMouseEnter={() => onHover(station.url)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(station.url)}
              onBlur={() => onHover(null)}
            >
              <title>
                {resource
                  ? `${resource.title} · ${WEIGHT_LABEL[resource.weight]} · ${LEVEL_LABEL[resource.level]}`
                  : station.url}
              </title>
              <rect
                x={station.x - route.pitch / 2}
                y={station.y - hitHeight / 2}
                width={route.pitch}
                height={hitHeight}
                fill="transparent"
              />
              {/*
                Focus is a rect behind the capsule, not a CSS box-shadow: shadows
                on SVG children are unreliable and would be clipped by the
                plate's `overflow-hidden` anyway.
              */}
              <rect
                x={x - 3}
                y={y - 3}
                width={station.w + 6}
                height={capsule + 6}
                rx={(capsule + 6) / 2}
                fill="none"
                strokeWidth={1}
                className={`stroke-accent transition-opacity group-focus-visible:opacity-100 ${
                  hovered ? 'opacity-70' : 'opacity-0'
                }`}
              />
              <rect
                x={x}
                y={y}
                width={station.w}
                height={capsule}
                rx={capsule / 2}
                strokeWidth={1}
                // Not done is filled with the plate's own ground rather than
                // `fill="none"`: an unfilled rect takes no pointer events, so a
                // hollow station would have been a link only its 1px outline
                // could be clicked on.
                className={
                  isDone ? 'fill-accent stroke-accent' : 'fill-ink-800 stroke-fg-faint'
                }
              />
            </a>
          );
        })}

        {/* Where the reader is standing. */}
        {next ? (
          <g className="pointer-events-none">
            {hero ? (
              <line
                x1={next.x}
                x2={next.x}
                y1={next.y}
                y2={route.baselineY}
                className="stroke-accent"
                strokeWidth={0.75}
                strokeDasharray="2 3"
                opacity={0.7}
              />
            ) : null}
            <rect
              x={next.x - next.w / 2 - 4}
              y={next.y - capsule / 2 - 4}
              width={next.w + 8}
              height={capsule + 8}
              rx={(capsule + 8) / 2}
              fill="none"
              className="stroke-accent"
              strokeWidth={0.9}
              strokeDasharray="3 2.5"
            />
          </g>
        ) : null}
      </svg>

      {/*
        The compact plate's caption, and the reason it is a diagram rather than
        a squiggle.

        The hero labels its axes inside the drawing — START HERE / CORE / GO
        DEEP down the left edge, the stage titles along the bottom — so a
        stranger can read it unaided. The compact plate keeps the channels and
        drops all six labels, which left a phone reader with vertical position
        encoding level and capsule width encoding cost, and nothing anywhere
        saying so.

        Labels down the left edge are the obvious repair and they do not fit,
        which is worth settling with the numbers rather than by eye: the first
        capsule is centred half a pitch in at x=8 and reaches back to x=5 on
        Graphics and x=3 on Games, whose first resource is heavier. One
        character of 7-unit mono is about 4.2 units wide. Nothing fits in 3
        units, not even a single letter, so the label would sit on top of the
        first station. The empty tail on the right is no better: Games leaves
        101 units spare and Graphics 21, so a label parked there would vanish on
        the longest track.

        So the three channels are named once, in a sentence, under the drawing.
        Measured in the browser at 375px: 290px of Inter at 11px in the 309px
        the padding leaves — one line, with room to spare, and it wraps rather
        than clips on anything narrower.

        The row is load-bearing twice over: the 26px it puts below the SVG is
        what moves the stage numbers clear of the container's 12px rounded
        corner. See the inset on the stage label above before removing it.
      */}
      {hero ? null : (
        <p className="relative px-3 pb-2 pt-1 text-2xs leading-tight text-fg-faint">
          Across is order, down is harder, wider is more evenings.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ rail ---*/

/**
 * The elbow that hangs a row off the rail, and the indent it produces.
 *
 * Length carries depth, so scrolling the list traces the same profile the plate
 * draws: 12 / 18 / 36 units on a phone, 12 / 30 / 60 from `lg`. Both halves are
 * written out as literal class strings because Tailwind reads source text — a
 * computed `pl-[${n}px]` produces no CSS at all.
 */
const ELBOW: Record<Level, { rule: string; indent: string }> = {
  'start here': { rule: 'w-3', indent: 'pl-[29px]' },
  core: { rule: 'w-[18px] lg:w-[30px]', indent: 'pl-[35px] lg:pl-[47px]' },
  deep: { rule: 'w-9 lg:w-[60px]', indent: 'pl-[53px] lg:pl-[77px]' },
};

function DoneToggle({
  done,
  title,
  onToggle,
}: {
  done: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Mark ${title} as not done` : `Mark ${title} as done`}
      // relative + z-10 keeps this above the row-wide link overlay on the title.
      // Without it the title's ::after swallows every click on the toggle — it
      // has happened once already, which is why the smoke test now clicks it.
      className={`relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
        done
          ? 'border-accent/50 bg-accent/20 text-accent'
          : 'border-line text-transparent hover:border-line-strong hover:text-fg-faint'
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
        <path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function StationRow({
  resource,
  done,
  hovered,
  pastGate,
  onToggle,
  onHover,
}: {
  resource: Resource;
  done: boolean;
  hovered: boolean;
  /** Past the reader's evening budget. Dashed elbow, but full opacity. */
  pastGate: boolean;
  onToggle: () => void;
  onHover: (url: string | null) => void;
}) {
  const elbow = ELBOW[resource.level];
  return (
    <li
      id={`res-${resourceId(resource.url)}`}
      onMouseEnter={() => onHover(resource.url)}
      onMouseLeave={() => onHover(null)}
      // scroll-mt-24 clears the 57px sticky header when a station in the plate
      // is followed; `target:` lights the row up with no JavaScript at all.
      className={`relative scroll-mt-24 rounded-md py-2 pr-1 transition-colors target:bg-accent/[0.07] ${
        hovered ? 'bg-ink-600/50' : ''
      } ${done ? 'opacity-60' : ''}`}
    >
      <span
        aria-hidden
        className={`absolute left-[13px] top-[1.05rem] ${elbow.rule} ${
          pastGate ? 'border-t border-dashed border-amber/50' : 'h-px bg-line-strong'
        }`}
      />
      <div className={`grid gap-2 sm:grid-cols-[1fr_auto] sm:gap-6 ${elbow.indent}`}>
        <div className="min-w-0">
          <h3 className="flex items-baseline gap-2 text-sm font-semibold tracking-tight text-fg">
            <span className="mt-0.5 shrink-0 self-start text-fg-faint">
              <KindMark kind={resource.kind} />
            </span>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 break-words after:absolute after:inset-0 hover:text-accent"
            >
              {resource.title}
            </a>
          </h3>
          <p className="mt-0.5 pl-6 text-2xs text-fg-faint">
            {resource.author}
            {!resource.free ? <span className="ml-2 text-amber">Paid</span> : null}
          </p>
          <p className="mt-1.5 max-w-[62ch] pl-6 text-xs leading-relaxed text-fg-muted">
            {resource.why}
          </p>
        </div>

        <div className="flex items-center gap-3 pl-6 sm:justify-end sm:pl-0">
          <span className="flex items-center gap-1.5" title={LEVEL_LABEL[resource.level]}>
            <DepthMark level={resource.level} />
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              {LEVEL_LABEL[resource.level]}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <CostGauge weight={resource.weight} />
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              {WEIGHT_LABEL[resource.weight]}
            </span>
          </span>
          <DoneToggle done={done} title={resource.title} onToggle={onToggle} />
        </div>
      </div>
    </li>
  );
}

/**
 * The labs that cover a stage — and, where there are none, the fact that there
 * are none.
 *
 * The empty branch is the useful one. Ten labs sit across the graphics spine
 * and not one touches the games track, and that asymmetry is the most useful
 * thing this page has never said. Drawn from `stage.labs` rather than claimed
 * in prose, so an eleventh lab in a games stage removes the hairline on its own.
 */
function StageLabs({ stage }: { stage: Stage }) {
  const labs = (stage.labs ?? [])
    .map((slug) => getLab(slug))
    .filter((lab): lab is Lab => lab !== undefined && lab.status === 'live');

  if (labs.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-2xs text-fg-faint">
        <span aria-hidden className="block w-6 border-t border-dashed border-line-strong" />
        No lab on this site covers this yet
      </span>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {labs.map((lab) => (
        <li key={lab.slug}>
          <Link
            href={`/labs/${lab.slug}`}
            className="flex items-center gap-1.5 rounded border border-accent/35 bg-accent/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            <span className="block h-4 w-5 shrink-0">
              <LabGlyph slug={lab.slug} />
            </span>
            See it · {lab.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- explorer ---*/

interface LearnState {
  track: Track['id'];
  kind: KindFilter;
  q: string;
  free: boolean;
  /** Evenings. 0 means "all of it", which is also the default. */
  budget: number;
}

const DEFAULTS: LearnState = {
  track: 'graphics',
  kind: 'all',
  q: '',
  free: false,
  budget: 0,
};

/** The largest budget any track can ask for — the ceiling a URL may name. */
const MAX_EVENINGS = Math.max(...TRACKS.map((track) => trackEvenings(track.id)));

export function LearnExplorer() {
  // The house URL-state hook, unchanged: it reads the address bar once after
  // hydration, and its writes MERGE rather than replace, so a `#res-…` fragment
  // followed from the plate survives the next keystroke in the search box.
  const [state, setState] = useLabState<LearnState>(DEFAULTS, {
    track: (value) => TRACKS.some((t) => t.id === value),
    kind: (value) => value === 'all' || value in KIND_LABEL,
    budget: (value) => Number.isFinite(value) && value > 0 && value <= MAX_EVENINGS,
  });

  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Progress lives only in this browser, under the key it has always used.
  // Read after mount so the server and the first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      // Storage unavailable — the page works, it just will not remember.
    }
    setLoaded(true);
  }, []);

  const toggleDone = useCallback((url: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      try {
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Not persisting is survivable.
      }
      return next;
    });
  }, []);

  const track = TRACKS.find((t) => t.id === state.track) ?? TRACKS[0];
  const trackIndex = TRACKS.indexOf(track);

  // Filters reset with the track. Carrying them across produced a page that
  // looked broken: "Interactive" returns three resources on Graphics and one on
  // Games, so switching track silently emptied the list.
  const selectTrack = useCallback(
    (id: Track['id']) => setState({ ...DEFAULTS, track: id }),
    [setState],
  );

  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const move = (to: number) => {
        const next = (to + TRACKS.length) % TRACKS.length;
        selectTrack(TRACKS[next].id);
        tabs.current[next]?.focus();
      };
      const keys: Record<string, () => void> = {
        ArrowRight: () => move(index + 1),
        ArrowDown: () => move(index + 1),
        ArrowLeft: () => move(index - 1),
        ArrowUp: () => move(index - 1),
        Home: () => move(0),
        End: () => move(TRACKS.length - 1),
      };
      const handler = keys[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    },
    [selectTrack],
  );

  const totalEvenings = trackEvenings(track.id);
  // 0 is the "all of it" sentinel; a budget carried in from a longer track is
  // clamped rather than rejected, so `?track=games&budget=270` still draws.
  const budget = state.budget === 0 ? totalEvenings : Math.min(state.budget, totalEvenings);

  /** Evenings spent by the end of each resource, in registry order. */
  const cumulative = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of trackPath(track.id)) map.set(entry.resource.url, entry.cumulative);
    return map;
  }, [track.id]);

  const query = state.q.trim().toLowerCase();
  const matches = useCallback(
    (stage: Stage, resource: Resource) => {
      if (state.free && !resource.free) return false;
      if (state.kind !== 'all' && resource.kind !== state.kind) return false;
      if (!query) return true;
      // The stage's own words are in the haystack: searching "shader" should
      // surface the stage called "Write shaders", not only the resources whose
      // own prose happens to use the word.
      const haystack =
        `${resource.title} ${resource.author} ${resource.why} ${KIND_LABEL[resource.kind]} ${stage.title} ${stage.summary}`.toLowerCase();
      return haystack.includes(query);
    },
    [state.free, state.kind, query],
  );

  // The number is stamped on before the filter runs, because it belongs to the
  // stage's place in the whole track and not to its position in whatever the
  // filters left on screen. Numbering the filtered array instead relabelled
  // stage 04, "Get light right", as 01 the moment anyone picked Book — and the
  // page promises this list in the order worth reading it. No stage is dropped
  // either: a filter should read as subtraction from a fixed path.
  const stages = track.stages.map((stage, index) => ({
    stage,
    number: String(index + 1).padStart(2, '0'),
    visible: stage.resources.filter((resource) => matches(stage, resource)),
  }));

  const filteredUrls = useMemo(
    () => new Set(stages.flatMap((s) => s.visible.map((r) => r.url))),
    [stages],
  );

  const trackResources = track.stages.flatMap((stage) => stage.resources);
  const trackTotal = trackResources.length;
  const trackDone = trackResources.filter((r) => done.has(r.url)).length;
  const visibleCount = filteredUrls.size;
  const filtering = query !== '' || state.kind !== 'all' || state.free;

  const kindCounts = useMemo(() => {
    const counts = {} as Record<ResourceKind, number>;
    for (const kind of Object.keys(KIND_LABEL) as ResourceKind[]) counts[kind] = 0;
    for (const resource of trackResources) counts[resource.kind] += 1;
    return counts;
  }, [trackResources]);

  // The first visible resource the budget does not reach. The hairline goes
  // immediately before it; nothing after it is dimmed, because a reference page
  // has to stay readable past the horizon.
  const firstOutOfBudget = useMemo(() => {
    if (budget >= totalEvenings) return null;
    for (const { visible } of stages) {
      for (const resource of visible) {
        if ((cumulative.get(resource.url) ?? 0) > budget) return resource.url;
      }
    }
    return null;
  }, [stages, budget, totalEvenings, cumulative]);

  // Where the reader is standing, and what to call the link that takes them
  // there. Rendered at all times so nothing shifts when progress loads; it
  // fades in instead, because before then "START" would be a guess.
  const nextResource = trackResources.find((r) => !done.has(r.url)) ?? null;
  const nextNumber = nextResource
    ? String(trackResources.indexOf(nextResource) + 1).padStart(2, '0')
    : null;

  // Evenings the drawn line covers: the furthest station ticked, not the sum of
  // ticked ones. Said out loud under the readout, because the two differ for
  // anyone who has skipped something and the plate can only draw the first.
  const drawnEvenings = useMemo(() => {
    let furthest = 0;
    for (const resource of trackResources) {
      if (done.has(resource.url)) furthest = cumulative.get(resource.url) ?? furthest;
    }
    return furthest;
  }, [trackResources, done, cumulative]);

  const plateProps = {
    track,
    done,
    filteredUrls,
    budget,
    loaded,
    hoverUrl,
    onHover: setHoverUrl,
  };

  return (
    <div>
      {/* Track switch + progress */}
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        {/*
          A tablist has to behave like one. This announced `role="tab"` with no
          panel to control and every tab its own stop, so a screen-reader user
          told "tab, 1 of 2" reached for the arrows and got silence. Roving
          tabindex makes the group one stop; the arrows move and choose, exactly
          as `components/lab/Controls.tsx`'s Segmented does.
        */}
        <div
          role="tablist"
          aria-label="Learning track"
          className="flex flex-wrap gap-1 rounded-lg border border-line bg-ink-800 p-1"
        >
          {TRACKS.map((t, index) => {
            const active = index === trackIndex;
            return (
              <button
                key={t.id}
                id={`learn-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="learn-panel"
                tabIndex={active ? 0 : -1}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                onClick={() => selectTrack(t.id)}
                className={`min-w-0 flex-1 rounded-md px-4 py-2 text-left transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.35)]'
                    : 'text-fg-faint hover:bg-ink-600 hover:text-fg-muted'
                }`}
              >
                <span className="block text-sm font-medium">{t.title}</span>
                {/* The Track type has carried a tagline since the day it was
                    written and this page has never once shown it. */}
                <span className="mt-0.5 block text-2xs leading-tight opacity-80">
                  {t.tagline}
                </span>
              </button>
            );
          })}
        </div>

        <div className="max-w-sm text-xs leading-tight">
          <p className="tabular font-mono text-2xs uppercase tracking-wider text-fg">
            {loaded ? `${trackDone} of ${trackTotal} done` : `${trackTotal} resources`}
          </p>
          <p className="mt-1 text-2xs leading-relaxed text-fg-faint">
            {loaded && drawnEvenings > 0
              ? `The line is drawn to ${drawnEvenings} of ${totalEvenings} evenings — your furthest, not your sum. Stored in this browser only.`
              : 'Progress is stored in this browser only.'}
          </p>
        </div>
      </div>

      <div id="learn-panel" role="tabpanel" aria-labelledby={`learn-tab-${track.id}`}>
        {/* Where to pick up. Faded rather than absent until progress loads, so
            nothing moves and the page never claims START to someone mid-way. */}
        <p
          className={`mt-7 font-mono text-2xs uppercase tracking-wider transition-opacity ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {nextResource ? (
            <a href={`#res-${resourceId(nextResource.url)}`} className="text-accent hover:underline">
              {trackDone === 0 ? 'Start' : 'Resume'} · {nextNumber} {nextResource.title} →
            </a>
          ) : (
            <span className="text-accent">All {trackTotal} done</span>
          )}
        </p>

        <div className="mt-3 space-y-3">
          <RouteMap {...plateProps} size="hero" />
          <RouteMap {...plateProps} size="compact" />
        </div>

        {/* The track's paragraph sits UNDER its drawing. Above it, five lines of
            prose pushed the compact plate to y=821 on a 375px phone — past the
            fold, so the one thing this page now has to say arrived only to
            readers who scrolled. */}
        <p className="mt-5 max-w-prose text-sm leading-relaxed text-fg-muted">
          {track.intro}
        </p>

        {/* Budget */}
        <div className="mt-6 flex flex-col gap-2 border-y border-line py-3 sm:flex-row sm:items-center sm:gap-8">
          <div className="w-full sm:max-w-xs">
            {/*
              step is 1, not the 5 the issue asked for: with min 5 the grid
              would be 5, 10, … 280 and neither 284 nor 248 is on it, so the
              dial could not be returned to "all of it" — a control you cannot
              undo is worse than no control.
            */}
            <Slider
              label="Budget"
              value={budget}
              min={5}
              max={totalEvenings}
              step={1}
              unit=" evenings"
              precision={0}
              onChange={(value) =>
                setState((previous) => ({
                  ...previous,
                  budget: value >= totalEvenings ? 0 : value,
                }))
              }
            />
          </div>
          <p className="text-2xs leading-relaxed text-fg-faint">
            {budget >= totalEvenings ? (
              <>
                All of it.{' '}
                <span className="tabular font-mono uppercase tracking-wider">
                  {totalEvenings} evenings total
                </span>
              </>
            ) : (
              <>
                <span className="text-amber">≈ {budget} evenings</span> ·{' '}
                {atThreeAWeek(budget)} at three a week ·{' '}
                <span className="tabular font-mono uppercase tracking-wider">
                  {totalEvenings} evenings total
                </span>
              </>
            )}
          </p>
        </div>

        {/* Legend and filters — one row, because the marks are the legend. The
            counts are live and per-track, so nobody picks Interactive on Games
            without seeing that it returns one. */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
            <span className="sr-only">Search resources</span>
            <input
              type="search"
              value={state.q}
              onChange={(event) =>
                setState((previous) => ({ ...previous, q: event.target.value }))
              }
              placeholder="Search…"
              className="w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none"
            />
          </label>

          <FilterChip
            active={state.kind === 'all'}
            onClick={() => setState((previous) => ({ ...previous, kind: 'all' }))}
          >
            All {trackTotal}
          </FilterChip>
          {(Object.keys(KIND_LABEL) as ResourceKind[]).map((kind) => (
            <FilterChip
              key={kind}
              active={state.kind === kind}
              onClick={() => setState((previous) => ({ ...previous, kind }))}
            >
              <KindMark kind={kind} className="h-3.5 w-3.5" />
              {KIND_LABEL[kind]} {kindCounts[kind]}
            </FilterChip>
          ))}
          <FilterChip
            active={state.free}
            onClick={() => setState((previous) => ({ ...previous, free: !previous.free }))}
          >
            Free only
          </FilterChip>

          {filtering ? (
            <button
              type="button"
              onClick={() =>
                setState((previous) => ({ ...previous, kind: 'all', q: '', free: false }))
              }
              className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
            >
              Clear
            </button>
          ) : null}
        </div>

        {filtering ? (
          <p className="mt-3 font-mono text-2xs uppercase tracking-wider text-fg-faint">
            {visibleCount} of {trackTotal} shown · the route keeps its full length
          </p>
        ) : null}

        {/* The rail. Every stage stays, numbered as the registry numbers it. */}
        <ol className="mt-10">
          {stages.map(({ stage, number, visible }) => {
            const stageDone = stage.resources.filter((r) => done.has(r.url)).length;
            return (
              <li key={stage.id} className="relative pb-14 last:pb-0">
                {/* pb-14 on the item rather than space-y-14 on the list, so the
                    rail runs unbroken from one stage's node to the next. */}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[13px] top-7 w-px bg-line"
                />
                <span
                  aria-hidden
                  className="absolute left-[13px] top-7 w-px bg-accent"
                  style={{
                    height: `${stage.resources.length === 0 ? 0 : (stageDone / stage.resources.length) * 100}%`,
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-0 top-0 grid h-[26px] w-[26px] place-items-center rounded border border-line bg-ink-800 font-mono text-2xs text-accent"
                >
                  {number}
                </span>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-9">
                  <h2 className="text-lg font-semibold tracking-tight text-fg">
                    {stage.title}
                  </h2>
                  <LevelHistogram resources={stage.resources} />
                  <StageLabs stage={stage} />
                </div>
                <p className="mt-1.5 max-w-prose pl-9 text-sm leading-relaxed text-fg-muted">
                  {stage.summary}
                </p>

                {visible.length === 0 ? (
                  // Only worth saying when something elsewhere DID match. With
                  // a query that matches nothing, nine stages each announcing
                  // it is nine lines of noise over one honest sentence.
                  visibleCount > 0 ? (
                    <p className="mt-4 pl-9 font-mono text-2xs uppercase tracking-wider text-fg-faint">
                      Nothing in this stage matches
                    </p>
                  ) : null
                ) : (
                  <ul className="mt-4">
                    {visible.map((resource) => (
                      <Fragment key={resource.url}>
                        {firstOutOfBudget === resource.url ? (
                          <li className="my-3 flex items-center gap-3 pl-[29px] text-2xs uppercase tracking-wider text-amber">
                            <span
                              aria-hidden
                              className="block w-6 shrink-0 border-t border-dashed border-amber/60"
                            />
                            <span className="tabular font-mono">
                              ≈ {budget} evenings gets you to here
                            </span>
                          </li>
                        ) : null}
                        <StationRow
                          resource={resource}
                          done={done.has(resource.url)}
                          hovered={hoverUrl === resource.url}
                          pastGate={(cumulative.get(resource.url) ?? 0) > budget}
                          onToggle={() => toggleDone(resource.url)}
                          onHover={setHoverUrl}
                        />
                      </Fragment>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>

        {visibleCount === 0 ? (
          <p className="mt-10 text-center text-sm text-fg-faint">
            Nothing matches that. Try clearing the filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A budget in evenings, said in the unit people plan in.
 *
 * Weeks below two months, because "≈ 1 month" for 10 evenings is both rounder
 * and less useful than "3 weeks". 4.345 weeks to the month, so the figure is
 * calendar months rather than four-week blocks.
 */
function atThreeAWeek(evenings: number): string {
  const weeks = evenings / 3;
  if (weeks < 8.7) return `about ${Math.max(1, Math.round(weeks))} weeks`;
  return `about ${Math.round(weeks / 4.345)} months`;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
        active
          ? 'border-accent/40 bg-accent/15 text-accent'
          : 'border-line text-fg-faint hover:border-line-strong hover:text-fg-muted'
      }`}
    >
      {children}
    </button>
  );
}
