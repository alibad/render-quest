/**
 * Captures the images the README shows, from the running site.
 *
 * Run with `npx tsx scripts/capture-readme-media.ts`. It boots a production
 * server the way `test/render.smoke.ts` does, drives the real labs in a real
 * browser, and writes three files into `docs/media/`.
 *
 * Why a script rather than three files somebody once made by hand: the README
 * is the only page about this project that cannot run WebGL, so every claim it
 * makes has to be carried by a picture. A picture nobody can regenerate goes
 * stale silently — the site changes, the README keeps showing last spring.
 *
 * Four things about this that are not obvious, each of them checked rather
 * than assumed:
 *
 * 1. `docs/media/`, not `screenshots/`. `.gitignore` excludes `/screenshots`,
 *    so a capture written there is committed by nobody and renders on GitHub as
 *    a broken image icon. It looks right locally, which is what makes it a
 *    mistake that survives review.
 *
 * 2. Headless Chromium DOES composite WebGL into a screenshot, given
 *    `--enable-unsafe-swiftshader` and `--use-angle=swiftshader`. The smoke
 *    test reads pixels out of the canvas in the page instead, and says
 *    screenshots did not work; that was true of how it was capturing, and the
 *    lesson to keep is the habit, not the conclusion. Every file this script
 *    writes is re-opened, decoded and measured before the run is allowed to
 *    succeed, because a capture script that quietly emits black rectangles is
 *    worse than no capture script.
 *
 * 3. Only WebGL labs are captured. This machine has no WebGPU adapter —
 *    `requestAdapter()` returns null even with the flags above — so
 *    `/labs/compute` and `/labs/instancing` would honestly record their own
 *    "this browser does not have it" card. Capturing that would be a picture of
 *    the capture box rather than of the site.
 *
 * 4. Nothing here encodes a GIF, so the GIF encoder is at the bottom of this
 *    file. Playwright records `.webm`, which GitHub will not play in a README,
 *    and a still cannot show a matrix changing as an object moves. The whole
 *    point of the first file is that the sixteen numbers move on the same
 *    frames as the cube, so it has to animate where it is read.
 *
 * The site's own principle — nothing it serves is a stock or pre-rendered
 * image — is about the site. These are recordings of the live product, made by
 * driving it. The one thing drawn that the site does not draw is the mouse
 * cursor: Playwright synthesises pointer events without rendering a pointer, so
 * a drag would otherwise look like a slider moving itself.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

import { chromium, type Browser, type Page } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3112';
const START_SERVER = !process.env.SMOKE_BASE_URL;

/** Where the captures go. `--out` moves them; the README expects the default. */
const OUT_FLAG = process.argv.indexOf('--out');
const OUT_DIR = OUT_FLAG === -1 ? join('docs', 'media') : process.argv[OUT_FLAG + 1];

/**
 * `--frames` keeps every screenshot the GIF was assembled from, as PNGs, so a
 * bad recording can be looked at rather than guessed about. Gitignored.
 */
const KEEP_FRAMES = process.argv.includes('--frames');
const FRAME_DIR = '.capture-frames';

/**
 * Wide enough that the lab keeps its two-column layout (it stacks below the
 * `lg` breakpoint) and that `main`, capped at `max-w-6xl`, is not the thing
 * being measured. Tall enough that no capture needs scrolling mid-recording,
 * which also keeps the sticky control column where the reader sees it.
 */
const VIEWPORT = { width: 1192, height: 1500 };

/** 12.5fps, in the hundredths of a second a GIF delay field counts in. */
const FRAME_DELAY = 8;
const FRAME_COUNT = 60;

/**
 * What a canvas region has to measure before a file is allowed to be written.
 * Same two numbers, and the same reasoning, as the rendering smoke test: the
 * colour count alone would fail a legitimately flat-shaded scene, and the
 * luminance spread alone would pass a gradient of noise. A canvas that drew
 * nothing measures 1 colour and sd 0.
 */
const MIN_COLOURS = 3;
const MIN_STD_DEV = 3;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Image {
  width: number;
  height: number;
  /** RGBA, four bytes per pixel, row-major. */
  data: Uint8Array;
}

interface Stats {
  unique: number;
  sd: number;
}

/** What `measure` resolves with: the capture rectangle and what must not be blank. */
interface Measured {
  clip: Rect;
  canvases: Rect[];
}

const written: string[] = [];
const failures: string[] = [];

