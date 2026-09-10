/**
 * The /learn route geometry, checked before anything draws it.
 *
 * lib/route.ts is pure on purpose, and this suite is why. A route map fails
 * quietly: a station half a pitch out, a stage band overlapping its neighbour,
 * a progress line that stops at the wrong place — all of them render happily
 * and all of them are wrong. None of it is visible in a screenshot at 356 units
 * wide, and none of it is reachable at all if the arithmetic only runs inside a
 * mounted component.
 *
 * So the hard cases are built here rather than waited for: a stage with one
 * resource and a stage with eight, an empty track, a single station, a track
 * with nothing done and a track with everything done. The real registry is
 * checked too, but it is the easy case — it has no stage of one and no stage of
 * eight, and it never will until someone adds one.
 *
 * The registry checks at the end belong with the other content invariants in
 * test/content.test.ts; they are here because `weight` and `Stage.labs` landed
 * in the same change as this file and would otherwise have shipped untested.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { LIVE_LABS } from '../lib/labs.ts';
import {
  ROUTE_SIZES,
  buildRoute,
  roundedPolyline,
  routeCapacity,
  type RouteSize,
  type Station,
} from '../lib/route.ts';
import {
  ALL_RESOURCES,
  LEVELS,
  LEVEL_LABEL,
  TRACKS,
  WEIGHT_EVENINGS,
  resourceId,
  trackEvenings,
  type Level,
  type Resource,
  type Stage,
  type Track,
  type Weight,
} from '../lib/resources.ts';

const ROOT = new URL('..', import.meta.url).pathname;

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

console.log('route');

const SIZES: RouteSize[] = ['hero', 'compact'];
const WEIGHTS = Object.keys(WEIGHT_EVENINGS) as Weight[];

/** A track built to order, so the awkward shapes can be tested on purpose. */
function makeTrack(
  stages: { title?: string; resources: [Level, Weight][] }[],
): Track {
  return {
    id: 'graphics',
    title: 'Synthetic',
    tagline: '',
    intro: '',
    stages: stages.map((stage, s): Stage => ({
      id: `s${s}`,
      title: stage.title ?? `Stage ${s + 1}`,
      summary: '',
      resources: stage.resources.map(
        ([level, weight], r): Resource => ({
          title: `r${s}-${r}`,
          author: '',
          url: `https://example.test/${s}/${r}`,
          kind: 'reference',
          level,
          weight,
          free: true,
          why: '',
        }),
      ),
    })),
  };
}

const noneDone = new Set<string>();
const build = (track: Track, size: RouteSize, done = noneDone, budget = Infinity) =>
  buildRoute(track, { size, done, budget });

interface PathCommand {
  op: string;
  coords: number[];
}

function parsePath(d: string): PathCommand[] {
  if (d === '') return [];
  const tokens = d.split(' ').filter((token) => token !== '');
  const commands: PathCommand[] = [];
  let i = 0;
  while (i < tokens.length) {
    const op = tokens[i++];
    const arity = op === 'M' || op === 'L' ? 2 : op === 'Q' ? 4 : -1;
    assert.ok(arity > 0, `unknown path command "${op}" in: ${d}`);
    const coords = tokens.slice(i, i + arity).map(Number);
    assert.equal(coords.length, arity, `"${op}" is short of coordinates in: ${d}`);
    assert.ok(
      coords.every((value) => Number.isFinite(value)),
      `"${op}" carries a non-number in: ${d}`,
    );
    commands.push({ op, coords });
    i += arity;
  }
  return commands;
}

/* ------------------------------------------------------------------ purity */

check('lib/route.ts imports nothing from React or the DOM', () => {
  const source = readFileSync(`${ROOT}lib/route.ts`, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['react', 'next/', 'components/', '../components']) {
    assert.ok(
      !code.includes(`'${forbidden}`),
      `route.ts imports "${forbidden}" — the geometry stops being testable without a renderer`,
    );
  }
  for (const global of ['document.', 'window.', 'getBoundingClientRect', 'measureText']) {
    assert.ok(
      !code.includes(global),
      `route.ts reaches for ${global} — geometry must not depend on the browser it is drawn in`,
    );
  }
});

/* ------------------------------------------------- the two real tracks */

