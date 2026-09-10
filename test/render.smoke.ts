/**
 * The rendering smoke test.
 *
 * Everything else here checks maths, content and shader strings. None of it can
 * tell you that a lab actually drew something — and the two worst regressions
 * this project has had were both invisible to every suite and caught by a human
 * looking at a screenshot: a released GL context that blanked every canvas, and
 * a bind-group mismatch that produced a black rectangle and 199 validation
 * warnings a second.
 *
 * So this loads each lab in a real browser and asserts, in both themes: the
 * page has a canvas with a size, nothing was logged as an error, no lab is
 * showing its own failure card, the pixels are not all the same colour — and
 * then it moves a control and checks that the picture moved with it.
 *
 * That last part is the whole point of the file now. For a year this suite
 * contained zero clicks: it proved every page returned 200 and every canvas
 * drew, and never once proved that a control did anything. The cost was
 * measured on 2026-09-08, by hand: the texture lab's magnification filter moved
 * 0.000 of the picture in every state the lab offered by name, and no suite
 * could have said so.
 *
 * Deliberately NOT part of `npm test`, because `npm run build` runs that and
 * Vercel has no browsers. CI installs chromium and runs this separately.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium, type Browser, type ConsoleMessage, type Page } from 'playwright';

import { LIVE_LABS } from '../lib/labs.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Every route, built from the registries rather than listed by hand — the last
 * time these were hand-picked, the one route that was broken was the one nobody
 * had thought to add.
 */
const STATIC_ROUTES = [
  '/',
  '/labs',
  '/tech',
  '/tech/choose',
  ...TECHNOLOGIES.map((tech) => `/tech/${tech.slug}`),
  '/learn',
  '/glossary',
  '/symptoms',
  '/roadmap',
  '/changelog',
  '/about',
  '/privacy',
];

/**
 * A path that does not exist, so `app/not-found.tsx` renders.
 *
 * It is a real page — Header, Footer, a card for every live lab, two CTAs — and
 * for a long time no suite touched it, because it is `not-found.tsx` rather
 * than a `page.tsx` in a directory and every route list here was built from
 * directories. Both bugs the guards below exist for apply to it: the card grid
 * has exactly LIVE_LABS.length cards, so it takes the same half-empty-row
 * off-by-one the lab index needed LabsTailCard to fix, and horizontal overflow
 * has regressed three times, always on a phone.
 */
const NOT_FOUND_ROUTE = '/this-route-does-not-exist';

const ALL_ROUTES = [
  ...STATIC_ROUTES,
  ...LIVE_LABS.map((lab) => `/labs/${lab.slug}`),
  NOT_FOUND_ROUTE,
];

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3111';
const START_SERVER = !process.env.SMOKE_BASE_URL;

let passed = 0;
let skipped = 0;
/**
 * Eight of the ten labs have a camera; the shader lab and the compute lab do
 * not. Counted, because a lab that loses its camera altogether would otherwise
 * turn the arrow-key check into a skip nobody reads.
 *
 * The expectation is derived rather than written down, because a written-down 8
 * was wrong on half the machines that run this. One of the eight — instancing —
 * is WebGPU, and a browser with no adapter renders its unsupported card instead
 * of a canvas. That is CI: this check hard-coded 8, found 7 and failed there,
 * while passing locally where swiftshader does supply an adapter. So it asks
 * the source how many cameras exist, then subtracts the ones this particular
 * browser cannot show.
 */
let labsWithCamera = 0;

/**
 * A lab offers an orbiting canvas if it hands `onDrag` to a GLCanvas — which is
 * what makes that component focusable and append "Arrow keys orbit the camera."
 * to its label — or, for the one WebGPU lab that draws its own canvas, if it
 * writes that sentence itself. Both are the same contract the ORBITING selector
 * matches on at runtime, read from the source instead of the page.
 */
function labsOfferingACamera(): string[] {
  return LIVE_LABS.filter((lab) => {
    const guesses = [
      `${lab.slug[0].toUpperCase()}${lab.slug.slice(1)}Lab.tsx`,
      `${lab.slug[0].toUpperCase()}${lab.slug.slice(1).replace(/s$/, '')}Lab.tsx`,
    ];
    const file = guesses
      .map((name) => join(ROOT, 'components/labs', name))
      .find((path) => existsSync(path));
    if (!file) return false;
    const source = readFileSync(file, 'utf8');
    return source.includes('onDrag') || source.includes('Arrow keys orbit');
  }).map((lab) => lab.slug);
}
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.error(`  NOT OK  ${name}\n          ${message}`);
  }
}

/**
 * A check that could not run here, counted and named.
 *
 * A pixel assertion on a WebGPU lab needs a WebGPU adapter, and whether one
 * exists depends on the box: Playwright's Chromium finds one on this laptop
 * through SwiftShader and may find none on a CI runner. Both are legitimate.
 * What is not legitimate is a silent pass, so every skip prints and the run
 * ends with the count.
 */
function skip(name: string, why: string) {
  skipped += 1;
  console.log(`  --  ${name} (skipped: ${why})`);
}

/** Console noise that is the browser's problem rather than the site's. */
const IGNORED = [
  // Chromium says this on every WebGPU page when no discrete GPU is present.
  'GroupMarkerNotSet',
  'Automatic fallback to software WebGL',
  'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
];

/**
 * The canvas the lab's controls actually drive.
 *
 * Each lab page is an essay with live figures in it and the full instrument at
 * the foot, so `document.querySelector('canvas')` — what this file used for a
 * year — returns the FIRST figure in the prose, not the lab. Measured on
 * /labs/transform: six canvases, the first five between 297x222 and 405x227,
 * the instrument 766x526. Every "the canvas actually drew something" check in
 * this suite was passing on an essay figure, and the calibration table below
 * was plainly measured against the instrument, which is what the numbers still
 * match. Largest drawing buffer wins: the instrument fills the main column and
 * a figure never comes close.
 */
const INSTRUMENT = `Array.from(document.querySelectorAll('canvas'))
  .slice().sort((a, b) => b.width * b.height - a.width * a.height)[0]`;

/**
 * The canvas that orbits, which is not always the biggest one.
 *
 * /labs/projection ships two: the outside view that orbits (766x430) and the
 * through-the-lens view that does not (766x478). Picking by size would test the
 * arrow keys against the canvas that has no camera and conclude they do
 * nothing.
 *
 * Found by the promise it makes rather than by `tabIndex === 0`, which is the
 * thing being checked: GLCanvas appends "Arrow keys orbit the camera." to the
 * accessible name of any canvas that takes a drag, so deleting the tabIndex
 * that made it focusable fails this check instead of quietly turning it into a
 * skip.
 */
const ORBITING = `Array.from(document.querySelectorAll('canvas'))
  .filter((c) => (c.getAttribute('aria-label') || '').includes('Arrow keys orbit'))
  .sort((a, b) => b.width * b.height - a.width * a.height)[0]`;

/**
 * Bring a canvas on screen and give its loop a moment to draw.
 *
 * GLCanvas pauses a figure's render loop while it is off screen, so the
 * instrument at the foot of a lab page is not drawing when the page loads: it
 * holds whatever it painted at mount. That is invisible while the palette never
 * changes, and very visible when it does — in light mode the instrument holds
 * the dark-palette frame it drew before the theme resolved, and every pixel
 * assertion in this file would be made against a frame from before the reader
 * arrived. Scrolling first is what a reader does anyway.
 */
function scrollIntoView(target: string) {
  return `(() => { const c = ${target}; if (c) c.scrollIntoView({ block: 'center' }); return !!c; })()`;
}

/**
 * How much of a picture is on the canvas, measured in the page rather than from
 * a screenshot.
 *
 * Screenshotting was the obvious approach and it was wrong twice over: headless
 * Chromium did not composite the WebGL content into the capture at all, and the
 * site's blueprint-grid background showed through the transparent canvas and
 * measured as detail. The first version of this test passed with every single
 * lab blank. Reading the canvas itself removes both problems.
 *
 * Sampled across several frames and the best reading kept, because a lab's own
 * rAF callback and this one race for position within a frame.
 */
const SAMPLE_CANVAS = `(() => new Promise((resolve) => {
  const canvas = ${INSTRUMENT};
  if (!canvas) return resolve({ error: 'no canvas on the page' });
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return resolve({ error: 'no 2d context for sampling' });

  let best = { unique: 0, sd: 0 };
  let frames = 0;
  const tick = () => {
    frames++;
    ctx.clearRect(0, 0, off.width, off.height);
    try { ctx.drawImage(canvas, 0, 0); }
    catch (e) { return resolve({ error: 'could not read the canvas: ' + e }); }
    const data = ctx.getImageData(0, 0, off.width, off.height).data;
    const seen = new Set();
    const lum = [];
    for (let i = 0; i < data.length; i += 16) {
      // A transparent sample is "nothing was drawn here", not a colour.
      if (data[i + 3] === 0) { lum.push(0); continue; }
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      lum.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    }
    const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
    const sd = Math.sqrt(lum.reduce((s, v) => s + (v - mean) ** 2, 0) / lum.length);
    if (seen.size > best.unique) best = { unique: seen.size, sd: Number(sd.toFixed(2)) };
    if (frames < 12) requestAnimationFrame(tick); else resolve(best);
  };
  requestAnimationFrame(tick);
}))()`;

