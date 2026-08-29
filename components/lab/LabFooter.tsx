import Link from 'next/link';

import { GLOSSARY, termId } from '@/lib/glossary';
import { labNeighbours, type Lab } from '@/lib/labs';
import { REPO_URL } from '@/lib/site';

/**
 * The end of a lab.
 *
 * Every lab used to stop dead: no next step, no vocabulary, no way back into
 * the site except the browser's back button. The content for all of it already
 * existed — 46 glossary terms carry a lab slug that no lab page rendered.
 */
export function LabFooter({ lab }: { lab: Lab }) {
  const { previous, next } = labNeighbours(lab.slug);
  const vocabulary = GLOSSARY.filter((term) => term.lab === lab.slug);

  return (
    <footer className="mt-14 space-y-10 border-t border-line pt-10">
      {vocabulary.length > 0 ? (
        <section>
          <h2 className="eyebrow mb-3">Vocabulary from this lab</h2>
          <ul className="flex flex-wrap gap-2">
            {vocabulary.map((term) => (
              <li key={term.term}>
                <Link
                  href={`/glossary#${termId(term.term)}`}
                  className="inline-block rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  title={term.definition}
                >
                  {term.term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Lab sequence" className="grid gap-3 sm:grid-cols-2">
        {previous ? (
          <Link
            href={`/labs/${previous.slug}`}
            className="panel group p-4 transition-colors hover:border-line-strong hover:bg-ink-600/50"
          >
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              ← Lab {previous.order} · previous
            </span>
            <p className="mt-1.5 text-sm font-semibold tracking-tight text-fg">
              {previous.title}
            </p>
          </Link>
        ) : (
          <div className="panel p-4 opacity-50">
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              Start of the sequence
            </span>
            <p className="mt-1.5 text-sm text-fg-muted">
              This is lab {lab.order}, the first one.
            </p>
          </div>
        )}

        {next ? (
          <Link
            href={`/labs/${next.slug}`}
            className="panel group p-4 text-right transition-colors hover:border-line-strong hover:bg-ink-600/50"
          >
            <span className="font-mono text-2xs uppercase tracking-wider text-accent">
              Lab {next.order} · next →
            </span>
            <p className="mt-1.5 text-sm font-semibold tracking-tight text-fg">
              {next.title}
            </p>
          </Link>
        ) : (
          <Link
            href="/learn"
            className="panel group p-4 text-right transition-colors hover:border-line-strong hover:bg-ink-600/50"
          >
            <span className="font-mono text-2xs uppercase tracking-wider text-accent">
              Last lab · what next →
            </span>
            <p className="mt-1.5 text-sm font-semibold tracking-tight text-fg">
              The reading path
            </p>
          </Link>
        )}
      </nav>

      {/* The only feedback channel a site with no accounts and no analytics has. */}
      <p className="text-xs leading-relaxed text-fg-faint">
        Something here unclear, or wrong?{' '}
        <a
          href={`${REPO_URL}/issues/new`}
          target="_blank"
          rel="noreferrer noopener"
          className="link-accent"
        >
          Tell me
        </a>{' '}
        — this site has no analytics, so a message is the only way I find out.
      </p>
    </footer>
  );
}
