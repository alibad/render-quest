'use client';

import { useEffect, useRef, useState } from 'react';

export interface Frame<P> {
  gl: WebGLRenderingContext;
  /** Drawing-buffer size in device pixels — what `gl.viewport` wants. */
  width: number;
  height: number;
  /** Seconds since the canvas mounted. */
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
 * A WebGL canvas with a lifecycle that behaves.
 *
 * One `requestAnimationFrame` loop per mount, cancelled on unmount; the drawing
 * buffer tracks the element's CSS size at device-pixel resolution; params are
 * read through a ref so changing a slider never restarts the loop or leaks a
 * second one.
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
  const [error, setError] = useState<string | null>(null);

  // Keep the refs current without re-running the effect below.
  paramsRef.current = params;
  createRef.current = create;
  dragRef.current = onDrag;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frameId = 0;
    let disposed = false;
    const start = performance.now();
    let previous = start;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frameId);
      setError('The WebGL context was lost. Reload the page to restore it.');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const loop = (now: number) => {
      if (disposed) return;
      const time = (now - start) / 1000;
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;

      try {
        scene.draw({
          gl,
          width: canvas.width,
          height: canvas.height,
          time,
          dt,
          params: paramsRef.current,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return; // stop the loop rather than throw once per frame
      }

      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.dispose?.();
      // Deliberately NOT calling WEBGL_lose_context here. getContext() returns
      // the *same* context object for a given canvas, so losing it on cleanup
      // breaks any remount that reuses the element — React's StrictMode
      // double-invoke does exactly that, and the canvas comes back dead. The
      // context is released when the canvas is collected; the churn that
      // actually mattered was the per-theme remount, and that is gone.
    };
    // The scene is built once per mount; `create` is read through a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          aria-label={label}
          role="img"
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