// ---------------------------------------------------------------------------
// The server, and the browser
// ---------------------------------------------------------------------------

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

async function openPage(browser: Browser, path: string): Promise<Page> {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    // The site follows the system preference unless told otherwise, and the
    // labs are drawn for the dark palette. Left to the browser default these
    // would all come back light.
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });
  // Must run before the app mounts: GLCanvas reads this when it creates the
  // context, and preserveDrawingBuffer cannot be turned on afterwards. Without
  // it a screenshot can land in the window between a frame being composited and
  // the buffer being cleared, and come back empty — rare, and ruinous in the
  // middle of a sixty-frame recording.
  await page.addInitScript(() => {
    (window as { __RQ_CAPTURE__?: boolean }).__RQ_CAPTURE__ = true;
  });
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  // Labs animate; give the loop a moment to actually put something up.
  await page.waitForTimeout(2500);
  return page;
}

// ---------------------------------------------------------------------------
// Finding the instrument on the page
// ---------------------------------------------------------------------------

/**
 * Where each capture's rectangle is, worked out from the page rather than
 * written down here.
 *
 * Every lab is an essay with figures followed by the full instrument, so a
 * hard-coded selector would be a class list copied out of a component — the
 * kind of fact that goes wrong the first time somebody restyles a panel. These
 * walk up from the last canvas on the page (the instrument's own) until they
 * reach the element that also holds the thing the capture is about: the matrix
 * table, the second canvas, the compiler's message.
 *
 * Returns document coordinates — `frameUp` converts them to the viewport
 * coordinates a screenshot clip wants — plus the canvas rectangles that have to
 * prove they are not blank.
 *
 * Written as source text rather than as a function, for the same reason the
 * smoke test's sampler is: tsx compiles a named function through esbuild's
 * keepNames, which wraps it in a `__name` helper that exists in Node and not in
 * the page. A function this size fails in the browser with a ReferenceError
 * that says nothing about why.
 */
const measure = (kind: 'transform' | 'projection' | 'shader') => `((kind) => {
  const box = (element) => {
    const r = element.getBoundingClientRect();
    return {
      x: r.left + window.scrollX,
      y: r.top + window.scrollY,
      width: r.width,
      height: r.height,
    };
  };

  const union = (rects) => {
    const left = Math.min(...rects.map((r) => r.x));
    const top = Math.min(...rects.map((r) => r.y));
    const right = Math.max(...rects.map((r) => r.x + r.width));
    const bottom = Math.max(...rects.map((r) => r.y + r.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  };

  const up = (from, holds) => {
    let element = from;
    while (element && element !== document.body) {
      if (holds(element)) return element;
      element = element.parentElement;
    }
    throw new Error('walked up to the body without finding the lab');
  };

  const canvases = Array.from(document.querySelectorAll('main canvas'));
  const last = canvases[canvases.length - 1];
  if (!last) throw new Error('no canvas on the page');

  if (kind === 'projection') {
    // Two canvases, the frustum from outside and what the camera makes of it.
    // Their nearest shared ancestor is the capture.
    const both = up(last, (element) => element.querySelectorAll('canvas').length === 2);
    return {
      clip: box(both),
      canvases: Array.from(both.querySelectorAll('canvas')).map(box),
    };
  }

  // Both remaining captures want the whole instrument: the canvas, the controls
  // that drive it, and the readout that answers it. The grid is the element
  // that holds an <aside> — the control column — alongside the canvas.
  const grid = up(last, (element) => Boolean(element.querySelector('aside')));
  const aside = grid.querySelector('aside');

  // The canvas cell is whichever grid child contains the canvas. On the shader
  // lab that cell carries the editor as well, which is the point of the shot.
  const cell = Array.from(grid.children).find((child) => child.contains(last));
  if (!cell) throw new Error('the canvas is not inside the lab grid');

  // The readout panel, found by what it says rather than by how it is styled.
  const anchor = kind === 'transform'
    ? grid.querySelector('table')
    : Array.from(grid.querySelectorAll('span')).find(
        (element) => (element.textContent || '').trim() === 'Will not compile',
      );
  if (!anchor) {
    throw new Error(kind === 'transform'
      ? 'the matrix readout is not on the page'
      : 'nothing on the page says the shader will not compile');
  }
  const panel = up(anchor, (element) => element.classList.contains('panel'));

  // Down to the bottom of the readout and no further, so the capture does not
  // trail off into the collapsed source panel underneath it.
  const content = union([box(cell), box(panel)]);
  const controls = box(aside);

  // The control column comes in only when it reaches the bottom of that — then
  // it is merely cropped, which is what a reader scrolling past it sees anyway.
  // Where it is shorter, taking its right-hand edge would spend a third of the
  // picture on empty background, and the shot reads as a mistake rather than as
  // a lab.
  const reaches = controls.y + controls.height >= content.y + content.height - 1;
  return {
    clip: {
      x: content.x,
      y: content.y,
      width: reaches ? controls.x + controls.width - content.x : content.width,
      height: content.height,
    },
    canvases: [box(last)],
  };
})(${JSON.stringify(kind)})`;

