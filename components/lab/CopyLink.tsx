'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hands the reader the address of what they are currently looking at.
 *
 * Shown only once the controls have actually been moved: offering to copy a
 * link to the default state is offering to copy the page you are already on.
 */
export function CopyLink({ query }: { query: string }) {
  const [copied, setCopied] = useState(false);
  // Set when the clipboard is unavailable — insecure origins and locked-down
  // browsers have none. The reader gets a selectable field instead of a
  // failure, and no native dialog is involved.
  const [manual, setManual] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (manual) field.current?.select();
  }, [manual]);

  const copy = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}${
      query ? `?${query}` : ''
    }`;
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
  }, [query]);

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
        <input
          ref={field}
          readOnly
          value={manual}
          aria-label="Link to this state — select and copy"
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-md border border-line bg-ink-800 px-2 py-1.5 font-mono text-2xs text-fg-muted"
        />
      ) : null}
      <p className="text-2xs leading-relaxed text-fg-faint">
        {manual
          ? 'This browser will not let a page write to the clipboard, so here is the link to copy by hand.'
          : 'Opens with exactly these controls. Only what you changed is in the link.'}
      </p>
    </div>
  );
}
