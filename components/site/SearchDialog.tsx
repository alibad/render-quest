'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SearchEntry } from '@/lib/search';
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
  section: 'text-accent',
};

type SearchModule = typeof import('@/lib/search');

/**
 * The index is fetched on the reader's first sign of interest, not on page load.
 *
 * It carries the whole essay text — 67 KB of the 80 KB module — because a
 * search that cannot find "premultiplied alpha" in the paragraph that explains
 * it is the bug this exists to fix. Making every visitor download that to read
 * one lab would be paying for the fix with someone else's bandwidth. Hovering
 * the button, focusing it, or pressing the shortcut all start the fetch, so by
 * the time there is a query to run the module is there.
 *
 * Module scope, not state: the promise has to survive the dialog unmounting.
 */
let searchModule: SearchModule | null = null;
let pending: Promise<SearchModule> | null = null;

function loadSearch(): Promise<SearchModule> {
  return (pending ??= import('@/lib/search').then((module) => {
    searchModule = module;
    return module;
  }));
}

/**
 * Which key this reader's keyboard actually has.
 *
 * `navigator.platform` is deprecated, so ask `userAgentData` first and keep the
 * old one as the fallback Safari and Firefox still need. Null until the effect
 * runs: rendering "⌘" on the server and "Ctrl" on a Windows client is a
 * hydration mismatch, and the smoke test reads a console error as a failure.
 */
function usePlatformModifier(): { symbol: string | null; label: string } {
  const [apple, setApple] = useState<boolean | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform ?? navigator.platform ?? '';
    setApple(/mac|iphone|ipad|ipod/i.test(platform));
  }, []);

  if (apple === null) return { symbol: null, label: 'Search' };
  return apple
    ? { symbol: '⌘K', label: 'Search (⌘K)' }
    : { symbol: 'Ctrl K', label: 'Search (Ctrl+K)' };
}

/**
 * Grepped, not remembered: `event.key` appears in this file, Header, Controls,
 * GLCanvas and InstancingLab and nowhere else in the site. Documenting a key
 * the site does not bind would be worse than documenting none.
 */
const SHORTCUTS: { keys: string[]; what: string }[] = [
  { keys: ['↑', '↓'], what: 'move through the results' },
  { keys: ['⏎'], what: 'open the highlighted one' },
  { keys: ['esc'], what: 'close this, or the menu' },
  { keys: ['←', '→', '↑', '↓'], what: 'orbit the camera on a focused lab canvas' },
  { keys: ['shift'], what: 'with an arrow, orbit four times as far' },
  { keys: ['←', '→'], what: 'move between presets in a control group' },
];

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchModule | null>(searchModule);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Navigating away is not the same as dismissing: only a dismiss should send
  // focus back where it came from.
  const restoreFocus = useRef(true);
  const modifier = usePlatformModifier();

  const results = useMemo(
    () => (index ? index.search(query) : []),
    [index, query],
  );

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
    if (!open || index) return;
    let live = true;
    loadSearch().then((module) => {
      if (live) setIndex(module);
    });
    return () => {
      live = false;
    };
  }, [open, index]);

  /**
   * Open, and put focus back afterwards.
   *
   * Dismissing this used to drop focus on <body>: opened from the Glossary link
   * with Ctrl+K, the next Tab after Escape landed on "Source on GitHub" — past
   * two controls the reader had never been to. A screen reader loses its place
   * entirely.
   */
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    restoreFocus.current = true;
    setQuery('');
    setActive(0);
    // Focus after the dialog has actually mounted.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      if (restoreFocus.current) openerRef.current?.focus?.();
    };
  }, [open]);

  /**
   * Keep Tab inside the dialog while it is open.
   *
   * `aria-modal` tells a screen reader the rest of the page is gone; it does
   * nothing about keyboard focus, which walked straight out of the overlay and
   * onto header controls painted underneath it.
   */
  const onDialogKey = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (entry: SearchEntry) => {
      restoreFocus.current = false;
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
        onPointerEnter={() => loadSearch()}
        onFocus={() => loadSearch()}
        aria-label="Search"
        title={modifier.label}
        className="grid h-8 w-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5 sm:grid-flow-col"
      >
        <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 L14 14" strokeLinecap="round" />
        </svg>
        {/* The slot is as wide as the longer form, so filling it in after mount
            settles nothing sideways. Decorative either way — the button's
            aria-label is what a screen reader reads. */}
        <span
          aria-hidden
          className="hidden min-w-[2.5rem] text-left font-mono text-2xs text-fg-faint sm:inline"
        >
          {modifier.symbol ?? ' '}
        </span>
      </button>

      {open ? (
        <div
          ref={dialogRef}
          onKeyDown={onDialogKey}
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
                placeholder="Search labs, essays, terms, resources…"
                aria-label="Search"
                className="w-full bg-transparent py-3.5 text-sm text-fg placeholder:text-fg-faint focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-fg-faint sm:block">
                esc
              </kbd>
            </div>

            {query.trim() === '' ? (
              /*
               * The empty state is where the shortcuts are written down. It is
               * the only screen on the site that is already about the keyboard,
               * it costs no page of its own, and the reader who is most likely
               * to want the list is the one who just pressed a shortcut to get
               * here.
               */
              <div className="px-4 py-5">
                <p className="text-center text-xs text-fg-faint">
                  {/* Counted, not typed. These read "five labs … 33 terms" for
                      months after the site had ten and sixty-one. */}
                  Search everything — {LIVE_LABS.length} labs,{' '}
                  {index ? `${index.ESSAY_SECTION_COUNT} essay sections, ` : ''}
                  {TECHNOLOGIES.length} technologies, {GLOSSARY.length} terms and{' '}
                  {ALL_RESOURCES.length} resources.
                </p>
                <dl className="mx-auto mt-5 max-w-sm space-y-1.5">
                  {SHORTCUTS.map((shortcut) => (
                    <div key={shortcut.what} className="flex items-baseline gap-2.5">
                      <dt className="flex shrink-0 gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-fg-faint"
                          >
                            {key}
                          </kbd>
                        ))}
                      </dt>
                      <dd className="text-xs text-fg-faint">{shortcut.what}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : results.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-fg-faint">
                {index ? (
                  <>Nothing matches &ldquo;{query}&rdquo;.</>
                ) : (
                  // The index is still arriving. Saying "nothing matches" here
                  // would be a lie for about one frame, and the wrong one.
                  <>Searching&hellip;</>
                )}
              </p>
            ) : (
              <ul className="max-h-[52vh] overflow-y-auto py-1.5">
                {results.map((entry, position) => (
                  <li key={`${entry.kind}-${entry.href}-${entry.title}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(position)}
                      onClick={() => go(entry)}
                      aria-current={position === active}
                      className={`flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors ${
                        position === active ? 'bg-ink-500' : ''
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
                          {index?.KIND_LABEL[entry.kind]}
                        </span>
                        {/* A section's heading says nothing about which of the
                            ten labs it is in, and the URL is not on screen. */}
                        {entry.context ? (
                          <span className="truncate text-2xs text-fg-faint">
                            {entry.context}
                          </span>
                        ) : null}
                        {entry.external ? (
                          <span className="font-mono text-2xs text-fg-faint">↗</span>
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-xs text-fg-muted">
                        {index ? index.excerpt(entry, query) : entry.description}
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
