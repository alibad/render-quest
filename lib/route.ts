/**
 * Station geometry for the /learn route map.
 *
 * /learn is a section drawing rather than a list: order runs left to right,
 * depth runs top to bottom, and every resource is a station on a route line.
 * This module turns the registry into coordinates and nothing else. It imports
 * no React, touches no DOM, reads no CSS and measures no text — the caller
 * supplies the viewport, this supplies the geometry, so one calculation draws
 * the same route at 375px and at 1400px.
 *
 * Purity is the point of the split, not a nicety: geometry that can only be
 * exercised by mounting a component is geometry that gets eyeballed instead of
 * tested, and every case below — a one-resource stage, an eight-resource stage,
 * an empty done-set, a completed track — is cheap to assert and expensive to
 * spot by looking at a picture. test/route.test.ts covers all of them with
 * synthetic tracks, so the drawing arrives with its arithmetic already proved.
 */

import {
  LEVELS,
  LEVEL_LABEL,
  WEIGHT_EVENINGS,
  type Level,
  type Track,
  type Weight,
} from './resources';

export type RouteSize = 'hero' | 'compact';

export interface RouteMetrics {
  /** x of the first station. */
  x0: number;
  /** Horizontal distance between consecutive stations. */
  pitch: number;
  /** The y each depth band sits on. */
  bandY: Record<Level, number>;
  /** y of the rule under the route, where the stage bands are labelled. */
  baselineY: number;
  width: number;
  height: number;
  /** Height of a station capsule. Not derivable from anything else here. */
  capsuleHeight: number;
  /** Capsule width per cost bucket — the one axis independent of x and y. */
  capsuleWidth: Record<Weight, number>;
  /** Corner radius where the route turns. Clamped per vertex; see roundedPolyline. */
  corner: number;
}

/**
 * The two sizes the route is drawn at. Every number is a coordinate in the
 * viewBox, so both are unitless and both scale to whatever box the renderer
 * gives them; `compact` is not "the small one", it is the one whose spacing
 * still reads when the whole route is 356 units wide on a phone.
 *
 * Width is fixed per size and is NOT a function of the track. A 16-station
 * Games route is therefore visibly shorter than a 21-station Graphics one
 * instead of stretching to fill the box: the empty tail is information.
 */
export const ROUTE_SIZES: Record<RouteSize, RouteMetrics> = {
  hero: {
    x0: 26,
    pitch: 44,
    bandY: { 'start here': 34, core: 84, deep: 134 },
    baselineY: 158,
    width: 932,
    height: 168,
    capsuleHeight: 9,
    capsuleWidth: { afternoon: 10, weekend: 16, weeks: 26, months: 38 },
    corner: 12,
  },
  compact: {
    x0: 8,
    pitch: 16,
    bandY: { 'start here': 14, core: 36, deep: 58 },
    baselineY: 70,
    width: 356,
    height: 76,
    capsuleHeight: 6,
    capsuleWidth: { afternoon: 4, weekend: 6, weeks: 10, months: 14 },
    corner: 5,
  },
};

export interface Station {
  url: string;
  x: number;
  /** One of the three band values, chosen by `level`. */
  y: number;
  /** Capsule width, set by the resource's cost bucket. */
  w: number;
  level: Level;
  /** Index of the owning stage in `track.stages`, empty stages included. */
  stageIndex: number;
  /** 0-based position along the whole track. */
  index: number;
  /** Evenings spent by the end of this station, this one included. */
  cumulative: number;
}

export interface RouteBand {
  level: Level;
  y: number;
  label: string;
}

export interface RouteStageBand {
  x0: number;
  x1: number;
  /** 1-based stage number as the reader counts it, from the registry order. */
  number: number;
  title: string;
}

export interface Route {
  stations: Station[];
  /** The route line, as an SVG path `d`. Empty when the track has no stations. */
  d: string;
  viewBox: string;
  width: number;
  height: number;
  baselineY: number;
  pitch: number;
  capsuleHeight: number;
  bands: RouteBand[];
  stageBands: RouteStageBand[];
  /**
   * x at which a reader's evening budget runs out, or null when the budget
   * covers the whole track. An x coordinate, not a fraction — see `fraction`.
   */
  budgetX: number | null;
  /** Index of the furthest station marked done, or -1. */
  furthestDoneIndex: number;
  /**
   * How much of the route's cost is behind the reader, in [0, 1].
   *
   * Cost, not station count: someone who finished Physically Based Rendering
   * (`months`, 40 evenings) must not read the same as someone who skimmed
   * Shadertoy (`afternoon`, 1), and a bare index would draw them identically.
   *
   * Measured to the FURTHEST station done rather than summed over the done
   * ones, because this is drawn as one continuous line from the start and a
   * line cannot show holes. "How far along am I" is the question a route map
   * answers; "how many did I tick" is the question the old card grid answered.
   *
   * The renderer turns this into length with `pathLength="1000"` and
   * `strokeDashoffset`, which is exact by declaration and identical on server
   * and client. That makes `fraction` a fraction of the line's ARC length,
   * while `budgetX` is an x coordinate. They live in different spaces on
   * purpose: do not try to derive one from the other.
   */
  fraction: number;
}