/**
 * Scrolls a rectangle fully into view and returns it in the coordinates
 * `page.screenshot` actually uses.
 *
 * `clip` is measured from the top-left of the viewport, not of the document —
 * the first attempt passed document coordinates and Chromium refused with
 * "clipped area is either empty or outside the resulting image", which is at
 * least a loud way to be wrong. The viewport is tall enough for every capture
 * here, so nothing has to scroll while a recording is running.
 */
async function frameUp(page: Page, clip: Rect): Promise<Rect> {
  await page.evaluate((y: number) => window.scrollTo(0, y), Math.max(0, clip.y - 60));
  await page.waitForTimeout(300);
  const scroll = (await page.evaluate(
    '({ x: window.scrollX, y: window.scrollY })',
  )) as { x: number; y: number };
  const view = {
    x: clip.x - scroll.x,
    y: clip.y - scroll.y,
    width: clip.width,
    height: clip.height,
  };
  if (view.y < 0 || view.y + view.height > VIEWPORT.height) {
    throw new Error(
      `the capture is ${Math.round(view.height)}px tall and will not sit in a ${VIEWPORT.height}px viewport`,
    );
  }
  return view;
}

// ---------------------------------------------------------------------------
// The cursor Playwright does not draw
// ---------------------------------------------------------------------------

const CURSOR = `
(() => {
  const el = document.createElement('div');
  el.id = '__rq_cursor';
  el.style.cssText =
    'position:fixed;left:-100px;top:-100px;z-index:2147483647;pointer-events:none;' +
    'width:34px;height:34px;margin:-9px 0 0 -9px;';
  el.innerHTML =
    '<svg width="34" height="34" viewBox="0 0 34 34">' +
    '<circle id="__rq_cursor_ring" cx="9" cy="9" r="12" fill="#7dd3fc" opacity="0"/>' +
    '<path d="M3 2 L3 22.5 L8.4 17.4 L11.8 24.6 L15.2 23 L11.9 16 L18.5 16 Z" ' +
    'fill="#ffffff" stroke="#0e1014" stroke-width="1.4" stroke-linejoin="round"/>' +
    '</svg>';
  document.body.appendChild(el);
})()`;

async function moveCursor(page: Page, x: number, y: number, pressed: boolean) {
  await page.mouse.move(x, y);
  await page.evaluate(
    ({ x: cx, y: cy, pressed: down }: { x: number; y: number; pressed: boolean }) => {
      const el = document.getElementById('__rq_cursor');
      const ring = document.getElementById('__rq_cursor_ring');
      if (!el) return;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      if (ring) ring.setAttribute('opacity', down ? '0.28' : '0');
    },
    { x, y, pressed },
  );
}

// ---------------------------------------------------------------------------
// Measuring what came back
// ---------------------------------------------------------------------------

/**
 * Distinct colours and luminance spread over a region of an image.
 *
 * A page screenshot is mostly text and panels, which vary plenty even when the
 * canvas in the middle of it is a black hole — so this is always run over the
 * canvas rectangles, never over the whole capture. That is the check the whole
 * script exists to pass.
 */
function statsIn(image: Image, region?: Rect): Stats {
  const x0 = Math.max(0, Math.round(region?.x ?? 0));
  const y0 = Math.max(0, Math.round(region?.y ?? 0));
  const x1 = Math.min(image.width, Math.round((region?.x ?? 0) + (region?.width ?? image.width)));
  const y1 = Math.min(image.height, Math.round((region?.y ?? 0) + (region?.height ?? image.height)));

  const seen = new Set<number>();
  const luminance: number[] = [];
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * image.width + x) * 4;
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      seen.add((r << 16) | (g << 8) | b);
      luminance.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
  }
  if (luminance.length === 0) return { unique: 0, sd: 0 };
  const mean = luminance.reduce((a, b) => a + b, 0) / luminance.length;
  const variance =
    luminance.reduce((sum, v) => sum + (v - mean) ** 2, 0) / luminance.length;
  return { unique: seen.size, sd: Number(Math.sqrt(variance).toFixed(2)) };
}

