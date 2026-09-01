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
 * So this loads each lab in a real browser and asserts four things: the page
 * has a canvas with a size, nothing was logged as an error, no lab is showing
 * its own failure card, and the pixels are not all the same colour.
 *
 * Deliberately NOT part of `npm test`, because `npm run build` runs that and
 * Vercel has no browsers. CI installs chromium and runs this separately.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import assert from 'node:assert/strict';

import { chromium, type Browser, type ConsoleMessage } from 'playwright';

import { LIVE_LABS } from '../lib/labs.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';

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
  '/roadmap',
  '/about',
  '/privacy',
];

const ALL_ROUTES = [...STATIC_ROUTES, ...LIVE_LABS.map((lab) => `/labs/${lab.slug}`)];

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3111';
const START_SERVER = !process.env.SMOKE_BASE_URL;

let passed = 0;
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

/** Console noise that is the browser's problem rather than the site's. */
const IGNORED = [
  // Chromium says this on every WebGPU page when no discrete GPU is present.
  'GroupMarkerNotSet',
  'Automatic fallback to software WebGL',
  'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
];


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
  const canvas = document.querySelector('canvas');
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
        // box with no GPU. WebGPU labs report unsupported here rather than
        // rendering, and the test allows for that explicitly below.
        '--enable-unsafe-swiftshader',
        '--use-gl=angle',
      ],
    });

    console.log('\nrendering smoke test');

    for (const lab of LIVE_LABS) {
      const url = `${BASE}/labs/${lab.slug}`;
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      // Must run before the app mounts: GLCanvas reads this when it creates the
      // context, and preserveDrawingBuffer cannot be turned on afterwards.
      await page.addInitScript(() => {
        (window as { __RQ_CAPTURE__?: boolean }).__RQ_CAPTURE__ = true;
      });
      const errors: string[] = [];

      page.on('console', (message: ConsoleMessage) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED.some((pattern) => text.includes(pattern))) return;
        errors.push(text);
      });
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));

      const response = await page.goto(url, { waitUntil: 'networkidle' });
      // Labs animate; give the loop a moment to actually put something up.
      await page.waitForTimeout(2500);

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

      // Swiftshader has no WebGPU, so the two WebGPU labs legitimately show
      // their unsupported card here. Saying so out loud beats a skip nobody
      // reads, and a WebGL lab showing any card is still a failure.
      const webgpuUnsupported =
        lab.technology === 'webgpu' && failureCard === 'does not have it';

      check(`${lab.slug}: is not showing a failure card`, () => {
        if (webgpuUnsupported) {
          console.log(`      (WebGPU unavailable in this browser — pixels not checked)`);
          return;
        }
        assert.equal(failureCard, null, `page shows: "${failureCard}"`);
      });

      if (!webgpuUnsupported) {
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
      }

      check(`${lab.slug}: logged no errors`, () => {
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      await page.close();
    }

    // The pages that are not labs still have to render.
    for (const route of STATIC_ROUTES) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED.some((pattern) => text.includes(pattern))) return;
        errors.push(text);
      });
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));

      const response = await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      check(`${route}: responds 200 and logs no errors`, () => {
        assert.equal(response?.status(), 200);
        assert.equal(errors.length, 0, errors.join(' | '));
      });

      await page.close();
    }

    // Horizontal overflow has now regressed three times, always on a phone. The
    // third one hid on /labs/pipeline for weeks because this loop checked four
    // hand-picked routes and that was not one of them. It checks every route
    // now, and reports which element is sticking out rather than just that one is.
    for (const route of ALL_ROUTES) {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
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

    // A two-column grid holding an odd number of cards ends on a half-empty row,
    // which on an index page reads as a card that failed to load rather than as
    // the end of a list. It has happened twice: once when a seventh lab was
    // added, and again when the card added to fix that stopped being enough at
    // ten. Counting it is cheaper than noticing it.
    for (const route of ['/', '/labs', '/learn', '/tech', '/tech/choose']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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

  console.log(`\n${passed} render checks passed`);
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
