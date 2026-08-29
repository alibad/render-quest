/**
 * Theme tokens.
 *
 * The UI reads these through CSS custom properties (see globals.css). The
 * canvases cannot — WebGL needs actual floats — so the same palette is mirrored
 * here as normalised RGB. Keep the two in step: a scene whose clear colour does
 * not match the page background looks like a bug, because it is one.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'rq-theme';

export interface CanvasPalette {
  /** Canvas clear colour, matching the page's sunken surface. */
  clear: [number, number, number];
  /** Ground grid lines. */
  grid: [number, number, number];
  /** The "before" wireframe in the transform lab. */
  ghost: [number, number, number];
  /** Frustum and other highlighted structure. */
  accent: [number, number, number];
  /** Dimmer accent, for rays and secondary structure. */
  accentDim: [number, number, number];
  /** Neutral geometry outline. */
  outline: [number, number, number];
  /** X / Y / Z, matching the --axis-* CSS tokens. */
  axisX: [number, number, number];
  axisY: [number, number, number];
  axisZ: [number, number, number];
  /** Warm highlight, used for light sources and the translation column. */
  amber: [number, number, number];
  /** How strongly to light surfaces — light mode needs less contrast lift. */
  ambient: number;
}

export const CANVAS_PALETTE: Record<Theme, CanvasPalette> = {
  dark: {
    clear: [0.055, 0.063, 0.078],
    grid: [0.15, 0.18, 0.24],
    ghost: [0.42, 0.47, 0.56],
    accent: [0.36, 0.78, 1.0],
    accentDim: [0.18, 0.42, 0.58],
    outline: [0.75, 0.79, 0.85],
    axisX: [1.0, 0.42, 0.42],
    axisY: [0.43, 0.91, 0.63],
    axisZ: [0.36, 0.62, 1.0],
    amber: [1.0, 0.71, 0.33],
    ambient: 0.35,
  },
  light: {
    clear: [0.957, 0.965, 0.976],
    grid: [0.78, 0.82, 0.87],
    ghost: [0.55, 0.60, 0.68],
    accent: [0.04, 0.47, 0.66],
    accentDim: [0.55, 0.72, 0.82],
    outline: [0.22, 0.27, 0.34],
    axisX: [0.80, 0.22, 0.22],
    axisY: [0.09, 0.51, 0.28],
    axisZ: [0.16, 0.37, 0.76],
    amber: [0.69, 0.42, 0.04],
    ambient: 0.55,
  },
};

/** Resolves the theme to apply before React hydrates. Mirrored in the inline script. */
export function resolveInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Private mode or blocked storage — fall through to the media query.
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

/**
 * Runs before paint to stamp the theme on <html>, so the page never flashes the
 * wrong palette. Kept as a string because it ships inline in the document head.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