function assertNotBlank(what: string, stats: Stats) {
  if (stats.unique <= MIN_COLOURS) {
    throw new Error(
      `${what}: only ${stats.unique} distinct colours — it is a flat rectangle`,
    );
  }
  if (stats.sd <= MIN_STD_DEV) {
    throw new Error(
      `${what}: luminance barely varies (sd ${stats.sd}) — it is a flat fill`,
    );
  }
}

// ---------------------------------------------------------------------------
// PNG, far enough to read one
// ---------------------------------------------------------------------------

/**
 * Decodes the PNGs Playwright hands back. Eight bits a channel, no interlace,
 * RGB or RGBA — which is all Chromium ever writes — and a loud error for
 * anything else rather than a silent misread.
 */
function decodePng(png: Buffer): Image {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < signature.length; i += 1) {
    if (png[i] !== signature[i]) throw new Error('not a PNG');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let interlace = 0;
  const parts: Buffer[] = [];

  let at = 8;
  while (at + 8 <= png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + length);
    at += 12 + length;
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colourType = body[9];
      interlace = body[12];
    } else if (type === 'IDAT') {
      parts.push(body);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || interlace !== 0 || (colourType !== 2 && colourType !== 6)) {
    throw new Error(
      `unsupported PNG: depth ${bitDepth}, colour type ${colourType}, interlace ${interlace}`,
    );
  }

  const channels = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const data = new Uint8Array(width * height * 4);

  let previous = new Uint8Array(stride);
  let line = new Uint8Array(stride);
  let read = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[read];
    read += 1;
    line.set(raw.subarray(read, read + stride));
    read += stride;
    unfilter(filter, line, previous, channels);

    for (let x = 0; x < width; x += 1) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      data[target] = line[source];
      data[target + 1] = line[source + 1];
      data[target + 2] = line[source + 2];
      data[target + 3] = channels === 4 ? line[source + 3] : 255;
    }

    const swap = previous;
    previous = line;
    line = swap;
  }

  return { width, height, data };
}

