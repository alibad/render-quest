'use client';

import { useState } from 'react';

import { CodeBlock } from '@/components/tech/CodeBlock';
import { REPO_URL } from '@/lib/site';
import type { CodeSample } from '@/lib/technologies';

/**
 * The source actually running above.
 *
 * On a site whose thesis is that the plumbing IS the subject, finishing a lab
 * without ever seeing a line of its shader was the largest hole in it. Closed
 * rather than collapsed: the samples are the same constants the scene compiles,
 * so they cannot drift out of date with what is on screen.
 */
export function LabSource({ samples }: { samples: CodeSample[] }) {
  const [open, setOpen] = useState(false);

  if (samples.length === 0) return null;

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        /*
         * An inset ring, uniquely on this control. The site's focus ring is
         * drawn outside the element, and this button sits flush inside a panel
         * with `overflow-hidden`, so the ring was clipped away entirely: the
         * one keyboard stop on the whole site where the caret vanished.
         */
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 hover:bg-ink-600/40"
      >
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 shrink-0 text-fg-faint transition-transform ${
            open ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 3.5 L11 8 L6 12.5" />
        </svg>
        <span className="eyebrow">The code running above</span>
        <span className="ml-auto font-mono text-2xs text-fg-faint">
          {open ? 'hide' : `${samples.length} file${samples.length === 1 ? '' : 's'}`}
        </span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-line p-5">
          <p className="max-w-prose text-xs leading-relaxed text-fg-faint">
            Not an illustration — these are the exact shader sources this page
            compiles and runs. Everything around them is in{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="link-accent"
            >
              the repository
            </a>
            .
          </p>
          {samples.map((sample) => (
            <CodeBlock key={sample.label} sample={sample} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