for (const track of TRACKS) {
  for (const size of SIZES) {
    const where = `${track.id}/${size}`;
    const route = build(track, size);
    const resources = track.stages.flatMap((stage) => stage.resources);
    const metrics = ROUTE_SIZES[size];

    check(`${where}: one station per resource`, () => {
      assert.equal(route.stations.length, resources.length);
      assert.deepEqual(
        route.stations.map((station) => station.url),
        resources.map((resource) => resource.url),
        'stations are not in reading order',
      );
    });

    check(`${where}: x is strictly increasing`, () => {
      for (let i = 1; i < route.stations.length; i++) {
        assert.ok(
          route.stations[i].x > route.stations[i - 1].x,
          `station ${i} is not to the right of ${i - 1}; the route doubles back`,
        );
      }
    });

    check(`${where}: every y is a band, and the band matches the level`, () => {
      const bandFor = new Map(route.bands.map((band) => [band.level, band.y]));
      for (const station of route.stations) {
        assert.equal(
          station.y,
          bandFor.get(station.level),
          `${station.url} sits off its "${station.level}" band, so depth reads as noise`,
        );
      }
    });

    check(`${where}: capsule width is the resource's cost`, () => {
      route.stations.forEach((station, i) => {
        assert.equal(
          station.w,
          metrics.capsuleWidth[resources[i].weight],
          `${station.url} is drawn at the wrong width for a "${resources[i].weight}"`,
        );
      });
    });

    check(`${where}: cumulative cost rises to the track total`, () => {
      for (let i = 1; i < route.stations.length; i++) {
        assert.ok(
          route.stations[i].cumulative > route.stations[i - 1].cumulative,
          `station ${i} costs nothing; a free resource is not a resource`,
        );
      }
      const last = route.stations[route.stations.length - 1];
      assert.equal(last.cumulative, trackEvenings(track.id));
    });

    check(`${where}: one turn per interior station, through it`, () => {
      const commands = parsePath(route.d);
      const stations = route.stations;
      assert.equal(commands[0].op, 'M', 'the path does not start with a move');
      assert.deepEqual(commands[0].coords, [stations[0].x, stations[0].y]);

      const turns = commands.filter((command) => command.op === 'Q');
      assert.equal(
        turns.length,
        stations.length - 2,
        'the number of corners does not match the number of interior stations',
      );
      turns.forEach((turn, i) => {
        const vertex = stations[i + 1];
        assert.deepEqual(
          turn.coords.slice(0, 2),
          [vertex.x, vertex.y],
          `corner ${i} does not turn through station ${i + 1}`,
        );
      });

      const last = commands[commands.length - 1];
      assert.equal(last.op, 'L');
      assert.deepEqual(last.coords, [
        stations[stations.length - 1].x,
        stations[stations.length - 1].y,
      ]);
    });

    check(`${where}: stage bands tile the route without gap or overlap`, () => {
      const bands = route.stageBands;
      assert.equal(bands.length, track.stages.length);
      bands.forEach((band, i) => {
        assert.ok(
          band.x1 - band.x0 >= metrics.pitch,
          `stage ${band.number} owns less than a pitch of width; its title has nowhere to go`,
        );
        if (i > 0) {
          assert.equal(
            band.x0,
            bands[i - 1].x1,
            `stage ${band.number} does not start where stage ${bands[i - 1].number} ends`,
          );
        }
      });
      assert.ok(bands[0].x0 >= 0, 'the first stage band starts left of the viewBox');
      assert.ok(
        bands[bands.length - 1].x1 <= route.width,
        'the last stage band runs past the right edge of the viewBox',
      );
    });

    check(`${where}: capsules never touch their neighbours`, () => {
      for (let i = 1; i < route.stations.length; i++) {
        const left = route.stations[i - 1];
        const right = route.stations[i];
        assert.ok(
          left.x + left.w / 2 <= right.x - right.w / 2,
          `stations ${i - 1} and ${i} overlap: widen the pitch or narrow the widest capsule`,
        );
      }
    });

    check(`${where}: the whole track fits the fixed viewBox`, () => {
      const capacity = routeCapacity(size);
      assert.ok(
        route.stations.length <= capacity,
        `${track.title} has ${route.stations.length} resources and the ${size} viewBox holds ${capacity}; the tail is silently clipped`,
      );
      for (const station of route.stations) {
        assert.ok(station.x - station.w / 2 >= 0, 'a capsule hangs off the left edge');
        assert.ok(
          station.x + station.w / 2 <= route.width,
          'a capsule hangs off the right edge',
        );
      }
    });

    check(`${where}: the depth bands are the registry's levels`, () => {
      assert.deepEqual(
        route.bands.map((band) => band.level),
        LEVELS,
      );
      assert.deepEqual(
        route.bands.map((band) => band.label),
        LEVELS.map((level) => LEVEL_LABEL[level]),
        'band labels have drifted from LEVEL_LABEL',
      );
      const ys = route.bands.map((band) => band.y);
      assert.deepEqual(ys, [...ys].sort((a, b) => a - b), 'depth does not run downwards');
      assert.ok(
        route.baselineY > ys[ys.length - 1],
        'the baseline is above the deepest band',
      );
    });

    check(`${where}: depth never goes back up inside a stage`, () => {
      const rank = new Map(LEVELS.map((level, i) => [level, i]));
      const byStage = new Map<number, Station[]>();
      for (const station of route.stations) {
        byStage.set(station.stageIndex, [
          ...(byStage.get(station.stageIndex) ?? []),
          station,
        ]);
      }
      for (const [stageIndex, stations] of byStage) {
        for (let i = 1; i < stations.length; i++) {
          assert.ok(
            rank.get(stations[i].level)! >= rank.get(stations[i - 1].level)!,
            `stage ${stageIndex + 1} of ${track.title} lists "${stations[i].level}" after "${stations[i - 1].level}"; the sawtooth reads backwards`,
          );
        }
      }
    });
  }
}