function unfilter(filter: number, line: Uint8Array, previous: Uint8Array, bpp: number) {
  const n = line.length;
  switch (filter) {
    case 0:
      break;
    case 1:
      for (let i = bpp; i < n; i += 1) line[i] = (line[i] + line[i - bpp]) & 255;
      break;
    case 2:
      for (let i = 0; i < n; i += 1) line[i] = (line[i] + previous[i]) & 255;
      break;
    case 3:
      for (let i = 0; i < n; i += 1) {
        const left = i >= bpp ? line[i - bpp] : 0;
        line[i] = (line[i] + ((left + previous[i]) >> 1)) & 255;
      }
      break;
    case 4:
      for (let i = 0; i < n; i += 1) {
        const a = i >= bpp ? line[i - bpp] : 0;
        const b = previous[i];
        const c = i >= bpp ? previous[i - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        line[i] = (line[i] + predictor) & 255;
      }
      break;
    default:
      throw new Error(`unknown PNG filter ${filter}`);
  }
}

// ---------------------------------------------------------------------------
// The three captures
// ---------------------------------------------------------------------------

/**
 * The transform lab's instrument, with a translate slider dragged out and back.
 *
 * The drag is on the slider rather than on the canvas on purpose: dragging the
 * canvas orbits the camera, which moves the cube and changes nothing in the
 * matrix. The claim the README is making is that the sixteen numbers are the
 * cube, so the recording has to be of the one gesture where both move together.
 */
async function captureTransformDrag(browser: Browser, outDir: string) {
  const page = await openPage(browser, '/labs/transform');
  const { clip, canvases } = (await page.evaluate(measure('transform'))) as Measured;
  const view = await frameUp(page, clip);
  await page.evaluate(CURSOR);

  // The essay above has figures with sliders of their own, so this is scoped to
  // the instrument's own control column — the last <aside> on the page.
  const controls = page.locator('main aside').last();
  const slider = controls.getByRole('slider', { name: 'Translate x' });
  const box = await slider.boundingBox();
  if (!box) throw new Error('the translate x slider has no box');

  // Where the thumb's centre sits for a given value. The thumb is 14px across
  // and its travel is inset by half of that at each end.
  const inset = 7;
  const min = Number(await slider.getAttribute('min'));
  const max = Number(await slider.getAttribute('max'));
  const at = (value: number) =>
    box.x + inset + ((value - min) / (max - min)) * (box.width - inset * 2);
  const trackY = box.y + box.height / 2;

  // The recording starts and ends at zero so the loop has no seam. Getting
  // there is a click on the track, which is what a reader would do, and is not
  // part of the recording.
  await moveCursor(page, at(0), trackY, false);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(400);

  // Hold, out to 1.5, hold, back to 0, hold.
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) ** 2);
  const path: number[] = [];
  for (let i = 0; i < FRAME_COUNT; i += 1) {
    if (i < 6) path.push(0);
    else if (i < 30) path.push(1.5 * ease((i - 6) / 23));
    else if (i < 36) path.push(1.5);
    else if (i < 54) path.push(1.5 * (1 - ease((i - 36) / 17)));
    else path.push(0);
  }

  await page.mouse.down();
  const frames: Image[] = [];
  const readouts: string[] = [];
  if (KEEP_FRAMES) mkdirSync(FRAME_DIR, { recursive: true });

  for (let i = 0; i < path.length; i += 1) {
    await moveCursor(page, at(path[i]), trackY, true);
    // One frame for React to re-render and one for the lab to redraw with it.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
    );
    const shot = await page.screenshot({ clip: view });
    if (KEEP_FRAMES) {
      writeFileSync(join(FRAME_DIR, `transform-${String(i).padStart(3, '0')}.png`), shot);
    }
    frames.push(decodePng(shot));
    readouts.push(await slider.inputValue());
  }
  await page.mouse.up();

  // The recording is worthless if the drag moved nothing, and a slider that
  // silently refused would produce sixty identical frames and no complaint.
  const reached = Math.max(...readouts.map(Number));
  if (reached < 1.2) {
    throw new Error(`the translate slider only reached ${reached} — the drag did not take`);
  }
  const moved = new Set(readouts).size;
  if (moved < 20) {
    throw new Error(`the slider showed only ${moved} distinct values across ${FRAME_COUNT} frames`);
  }

  // Canvas rectangles are in document coordinates; inside the capture they are
  // offset by the clip's own origin.
  const canvasRegions = canvases.map((r) => ({
    x: r.x - clip.x,
    y: r.y - clip.y,
    width: r.width,
    height: r.height,
  }));
  for (const index of [0, Math.floor(FRAME_COUNT / 2)]) {
    assertNotBlank(`transform-drag.gif frame ${index} canvas`, statsIn(frames[index], canvasRegions[0]));
  }

  const gif = encodeGif(frames, FRAME_DELAY);
  const file = join(outDir, 'transform-drag.gif');
  writeFileSync(file, gif);
  await page.close();

  return {
    file,
    note: `${frames.length} frames, ${((frames.length * FRAME_DELAY) / 100).toFixed(1)}s, translate x 0 → ${reached}`,
    canvasRegions,
  };
}

/** One still, both canvases: the frustum from outside and what it renders. */
async function captureFrustum(browser: Browser, outDir: string) {
  const page = await openPage(browser, '/labs/projection');
  const { clip, canvases } = (await page.evaluate(measure('projection'))) as Measured;
  const view = await frameUp(page, clip);

  const shot = await page.screenshot({ clip: view });
  const file = join(outDir, 'frustum.png');
  writeFileSync(file, shot);
  await page.close();

  const canvasRegions = canvases.map((r) => ({
    x: r.x - clip.x,
    y: r.y - clip.y,
    width: r.width,
    height: r.height,
  }));
  return { file, note: `${canvases.length} canvases in one frame`, canvasRegions };
}

/**
 * The shader lab with its own "Break it on purpose" preset applied.
 *
 * The broken source is the site's, not this script's: clicking the preset is
 * the affordance a reader has, and the error under the editor is the graphics
 * driver's own text. Typing a different mistake in here would be a picture of
 * something the site does not ship.
 */
