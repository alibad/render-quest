'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The clipboard, written once, for everything on a lab page that offers a link.
 *
 * WHAT GOES IN THE LINK — the whole of `window.location.search`, read at the
 * moment of the click, and no fragment unless the caller asks for one.
 *
 * The query is read from the address bar rather than taken as a prop because
 * the bar is the only thing that has all of it. `useLabState` writes the
 * instrument's keys and each `useFigureState` writes its own, independently and
 * without seeing each other. Until figures had state the instrument's query was
 * the whole query, so building the URL from the instrument's `query` prop was
 * correct; the day figures started writing `?rotate.ry=-120`, a reader who
 * moved a figure and then the instrument got a link with the figure silently
 * missing — underneath a sentence promising that the address bar follows what
 * they do.
 *
 * The fragment is dropped because the button says "this state", not "this
 * place". A link that also dropped the recipient wherever the sender happened
 * to have scrolled is a different and more surprising feature; a reader who
 * wants both clicks a figure's `#` permalink and copies the address bar. The
 * per-figure affordance is the one caller that passes a hash, because for a
 * single figure the place and the state are the same thing.
 */
export function useCopyLink(hash = '') {
  const [copied, setCopied] = useState(false);
  // Set when the clipboard is unavailable — insecure origins and locked-down
  // browsers have none. The reader gets a selectable field instead of a
  // failure, and no native dialog is involved.
  const [manual, setManual] = useState('');
  // React 19's `useRef` has no zero-argument overload any more — a ref that
  // starts life empty has to say so. `undefined` is what it held before.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    const { origin, pathname, search } = window.location;
    const url = `${origin}${pathname}${search}${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setManual('');
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setManual(url);
    }
  }, [hash]);

  return { copy, copied, manual };
}

/**
 * The remedy when the clipboard is refused: the link itself, already selected.
 *
 * Shared with the figures for the same reason the hook is — one refusal path,
 * so a browser that blocks clipboard writes behaves the same in a caption as it
 * does at the foot of the page.
 */
export function ManualLink({ value, label }: { value: string; label: string }) {
  const field = useRef<HTMLInputElement>(null);

  // Keyed on the value, not on mount: a second refused copy of a different URL
  // leaves this element mounted, and an unselected field is a field the reader
  // has to select by hand for no reason.
  useEffect(() => {
    field.current?.select();
  }, [value]);

  return (
    <input
      ref={field}
      readOnly
      value={value}
      aria-label={label}
      onFocus={(event) => event.currentTarget.select()}
      className="w-full rounded-md border border-line bg-ink-800 px-2 py-1.5 font-mono text-2xs text-fg-muted"
    />
  );
}

/**
 * Hands the reader the address of what they are currently looking at.
 *
 * Shown only once the instrument's controls have actually been moved: offering
 * to copy a link to the default state is offering to copy the page you are
 * already on. What it copies is the whole page's state, not the instrument's —
 * see `useCopyLink`.
 */
export function CopyLink({ query }: { query: string }) {
  const { copy, copied, manual } = useCopyLink();

  if (!query) {
    return (
      <p className="text-2xs leading-relaxed text-fg-faint">
        Move any control and this becomes a link you can share — the address bar
        follows what you do.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={copy}
        className="w-full rounded-md border border-line px-3 py-2 font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        {copied ? 'Copied ✓' : 'Copy link to this state'}
      </button>
      {manual ? (
        <ManualLink value={manual} label="Link to this state — select and copy" />
      ) : null}
      <p className="text-2xs leading-relaxed text-fg-faint">
        {manual
          ? 'This browser will not let a page write to the clipboard, so here is the link to copy by hand.'
          : 'Opens with everything you have moved on this page, the figures above included. Only what you changed is in the link.'}
      </p>
    </div>
  );
}