check('graphics and games draw into the same box', () => {
  for (const size of SIZES) {
    const [graphics, games] = TRACKS.map((track) => build(track, size));
    assert.equal(
      graphics.viewBox,
      games.viewBox,
      'the tracks scale to fill the box, so the shorter one stops meaning anything',
    );
    assert.equal(graphics.width, games.width);
    assert.equal(graphics.height, games.height);
    assert.ok(
      games.stations[games.stations.length - 1].x <
        graphics.stations[graphics.stations.length - 1].x,
      'the 16-station route does not end short of the 21-station one',
    );
  }
});

check('the track totals are 284 and 248 evenings', () => {
  assert.equal(trackEvenings('graphics'), 284);
  assert.equal(trackEvenings('games'), 248);
});

/* ------------------------------------------------------------- progress */

const graphics = TRACKS[0];
const allUrls = new Set(graphics.stages.flatMap((s) => s.resources.map((r) => r.url)));

check('nothing done draws nothing', () => {
  for (const size of SIZES) {
    const route = build(graphics, size);
    assert.equal(route.fraction, 0);
    assert.equal(route.furthestDoneIndex, -1);
  }
});

check('everything done draws the whole line', () => {
  for (const size of SIZES) {
    const route = build(graphics, size, allUrls);
    assert.equal(route.fraction, 1);
    assert.equal(route.furthestDoneIndex, route.stations.length - 1);
  }
});

check('reaching the last station alone completes the route', () => {
  const stations = build(graphics, 'hero').stations;
  const last = stations[stations.length - 1];
  const route = build(graphics, 'hero', new Set([last.url]));
  assert.equal(route.fraction, 1, 'the furthest station done is not the end of the line');
});

check('progress is cost, not a count of stations', () => {
  // The whole reason `weight` exists. Physically Based Rendering is 1,200
  // pages; the Real-Time Rendering link list is an afternoon. Before weights,
  // finishing either moved the same single card from one column to another.
  const stations = build(graphics, 'hero').stations;
  const heavy = stations.find((s) => s.w === ROUTE_SIZES.hero.capsuleWidth.months);
  const light = stations.find((s) => s.w === ROUTE_SIZES.hero.capsuleWidth.afternoon);
  assert.ok(heavy, 'the track has no months-long resource to compare');
  assert.ok(light, 'the track has no afternoon-long resource to compare');
  assert.ok(
    heavy.cumulative - (stations[heavy.index - 1]?.cumulative ?? 0) >
      light.cumulative - (stations[light.index - 1]?.cumulative ?? 0),
    'a months-long book advances the line no further than an afternoon',
  );
});