/**
 * Calibrated against measurements rather than guessed — twice, because both
 * guesses failed healthy labs. What the real labs actually measure:
 *
 *   depth         4 colours, sd 24.0   <- two flat-shaded panels
 *   pipeline     19 colours, sd 10.3   <- a wireframe scene
 *   transform    92 colours, sd 14.8
 *   projection  232 colours, sd 13.0
 *   shader      291 colours, sd  8.9
 *   colour      392 colours, sd 62.1
 *   shading    1431 colours, sd 36.2
 *   instancing 2156 colours, sd 32.1
 *   textures   5326 colours, sd 52.3
 *
 * A canvas that drew nothing measures 1 colour and sd 0.
 *
 * The colour count is the weaker signal and nearly caused a false failure: a
 * scene of flat-shaded quads is legitimately almost monochrome, and insisting
 * otherwise would make the suite lie about a lab that renders perfectly. The
 * luminance spread is what actually separates "drew something" from "drew
 * nothing", and the two together still catch a blank canvas with room to spare.
 */
const MIN_COLOURS = 3;
const MIN_STD_DEV = 3;

/** What the in-page sampler resolves with. */
interface CanvasStats {
  unique: number;
  sd: number;
  error?: string;
}

/**
 * A fingerprint of the picture, averaged over 32 frames.
 *
 * Two decisions here were both bought with a failed attempt.
 *
 * Resolution: an earlier sweep fingerprinted at 60x40, which averages away
 * anything at texel scale and reported "no change" for controls that plainly
 * work. 480x300 keeps them. It is still a downsample of a 766-wide instrument,
 * and it still cannot see the depth lab's z-fighting bands — moving the near
 * plane from 0.02 to 1 under the "Make it fight" preset moves 0.049% of the
 * picture even at the canvas's native resolution, which is why the depth lab is
 * driven by its scene switch below and not by its near plane.
 *
 * Averaging: three labs animate, so a single frame taken before and a single
 * frame taken after differ by however far the animation walked in between.
 * Averaging 32 frames cancels almost all of it — the shader lab's frame-to-
 * frame noise drops to 0.000% of pixels on the scale used here — and leaves a
 * control's effect, which does not average away because it persists.
 */
function fingerprint(target: string, frames = 32) {
  return `(() => new Promise((resolve) => {
    const W = 480, H = 300, N = ${frames};
    window.__rqShots = window.__rqShots || [];
    const canvas = ${target};
    if (!canvas) return resolve(-1);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    const acc = new Float32Array(W * H);
    let n = 0;
    const tick = () => {
      ctx.drawImage(canvas, 0, 0, W, H);
      const d = ctx.getImageData(0, 0, W, H).data;
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        acc[p] += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      }
      n++;
      if (n < N) return requestAnimationFrame(tick);
      for (let p = 0; p < acc.length; p++) acc[p] /= n;
      window.__rqShots.push(acc);
      resolve(window.__rqShots.length - 1);
    };
    requestAnimationFrame(tick);
  }))()`;
}

/**
 * How much two fingerprints differ, as the share of samples that moved.
 *
 * The mean absolute difference was the first metric and it is the wrong one:
 * it mixes "a small part of the picture changed a lot" with "the whole picture
 * changed slightly", and the labs do both. Counting samples that moved by more
 * than 6 of 255 separates the two cases cleanly. Measured on this machine, nine
 * of the ten labs' noise floors are 0.000% to the third decimal — a still scene
 * with preserveDrawingBuffer really does produce identical frames — and the
 * smallest genuine control effect is 6.469%.
 */
const MOVED_THRESHOLD = 6;

function difference(a: number, b: number) {
  return `(() => {
    const A = window.__rqShots[${a}], B = window.__rqShots[${b}];
    let moved = 0;
    for (let i = 0; i < A.length; i++) if (Math.abs(A[i] - B[i]) > ${MOVED_THRESHOLD}) moved++;
    return Number((100 * moved / A.length).toFixed(3));
  })()`;
}

/**
 * What a control has to beat.
 *
 * Not equality, and not a bare constant either. The two animated WebGPU labs
 * have a real noise floor — the compute lab measures 17.3% of samples moving
 * between two reads with nothing touched, which is larger than several genuine
 * WebGL control effects — so the bar is relative to the noise measured on that
 * lab, in that browser, moments earlier, plus a floor for the still labs where
 * the noise is zero and a ratio would divide by it.
 */
const NOISE_MULTIPLE = 2;
const CONTROL_FLOOR = 1.0;
/**
 * Orbiting gets a lower floor: six shifted arrow presses on the depth lab move
 * 0.938% of the picture, because two nearly coplanar panels seen almost
 * edge-on stay almost edge-on. Every other lab clears 2.8% and most clear 10%.
 */
const ORBIT_FLOOR = 0.5;

function bar(noise: number, floor: number) {
  return noise * NOISE_MULTIPLE + floor;
}

/**
 * The clear colour, read back off the canvas.
 *
 * The modal colour rather than the mean: the clear colour is the largest single
 * area in every lab that shows any of it, and the mean is dragged around by
 * whatever geometry happens to be on screen. Quantised to 6 bits a channel so
 * that antialiasing does not split the background into a hundred near-
 * identical entries.
 */
const BACKGROUND = `(() => new Promise((resolve) => {
  // Inside a frame callback, not beside one. A WebGPU canvas only hands its
  // contents to drawImage while the frame is being composed: read the compute
  // lab synchronously and every pixel comes back transparent, which reads as
  // luminance 0 and looks exactly like a scene that drew nothing.
  requestAnimationFrame(() => {
    const canvas = ${INSTRUMENT};
    if (!canvas) return resolve(-1);
    const off = document.createElement('canvas');
    off.width = 240; off.height = 150;
    const ctx = off.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, 240, 150);
    const d = ctx.getImageData(0, 0, 240, 150).data;
    const counts = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let key = 0, best = 0;
    for (const entry of counts) if (entry[1] > best) { best = entry[1]; key = entry[0]; }
    const r = ((key >> 12) & 63) * 4, g = ((key >> 6) & 63) * 4, b = (key & 63) * 4;
    resolve(Number((0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(1)));
  });
}))()`;

/**
 * CANVAS_PALETTE.dark.clear is 0.055 0.063 0.078 and .light.clear is
 * 0.957 0.965 0.976, which read back as luminance 15.4 and 244.3. Anything
 * between the two bounds below means the scene is not using the palette it was
 * handed — the failure this pass exists for, where a lab renders as a dark
 * rectangle sitting on a near-white page.
 */
const DARK_BACKGROUND_MAX = 90;
const LIGHT_BACKGROUND_MIN = 140;

/**
 * The one lab whose clear colour never reaches the reader.
 *
 * The shader lab's fragment shader covers the canvas, so the clear is drawn and
 * then painted over: it measures 181.2 in both themes. Exempting it is honest;
 * asserting on it would be asserting on the default shader's output.
 */
const NO_VISIBLE_CLEAR = new Set(['shader']);

/**
 * One control per lab: the one that carries the lab's argument.
 *
 * `pre` puts the lab into the state where the control means something, which is
 * not always the state it opens in. Two of those are the point of the whole
 * exercise:
 *
 *  - textures opens minified, where the MAGNIFICATION filter has nothing to do.
 *    That is not a bug and the lab says so on screen, but it means the naive
 *    assertion measures zero and would have to be deleted. Applying "Close
 *    enough to magnify" first is exactly the fix that shipped on 2026-09-08;
 *    revert that preset and this check goes to zero and fails.
 *  - shading's inverse-transpose toggle is a no-op at stretch 1, which is where
 *    the lab opens, because at uniform scale the inverse transpose IS the model
 *    matrix. Stretching first is what makes the toggle mean anything.
 *
 * The two WebGPU labs are paused before being measured. They animate, and their
 * noise floor with the animation running (17.3% and 4.7% of samples) is close
 * enough to a real control's effect to make the assertion a coin toss. Pausing
 * is itself a control doing what it says: the noise floor after it drops to
 * 0.193% and 0.000%.
 *
 * Effects measured on this machine, as the share of samples that moved, with
 * that lab's noise floor in brackets. Taken after the arrow-key check above has
 * already orbited the camera, which is why several differ from the same control
 * measured on an untouched page:
 *
 *   transform   Translate x -> 3                6.469%  (0.000%)
 *   projection  near -> 4.5                     7.165%  (0.000%)
 *   pipeline    Next stage                      8.533%  (0.000%)
 *   shading     Inverse-transpose, stretched    9.973%  (0.000%)
 *   textures    Magnification -> Linear        26.445%  (0.000%)
 *   colour      gamma -> 1                      9.501%  (0.000%)
 *   depth       Which failure -> Transparency  23.606%  (0.000%)
 *   shader      Rings preset                  100.000%  (1.272%)
 *   compute     size -> 0.02, paused           50.358%  (0.000%)
 *   instancing  Cube size -> 2.5, stopped      11.194%  (0.000%)
 *
 * And the arrow keys, on the eight labs that have a camera: 14.997, 21.937,
 * 2.823, 13.221, 49.776, 11.455, 5.355 and — the tightest reading in the file —
 * 0.938% on the depth lab, whose two nearly coplanar panels are seen almost
 * edge-on and stay that way.
 */
