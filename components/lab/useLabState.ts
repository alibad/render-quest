'use client';

import { useEffect, useRef, useState } from 'react';

import { decodeState, encodeState, type LabState } from '@/lib/url-state';

/**
 * A lab's controls, kept in sync with the address bar.
 *
 * The URL is read once after hydration rather than during the first render:
 * the server has no address bar, so seeding initial state from `window` would
 * make the markup disagree with itself. The cost is one extra render on a lab
 * opened from a shared link, which nobody can see.
 *
 * Writes go through `replaceState`, so dragging a slider does not fill the
 * reader's back button with sixty entries a second.
 */
export function useLabState<T extends object>(
  defaults: T,
  allow?: { [K in keyof T]?: (value: T[K]) => boolean },
): [T, React.Dispatch<React.SetStateAction<T>>, string] {
  const [state, setState] = useState<T>(defaults);
  const [query, setQuery] = useState('');
  const restored = useRef(false);
  // Captured once: these never change for a mounted lab, and depending on them
  // would restart the effect on every render.
  const defaultsRef = useRef(defaults);
  const allowRef = useRef(allow);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    // `LabState` is the loose shape the codec works in; every lab's controls
    // are flat records of string, number and boolean, which is what makes the
    // round trip safe. The cast is confined to these two call sites so callers
    // keep their exact control type.
    const fromUrl = decodeState(
      defaultsRef.current as unknown as LabState,
      window.location.search,
      allowRef.current as never,
    ) as Partial<T>;
    if (Object.keys(fromUrl).length > 0) {
      setState((previous) => ({ ...previous, ...fromUrl }));
    }
  }, []);

  useEffect(() => {
    // Until the URL has been read, writing would erase what we came to restore.
    if (!restored.current) return;
    const next = encodeState(
      defaultsRef.current as unknown as LabState,
      state as unknown as LabState,
    );
    setQuery(next);
    const url = next
      ? `${window.location.pathname}?${next}`
      : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [state]);

  return [state, setState, query];
}
