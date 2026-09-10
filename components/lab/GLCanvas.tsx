'use client';

import { useEffect, useRef, useState } from 'react';

export interface Frame<P> {
  gl: WebGLRenderingContext;
  /** Drawing-buffer size in device pixels — what `gl.viewport` wants. */
  width: number;
  height: number;
  /**
   * Seconds of animation since the canvas mounted.
   *
   * Paused time is not counted. A figure that spends a minute scrolled off
   * screen, or in a background tab, stops its loop and its clock together, so
   * it resumes exactly where it stopped instead of arriving a minute further
   * round its orbit the instant it comes back into view.
   */
  time: number;
  /** Seconds since the previous frame. */
  dt: number;
  params: P;
}

export type SceneFactory<P> = (
  gl: WebGLRenderingContext,
  params: P,
) => {
  draw: (frame: Frame<P>) => void;
  dispose?: () => void;
};

interface GLCanvasProps<P> {
  /**
   * Called once per context, with the params as they stand at mount. Allocate
   * buffers and programs here, not per frame. Remount (via `key`) to rebuild.
   */
  create: SceneFactory<P>;
  /** Latest values from the surrounding controls; read fresh every frame. */
  params: P;
  className?: string;
  /** width / height. The canvas fills its container's width. */
  aspect?: number;
  label?: string;
  /** Receives pointer drag deltas in CSS pixels. Enables orbit affordances. */
  onDrag?: (deltaX: number, deltaY: number) => void;
  /** Rendered above the canvas — legends, axis keys, readouts. */
  overlay?: React.ReactNode;
}

/**
 * Called with the element's on-screen state, or with nothing when only the
 * document's visibility changed and the element's own state still stands.
 */
type VisibilityListener = (onScreen?: boolean) => void;

/**
 * One IntersectionObserver and one visibilitychange listener for every figure
 * on the page, not one each.
 *
 * A lab mounts up to six of these; /labs/projection and /labs/textures mount
 * seven, and at 1280x900 all seven are below the fold at load. Before this,
 * every one of them ran its own rAF loop from mount to unmount — seven render
 * loops competing with the compositor for the scroll the reader is actually
 * doing, drawing pixels nobody could see.
 */
const watchers = new Map<Element, VisibilityListener>();
let sharedObserver: IntersectionObserver | null = null;

function handleDocumentVisibility() {
  for (const listener of watchers.values()) listener();
}

function watchVisibility(element: Element, listener: VisibilityListener) {
  if (typeof IntersectionObserver === 'undefined') {
    // No observer to ask, so assume the figure is on screen: a browser this
    // old should get the animation, not a rectangle that never draws.
    listener(true);
    return () => {};
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        watchers.get(entry.target)?.(entry.isIntersecting);
      }
    });
    // Every current browser suspends rAF in a hidden tab, so this is belt and
    // braces — but it costs one listener, and it makes the pause a property of
    // this component rather than of whichever browser the reader has.
    document.addEventListener('visibilitychange', handleDocumentVisibility);
  }

  watchers.set(element, listener);
  sharedObserver.observe(element);
  return () => {
    watchers.delete(element);
    sharedObserver?.unobserve(element);
  };
}

/**
 * Context releases queued by a cleanup, keyed by the canvas that owns them.
 *
 * `getContext()` returns the *same* context object for a given canvas, so
 * losing it in cleanup breaks any remount that reuses the element — React's
 * StrictMode double-invoke does exactly that, and the canvas came back dead.
 * That is why this file used to leave the context to the garbage collector.
 *
 * Leaving it to GC is what made the release nondeterministic, and Chrome caps
 * live contexts at 16. Walking the ten labs through the site's own next-lab
 * links, in one page, created 43 contexts and released none: over the cap by
 * lab 3, and by the last lab Chrome had killed 27 of them and logged "Too many
 * active WebGL contexts. Oldest context will be lost." 27 times. What the
 * reader gets for a context killed under them is "The WebGL context was lost.
 * Reload the page to restore it." on a figure they already read past.
 *
 * So the release is deferred by a task instead of skipped. A remount that
 * reuses the element cancels it on the way in, and the deferred call checks
 * `isConnected` as well: a StrictMode remount leaves the element in the
 * document, a real unmount takes it out.
 */
const pendingRelease = new WeakMap<
  HTMLCanvasElement,
  ReturnType<typeof setTimeout>