/**
 * The labs whose scene never stands still, and whose `pre` stops it. Measured
 * running: the compute lab's noise floor is 18.55% of samples and the
 * instancing lab's 4.7%, either of which would swallow a real control effect
 * from one of the still labs. Stopped, they measure 0.193% and 0.000%.
 */
const ANIMATED = new Set(['compute', 'instancing']);

interface Drive {
  /** What the check line says was moved. */
  what: string;
  /** Puts the lab into the state where the control matters. */
  pre?: (page: Page) => Promise<void>;
  act: (page: Page) => Promise<void>;
}

/**
 * Controls live twice on a lab page: once in the essay's figures and once in
 * the instrument at the foot, sharing accessible names. `.last()` takes the
 * instrument's, which is the one whose canvas is being measured. A wrong pick
 * would show up immediately as a control that moves nothing.
 */
const slider = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).last();
const option = (page: Page, group: string, label: string) =>
  page.getByRole('radiogroup', { name: group }).last().getByRole('radio', { name: label, exact: true });
const toggle = (page: Page, label: string) =>
  page.getByRole('switch', { name: label, exact: true }).last();
const preset = (page: Page, label: string) =>
  page.getByRole('button', { name: label, exact: true }).last();

const DRIVES: Record<string, Drive> = {
  transform: {
    what: 'Translate x to 3',
    act: async (page) => slider(page, 'Translate x').fill('3'),
  },
  projection: {
    what: 'the near plane to 4.5',
    act: async (page) => slider(page, 'Shape near').fill('4.5'),
  },
  pipeline: {
    what: 'one stage forward',
    act: async (page) => preset(page, 'Next').click(),
  },
  shading: {
    what: 'the inverse-transpose toggle, under a stretch',
    pre: async (page) => slider(page, 'Normals under scale stretch y').fill('2.2'),
    act: async (page) => toggle(page, 'Inverse-transpose').click(),
  },
  textures: {
    what: 'magnification to Linear, close enough to magnify',
    pre: async (page) => preset(page, 'Close enough to magnify').click(),
    act: async (page) => option(page, 'Magnification', 'Linear').click(),
  },
  colour: {
    what: 'gamma to 1',
    act: async (page) => slider(page, 'The comparison gamma').fill('1'),
  },
  depth: {
    what: 'the failure to Transparency',
    act: async (page) => option(page, 'Which failure', 'Transparency').click(),
  },
  shader: {
    // Not the knob. uKnob 0.5 -> 0 moves 3.983% of the picture on a quiet
    // machine and 1.756% on a loaded one, against a noise floor that rises to
    // 1.711% at the same time — the one lab where a real effect and the
    // animation are the same size. Loading a different shader replaces every
    // pixel: 100.000% against 1.272%, and it is the control the lab is about.
    what: 'the Rings preset into the editor',
    act: async (page) => preset(page, 'Rings').click(),
  },
  compute: {
    what: 'point size to 0.02',
    pre: async (page) => toggle(page, 'Running').click(),
    act: async (page) => slider(page, 'Simulation size').fill('0.02'),
  },
  instancing: {
    what: 'cube size to 2.5',
    pre: async (page) => toggle(page, 'Animate').click(),
    act: async (page) => slider(page, 'The scene Cube size').fill('2.5'),
  },
};

/**
 * Accessible names, checked where they were broken.
 *
 * On 2026-09-08 a screen reader on the transform lab heard "slider x, slider y,
 * slider z" three times over and four buttons all called "Reset", because the
 * headings that disambiguate them — Translate, Rotate, Scale — were
 * presentational. ControlGroup now carries its heading into the names through a
 * React context. Strip that context out and every group below reports a
 * duplicate.
 *
 * Scoped to a control group rather than the whole page on purpose: the page
 * also carries the essay's figures, and two figures may legitimately offer the
 * same control under their own headings.
 */
const GROUP_NAMES = `(() => {
  const problems = [];
  for (const group of document.querySelectorAll('section[role="group"]')) {
    const heading = group.querySelector('h3');
    const title = (heading ? heading.textContent : '') || '';
    const named = group.querySelectorAll('input[type="range"], button[aria-label]');
    const seen = new Map();
    for (const control of named) {
      const name = control.getAttribute('aria-label') || '';
      if (!name) { problems.push(title + ': a control with no accessible name'); continue; }
      if (!name.toLowerCase().includes(title.toLowerCase())) {
        problems.push('"' + name + '" does not carry its heading "' + title + '"');
      }
      seen.set(name, (seen.get(name) || 0) + 1);
    }
    for (const entry of seen) {
      if (entry[1] > 1) problems.push('"' + entry[0] + '" announced ' + entry[1] + ' times in "' + title + '"');
    }
  }
  return problems;
})()`;

/**
 * A radiogroup has to behave like one.
 *
 * The segmented controls announced `role="radiogroup"` while implementing none
 * of the pattern: every option was its own tab stop, so a keyboard user tabbed
 * through all of them, and the group had no accessible name. Roving tabindex
 * means exactly one option is tabbable and it is the selected one.
 */
const RADIOGROUPS = `(() => {
  const problems = [];
  for (const group of document.querySelectorAll('[role="radiogroup"]')) {
    const name = group.getAttribute('aria-label') || group.getAttribute('aria-labelledby');
    if (!name) problems.push('a radiogroup with no accessible name');
    const radios = Array.from(group.querySelectorAll('[role="radio"]'));
    const tabbable = radios.filter((r) => r.tabIndex === 0);
    if (tabbable.length !== 1) {
      problems.push('"' + name + '" has ' + tabbable.length + ' tab stops across ' + radios.length + ' options');
    }
    for (const r of tabbable) {
      if (r.getAttribute('aria-checked') !== 'true') {
        problems.push('"' + name + '" puts the tab stop on an unselected option');
      }
    }
  }
  return problems;
})()`;

/**
 * Focus rings that are drawn outside an element and clipped away by an
 * ancestor.
 *
 * The site's focus ring is `ring-2 ring-offset-2`, four pixels outside the
 * element's box. The source-panel disclosure button sits flush inside a panel
 * with `overflow-hidden`, so its ring was clipped to nothing: the one keyboard
 * stop on the site where the caret vanished. The fix was an inset ring on that
 * button, and this looks for the shape of that bug anywhere rather than for
 * that button — the ring variables have to be read while the element is
 * actually focused, because they are set by a `focus-visible:` variant.
 */
const CLIPPED_RINGS = `(() => {
  const clipped = [];
  const focusables = document.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])');
  for (const el of focusables) {
    el.focus();
    if (!el.matches(':focus-visible')) continue;
    const cs = getComputedStyle(el);
    if (cs.getPropertyValue('--tw-ring-inset').trim() === 'inset') continue;
    const pad = (parseFloat(cs.getPropertyValue('--tw-ring-offset-width')) || 0)
      + (parseFloat(cs.getPropertyValue('--tw-ring-width')) || 2);
    const box = el.getBoundingClientRect();
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.overflowX === 'visible' && ps.overflowY === 'visible') continue;
      const pb = p.getBoundingClientRect();
      if (box.left - pad < pb.left - 0.5 || box.right + pad > pb.right + 0.5
        || box.top - pad < pb.top - 0.5 || box.bottom + pad > pb.bottom + 0.5) {
        clipped.push(el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? ' "' + el.getAttribute('aria-label') + '"' : ''));
      }
      break;
    }
  }
  return clipped;
})()`;

/**
 * The instrument canvas is a known offender and is listed rather than ignored.
 *
 * Making the canvas focusable is what put a keyboard camera in eight labs, and
 * it left the canvas with the site's outside ring inside the wrapper that
 * rounds and clips it — the same defect the disclosure button had, on the
 * element the fix created. It is in GLCanvas.tsx, not in this file's gift, so
 * the check names it and fails on anything else. Fixing it will fail this
 * check too, which is the right way round: the list is meant to shrink.
 */