async function captureShaderError(browser: Browser, outDir: string) {
  const page = await openPage(browser, '/labs/shader');
  await page.getByRole('button', { name: 'Break it on purpose' }).click();
  // The lab recompiles as you type; give it the keystroke it thinks it had.
  await page.waitForTimeout(1200);
  await page.getByText('Will not compile').waitFor({ state: 'visible' });

  const { clip, canvases } = (await page.evaluate(measure('shader'))) as Measured;
  const view = await frameUp(page, clip);

  const shot = await page.screenshot({ clip: view });
  const file = join(outDir, 'shader-error.png');
  writeFileSync(file, shot);
  await page.close();

  const canvasRegions = canvases.map((r) => ({
    x: r.x - clip.x,
    y: r.y - clip.y,
    width: r.width,
    height: r.height,
  }));
  return { file, note: 'the preset’s two errors, and the driver’s reply', canvasRegions };
}

// ---------------------------------------------------------------------------
// Reading the files back
// ---------------------------------------------------------------------------

/**
 * Opens a written file the way a reader's browser will, and measures it.
 *
 * Checking the frames still in memory would prove only that this script agrees
 * with itself. Decoding the bytes on disk with Chromium's own decoders is the
 * check that matters: it catches a GIF this file encoded wrongly as readily as
 * it catches a black canvas, and it is the one an animated GIF cannot fake.
 */
async function verifyFile(browser: Browser, file: string, regions: Rect[]) {
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  const bytes = statSync(file).size;
  const base64 = readFileSync(file).toString('base64');
  const mime = file.endsWith('.gif') ? 'image/gif' : 'image/png';

  // The browser cuts out each canvas region and hands it back as a PNG, which
  // this file can already read. Shipping the raw pixels over the debugging
  // protocol instead would be four million numbers of JSON per image, and the
  // measuring would still have to happen twice, once in each language.
  const cut = await page.evaluate(
    async ({ data, type, rects }: { data: string; type: string; rects: Rect[] }) => {
      const image = new Image();
      image.src = `data:${type};base64,${data}`;
      await image.decode();
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        // Inline rather than a named helper: tsx compiles named functions
        // through esbuild's keepNames, whose `__name` wrapper does not exist in
        // the page.
        regions: rects.map((rect) => {
          const surface = document.createElement('canvas');
          surface.width = Math.round(rect.width);
          surface.height = Math.round(rect.height);
          const context = surface.getContext('2d');
          if (!context) throw new Error('no 2d context to decode into');
          context.drawImage(image, -Math.round(rect.x), -Math.round(rect.y));
          return surface.toDataURL('image/png').split(',')[1];
        }),
      };
    },
    { data: base64, type: mime, rects: regions },
  );
  await page.close();

  console.log(`      ${cut.width}x${cut.height}, ${bytes.toLocaleString()} bytes`);

  cut.regions.forEach((region, index) => {
    const stats = statsIn(decodePng(Buffer.from(region, 'base64')));
    assertNotBlank(`${file} canvas ${index + 1}`, stats);
    console.log(
      `      canvas ${index + 1}: ${stats.unique} colours, luminance sd ${stats.sd}`,
    );
  });
}

// ---------------------------------------------------------------------------
// GIF89a
// ---------------------------------------------------------------------------

interface Box {
  entries: { r: number; g: number; b: number; count: number; key: number }[];
  range: number;
  channel: 0 | 1 | 2;
  population: number;
}

/**
 * A palette for the whole recording, by median cut.
 *
 * 255 colours rather than 256: the last index is reserved for transparency, so
 * that every frame after the first can be a patch of only what changed. On a
 * recording where a cube moves inside a page that does not, that is the
 * difference between a file GitHub will serve and one nobody waits for.
 */