check('fraction is weighed in evenings, not in stations ticked', () => {
  // The check that refuses a station count. A count would put this reader at
  // 1/3 for finishing the one thing on the track that costs 40 evenings out of
  // 42 — the exact confusion between "how many did I tick" and "how far along
  // am I" that the route line exists to remove.
  const track = makeTrack([
    { resources: [['deep', 'months'], ['core', 'afternoon'], ['core', 'afternoon']] },
  ]);
  const urls = track.stages[0].resources.map((resource) => resource.url);
  const after = (url: string) => build(track, 'hero', new Set([url])).fraction;
  assert.equal(
    after(urls[0]),
    40 / 42,
    'finishing the 40-evening book does not draw 40 of the 42 evenings; fraction is counting stations, not cost',
  );
  assert.equal(
    after(urls[1]),
    41 / 42,
    'the second station is not 41 evenings along the route',
  );
  assert.equal(after(urls[2]), 1, 'the last station is not the end of the route');
});

check('fraction stays inside [0, 1] for every prefix of the path', () => {
  for (const track of TRACKS) {
    const stations = build(track, 'hero').stations;
    for (let i = 0; i < stations.length; i++) {
      const done = new Set(stations.slice(0, i + 1).map((s) => s.url));
      const route = build(track, 'hero', done);
      assert.ok(
        route.fraction >= 0 && route.fraction <= 1,
        `${track.id}: prefix of ${i + 1} gives ${route.fraction}`,
      );
      assert.equal(route.furthestDoneIndex, i);
    }
  }
});

check('a URL that is not on this track is ignored', () => {
  const route = build(graphics, 'hero', new Set(['https://example.test/nope']));
  assert.equal(route.furthestDoneIndex, -1);
  assert.equal(route.fraction, 0);
});

/* --------------------------------------------------------------- budget */

check('a budget covering the track draws no marker', () => {
  for (const track of TRACKS) {
    for (const size of SIZES) {
      const total = trackEvenings(track.id);
      assert.equal(build(track, size, noneDone, total).budgetX, null, 'at the total');
      assert.equal(build(track, size, noneDone, total + 50).budgetX, null, 'above it');
      assert.equal(build(track, size, noneDone, Infinity).budgetX, null, 'unbounded');
    }
  }
});

check('the budget marker only ever moves right as the budget grows', () => {
  for (const track of TRACKS) {
    const total = trackEvenings(track.id);
    let previous = -Infinity;
    for (let budget = -5; budget < total; budget++) {
      const x = build(track, 'hero', noneDone, budget).budgetX;
      assert.ok(x !== null, `budget ${budget} of ${total} should still mark a point`);
      assert.ok(
        x >= previous,
        `budget ${budget} pulls the marker back from ${previous} to ${x}`,
      );
      previous = x;
    }
  }
});

check('no budget at all marks the start of the route', () => {
  for (const size of SIZES) {
    const route = build(graphics, size, noneDone, 0);
    assert.equal(
      route.budgetX,
      route.stageBands[0].x0,
      'a reader with no evenings is placed somewhere other than the entrance',
    );
  }
});

check('the budget marker lands inside the drawing', () => {
  const total = trackEvenings('graphics');
  for (const size of SIZES) {
    for (const budget of [1, 40, 100, 283]) {
      const route = build(graphics, size, noneDone, budget);
      assert.ok(route.budgetX !== null);
      assert.ok(
        route.budgetX >= 0 && route.budgetX <= route.width,
        `budget ${budget} of ${total} marks x=${route.budgetX}, outside the viewBox`,
      );
    }
  }
});

/* ------------------------------------------------------- awkward shapes */

check('a stage of one and a stage of eight sit side by side', () => {
  const track = makeTrack([
    { resources: [['start here', 'afternoon']] },
    {
      resources: [
        ['start here', 'weekend'],
        ['start here', 'weeks'],
        ['core', 'months'],
        ['core', 'afternoon'],
        ['core', 'weekend'],
        ['deep', 'weeks'],
        ['deep', 'months'],
        ['deep', 'afternoon'],
      ],
    },
  ]);
  for (const size of SIZES) {
    const route = build(track, size);
    const metrics = ROUTE_SIZES[size];
    assert.equal(route.stations.length, 9);
    assert.equal(route.stageBands.length, 2);
    assert.equal(
      route.stageBands[0].x1 - route.stageBands[0].x0,
      metrics.pitch,
      'a one-resource stage does not own exactly one pitch of width',
    );
    assert.equal(
      route.stageBands[1].x1 - route.stageBands[1].x0,
      metrics.pitch * 8,
      'an eight-resource stage does not own eight pitches',
    );
    assert.equal(route.stageBands[0].x1, route.stageBands[1].x0);
  }
});