const KNOWN_CLIPPED_RINGS = ['canvas'];

/** The reported name is `tag "accessible name"`, so match on the tag. */
const isKnownClipped = (name: string) =>
  KNOWN_CLIPPED_RINGS.some((tag) => name === tag || name.startsWith(tag + ' '));

/**
 * Contrast, computed from the tokens the stylesheet actually resolves to.
 *
 * Measured: --fg is 16.67:1 on --bg in dark and 17.99:1 in light, --fg-muted
 * 7.30 and 6.01, --accent 10.59 and 4.79. --fg-faint is 3.97 and 3.23, below AA
 * for body text — it is used for hints at text-2xs and is deliberately quiet,
 * so it is held to 3:1 rather than let go entirely. The light palette is the
 * half nothing checked: --accent there has the least room of any token on the
 * site, 4.79 against a required 4.50.
 */
const CONTRAST = `(() => {
  const root = getComputedStyle(document.documentElement);
  const channel = (token) => root.getPropertyValue(token).trim().split(/\\s+/).map(Number);
  const linear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const luminance = (rgb) => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
  const ratio = (a, b) => {
    const la = luminance(channel(a)), lb = luminance(channel(b));
    return Number(((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2));
  };
  const out = {};
  for (const fg of ['--fg', '--fg-muted', '--fg-faint', '--accent']) {
    for (const bg of ['--bg', '--surface']) out[fg + ' on ' + bg] = ratio(fg, bg);
  }
  return out;
})()`;

/**
 * Two accessibility defects that are live right now, named so the checks above
 * fail on anything else while these two stay visible.
 *
 * Neither is in this file's gift to fix, and both are exactly the class of
 * defect the 2026-09-08 pass fixed elsewhere:
 *
 *  - components/labs/ProjectionEssay.tsx:206 puts a <Segmented> in a figure
 *    with neither a `label` prop nor a ControlGroup around it, so `aria-label`
 *    resolves to undefined and the group announces itself as an unnamed radio
 *    group. Every other segmented control on the site is named.
 *  - components/labs/TextureLab.tsx gives the Minification group two
 *    <Segmented> controls bound to the same value, so whichever one does not
 *    hold the current filter has no checked option — and roving tabindex puts
 *    the tab stop on the checked option, which means that group has no tab stop
 *    at all. It is unreachable from the keyboard in the lab's default state.
 *
 * Delete an entry when the defect goes, and the check will tell you if you
 * deleted the wrong one.
 */
const KNOWN_A11Y = [
  'a radiogroup with no accessible name',
  '"Minification" has 0 tab stops across 2 options',
];

const CONTRAST_MIN = 4.5;
const HINT_CONTRAST_MIN = 3;