function buildPalette(frames: Image[]): { palette: number[]; lookup: Map<number, number> } {
  const histogram = new Map<number, number>();
  for (const frame of frames) {
    for (let i = 0; i < frame.data.length; i += 4) {
      const key = (frame.data[i] << 16) | (frame.data[i + 1] << 8) | frame.data[i + 2];
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
    }
  }

  const entries = Array.from(histogram, ([key, count]) => ({
    key,
    count,
    r: (key >> 16) & 255,
    g: (key >> 8) & 255,
    b: key & 255,
  }));

  const describe = (list: Box['entries']): Box => {
    let range = -1;
    let channel: 0 | 1 | 2 = 0;
    let population = 0;
    for (const axis of [0, 1, 2] as const) {
      const field = axis === 0 ? 'r' : axis === 1 ? 'g' : 'b';
      let low = 255;
      let high = 0;
      for (const entry of list) {
        const value = entry[field];
        if (value < low) low = value;
        if (value > high) high = value;
      }
      if (high - low > range) {
        range = high - low;
        channel = axis;
      }
    }
    for (const entry of list) population += entry.count;
    return { entries: list, range, channel, population };
  };

  let boxes: Box[] = [describe(entries)];
  while (boxes.length < 255) {
    // The box with the most pixels spread over the widest span: splitting the
    // most populous box alone loses small bright details, splitting the widest
    // alone spends codes on colours nobody can see.
    let target = -1;
    let score = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      if (boxes[i].entries.length < 2) continue;
      const value = boxes[i].population * (boxes[i].range + 1);
      if (value > score) {
        score = value;
        target = i;
      }
    }
    if (target === -1) break;

    const box = boxes[target];
    const field = box.channel === 0 ? 'r' : box.channel === 1 ? 'g' : 'b';
    const sorted = [...box.entries].sort((a, b) => a[field] - b[field]);
    const half = box.population / 2;
    let running = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      running += sorted[i].count;
      cut = i + 1;
      if (running >= half) break;
    }
    boxes.splice(target, 1, describe(sorted.slice(0, cut)), describe(sorted.slice(cut)));
  }

  const palette: number[] = [];
  const lookup = new Map<number, number>();
  boxes.forEach((box, index) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const entry of box.entries) {
      r += entry.r * entry.count;
      g += entry.g * entry.count;
      b += entry.b * entry.count;
      lookup.set(entry.key, index);
    }
    palette.push(
      Math.round(r / box.population),
      Math.round(g / box.population),
      Math.round(b / box.population),
    );
  });
  while (palette.length < 256 * 3) palette.push(0);

  return { palette, lookup };
}

function toIndices(frame: Image, lookup: Map<number, number>): Uint8Array {
  const indices = new Uint8Array(frame.width * frame.height);
  for (let i = 0, p = 0; i < frame.data.length; i += 4, p += 1) {
    const key = (frame.data[i] << 16) | (frame.data[i + 1] << 8) | frame.data[i + 2];
    indices[p] = lookup.get(key) ?? 0;
  }
  return indices;
}

/** GIF LZW: variable code width from 9 bits, a clear code, sub-blocks of 255. */
function lzwEncode(indices: Uint8Array, minCodeSize: number): Buffer {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const out: number[] = [];
  let bits = 0;
  let bitCount = 0;

  const emit = (code: number, width: number) => {
    bits |= code << bitCount;
    bitCount += width;
    while (bitCount >= 8) {
      out.push(bits & 255);
      bits >>= 8;
      bitCount -= 8;
    }
  };

  let codeSize = minCodeSize + 1;
  let next = end + 1;
  let dictionary = new Map<number, number>();

  emit(clear, codeSize);
  let current = indices[0];
  for (let i = 1; i < indices.length; i += 1) {
    const byte = indices[i];
    const key = (current << 8) | byte;
    const known = dictionary.get(key);
    if (known !== undefined) {
      current = known;
      continue;
    }
    emit(current, codeSize);
    if (next === 4096) {
      emit(clear, codeSize);
      dictionary = new Map();
      next = end + 1;
      codeSize = minCodeSize + 1;
    } else {
      // The code width grows *before* the entry that first needs it is added,
      // and after that entry's code has already gone out at the old width. The
      // encoder is one entry ahead of the decoder, so widening a code too early
      // — which is the obvious way to write this — desynchronises them the
      // first time the table passes 512, about eight rows into the first frame.
      // It does not error: the decoder reads a plausible stream and paints
      // nothing after that point.
      if (next === 1 << codeSize) codeSize += 1;
      dictionary.set(key, next);
      next += 1;
    }
    current = byte;
  }
  emit(current, codeSize);
  emit(end, codeSize);
  if (bitCount > 0) out.push(bits & 255);

  // Into sub-blocks, each led by its own length byte, terminated by a zero.
  const blocks: number[] = [];
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return Buffer.from(blocks);
}

/**
 * Assembles the frames into a looping GIF89a.
 *
 * Frame one is whole. Every frame after it is the bounding box of what changed,
 * with everything inside that box that did not change written as the
 * transparent index and left showing through — disposal method 1, which is what
 * makes a five-second recording of a mostly-still page cost megabytes less than
 * sixty full frames.
 */