>();

/**
 * A WebGL canvas with a lifecycle that behaves.
 *
 * One `requestAnimationFrame` loop per mount, cancelled on unmount and paused
 * whenever the figure is off screen, the tab is hidden, or the reader has
 * asked for reduced motion; the drawing buffer tracks the element's CSS size
 * at device-pixel resolution; params are read through a ref so changing a
 * slider never restarts the loop or leaks a second one. While the loop is
 * paused the canvas still redraws on every param change, so the picture tracks
 * the controls exactly — a reduced-motion reader loses the idle spin, not the
 * figure.
 */
export function GLCanvas<P>({
  create,
  params,
  className,
  aspect = 16 / 10,
  label,
  onDrag,
  overlay,
}: GLCanvasProps<P>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef(params);
  const createRef = useRef(create);
  const dragRef = useRef(onDrag);
  const animateRef = useRef(true);
  const syncRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionOptIn, setMotionOptIn] = useState(false);

  // Autonomous animation — the idle spin, the marching time uniform — is what
  // reduced motion switches off, and the button below is how a reader who
  // wants a particular figure moving anyway gets it back.
  const allowAnimation = !reducedMotion || motionOptIn;

  // Keep the refs current without re-running the effect below.
  paramsRef.current = params;
  createRef.current = create;
  dragRef.current = onDrag;
  animateRef.current = allowAnimation;

  // app/globals.css already neutralises CSS animation and transition under
  // this query; the canvases are the most motion-heavy things on the site and
  // were the one thing it could not reach. Read live, because a reader who
  // turns the OS setting on should not have to reload to be believed.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // A remount that reuses this element cancels the release its own previous
    // cleanup queued — before getContext() below hands back the very context
    // that release was going to kill.
    const queued = pendingRelease.get(canvas);
    if (queued !== undefined) {
      clearTimeout(queued);
      pendingRelease.delete(canvas);
    }

    // `preserveDrawingBuffer` is off in normal use — keeping the buffer around
    // costs a copy every frame for a feature nothing on the site needs. The
    // rendering smoke test sets this flag before the app loads, because
    // otherwise the drawing buffer is cleared the moment it is composited and
    // there is no way to check that a lab drew anything at all.
    const capturable =
      typeof window !== 'undefined' &&
      (window as { __RQ_CAPTURE__?: boolean }).__RQ_CAPTURE__ === true;

    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: capturable,
    });

    if (!gl) {
      setError('This browser could not create a WebGL context.');
      return;
    }

    let scene: ReturnType<SceneFactory<P>>;
    try {
      scene = createRef.current(gl, paramsRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    let frameId = 0;
    let disposed = false;
    // A lost context or a scene that threw: stopped for good, not paused. The
    // pause below resumes on its own, and a scene that throws once throws
    // every time — resuming it would put the same error up on every scroll.
    let halted = false;
    let running = false;
    let onScreen = false;
    // Animated seconds, not wall-clock seconds: see Frame.time.
    let elapsed = 0;
    let previous = performance.now();

    const drawFrame = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      elapsed += dt;

      try {
        scene.draw({
          gl,
          width: canvas.width,
          height: canvas.height,
          time: elapsed,
          dt,
          params: paramsRef.current,
        });
      } catch (err) {
        halted = true; // stop rather than throw once per frame
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    const loop = (now: number) => {
      if (disposed || halted || !running) return;
      drawFrame(now);
      if (halted) {
        running = false;
        return;
      }
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const start = () => {
      if (disposed || halted || running) return;
      running = true;
      // Reset the clock reference, so the first frame back sees the frame it
      // took rather than the whole pause.
      previous = performance.now();
      frameId = requestAnimationFrame(loop);
    };

    /** A single frame outside the loop, for every paused state. */
    const renderOneFrame = () => {
      if (disposed || halted || running) return;
      previous = performance.now();
      drawFrame(previous);
    };

    /**
     * Reconcile the loop with the three things that can pause it. Called on
     * every render as well as on every visibility change, so a param change
     * while paused still puts a fresh picture up.
     */
    const sync = () => {
      if (disposed || halted) return;
      const visible = onScreen && !document.hidden;
      if (visible && animateRef.current) {
        start();
        return;
      }
      stop();
      if (visible) renderOneFrame();
    };

    // Resize the drawing buffer to match the element at device resolution.
    // Capped at 2x: beyond that the extra pixels cost more than they show.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        // Resizing throws the drawing buffer away. A paused figure would sit
        // blank until something else redrew it, so redraw it here.
        renderOneFrame();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const onContextLost = (event: Event) => {
      event.preventDefault();
      halted = true;
      stop();
      setError('The WebGL context was lost. Reload the page to restore it.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    // One frame before anyone asks, even for a figure that is off screen: the
    // rendering smoke test reads the first canvas on the page, and on
    // /labs/projection every canvas is below the fold at 1280x900.
    renderOneFrame();

    const unwatch = watchVisibility(canvas, (value) => {
      if (value !== undefined) onScreen = value;
      sync();
    });
    syncRef.current = sync;

    return () => {
      disposed = true;
      stop();
      syncRef.current = null;
      unwatch();
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      // dispose() first, and while the context is still alive: it deletes
      // buffers, programs and textures, and every one of those calls needs the
      // context that the release below kills.
      scene.dispose?.();
      const release = setTimeout(() => {
        pendingRelease.delete(canvas);
        // Still in the document means this was a remount reusing the element,
        // not an unmount — see pendingRelease.
        if (canvas.isConnected) return;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }, 0);
      pendingRelease.set(canvas, release);
    };
    // The scene is built once per mount; `create` is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deliberately without a dependency list. Params arrive as a fresh object
  // every render, and this is what keeps a paused figure honest: one frame per
  // change, so the picture matches the controls exactly. A no-op while the
  // loop is running, which is the common case.
  useEffect(() => {
    syncRef.current?.();
  });

  // Pointer drag -> orbit. Pointer capture keeps the gesture alive when the
  // cursor leaves the canvas, and touch-action:none stops mobile from
  // scrolling the page out from under a drag.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let activePointer: number | null = null;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (!dragRef.current || activePointer !== null) return;
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      dragRef.current?.(event.clientX - lastX, event.clientY - lastY);
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return (
    <div className={className}>
      <div
        className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
        style={{ aspectRatio: String(aspect) }}
      >
        <canvas
          ref={canvasRef}
          aria-label={
            onDrag && label ? `${label}. Arrow keys orbit the camera.` : label
          }
          role="img"
          /*
           * A camera reachable only by dragging is a camera half the readers
           * cannot move. The canvas takes focus when it orbits, and the arrow
           * keys feed the same handler the pointer does — so every lab keeps
           * its own clamping, and the URL records the framing either way.
           */
          tabIndex={onDrag ? 0 : undefined}
          onKeyDown={
            onDrag
              ? (event) => {
                  const step = event.shiftKey ? 48 : 12;
                  const delta: Record<string, [number, number]> = {
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                  };
                  const move = delta[event.key];
                  if (!move) return;
                  event.preventDefault();
                  onDrag(move[0], move[1]);
                }
              : undefined
          }
          // touch-action: only claim the gesture on canvases that actually
          // orbit, and only horizontally. `none` everywhere meant a visitor who
          // began a scroll on the canvas got a page that refused to move, which
          // reads as broken rather than as principled. pan-y leaves vertical
          // scrolling to the browser and delivers horizontal drags to us.
          style={{ touchAction: onDrag ? 'pan-y' : 'auto' }}
          className={`block h-full w-full ${
            onDrag ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        />
        {overlay}
        {reducedMotion ? (
          // Top right, because the axis key owns the bottom of the frame and
          // three labs put a stage badge top left. The accessible name carries
          // the figure's own label: a page of buttons all called "Animate" is
          // a page of identical choices, the same problem the Reset buttons
          // had.
          <button
            type="button"
            aria-pressed={motionOptIn}
            aria-label={
              label
                ? `${motionOptIn ? 'Hold still' : 'Animate'}: ${label}`
                : undefined
            }
            onClick={() => setMotionOptIn((on) => !on)}
            className="absolute right-3 top-3 rounded-md bg-ink-900/70 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider text-fg-muted backdrop-blur-sm transition-colors hover:text-accent"
          >
            {motionOptIn ? 'Hold still' : 'Animate'}
          </button>
        ) : null}
        {error ? (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/90 p-6 text-center">
            <p className="max-w-sm font-mono text-xs leading-relaxed text-red">
              {error}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