// Generous, because this has to survive a loaded CI box as well as a laptop
// that happens to be compiling something else.
async function waitForServer(url: string, timeoutMs = 240_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server at ${url} did not come up within ${timeoutMs}ms`);
}

/**
 * A page with the theme decided before anything runs.
 *
 * Theme selection is `localStorage['rq-theme']`, read by the inline head script
 * before first paint, so setting it here is the whole of it — no clicking the
 * toggle on 23 routes. The context's colorScheme covers the no-stored-
 * preference path that the same script falls back to, and matching the two
 * matters: ThemeProvider starts at 'dark' and resolves on mount, so a dark run
 * has nothing to resolve and never flips mid-measurement.
 *
 * Worth recording, because it inverts what everyone assumed: Playwright's
 * default colorScheme is light, so before this the whole suite was running in
 * the LIGHT theme and the dark one was the unchecked half.
 */
async function themedPage(browser: Browser, theme: 'dark' | 'light', width = 1280, height = 900) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme });
  // Must run before the app mounts: GLCanvas reads __RQ_CAPTURE__ when it
  // creates the context, and preserveDrawingBuffer cannot be turned on
  // afterwards.
  await page.addInitScript(
    `window.__RQ_CAPTURE__ = true; try { localStorage.setItem('rq-theme', '${theme}'); } catch (e) {}`,
  );
  // A control that has gone missing should fail one check and let the run
  // finish, not spend thirty seconds waiting and then abort the suite with
  // everything after it unreported.
  page.setDefaultTimeout(10_000);
  return page;
}

/**
 * Drives a control and says what went wrong instead of throwing out of the run.
 *
 * Renaming a control's accessible name breaks the locator, not the render, and
 * the first mutation test of this file lost every check after /labs/transform
 * to a single 30-second locator timeout.
 */
async function attempt(action: () => Promise<unknown>): Promise<string | null> {
  try {
    await action();
    return null;
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).split('\n')[0];
  }
}

function watchErrors(page: Page, errors: string[]) {
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (IGNORED.some((pattern) => text.includes(pattern))) return;
    errors.push(text);
  });
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
}

/** Whether this browser can actually run the WebGPU labs. */
async function hasWebGPU(browser: Browser): Promise<boolean> {
  const page = await browser.newPage();
  try {
    // On about:blank Chromium reports no adapter even where it has one, so ask
    // from a real origin — otherwise both WebGPU labs get skipped on a machine
    // that renders them perfectly well.
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    return (await page.evaluate(`(async () => {
      if (!navigator.gpu) return false;
      try { return !!(await navigator.gpu.requestAdapter()); } catch (e) { return false; }
    })()`)) as boolean;
  } finally {
    await page.close();
  }
}

async function main() {
  let server: ChildProcess | undefined;

  if (START_SERVER) {
    console.log(`starting a production server on ${BASE}`);
    server = spawn('npx', ['next', 'start', '--port', '3111'], {
      stdio: 'ignore',
      detached: false,
    });
  }

  let browser: Browser | undefined;
  try {
    await waitForServer(BASE);

    browser = await chromium.launch({
      args: [
        // Software rendering, so this behaves the same on a laptop and on a CI
        // box with no GPU. Whether that leaves a WebGPU adapter is not the same
        // answer everywhere, so it is asked below rather than assumed.
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
      ],
    });

    const webgpu = await hasWebGPU(browser);
    console.log(`\nrendering smoke test — WebGPU adapter: ${webgpu ? 'yes' : 'no'}`);

    for (const lab of LIVE_LABS) {
      const url = `${BASE}/labs/${lab.slug}`;
      const page = await themedPage(browser, 'dark');
      const errors: string[] = [];
      watchErrors(page, errors);

      const response = await page.goto(url, { waitUntil: 'networkidle' });
      // Labs animate; give the loop a moment to actually put something up.
      await page.waitForTimeout(2500);
      await page.evaluate(scrollIntoView(INSTRUMENT));
      await page.waitForTimeout(1200);

      check(`${lab.slug}: responds 200`, () => {
        assert.equal(response?.status(), 200);
      });

      const canvas = await page.$('canvas');
      check(`${lab.slug}: has a canvas with a size`, () => {
        assert.ok(canvas, 'no canvas on the page');
      });
      if (!canvas) {
        await page.close();
        continue;
      }

      const size = await canvas.evaluate((element) => ({
        width: (element as HTMLCanvasElement).width,
        height: (element as HTMLCanvasElement).height,
      }));
      check(`${lab.slug}: the canvas has a backing store`, () => {
        assert.ok(size.width > 0 && size.height > 0, `canvas is ${size.width}x${size.height}`);
      });

      // Each lab renders a card in place of the scene when it cannot run. A
      // visible one means the lab is broken, or the browser cannot run it.
      const failureCard = await page.evaluate(() => {
        const text = document.body.innerText;
        for (const marker of [
          'would not start',
          'does not have it',
          'failed to compile',
          'Shader error',
        ]) {
          if (text.includes(marker)) return marker;
        }
        return null;
      });

      // A WebGPU lab in a browser with no adapter legitimately shows its
      // unsupported card. Saying so out loud beats a skip nobody reads, and a
      // WebGL lab showing any card is still a failure.
      const webgpuUnsupported = lab.technology === 'webgpu' && !webgpu;

      check(`${lab.slug}: is not showing a failure card`, () => {
        if (webgpuUnsupported) {
          console.log(`      (no WebGPU adapter here — pixels not checked)`);
          assert.equal(failureCard, 'does not have it', `expected the unsupported card, page shows: "${failureCard}"`);
          return;
        }
        assert.equal(failureCard, null, `page shows: "${failureCard}"`);
      });

      if (webgpuUnsupported) {
        skip(`${lab.slug}: the canvas actually drew something`, 'no WebGPU adapter');
        skip(`${lab.slug}: moving a control changes the picture`, 'no WebGPU adapter');
        skip(`${lab.slug}: the camera answers the arrow keys`, 'no WebGPU adapter');
        skip(`${lab.slug}: offers a link once a control has moved`, 'no WebGPU adapter');
      } else {
        const stats = (await page.evaluate(SAMPLE_CANVAS)) as CanvasStats;
        console.log(`      ${lab.slug}: ${stats.unique} colours, luminance sd ${stats.sd}`);

        check(`${lab.slug}: the canvas actually drew something`, () => {
          assert.equal(stats.error, undefined, String(stats.error));
          assert.ok(
            stats.unique > MIN_COLOURS,
            `only ${stats.unique} distinct colours on the canvas — it looks blank`,
          );
          assert.ok(
            stats.sd > MIN_STD_DEV,
            `luminance barely varies (sd ${stats.sd}) — the canvas looks like a flat fill`,
          );
        });

        const background = (await page.evaluate(BACKGROUND)) as number;
        if (NO_VISIBLE_CLEAR.has(lab.slug)) {
          skip(`${lab.slug}: the dark palette reaches the canvas`, 'the shader covers the clear colour');
        } else {
          check(`${lab.slug}: the dark palette reaches the canvas`, () => {
            assert.ok(
              background < DARK_BACKGROUND_MAX,
              `the canvas background reads luminance ${background} in the dark theme — the palette is not the one the page is using`,
            );
          });
        }

        // Copy link does not change a pixel and is not asserted on as if it
        // did. What it does is appear once there is something to link to —
        // counted here, before anything on the page has been touched.
        const linkBefore = await page.getByRole('button', { name: /Copy link/ }).count();
        // `pre` runs once per page, whichever measurement gets there first.
        let prepared = false;

        // The camera, from the keyboard. Eight labs have one, and until
        // 2026-09-08 every one of them was pointer-only: "drag to orbit" with
        // no way to accept the invitation. The URL is checked alongside the
        // pixels because orbiting is supposed to be shareable state, and one
        // lab kept its camera in a ref where the address bar never saw it.
        const orbits = (await page.evaluate(`!!(${ORBITING})`)) as boolean;
        if (orbits) labsWithCamera += 1;
        if (!orbits) {
          skip(`${lab.slug}: the camera answers the arrow keys`, 'this lab has no camera');
        } else {
          const drive = DRIVES[lab.slug];
          // The animated labs are stilled first, for the same reason as below:
          // their noise floor otherwise sits on top of the answer.
          if (drive?.pre && ANIMATED.has(lab.slug)) {
            await attempt(() => drive.pre!(page));
            await page.waitForTimeout(800);
            prepared = true;
          }
          await page.evaluate(scrollIntoView(ORBITING));
          await page.waitForTimeout(1000);
          const before = (await page.evaluate(fingerprint(ORBITING))) as number;
          const again = (await page.evaluate(fingerprint(ORBITING))) as number;
          const orbitNoise = (await page.evaluate(difference(before, again))) as number;
          const tabbable = (await page.evaluate(`(${ORBITING}).tabIndex`)) as number;
          const focused = (await page.evaluate(
            `(() => { const c = ${ORBITING}; c.focus(); return document.activeElement === c; })()`,
          )) as boolean;
          for (let i = 0; i < 6; i++) await page.keyboard.press('Shift+ArrowLeft');
          await page.waitForTimeout(700);
          const after = (await page.evaluate(fingerprint(ORBITING))) as number;
          const orbited = (await page.evaluate(difference(again, after))) as number;
          const query = new URL(page.url()).searchParams;
          console.log(`      ${lab.slug}: arrow keys moved ${orbited}% of the picture (noise ${orbitNoise}%)`);

          check(`${lab.slug}: the camera answers the arrow keys`, () => {
            assert.equal(tabbable, 0, 'the canvas invites arrow keys and is not focusable');
            assert.ok(focused, 'the canvas would not take focus');
            assert.ok(
              orbited > bar(orbitNoise, ORBIT_FLOOR),
              `six shifted arrow presses moved ${orbited}% of the picture, against a noise floor of ${orbitNoise}% — the camera is not listening`,
            );
            assert.ok(
              query.has('azimuth'),
              `the camera moved but the address bar does not carry it: ?${query.toString()}`,
            );
          });
        }

        // The control. Everything above proves the lab drew; this is the only
        // thing in the suite that proves the lab responds.
        const drive = DRIVES[lab.slug];
        check(`${lab.slug}: has a control worth checking`, () => {
          assert.ok(drive, `no control named for ${lab.slug} — add one to DRIVES`);
        });

        if (drive) {
          const preFailed = drive.pre && !prepared ? await attempt(() => drive.pre!(page)) : null;
          if (drive.pre && !prepared) await page.waitForTimeout(900);
          await page.evaluate(scrollIntoView(INSTRUMENT));
          await page.waitForTimeout(1000);
          const before = (await page.evaluate(fingerprint(INSTRUMENT))) as number;
          const again = (await page.evaluate(fingerprint(INSTRUMENT))) as number;
          const noise = (await page.evaluate(difference(before, again))) as number;
          const actFailed = await attempt(() => drive.act(page));
          await page.waitForTimeout(900);
          const after = (await page.evaluate(fingerprint(INSTRUMENT))) as number;
          const moved = (await page.evaluate(difference(again, after))) as number;
          const linkAfter = await page.getByRole('button', { name: /Copy link/ }).count();
          console.log(`      ${lab.slug}: ${drive.what} moved ${moved}% of the picture (noise ${noise}%)`);

          check(`${lab.slug}: moving a control changes the picture`, () => {
            assert.equal(preFailed, null, `could not set the lab up: ${preFailed}`);
            assert.equal(actFailed, null, `could not move ${drive.what}: ${actFailed}`);
            assert.ok(
              moved > bar(noise, CONTROL_FLOOR),
              `moving ${drive.what} moved ${moved}% of the picture, against a noise floor of ${noise}% — the control is not connected to the render`,
            );
          });

          check(`${lab.slug}: offers a link once a control has moved`, () => {
            assert.equal(linkBefore, 0, 'the copy-link button is offered before anything has been changed');
            assert.equal(linkAfter, 1, 'controls moved and no link to that state was offered');
          });
        }
      }

      // Accessibility. These are hand-written against the eight defects a
      // manual pass found on 2026-09-08, rather than a generic ruleset: seven
      // of them had no guard at all, and a rule that says "this input has no
      // label" would not have caught nine sliders that all had the same one.
      const radiogroups = ((await page.evaluate(RADIOGROUPS)) as string[])
        .filter((problem) => !KNOWN_A11Y.includes(problem));
      check(`${lab.slug}: every segmented control behaves like a radio group`, () => {
        assert.deepEqual(radiogroups, [], radiogroups.join('; '));
      });

      const names = ((await page.evaluate(GROUP_NAMES)) as string[])
        .filter((problem) => !KNOWN_A11Y.includes(problem));
      check(`${lab.slug}: every control announces which group it belongs to`, () => {
        assert.deepEqual(names, [], names.join('; '));
      });

      // Programmatic focus only counts as :focus-visible once the browser has
      // seen a key, so give it one.
      await page.keyboard.press('Tab');
      const clipped = (await page.evaluate(CLIPPED_RINGS)) as string[];
      const unknown = clipped.filter((name) => !isKnownClipped(name));
      check(`${lab.slug}: no focus ring is clipped away by an ancestor`, () => {
        assert.deepEqual(
          unknown,
          [],
          `${unknown.join('; ')} (known and unfixed: ${KNOWN_CLIPPED_RINGS.join(', ')})`,
        );
      });

      check(`${lab.slug}: logged no errors`, () => {
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      await page.close();
    }

    /* ------------------------------------------- the figure anchor -------
     * Every figure has an id and a `#` permalink now, and every lab writes its
     * own controls into the address bar from an effect that runs on mount
     * whether or not anything has been touched. Those two features meet in the
     * address bar, and the meeting used to go one way: `useLabState` rebuilt the
     * URL from pathname and search alone, so a reader who opened
     * `/labs/transform?rotate.ry=-120#rotate` was scrolled to the figure by the
     * browser and then, a tick later, had `#rotate` quietly deleted from the bar
     * in front of them. Nothing looked wrong — the first arrival always scrolls
     * correctly — but the link that reader copied on to the next person had lost
     * the half that says which figure to look at.
     *
     * One cold load per lab, which is what opening a shared link is. Reading the
     * figure id out of the prerendered HTML rather than from a first visit is
     * deliberate: navigating an already-mounted page to its own URL plus a
     * fragment raises a popstate that Next's router answers by restoring its own
     * canonical URL, which drops the fragment perhaps a third of the time and has
     * nothing to do with this code. No reader does that — they arrive cold or
     * they click the permalink — so the test does not either.
     */
    console.log('\nfigure anchors');
    for (const lab of LIVE_LABS) {
      const html = await (await fetch(`${BASE}/labs/${lab.slug}`)).text();
      const figure = /<figure id="([^"]+)"/.exec(html)?.[1];

      if (!figure) {
        skip(`${lab.slug}: a figure anchor survives in the address bar`, 'no figure with an id');
        continue;
      }

      const page = await themedPage(browser, 'dark');
      await page.goto(`${BASE}/labs/${lab.slug}#${figure}`, { waitUntil: 'networkidle' });
      // Long enough for every state effect on the page to have mounted and written.
      await page.waitForTimeout(1500);
      const href = (await page.evaluate(() => window.location.href)) as string;
      await page.close();

      check(`${lab.slug}: a figure anchor survives in the address bar`, () => {
        assert.ok(
          href.endsWith(`#${figure}`),
          `opened #${figure} and the address bar now reads ${href} — the anchor was ` +
            'rewritten away, so a link copied from here goes to the top of the page',
        );
      });
    }

    /* --------------------------------- the figures and the instrument ----
     * The same address bar, written by two hooks that did not know about each
     * other. `useFigureState` namespaces every key it writes under the figure's
     * id — `?translate.tx=1.5` — and merges, deleting only its own keys and
     * putting back whatever else it finds. `useLabState`, which owns the
     * instrument's unprefixed keys, rebuilt the query from its own encoding
     * alone, so the first touch of any control at the foot of the page deleted
     * every figure key above it.
     *
     * That failure is invisible on the page it happens on. The figure sliders
     * keep the positions they were restored to, so every picture stays correct;
     * only the link the reader copies next is short. With the per-figure copy
     * button it stopped being merely silent and started lying outright — a
     * button whose accessible name reads "Copy a link to figure translate in
     * this state" handed over a URL with no `translate.` key in it at all.
     *
     * So the check is the round trip a reader actually performs: move a figure,
     * move the instrument, and require both halves to still be in the bar.
     *
     * The two scripts below are source strings for the reason every other
     * evaluated snippet in this file is: tsx compiles this suite with esbuild's
     * keepNames on, which wraps any named function expression in a `__name`
     * helper that does not exist in the page. A callback passed as a function
     * dies with "__name is not defined" the moment it declares one.
     */
    console.log('\nfigure state survives the instrument');

    // Somewhere else along the track, so the key is actually written rather
    // than encoded away as still sitting at its default. Two constants rather
    // than one taking a flag: a string pageFunction is evaluated as an
    // expression and does not receive `evaluate`'s second argument, so the
    // flag arrived undefined and every lab skipped itself while reporting a
    // clean run.
    const moveSlider = (mine: boolean) => `(() => {
      const all = [...document.querySelectorAll('input[type=range]')];
      const inFigure = new Set([...document.querySelectorAll('figure[id] input[type=range]')]);
      const el = all.filter((slider) => inFigure.has(slider) === ${mine})[0];
      if (!el) return null;
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      const now = Number(el.value);
      const to = now - min > max - now ? min + (max - min) * 0.25 : min + (max - min) * 0.75;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, String(to));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      const figure = el.closest('figure');
      return { figure: figure ? figure.id : '' };
    })()`;

    for (const lab of LIVE_LABS) {
      const name = `${lab.slug}: the instrument does not erase the figures`;
      const page = await themedPage(browser, 'dark');
      await page.goto(`${BASE}/labs/${lab.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      // A range input is the control every lab has most of; a lab whose figures
      // are all segmented buttons has nothing here to drag, and is skipped
      // rather than asserted vacuously.
      const moved = (await page.evaluate(moveSlider(true))) as { figure: string } | null;
      if (!moved || !moved.figure) {
        await page.close();
        skip(name, 'no figure slider to move');
        continue;
      }
      await page.waitForTimeout(500);
      const afterFigure = (await page.evaluate('window.location.search')) as string;

      const instrument = (await page.evaluate(moveSlider(false))) as { figure: string } | null;
      if (!instrument) {
        await page.close();
        skip(name, 'no instrument slider to move');
        continue;
      }
      await page.waitForTimeout(500);
      const afterBoth = (await page.evaluate('window.location.search')) as string;
      await page.close();

      const prefix = `${moved.figure}.`;
      const figureKeys = (search: string) =>
        [...new URLSearchParams(search).keys()].filter((key) => key.startsWith(prefix));
      const labKeys = (search: string) =>
        [...new URLSearchParams(search).keys()].filter((key) => !key.includes('.'));

      check(name, () => {
        assert.ok(
          figureKeys(afterFigure).length > 0,
          `moving a slider in #${moved.figure} wrote nothing under "${prefix}" — the ` +
            `address bar reads "${afterFigure}", so this check proves nothing`,
        );
        assert.ok(
          labKeys(afterBoth).length > 0,
          `moving the instrument wrote no unprefixed key — the address bar reads "${afterBoth}"`,
        );
        assert.deepEqual(
          figureKeys(afterBoth),
          figureKeys(afterFigure),
          `the figures wrote "${afterFigure}", then the instrument left "${afterBoth}" — ` +
            `a link copied from here has lost #${moved.figure}`,
        );
      });
    }

    /* ------------------------------------------- the checks in the essays ---
     * Issue #49 put one question at the paragraph making the claim. The thing
     * that has to be true about it is not on the page at all: NOTHING IS
     * RECORDED. /privacy says "There is nothing to collect", and that sentence
     * is load-bearing — one remembered answer falsifies it, in a change that
     * would arrive looking like a kindness ("it forgets what I picked when I
     * scroll away"). Nothing about that change is visible in a screenshot, in a
     * diff review of an essay, or in any content check, which is why it is
     * asserted here, in a real browser, by answering a question and looking at
     * the storage afterwards.
     *
     * Snapshot and compare rather than assert emptiness: this suite's own
     * themedPage writes `rq-theme` before the page loads, and the theme toggle
     * is entitled to that key. What is being asserted is that answering added
     * nothing, which is the claim.
     *
     * The other two are the accessibility half. The options are buttons in a
     * list rather than a radiogroup, so each is its own tab stop and each has
     * to answer Enter and Space; and the response is announced through an
     * aria-live region that — per Check.tsx — must already exist and be empty
     * before the answer, because assistive technology announces mutations to a
     * region it has already registered and stays silent about one that arrives
     * with its content already in it.
     */
    console.log('\nchecks in the essays');

    /** The first `<Check>` on the page, found by the eyebrow it prints. */
    const CHECK_GROUP = `Array.from(document.querySelectorAll('section[role="group"]'))
      .find((g) => { const e = g.querySelector('.eyebrow'); return e && e.textContent.trim() === 'check'; })`;

    const CHECK_SHAPE = `(() => {
      const group = ${CHECK_GROUP};
      if (!group) return null;
      const options = Array.from(group.querySelectorAll('li button'));
      const live = group.querySelector('[aria-live]');
      return {
        options: options.length,
        tabbable: options.filter((b) => b.tabIndex === 0).length,
        hasLive: !!live,
        liveAtRest: live ? live.textContent.replace(/\\s+/g, ' ').trim() : null,
        // The word "correct", printed beside the right option as a direct
        // child of its button. It must not be in the DOM before anything has
        // been chosen — a reader who wanted to think first should not have the
        // answer sitting in the markup.
        marked: options.filter((b) => Array.from(b.children)
          .some((c) => c.textContent.trim() === 'correct')).length,
      };
    })()`;

    const LIVE_TEXT = `(() => {
      const group = ${CHECK_GROUP};
      const live = group ? group.querySelector('[aria-live]') : null;
      return live ? live.textContent.replace(/\\s+/g, ' ').trim() : null;
    })()`;

    /**
     * Put focus on one option without clicking it, so the key press that
     * follows is the only thing that could have answered the question.
     */
    const focusOption = (index: number) => `(() => {
      const group = ${CHECK_GROUP};
      if (!group) return null;
      const button = group.querySelectorAll('li button')[${index}];
      if (!button) return null;
      button.scrollIntoView({ block: 'center' });
      button.focus();
      return {
        focused: document.activeElement === button,
        tabIndex: button.tabIndex,
        text: button.textContent.replace(/\\s+/g, ' ').trim().slice(0, 48),
      };
    })()`;

    const STORAGE = `(() => {
      const read = (store) => { try { return Object.keys(store).sort(); } catch (e) { return ['<unreadable>']; } };
      return {
        local: read(localStorage),
        session: read(sessionStorage),
        cookie: document.cookie,
      };
    })()`;

    // The three labs that carry a check today. Read from the page rather than
    // assumed: a lab with none renders nothing and is skipped by name, which is
    // the shape issue #49 asked for — checks spread as prose gets written, and
    // no page anywhere counts how many labs have one.
    for (const lab of LIVE_LABS) {
      const name = `${lab.slug}: answering a check stores nothing`;
      const page = await themedPage(browser, 'dark');
      const errors: string[] = [];
      watchErrors(page, errors);
      await page.goto(`${BASE}/labs/${lab.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      const shape = (await page.evaluate(CHECK_SHAPE)) as {
        options: number;
        tabbable: number;
        hasLive: boolean;
        liveAtRest: string | null;
        marked: number;
      } | null;

      if (!shape) {
        await page.close();
        skip(name, 'this lab has no check');
        skip(`${lab.slug}: a check is operable from the keyboard`, 'this lab has no check');
        skip(`${lab.slug}: a check announces its response`, 'this lab has no check');
        continue;
      }

      const before = (await page.evaluate(STORAGE)) as {
        local: string[];
        session: string[];
        cookie: string;
      };

      const first = (await page.evaluate(focusOption(0))) as {
        focused: boolean;
        tabIndex: number;
        text: string;
      } | null;
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const afterEnter = (await page.evaluate(LIVE_TEXT)) as string | null;

      // A second option, chosen with Space. Two presses because a <button>
      // owes an answer to both keys, and a second answer because nothing locks.
      const second = (await page.evaluate(focusOption(1))) as {
        focused: boolean;
        tabIndex: number;
        text: string;
      } | null;
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
      const afterSpace = (await page.evaluate(LIVE_TEXT)) as string | null;

      const after = (await page.evaluate(STORAGE)) as {
        local: string[];
        session: string[];
        cookie: string;
      };
      await page.close();

      const added = after.local.filter((key) => !before.local.includes(key));
      console.log(
        `      ${lab.slug}: ${shape.options} options, ` +
          `localStorage ${before.local.length} keys before and ${after.local.length} after`,
      );

      check(name, () => {
        assert.deepEqual(
          added,
          [],
          `answering a check added ${added.join(', ')} to localStorage — /privacy says ` +
            '"There is nothing to collect", and that sentence stops being true here',
        );
        assert.deepEqual(
          after.session.filter((key) => !before.session.includes(key)),
          [],
          'answering a check wrote to sessionStorage',
        );
        assert.equal(
          after.cookie,
          before.cookie,
          `answering a check set a cookie: "${after.cookie}"`,
        );
      });

      check(`${lab.slug}: a check is operable from the keyboard`, () => {
        assert.ok(first, 'the check has no option buttons');
        assert.ok(first!.focused, `the first option would not take focus ("${first!.text}")`);
        assert.equal(
          first!.tabIndex,
          0,
          `the first option is not in the tab order (tabIndex ${first!.tabIndex}) — the ` +
            'options are separate things to read, so each one is its own tab stop',
        );
        assert.equal(
          shape.tabbable,
          shape.options,
          `${shape.tabbable} of ${shape.options} options are tabbable — every option has to ` +
            'be reachable, or the ones that are not are hidden from anyone moving by keyboard',
        );
        assert.ok(
          afterEnter && afterEnter.length > 0,
          'Enter on a focused option produced no response',
        );
        assert.ok(second!.focused, 'the second option would not take focus');
        assert.ok(
          afterSpace && afterSpace.length > 0 && afterSpace !== afterEnter,
          `Space on a second option left the response reading "${afterSpace}" — either the ` +
            'key does nothing, or the check locked after the first answer',
        );
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      check(`${lab.slug}: a check announces its response`, () => {
        assert.ok(
          shape.hasLive,
          'the check has no aria-live region, so a screen reader is told nothing when the ' +
            'response appears',
        );
        // Not "the region is empty at rest": a region holding a prompt and then
        // mutated to the response does announce, so that would fail a change
        // that is not a defect. What has to be true is that the region existed
        // BEFORE the answer — assistive technology announces mutations to a
        // region it has already registered and stays silent about one that
        // enters the tree with its content already in it — and that the
        // response arrived by mutating it rather than beside it.
        assert.notEqual(
          afterEnter,
          shape.liveAtRest,
          `the live region read "${shape.liveAtRest}" before the answer and reads the same ` +
            'after it, so the response is being rendered somewhere else and nothing is announced',
        );
        assert.equal(
          shape.marked,
          0,
          `${shape.marked} options are marked before anything was chosen — the answer is on ` +
            'the page for anyone reading the DOM',
        );
      });
    }

    check('every lab that invites arrow keys was found', () => {
      const cameras = labsOfferingACamera();
      const reachable = cameras.filter(
        (slug) => webgpu || LIVE_LABS.find((lab) => lab.slug === slug)?.technology !== 'webgpu',
      );
      const unreachable = cameras.filter((slug) => !reachable.includes(slug));
      assert.ok(
        cameras.length > 0,
        'no lab source offers an orbiting canvas — either every camera has gone, or the ' +
          'signal this reads for (onDrag, or the words "Arrow keys orbit") has been renamed',
      );
      assert.equal(
        labsWithCamera,
        reachable.length,
        `${labsWithCamera} labs offered an orbiting canvas, not ${reachable.length}. ` +
          `The source says ${cameras.length} have a camera (${cameras.join(', ')})` +
          (unreachable.length
            ? `, of which ${unreachable.join(', ')} needs WebGPU and this browser has no adapter`
            : ''),
      );
    });

    // The light theme, which until now nothing rendered at all. It is not a
    // tint: globals.css redefines every token, and lib/theme.ts carries a
    // second CANVAS_PALETTE with different clear, grid, ghost, outline and axis
    // colours and a different ambient level. A regression that blanks a canvas
    // or washes the geometry out against a near-white ground would have passed
    // the whole suite.
    console.log('\nlight theme');
    for (const lab of LIVE_LABS) {
      if (lab.technology === 'webgpu' && !webgpu) {
        skip(`${lab.slug}: draws in light theme too`, 'no WebGPU adapter');
        skip(`${lab.slug}: the light palette reaches the canvas`, 'no WebGPU adapter');
        continue;
      }
      const page = await themedPage(browser, 'light');
      const errors: string[] = [];
      watchErrors(page, errors);
      await page.goto(`${BASE}/labs/${lab.slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      await page.evaluate(scrollIntoView(INSTRUMENT));
      await page.waitForTimeout(1500);

      const themed = await page.evaluate(() => document.documentElement.dataset.theme);
      const stats = (await page.evaluate(SAMPLE_CANVAS)) as CanvasStats;

      check(`${lab.slug}: draws in light theme too`, () => {
        assert.equal(themed, 'light', `the page is in the ${themed} theme`);
        assert.equal(stats.error, undefined, String(stats.error));
        assert.ok(stats.unique > MIN_COLOURS, `only ${stats.unique} distinct colours — it looks blank`);
        assert.ok(stats.sd > MIN_STD_DEV, `luminance barely varies (sd ${stats.sd})`);
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      if (NO_VISIBLE_CLEAR.has(lab.slug)) {
        skip(`${lab.slug}: the light palette reaches the canvas`, 'the shader covers the clear colour');
      } else {
        // The clear colour, once the instrument is on screen and drawing — no
        // control touched, so this is what a reader in light mode sees.
        // Setting CANVAS_PALETTE.light.clear to the dark value fails this on
        // nine labs.
        const background = (await page.evaluate(BACKGROUND)) as number;
        console.log(`      ${lab.slug}: canvas background reads luminance ${background}`);
        check(`${lab.slug}: the light palette reaches the canvas`, () => {
          assert.ok(
            background > LIGHT_BACKGROUND_MIN,
            `the canvas background reads luminance ${background} on a light page — the scene is a dark rectangle sitting on it`,
          );
        });
      }

      await page.close();
    }

    // Contrast, in both palettes, from the tokens the browser resolved.
    for (const theme of ['dark', 'light'] as const) {
      const page = await themedPage(browser, theme);
      await page.goto(`${BASE}/labs`, { waitUntil: 'networkidle' });
      const ratios = (await page.evaluate(CONTRAST)) as Record<string, number>;
      check(`${theme} theme: text meets contrast against its background`, () => {
        for (const [pair, ratio] of Object.entries(ratios)) {
          const floor = pair.startsWith('--fg-faint') ? HINT_CONTRAST_MIN : CONTRAST_MIN;
          assert.ok(ratio >= floor, `${pair} is ${ratio}:1, under ${floor}:1`);
        }
      });
      await page.close();
    }

    // The search dialog. Dismissing it used to drop focus on <body>, and Tab
    // walked straight out of the overlay onto header controls painted
    // underneath it — aria-modal tells a screen reader the rest of the page is
    // gone and does nothing whatever about the keyboard.
    {
      const page = await themedPage(browser, 'dark');
      await page.goto(`${BASE}/labs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      await page.click('button[aria-label="Search"]');
      await page.waitForTimeout(400);
      const landed = (await page.evaluate(
        `(() => { const el = document.activeElement; return el.tagName + '/' + (el.getAttribute('aria-label') || ''); })()`,
      )) as string;
      check('search dialog: opening it puts focus in the field', () => {
        assert.equal(landed, 'INPUT/Search', `focus landed on ${landed}`);
      });

      const escaped: string[] = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        const inside = (await page.evaluate(
          `(() => { const el = document.activeElement; return !!el.closest('[role="dialog"]'); })()`,
        )) as boolean;
        if (!inside) {
          escaped.push((await page.evaluate(
            `(() => { const el = document.activeElement; return el.tagName + '/' + (el.getAttribute('aria-label') || el.textContent || '').slice(0, 30); })()`,
          )) as string);
        }
      }
      check('search dialog: Tab does not escape it', () => {
        assert.deepEqual(escaped, [], `focus reached ${escaped.join(', ')} behind the overlay`);
      });

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const restored = (await page.evaluate(
        `(() => { const el = document.activeElement; return el.tagName + '/' + (el.getAttribute('aria-label') || ''); })()`,
      )) as string;
      check('search dialog: dismissing it puts focus back on the opener', () => {
        assert.equal(restored, 'BUTTON/Search', `focus went to ${restored} instead`);
      });
      await page.close();
    }

    // The pages that are not labs still have to render.
    for (const route of STATIC_ROUTES) {
      const page = await themedPage(browser, 'dark');
      const errors: string[] = [];
      watchErrors(page, errors);

      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      check(`${route}: responds 200 and logs no errors`, () => {
        assert.equal(response?.status(), 200);
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      await page.close();
    }

    // The 404, which is a page like any other except for the status code.
    {
      const page = await themedPage(browser, 'dark');
      const errors: string[] = [];
      watchErrors(page, errors);
      const response = await page.goto(`${BASE}${NOT_FOUND_ROUTE}`, { waitUntil: 'networkidle' });
      // Chromium logs the document's own 404 status as a console error. That is
      // the status this check is asserting on, not a fault in the page.
      const noise = errors.findIndex((e) => e.includes('status of 404'));
      if (noise >= 0) errors.splice(noise, 1);
      await page.waitForTimeout(600);

      check(`${NOT_FOUND_ROUTE}: responds 404 and logs no errors`, () => {
        assert.equal(response?.status(), 404);
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      const head = await page.evaluate(() => ({
        title: document.title,
        robots: Array.from(document.querySelectorAll('meta[name="robots"]')).map(
          (m) => m.getAttribute('content') ?? '',
        ),
        cards: document.querySelectorAll('main a[href^="/labs/"]').length,
      }));
      // "The 404 page was inheriting the site's default title" is a bug this
      // project has already had once, fixed by hand and unguarded since. Next
      // emits its own noindex for this route on top of the page's, so the
      // assertion is that every robots tag agrees, not that there is one.
      check(`${NOT_FOUND_ROUTE}: carries its own title and is not indexable`, () => {
        assert.ok(
          head.title.startsWith('Page not found'),
          `the 404 is titled "${head.title}"`,
        );
        assert.ok(head.robots.length > 0, 'the 404 carries no robots directive');
        for (const content of head.robots) {
          assert.ok(content.includes('noindex'), `a robots tag on the 404 says "${content}"`);
        }
      });

      check(`${NOT_FOUND_ROUTE}: links to every live lab`, () => {
        assert.equal(head.cards, LIVE_LABS.length, `${head.cards} lab links for ${LIVE_LABS.length} labs`);
      });

      await page.close();
    }

    // Horizontal overflow has now regressed three times, always on a phone. The
    // third one hid on /labs/pipeline for weeks because this loop checked four
    // hand-picked routes and that was not one of them. It checks every route
    // now, and reports which element is sticking out rather than just that one is.
    for (const route of ALL_ROUTES) {
      const page = await themedPage(browser, 'dark', 375, 812);
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth <= viewport) return null;
        // Name the widest offender, so the failure says what to go and look at.
        let worst = null;
        for (const element of document.querySelectorAll('main *')) {
          const box = element.getBoundingClientRect();
          if (box.width === 0) continue;
          if (box.right > viewport + 1 && (!worst || box.width > worst.width)) {
            worst = {
              width: Math.round(box.width),
              tag: element.tagName.toLowerCase(),
              cls: String(element.className ?? '').slice(0, 70),
            };
          }
        }
        return { scrollWidth: document.documentElement.scrollWidth, viewport, worst };
      });
      check(`${route}: no horizontal scroll at 375px`, () => {
        assert.equal(
          overflow,
          null,
          overflow
            ? `${overflow.scrollWidth}px wide in a ${overflow.viewport}px viewport — widest offender: <${overflow.worst?.tag} class="${overflow.worst?.cls}"> at ${overflow.worst?.width}px`
            : '',
        );
      });
      await page.close();
    }

    // The print stylesheet hides every `button`, deliberately, so that a widget
    // nobody enumerated cannot print as a stranded box. The inline glossary term
    // is a button too — and it is not a control beside the prose, it is a word
    // inside it. So the blanket rule deleted 114 words from the middle of
    // printed sentences across the ten labs: "It builds a UV from the vertex
    // position" printed as "It builds a from the vertex position", and nothing
    // caught it, because on screen every one of those sentences is perfect.
    //
    // This drives the real print stylesheet in a real browser and reads the text
    // a sheet of paper would carry. Deleting the `button[data-term='inline']`
    // exemption from globals.css fails it on all ten labs at once.
    for (const lab of LIVE_LABS) {
      const page = await themedPage(browser, 'light');
      await page.goto(`${BASE}/labs/${lab.slug}`, { waitUntil: 'networkidle' });
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(300);
      const terms = await page.evaluate(() => {
        const gone: { word: string; sentence: string }[] = [];
        for (const element of document.querySelectorAll('button[data-term="inline"]')) {
          if (getComputedStyle(element).display !== 'none') continue;
          const word = (element.textContent ?? '').trim();
          const holder = element.closest('p, li');
          gone.push({
            word,
            sentence: (holder?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90),
          });
        }
        // The footer's vocabulary chips are the same component in its `chip`
        // variant, and they SHOULD stay hidden — their definitions are not in
        // the document until pressed, so they would print as bare headwords.
        const chips = Array.from(document.querySelectorAll('button[data-term="chip"]')).filter(
          (element) => getComputedStyle(element).display !== 'none',
        ).length;
        const total = document.querySelectorAll('button[data-term="inline"]').length;
        return { gone, chips, total };
      });
      await page.close();

      check(`${lab.slug}: every term still reads as a word on paper`, () => {
        assert.equal(
          terms.gone.length,
          0,
          terms.gone.length
            ? `print drops ${terms.gone.length} of ${terms.total} inline terms out of the middle of their own sentences — ` +
              terms.gone
                .slice(0, 3)
                .map((t) => `"${t.word}" from "${t.sentence}"`)
                .join('; ')
            : '',
        );
        assert.equal(
          terms.chips,
          0,
          `${terms.chips} footer vocabulary chips print as bare headwords with no definition under them`,
        );
      });
    }

    // A two-column grid holding an odd number of cards ends on a half-empty row,
    // which on an index page reads as a card that failed to load rather than as
    // the end of a list. It has happened twice: once when a seventh lab was
    // added, and again when the card added to fix that stopped being enough at
    // ten. Counting it is cheaper than noticing it. The 404 is in this list
    // because its grid holds one card per live lab and is exposed to exactly
    // the same off-by-one.
    for (const route of ['/', '/labs', '/learn', '/tech', '/tech/choose', NOT_FOUND_ROUTE]) {
      const page = await themedPage(browser, 'dark');
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const lopsided = await page.evaluate(() => {
        const offenders: string[] = [];
        for (const grid of document.querySelectorAll('main *')) {
          const style = getComputedStyle(grid);
          if (style.display !== 'grid') continue;
          const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length;
          if (columns < 2) continue;
          // Count the tracks each child occupies, so a col-span-2 card counts twice.
          let slots = 0;
          for (const child of grid.children) {
            if (child.getBoundingClientRect().height === 0) continue;
            const span = getComputedStyle(child).gridColumnEnd;
            const spanned = span.startsWith('span ') ? Number(span.slice(5)) : 1;
            slots += Number.isFinite(spanned) ? spanned : 1;
          }
          if (slots > columns && slots % columns !== 0) {
            offenders.push(`${slots} slots across ${columns} columns`);
          }
        }
        return offenders;
      });
      check(`${route}: no grid ends on a half-empty row`, () => {
        assert.deepEqual(lopsided, [], lopsided.join('; '));
      });
      await page.close();
    }
  } finally {
    await browser?.close();
    if (server) {
      server.kill('SIGTERM');
    }
  }

  console.log(`\n${passed} render checks passed${skipped > 0 ? `, ${skipped} skipped` : ''}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} FAILED:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
