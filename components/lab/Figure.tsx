'use client';

import type { ReactNode } from 'react';

/**
 * One canvas, one idea, one control at most.
 *
 * The full lab instrument at the foot of each essay has sixteen controls and
 * answers every question at once, which is exactly why it cannot teach a single
 * one. A figure isolates the variable the paragraph above it just named, so
 * that moving the only thing there is to move demonstrates the only claim being
 * made. Ciechanowski's articles are built this way and it is the whole reason
 * they work.
 */
export function Figure({
  children,
  control,
  caption,
  readout,
}: {
  /** The canvas. */
  children: ReactNode;
  /** At most one control. If it needs two, it is two figures. */
  control?: ReactNode;
  /** What the reader should have just seen. Written after the fact, not before. */
  caption: ReactNode;
  /** Numbers beside the picture — a matrix, a measurement. */
  readout?: ReactNode;
}) {
  return (
    <figure className="!mt-8 !mb-8 w-full">
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
      </figcaption>
    </figure>
  );
}