function encodeGif(frames: Image[], delay: number): Buffer {
  const { width, height } = frames[0];
  for (const frame of frames) {
    if (frame.width !== width || frame.height !== height) {
      throw new Error('frames are not all the same size');
    }
  }

  const { palette, lookup } = buildPalette(frames);
  const transparent = 255;
  const parts: Buffer[] = [];

  const header = Buffer.alloc(13);
  header.write('GIF89a', 0, 'ascii');
  header.writeUInt16LE(width, 6);
  header.writeUInt16LE(height, 8);
  // Global colour table present, 8 bits of colour resolution, 256 entries.
  header.writeUInt8(0xf7, 10);
  header.writeUInt8(0, 11);
  header.writeUInt8(0, 12);
  parts.push(header, Buffer.from(palette));

  // NETSCAPE2.0, the extension that means "loop forever".
  parts.push(
    Buffer.from([
      0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e,
      0x30, 0x03, 0x01, 0x00, 0x00, 0x00,
    ]),
  );

  let previous: Uint8Array | null = null;

  for (const frame of frames) {
    const indices = toIndices(frame, lookup);

    let left = 0;
    let top = 0;
    let subWidth = width;
    let subHeight = height;
    let patch = indices;
    let usesTransparency = false;

    if (previous) {
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = y * width + x;
          if (indices[i] === previous[i]) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX === -1) {
        // Nothing moved. A one-pixel transparent patch keeps the timing honest
        // without repeating the frame.
        left = 0;
        top = 0;
        subWidth = 1;
        subHeight = 1;
        patch = Uint8Array.from([transparent]);
        usesTransparency = true;
      } else {
        left = minX;
        top = minY;
        subWidth = maxX - minX + 1;
        subHeight = maxY - minY + 1;
        patch = new Uint8Array(subWidth * subHeight);
        for (let y = 0; y < subHeight; y += 1) {
          for (let x = 0; x < subWidth; x += 1) {
            const source = (top + y) * width + (left + x);
            if (indices[source] === previous[source]) {
              patch[y * subWidth + x] = transparent;
              usesTransparency = true;
            } else {
              patch[y * subWidth + x] = indices[source];
            }
          }
        }
      }
    }

    const control = Buffer.alloc(8);
    control.writeUInt8(0x21, 0);
    control.writeUInt8(0xf9, 1);
    control.writeUInt8(4, 2);
    // Disposal method 1 — leave the frame in place for the next one to patch.
    control.writeUInt8((1 << 2) | (usesTransparency ? 1 : 0), 3);
    control.writeUInt16LE(delay, 4);
    control.writeUInt8(transparent, 6);
    control.writeUInt8(0, 7);

    const descriptor = Buffer.alloc(10);
    descriptor.writeUInt8(0x2c, 0);
    descriptor.writeUInt16LE(left, 1);
    descriptor.writeUInt16LE(top, 3);
    descriptor.writeUInt16LE(subWidth, 5);
    descriptor.writeUInt16LE(subHeight, 7);
    descriptor.writeUInt8(0, 9);

    parts.push(control, descriptor, Buffer.from([8]), lzwEncode(patch, 8));
    previous = indices;
  }

  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

// ---------------------------------------------------------------------------

async function main() {
  let server: ChildProcess | undefined;

  if (START_SERVER) {
    console.log(`starting a production server on ${BASE}`);
    server = spawn('npx', ['next', 'start', '--port', '3112'], {
      stdio: 'ignore',
      detached: false,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let browser: Browser | undefined;
  try {
    await waitForServer(BASE);

    browser = await chromium.launch({
      args: [
        // Software rendering, so a laptop and a CI box produce the same file.
        // Chromium will not composite WebGL into a screenshot without them.
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
        '--use-angle=swiftshader',
      ],
    });

    console.log(`\ncapturing into ${OUT_DIR}/`);

    const captures = [
      { name: 'transform-drag.gif', run: captureTransformDrag },
      { name: 'frustum.png', run: captureFrustum },
      { name: 'shader-error.png', run: captureShaderError },
    ];

    for (const capture of captures) {
      console.log(`\n  ${capture.name}`);
      try {
        const result = await capture.run(browser, OUT_DIR);
        await verifyFile(browser, result.file, result.canvasRegions);
        console.log(`      ${result.note}`);
        written.push(result.file);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`      FAILED  ${message}`);
        failures.push(`${capture.name}: ${message}`);
      }
    }
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }

  console.log('');
  for (const file of written) {
    console.log(`wrote ${file}  ${statSync(file).size.toLocaleString()} bytes`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} capture(s) FAILED:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
