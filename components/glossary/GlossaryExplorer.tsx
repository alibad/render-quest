'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { GLOSSARY_SORTED, termId, type Term } from '@/lib/glossary';
import { getLab } from '@/lib/labs';

export function GlossaryExplorer() {
  const [query, setQuery] = useState('');
  const [labsOnly, setLabsOnly] = useState(false);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return GLOSSARY_SORTED.filter((entry) => {
      if (labsOnly && !entry.lab) return false;
      if (!needle) return true;
      return `${entry.term} ${entry.definition}`.toLowerCase().includes(needle);
    });
  }, [query, labsOnly]);

  // Only offer a letter in the jump nav if something is under it right now.
  const letters = useMemo(() => {
    const present = new Set(matches.map((entry) => entry.term[0].toUpperCase()));
    return [...present].sort();
  }, [matches]);

  const filtering = query.trim() !== '' || labsOnly;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <span className="sr-only">Search the glossary</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search terms…"
            className="w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => setLabsOnly((value) => !value)}
          aria-pressed={labsOnly}
          className={`rounded-lg border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
            labsOnly
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-line text-fg-faint hover:border-line-strong hover:text-fg-muted'
          }`}
        >
          Has a lab
        </button>
        {filtering ? (
          <>
            <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
              {matches.length} of {GLOSSARY_SORTED.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setLabsOnly(false);
              }}
              className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
            >
              Clear
            </button>
          </>
        ) : null}
      </div>

      {letters.length > 1 ? (
        <nav aria-label="Jump to letter" className="mt-5 flex flex-wrap gap-1">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="grid h-7 w-7 place-items-center rounded border border-line font-mono text-2xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent"
            >
              {letter}
            </a>
          ))}
        </nav>
      ) : null}

      {matches.length === 0 ? (
        <p className="mt-16 text-center text-sm text-fg-faint">
          Nothing matches that. Try clearing the filters.
        </p>
      ) : (
        <dl className="mt-10 space-y-8">
          {matches.map((entry, index) => {
            const letter = entry.term[0].toUpperCase();
            const startsLetter =
              index === 0 || matches[index - 1].term[0].toUpperCase() !== letter;
            return (
              <div
                key={entry.term}
                id={termId(entry.term)}
                className="scroll-mt-20 border-l-2 border-line pl-5 transition-colors target:border-accent"
              >
                {startsLetter ? (
                  <span id={`letter-${letter}`} className="sr-only">
                    {letter}
                  </span>
                ) : null}
                <Entry entry={entry} />
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

function Entry({ entry }: { entry: Term }) {
  const lab = entry.lab ? getLab(entry.lab) : undefined;

  return (
    <>
      <dt className="flex flex-wrap items-baseline gap-3">
        <a
          href={`#${termId(entry.term)}`}
          className="text-base font-semibold tracking-tight text-fg transition-colors hover:text-accent"
        >
          {entry.term}
        </a>
        {lab ? (
          <Link
            href={`/labs/${lab.slug}`}
            className="rounded border border-accent/35 bg-accent/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-accent transition-colors hover:bg-accent/20"
          >
            See it · {lab.title}
          </Link>
        ) : null}
      </dt>
      <dd className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
        {entry.definition}
      </dd>
      {entry.see && entry.see.length > 0 ? (
        <dd className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
            See also
          </span>
          {entry.see.map((related) => (
            <a
              key={related}
              href={`#${termId(related)}`}
              className="text-xs text-fg-faint underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              {related}
            </a>
          ))}
        </dd>
      ) : null}
    </>
  );
}
