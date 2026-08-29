/**
 * Lab controls, encoded into the address bar.
 *
 * The most valuable thing on this site is a configuration that makes a point —
 * the normal-matrix bug, ten thousand cubes drawn one at a time — and until now
 * none of them could be handed to anyone. With no accounts and no newsletter, a
 * URL is the only distribution mechanism the site has.
 *
 * Only values that differ from the lab's defaults are written, so an untouched
 * lab has a clean address and a shared link says exactly what was changed and
 * nothing else.
 */

export type StateValue = string | number | boolean;
export type LabState = Record<string, StateValue>;

/** Rounded to keep shared links short; sliders have nothing like this precision. */
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The query string for `current`, given what the lab opens with.
 * Returns '' when nothing has been touched.
 */
export function encodeState<T extends LabState>(defaults: T, current: T): string {
  const params = new URLSearchParams();

  // Sorted so the same configuration always produces the same link, whatever
  // order the reader happened to move the controls in.
  for (const key of Object.keys(defaults).sort()) {
    const value = current[key];
    const fallback = defaults[key];
    if (value === undefined || value === fallback) continue;

    if (typeof fallback === 'number' && typeof value === 'number') {
      if (round(value) === round(fallback)) continue;
      params.set(key, String(round(value)));
    } else if (typeof fallback === 'boolean') {
      params.set(key, value ? '1' : '0');
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

/**
 * The subset of `search` that this lab understands, coerced to the types its
 * defaults imply. Unknown keys, wrong types and out-of-range numbers are
 * dropped rather than trusted — a URL is user input, and a NaN reaching a
 * uniform is a blank canvas with no error.
 */
export function decodeState<T extends LabState>(
  defaults: T,
  search: string,
  /** Optional per-key guard, for values a type alone cannot validate. */
  allow?: { [K in keyof T]?: (value: T[K]) => boolean },
): Partial<T> {
  const params = new URLSearchParams(search);
  const out: Partial<T> = {};

  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    if (!params.has(key)) continue;
    const raw = params.get(key);
    if (raw === null) continue;
    const fallback = defaults[key];

    // An empty value is not a value. `Number('')` is 0, which is finite and
    // would sail through as a real setting — `?scale=` would silently collapse
    // the geometry to nothing with no error anywhere.
    if (raw.trim() === '') continue;

    let value: StateValue;
    if (typeof fallback === 'number') {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) continue;
      value = parsed;
    } else if (typeof fallback === 'boolean') {
      if (raw !== '0' && raw !== '1') continue;
      value = raw === '1';
    } else {
      value = raw;
    }

    const guard = allow?.[key];
    if (guard && !guard(value as T[typeof key])) continue;

    out[key] = value as T[typeof key];
  }

  return out;
}

/** `/labs/transform?rotY=45` — the address to hand someone. */
export function stateHref(pathname: string, query: string): string {
  return query ? `${pathname}?${query}` : pathname;
}
