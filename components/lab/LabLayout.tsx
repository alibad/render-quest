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
}: {
  canvas: ReactNode;
  controls: ReactNode;
  readout?: ReactNode;
  readoutCaption?: ReactNode;
  readoutTitle?: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        {canvas}
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
      </div>

      <aside className="panel h-fit space-y-6 p-5 lg:sticky lg:top-6">
        {controls}
      </aside>
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
  hint = 'drag to orbit',
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
