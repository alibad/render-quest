'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { decodeState, encodeState, type LabState } from '@/lib/url-state';

/**
 * One figure's controls, kept in the address bar under the figure's own name.
 *
 * `useLabState` owns the unprefixed query string for the instrument at the foot
 * of the page. A lab page has up to six figures on it as well, and if any of
 * them wrote `tx` they would be writing the instrument's `tx`. So every key a
 * figure writes is prefixed with the figure's id: `?translate.tx=1.5`. Two
 * figures with a `tx` each are then two different keys, and neither is the
 * lab's.
 *
 * The hydration discipline is `useLabState`'s, for `useLabState`'s reason: the
 * URL is read once in an effect and never during the first render, because the
 * server has no address bar and seeding from `window` would make the markup
 * disagree with itself.
 *
 * The write is not `useLabState`'s. A figure must not replace the query string,
 * only its own slice of it — so the write reads `window.location.search` fresh
 * every time, deletes only the keys under its own prefix, and puts back what it
 * found. Reading a snapshot captured at mount would mean that two figures moved
 * in the same tick each wrote the URL as it looked before the other, and the
 * second one to run would erase the first. The hash is carried through for the
 * same reason: a reader who arrived on `#order-matters` should still be on it
 * after touching the slider they came for.
 */
export function useFigureState<T extends object>(
  /** The figure's id — the same string passed to `<Figure id="…">`. */
  id: string,
  defaults: T,
  allow?: { [K in keyof T]?: (value: T[K]) => boolean },
): [T, React.Dispatch<React.SetStateAction<T>>, string] {
  // A `.`, `&` or `=` in the id would put the separator inside the key and the
  // namespace would stop being a namespace. These pages are prerendered, so a
  // bad id fails the build rather than one reader's session.
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
    throw new Error(
      `useFigureState: "${id}" is not a figure id — expected kebab-case, e.g. "order-matters"`,
    );
  }

  const [state, setState] = useState<T>(defaults);
  const [query, setQuery] = useState('');
  const restored = useRef(false);
  // Captured once: these never change for a mounted figure, and depending on
  // them would restart the effect on every render.
  const idRef = useRef(id);
  const defaultsRef = useRef(defaults);
  const allowRef = useRef(allow);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const prefix = idRef.current;
    // `decodeState` keys off the defaults it is handed, so handing it prefixed
    // defaults makes it read prefixed params — all of its coercion, its
    // range guards and its refusal to trust an empty value come along
    // unchanged. Encoding and decoding against a re-keyed object is the whole
    // of the namespacing; there is no second codec.
    const decoded = decodeState(
      prefixed(prefix, defaultsRef.current as unknown as LabState),
      window.location.search,
      prefixed(prefix, (allowRef.current ?? {}) as Record<string, unknown>) as never,
    );
    // `LabState` is the loose shape the codec works in; a figure's controls are
    // a flat record of string, number and boolean, which is what makes the
    // round trip safe. The casts are confined to this file so callers keep
    // their exact control type.
    const fromUrl = unprefixed(prefix, decoded) as unknown as Partial<T>;
    if (Object.keys(fromUrl).length > 0) {
      setState((previous) => ({ ...previous, ...fromUrl }));
    }
  }, []);

  // A figure that leaves the page has nothing in the address bar to link to.
  // Client-side navigation between two labs matters here: `near-plane` is a
  // figure in both the depth lab and the projection lab, and without this the
  // second one would open already offering a link to the first one's state.
  useEffect(() => () => publish(idRef.current, ''), []);

  useEffect(() => {
    // Until the URL has been read, writing would erase what we came to restore.
    if (!restored.current) return;
    const prefix = idRef.current;
    const mine = encodeState(
      prefixed(prefix, defaultsRef.current as unknown as LabState),
      prefixed(prefix, state as unknown as LabState),
    );
    setQuery(mine);
    publish(prefix, mine);

    const params = new URLSearchParams(window.location.search);
    // Every key of ours goes, including the ones now back at their default —
    // otherwise dragging a slider back to where it started would leave the
    // link claiming it had been moved.
    for (const key of [...params.keys()]) {
      if (key.startsWith(`${prefix}.`)) params.delete(key);
    }
    for (const [key, value] of new URLSearchParams(mine)) params.append(key, value);
    // Sorted so the same page state always produces the same link, whatever
    // order the reader happened to touch the figures in.
    params.sort();

    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    // `replaceState`, so dragging a slider does not fill the reader's back
    // button with sixty entries a second.
    window.history.replaceState(null, '', url);
  }, [state]);

  return [state, setState, query];
}

/* ------------------------------------------------ the same fragment, again ---
 * `useFigureState` returns a figure's own query fragment as its third value,
 * empty until the reader moves something. That is the signal for "this figure
 * now has a state worth linking to" — but the component that has to act on it,
 * `<Figure>`, is not the component that holds it. The hook is called in the
 * essay, in the wrapper around the figure, and `<Figure>` only ever sees the
 * caption and the control JSX that wrapper hands down.
 *
 * Threading it down as a prop would mean editing all 42 figure call sites and
 * trusting each of them to keep passing it, on top of the id pairing they must
 * already keep in step by hand. So the fragment is published instead, keyed by
 * the same id, and `<Figure>` subscribes to its own.
 *
 * `useSyncExternalStore` rather than a context: the server snapshot is `''`, so
 * nothing about the affordance is in the prerendered HTML and the first client
 * render agrees with it. It appears when the first write lands, which is the
 * first time a reader has moved anything — the same discipline the rest of this
 * file keeps about never reading the address bar during a render.
 */

const fragments = new Map<string, string>();
const listeners = new Set<() => void>();

function publish(id: string, query: string) {
  if ((fragments.get(id) ?? '') === query) return;
  if (query) fragments.set(id, query);
  else fragments.delete(id);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The figure `id`'s own query fragment — `''` until its controls have moved.
 *
 * The same string `useFigureState` returns third, so a figure with no state at
 * all never reports one and never grows a copy affordance.
 */
export function useFigureQuery(id: string): string {
  return useSyncExternalStore(
    subscribe,
    () => fragments.get(id) ?? '',
    () => '',
  );
}

/** `{ tx: 0 }` → `{ 'translate.tx': 0 }`. */
function prefixed<V>(id: string, source: Record<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const key of Object.keys(source)) out[`${id}.${key}`] = source[key];
  return out;
}

/** `{ 'translate.tx': 1.5 }` → `{ tx: 1.5 }`. */
function unprefixed<V>(id: string, source: Record<string, V>): Record<string, V> {
  const out: Record<string, V> = {};
  for (const key of Object.keys(source)) out[key.slice(id.length + 1)] = source[key];
  return out;
}