check('a stage title of any length changes no coordinate', () => {
  // The one thing that would quietly reintroduce a dependency on the browser:
  // nudging a band because a title looked too long. The renderer clips or
  // wraps inside the box it is given; the box never moves.
  const short = makeTrack([{ title: 'A', resources: [['core', 'weeks']] }]);
  const long = makeTrack([{ title: 'B'.repeat(400), resources: [['core', 'weeks']] }]);
  for (const size of SIZES) {
    const a = build(short, size);
    const b = build(long, size);
    assert.deepEqual(a.stations, b.stations);
    assert.deepEqual(
      a.stageBands.map(({ x0, x1 }) => [x0, x1]),
      b.stageBands.map(({ x0, x1 }) => [x0, x1]),
    );
    assert.equal(a.d, b.d);
  }
});

check('an empty track draws nothing and crashes nothing', () => {
  for (const size of SIZES) {
    const route = build(makeTrack([]), size);
    assert.deepEqual(route.stations, []);
    assert.deepEqual(route.stageBands, []);
    assert.equal(route.d, '', 'an empty track produces a path that would draw a stray mark');
    assert.equal(route.fraction, 0);
    assert.equal(route.furthestDoneIndex, -1);
    assert.equal(route.budgetX, null);
    assert.equal(route.bands.length, LEVELS.length);
    assert.equal(route.viewBox, build(TRACKS[0], size).viewBox);
  }
});

check('a stage with no resources takes up no width', () => {
  const track = makeTrack([
    { resources: [['core', 'weeks']] },
    { resources: [] },
    { resources: [['deep', 'months']] },
  ]);
  const route = build(track, 'hero');
  assert.equal(route.stations.length, 2);
  assert.equal(route.stageBands.length, 2, 'the empty stage drew a band over nothing');
  assert.deepEqual(
    route.stageBands.map((band) => band.number),
    [1, 3],
    'stage numbers stopped matching the reading list when a stage was skipped',
  );
  assert.deepEqual(
    route.stations.map((station) => station.stageIndex),
    [0, 2],
  );
});

check('a single station has a line with no corners', () => {
  const track = makeTrack([{ resources: [['deep', 'months']] }]);
  for (const size of SIZES) {
    const route = build(track, size);
    const commands = parsePath(route.d);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].op, 'M');
    assert.deepEqual(commands[0].coords, [route.stations[0].x, route.stations[0].y]);
    assert.equal(route.stageBands[0].x1 - route.stageBands[0].x0, ROUTE_SIZES[size].pitch);
  }
});

check('two stations are one straight line', () => {
  const track = makeTrack([{ resources: [['start here', 'afternoon'], ['deep', 'months']] }]);
  const commands = parsePath(build(track, 'hero').d);
  assert.deepEqual(
    commands.map((command) => command.op),
    ['M', 'L'],
    'two stations produced a corner to turn through',
  );
});

check('one station done out of one completes the route', () => {
  const track = makeTrack([{ resources: [['core', 'weeks']] }]);
  const url = track.stages[0].resources[0].url;
  assert.equal(build(track, 'hero', new Set([url])).fraction, 1);
  assert.equal(build(track, 'hero').fraction, 0);
});

check('every weight bucket draws a different width', () => {
  for (const size of SIZES) {
    const widths = WEIGHTS.map((weight) => ROUTE_SIZES[size].capsuleWidth[weight]);
    assert.equal(
      new Set(widths).size,
      WEIGHTS.length,
      `${size}: two cost buckets are drawn identically, so the width axis says nothing`,
    );
    assert.deepEqual(
      widths,
      [...widths].sort((a, b) => a - b),
      `${size}: capsule width does not rise with cost`,
    );
  }
});

check('a track of all one weight still draws a legible route', () => {
  // The lazy fill the registry test refuses, checked from the other side: even
  // if it happened, the geometry must not divide by zero or collapse.
  for (const weight of WEIGHTS) {
    const track = makeTrack([
      { resources: [['start here', weight], ['core', weight], ['deep', weight]] },
    ]);
    const route = build(track, 'hero', noneDone, 1);
    assert.equal(new Set(route.stations.map((s) => s.w)).size, 1);
    assert.ok(route.budgetX !== null && Number.isFinite(route.budgetX));
    assert.equal(route.fraction, 0);
  }
});

