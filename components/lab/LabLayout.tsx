'use client';

import type { ReactNode } from 'react';

/**
 * The shared shape of every lab: a large canvas, a column of controls beside
 * it, and a numeric readout underneath. Same layout everywhere so that moving
 * between labs costs no re-learning.
 */
export function LabLayout({
  canvas,
  controls,
  readout,
  readoutCaption,
  readoutTitle = 'The matrix',
  source,
}: {
  canvas: ReactNode;
  controls: ReactNode;
  readout?: ReactNode;
  readoutCaption?: ReactNode;
  readoutTitle?: string;
  /** The shader source this lab runs, shown in a collapsible panel. */
  source?: ReactNode;
}) {
  // `min-w-0` on every child is load-bearing, not tidiness. A grid item defaults
  // to `min-width: auto`, which means it refuses to shrink below its content's
  // min-content width — so one wide readout table widened the whole column to
  // 458px inside a 375px phone and the entire lab scrolled sideways, its own
  // `overflow-x-auto` powerless to help. With min-w-0 the track can shrink and
  // the scroll container finally does its job.
  //
  // Explicit grid placement rather than DOM order, because the two orders differ:
  // on a wide screen the readout sits under the canvas with controls beside both;
  // on a phone the controls must come SECOND, directly under the canvas they
  // drive. A slider two screens below the render it changes teaches nothing.
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{canvas}</div>

      <aside className="panel h-fit min-w-0 space-y-6 p-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
        {controls}
      </aside>

      {readout || source ? (
        <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-2">
          {readout ? (
            <div className="panel p-5">
              <h2 className="eyebrow mb-4">{readoutTitle}</h2>
              {readout}
              {readoutCaption ? (
                <p className="mt-5 max-w-prose border-t border-line pt-4 text-xs leading-relaxed text-fg-faint">
                  {readoutCaption}
                </p>
              ) : null}
            </div>
          ) : null}
          {source}
        </div>
      ) : null}
    </div>
  );
}

/** Legend pinned to a canvas corner. The colours match the tailwind axis tokens. */
export function AxisKey({
  items = [
    { color: 'bg-axis-x', label: 'X' },
    { color: 'bg-axis-y', label: 'Y' },
    { color: 'bg-axis-z', label: 'Z' },
  ],
  hint = 'drag or arrow keys to orbit',
}: {
  items?: { color: string; label: string }[];
  hint?: string | null;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-4">
      <ul className="flex gap-3 rounded-md bg-ink-900/70 px-2.5 py-1.5 backdrop-blur-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${item.color}`} />
            <span className="font-mono text-2xs text-fg-muted">{item.label}</span>
          </li>
        ))}
      </ul>
      {hint ? (
        <span className="rounded-md bg-ink-900/70 px-2.5 py-1.5 font-mono text-2xs text-fg-faint backdrop-blur-sm">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
