import Link from 'next/link';

import { LIVE_LABS } from '@/lib/labs';
import { REPO_URL } from '@/lib/site';

/**
 * The card that closes the lab grid.
 *
 * There are an odd number of labs and the grid is two columns, so the last row
 * is half empty — and an empty half-row on a contents page reads as something
 * that failed to load rather than as the end of a list. This is the honest
 * thing to put in it: where the sequence goes next, and how to push it there.
 */
export function LabsTailCard() {
  return (
    <section className="flex flex-col justify-center rounded-xl border border-dashed border-line-strong p-5">
      <p className="eyebrow">The end of the sequence, for now</p>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        {LIVE_LABS.length} labs, each one assuming the one before it. What comes
        after them is written down rather than implied — including the things that
        were proposed and turned down, with the reason.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <Link
          href="/roadmap"
          className="font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:underline"
        >
          What is next →
        </Link>
        <a
          href={`${REPO_URL}/issues/new`}
          target="_blank"
          rel="noreferrer noopener"
          className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-fg-muted"
        >
          Ask for a lab →
        </a>
      </div>
    </section>
  );
}
