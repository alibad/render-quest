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

    // Only the instrument's own keys are ours to rewrite. The figures above
    // write the same address bar under their own prefixes — `translate.tx`,
    // `rotate.ry` — and rebuilding the query from `next` alone deleted every
    // one of them the first time the reader touched a control down here.
    //
    // Nothing looked wrong when it did: the figure sliders kept their restored
    // positions, so the pictures were all correct, and only the link the reader
    // copied next was short. The per-figure copy button made it worse than
    // silent — a button reading "Copy a link to figure translate in this state"
    // handed over a URL with no `translate.` key in it at all.
    //
    // So the write is `useFigureState`'s write, with the instrument's flat keys
    // standing in for that hook's prefix: read the search fresh at write time
    // (a snapshot taken at mount would lose whatever a figure wrote in the same
    // tick), delete exactly the keys this hook owns — including the ones now
    // back at their default, or dragging a slider home would leave the link
    // claiming it had moved — put ours back, and sort, so the same page state
    // always produces the same link.
    const params = new URLSearchParams(window.location.search);
    for (const key of Object.keys(defaultsRef.current)) params.delete(key);
    for (const [key, value] of new URLSearchParams(next)) params.append(key, value);
    params.sort();

    // The hash is carried through, for the reason `useFigureState` carries it:
    // a reader who arrived on `/labs/transform?rotate.ry=-120#rotate` is looking
    // at the figure the link named, and this effect runs on mount whether or not
    // anything has been touched. Rebuilding the URL from pathname and search
    // alone stripped `#rotate` out of the address bar a moment after arrival, so
    // the link that reader then copied restored the state and landed the next
    // person at the top of the page — the half of the feature nobody would ever
    // see fail, because the first arrival scrolls correctly.
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [state]);

  return [state, setState, query];
}