/** Round to 2dp so the `d` string is deterministic and free of float noise. */
function n(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

interface Point {
  x: number;
  y: number;
}

/** The point `distance` along the way from `from` towards `to`. */
function along(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: from.x, y: from.y };
  const t = distance / length;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

/**
 * A polyline through `points` with the corners rounded: walk to `radius` short
 * of each interior vertex with `L`, then turn with one `Q` through it.
 *
 * The radius is clamped per vertex to half the shorter adjacent segment, so a
 * tight turn — two stations one pitch apart with a full band's drop between
 * them — rounds less rather than overshooting into the previous segment and
 * doubling back, which is what an unclamped radius draws.
 *
 * Every interior vertex gets a `Q`, including collinear ones. A run of stations
 * on the same band produces `Q`s that are geometrically straight lines, which
 * costs a few characters and buys the invariant the tests lean on: exactly one
 * turn per interior vertex, through it.
 */
export function roundedPolyline(points: Point[], radius: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (points.length === 1) return `M ${n(first.x)} ${n(first.y)}`;

  const parts = [`M ${n(first.x)} ${n(first.y)}`];
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const vertex = points[i];
    const next = points[i + 1];
    const r = Math.min(
      radius,
      Math.hypot(vertex.x - previous.x, vertex.y - previous.y) / 2,
      Math.hypot(next.x - vertex.x, next.y - vertex.y) / 2,
    );
    const enter = along(vertex, previous, r);
    const leave = along(vertex, next, r);
    parts.push(`L ${n(enter.x)} ${n(enter.y)}`);
    parts.push(`Q ${n(vertex.x)} ${n(vertex.y)} ${n(leave.x)} ${n(leave.y)}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${n(last.x)} ${n(last.y)}`);
  return parts.join(' ');
}

/**
 * How many stations fit inside a fixed-width viewBox at this size.
 *
 * Exported so the tests can derive the limit instead of restating it. The hero
 * size holds exactly 21 and Graphics has exactly 21 resources: there is 7 units
 * of headroom past the last capsule and none at all for a 22nd. Adding a
 * resource to that track without widening `ROUTE_SIZES.hero` pushes the last
 * station out of the box, where it is clipped rather than warned about.
 */
export function routeCapacity(size: RouteSize): number {
  const metrics = ROUTE_SIZES[size];
  const widest = Math.max(...Object.values(metrics.capsuleWidth));
  const usable = metrics.width - metrics.x0 - widest / 2;
  return Math.floor(usable / metrics.pitch) + 1;
}

/**
 * Where the reader's budget runs out, in x.
 *
 * Piecewise linear over (cumulative evenings, x) with the route entrance —
 * half a pitch before the first station, the left edge of stage band one —
 * prepended at zero evenings, so a budget of nothing lands at the start of the
 * drawing rather than on top of the first station.
 */
function budgetPosition(
  stations: Station[],
  total: number,
  budget: number,
  startX: number,
): number | null {
  if (stations.length === 0) return null;
  if (budget >= total) return null;
  if (budget <= 0) return startX;

  let previousCumulative = 0;
  let previousX = startX;
  for (const station of stations) {
    if (budget <= station.cumulative) {
      const span = station.cumulative - previousCumulative;
      const t = span === 0 ? 1 : (budget - previousCumulative) / span;
      return previousX + t * (station.x - previousX);
    }
    previousCumulative = station.cumulative;
    previousX = station.x;
  }
  return stations[stations.length - 1].x;
}

/**
 * Lay a track out as a route.
 *
 * `done` is a set of resource URLs — the same keys progress is already stored
 * under, so nothing has to be re-keyed or migrated. `budget` is the reader's
 * evenings; pass the track's total (or more) to draw no budget marker.
 *
 * A stage with no resources contributes no stations and no stage band: it
 * would otherwise draw a zero-width band and a stage number pointing at
 * nothing. Stage numbers stay registry-based so they still match the reading
 * list even when a stage is skipped this way.
 */
export function buildRoute(
  track: Track,
  opts: { size: RouteSize; done: Set<string>; budget: number },
): Route {
  const metrics = ROUTE_SIZES[opts.size];
  const stations: Station[] = [];
  const stageBands: RouteStageBand[] = [];
  let cumulative = 0;

  track.stages.forEach((stage, stageIndex) => {
    if (stage.resources.length === 0) return;
    const firstIndex = stations.length;
    for (const resource of stage.resources) {
      const index = stations.length;
      cumulative += WEIGHT_EVENINGS[resource.weight];
      stations.push({
        url: resource.url,
        x: metrics.x0 + index * metrics.pitch,
        y: metrics.bandY[resource.level],
        w: metrics.capsuleWidth[resource.weight],
        level: resource.level,
        stageIndex,
        index,
        cumulative,
      });
    }
    stageBands.push({
      // Half a pitch either side, so consecutive stage bands tile exactly:
      // one band's x1 is the next band's x0, with no gap to fall down and no
      // overlap for two stage titles to fight over.
      x0: stations[firstIndex].x - metrics.pitch / 2,
      x1: stations[stations.length - 1].x + metrics.pitch / 2,
      number: stageIndex + 1,
      title: stage.title,
    });
  });

  const total = cumulative;
  let furthestDoneIndex = -1;
  for (const station of stations) {
    if (opts.done.has(station.url)) furthestDoneIndex = station.index;
  }
  const fraction =
    furthestDoneIndex < 0 || total === 0
      ? 0
      : Math.min(1, Math.max(0, stations[furthestDoneIndex].cumulative / total));

  return {
    stations,
    d: roundedPolyline(stations, metrics.corner),
    viewBox: `0 0 ${metrics.width} ${metrics.height}`,
    width: metrics.width,
    height: metrics.height,
    baselineY: metrics.baselineY,
    pitch: metrics.pitch,
    capsuleHeight: metrics.capsuleHeight,
    bands: LEVELS.map((level) => ({
      level,
      y: metrics.bandY[level],
      label: LEVEL_LABEL[level],
    })),
    stageBands,
    budgetX: budgetPosition(
      stations,
      total,
      opts.budget,
      metrics.x0 - metrics.pitch / 2,
    ),
    furthestDoneIndex,
    fraction,
  };
}