/* ------------------------------------------------------ roundedPolyline */

check('a corner never overshoots the segment it turns off', () => {
  // An unclamped radius walks backwards past the previous vertex and the line
  // visibly doubles back on itself — the failure that made the clamp exist.
  const points = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 8, y: 100 },
    { x: 12, y: 100 },
  ];
  const commands = parsePath(roundedPolyline(points, 40));
  for (const command of commands) {
    for (let i = 0; i < command.coords.length; i += 2) {
      const x = command.coords[i];
      assert.ok(x >= 0 && x <= 12, `the path reaches x=${x}, outside the polyline's own span`);
    }
  }
});

check('duplicate points do not produce NaN', () => {
  const d = roundedPolyline(
    [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 20, y: 30 },
    ],
    12,
  );
  assert.ok(!d.includes('NaN'), d);
  parsePath(d);
});

check('an empty polyline is an empty string', () => {
  assert.equal(roundedPolyline([], 12), '');
});

check('the path string is stable across calls', () => {
  for (const track of TRACKS) {
    for (const size of SIZES) {
      assert.equal(build(track, size).d, build(track, size).d);
      assert.ok(
        !/\d\.\d{3}/.test(build(track, size).d),
        'coordinates carry float noise, so the server and client strings can differ',
      );
    }
  }
});

/* ----------------------------------------------- registry data (from #21) */

check('every resource says how long it takes', () => {
  for (const resource of ALL_RESOURCES) {
    assert.ok(
      resource.weight in WEIGHT_EVENINGS,
      `${resource.title} carries no cost, so it cannot be drawn or budgeted for`,
    );
  }
});

check('the cost scale is actually used', () => {
  const used = new Set(ALL_RESOURCES.map((resource) => resource.weight));
  for (const weight of WEIGHTS) {
    assert.ok(
      used.has(weight),
      `nothing is a "${weight}"; a scale with an unused end makes the station widths noise and the cost gauge a lie`,
    );
  }
});

check("every stage's labs point at a live lab", () => {
  const live = new Set(LIVE_LABS.map((lab) => lab.slug));
  for (const track of TRACKS) {
    for (const stage of track.stages) {
      for (const slug of stage.labs ?? []) {
        assert.ok(
          live.has(slug),
          `${track.title} / ${stage.title} claims lab "${slug}", which is not live`,
        );
      }
    }
  }
});

check('every live lab is claimed by exactly one stage', () => {
  const claims = new Map<string, string[]>();
  for (const track of TRACKS) {
    for (const stage of track.stages) {
      for (const slug of stage.labs ?? []) {
        claims.set(slug, [...(claims.get(slug) ?? []), `${track.title}/${stage.title}`]);
      }
    }
  }
  for (const lab of LIVE_LABS) {
    const owners = claims.get(lab.slug) ?? [];
    assert.equal(
      owners.length,
      1,
      `lab "${lab.slug}" is claimed by ${owners.length} stages (${owners.join(', ') || 'none'}); an unclaimed lab is missing from the map`,
    );
  }
});

check('the stages with no lab are the ones we mean', () => {
  // Drawn later as a public statement about what this site does not cover, so
  // a stage losing its labs by accident must not read as that statement.
  const without = TRACKS.flatMap((track) =>
    track.stages.filter((stage) => !stage.labs?.length).map((stage) => `${track.id}/${stage.id}`),
  );
  assert.deepEqual(without, [
    'games/foundations',
    'games/engines',
    'games/systems',
    'games/ship',
  ]);
});

check('resource anchors are unique', () => {
  const ids = new Set(ALL_RESOURCES.map((resource) => resourceId(resource.url)));
  assert.equal(
    ids.size,
    ALL_RESOURCES.length,
    'two resources collapse to one anchor, so one of them can never be linked to',
  );
  assert.equal(resourceId('https://thebookofshaders.com/'), 'thebookofshaders-com');
  for (const id of ids) {
    assert.ok(/^[a-z0-9][a-z0-9-]*$/.test(id), `"${id}" is not a usable anchor`);
  }
});

console.log(`\n${passed} route checks passed`);
