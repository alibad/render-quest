'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { KIND_LABEL, search, type SearchEntry } from '@/lib/search';
import { LIVE_LABS } from '@/lib/labs';
import { TECHNOLOGIES } from '@/lib/technologies';
import { GLOSSARY } from '@/lib/glossary';
import { ALL_RESOURCES } from '@/lib/resources';

const KIND_CLASS: Record<string, string> = {
  lab: 'text-accent',
  technology: 'text-axis-z',
  term: 'text-axis-y',
  resource: 'text-amber',
  page: 'text-fg-faint',
};

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => search(query), [query]);

  // Cmd/Ctrl-K from anywhere, Escape to leave.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the dialog has actually mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (entry: SearchEntry) => {
      setOpen(false);
      if (entry.external) {
        window.open(entry.href, '_blank', 'noreferrer,noopener');
      } else {
        router.push(entry.href);
      }
    },
    [router],
  );

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        title="Search (⌘K)"
        className="grid h-8 w-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5 sm:grid-flow-col"
      >
        <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
        </svg>
        <span className="hidden font-mono text-2xs text-fg-faint sm:inline">⌘K</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search Render Quest"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink-900/80 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line-strong bg-ink-700 shadow-panel">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-fg-faint" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search labs, technologies, terms, resources…"
                aria-label="Search"
                className="w-full bg-transparent py-3.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-fg-faint sm:block">
                esc
              </kbd>
            </div>

            {query.trim() === '' ? (
              <p className="px-4 py-8 text-center text-xs text-fg-faint">
                {/* Counted, not typed. These read "five labs … 33 terms" for
                    months after the site had ten and sixty-one. */}
                Search everything — {LIVE_LABS.length} labs,{' '}
                {TECHNOLOGIES.length} technologies, {GLOSSARY.length} terms and{' '}
                {ALL_RESOURCES.length} resources.
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-fg-faint">
                Nothing matches &ldquo;{query}&rdquo;.
              </p>
            ) : (
              <ul className="max-h-[52vh] overflow-y-auto py-1.5">
                {results.map((entry, index) => (
                  <li key={`${entry.kind}-${entry.href}-${entry.title}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(entry)}
                      aria-current={index === active}
                      className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors ${
                        index === active ? 'bg-ink-500' : ''
                      }`}
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-fg">
                          {entry.title}
                        </span>
                        <span
                          className={`font-mono text-2xs uppercase tracking-wider ${
                            KIND_CLASS[entry.kind] ?? 'text-fg-faint'
                          }`}
                        >
                          {KIND_LABEL[entry.kind]}
                        </span>
                        {entry.external ? (
                          <span className="font-mono text-2xs text-fg-faint">↗</span>
                        ) : null}
                      </span>
                      <span className="line-clamp-1 text-xs text-fg-muted">
                        {entry.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
