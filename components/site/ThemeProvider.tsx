'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  CANVAS_PALETTE,
  THEME_STORAGE_KEY,
  resolveInitialTheme,
  type CanvasPalette,
  type Theme,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  palette: CanvasPalette;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline head script has already stamped <html>; start from whatever it
  // decided so the first client render agrees with the painted page.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(resolveInitialTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Follow the OS while the visitor has not made an explicit choice.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        // Storage blocked — following the OS is the right default anyway.
      }
      setTheme(event.matches ? 'light' : 'dark');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Not persisting is survivable; the toggle still works this session.
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, palette: CANVAS_PALETTE[theme], toggle }),
    [theme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return context;
}

/** The canvas palette on its own, for scenes that ignore the rest. */
export function usePalette(): CanvasPalette {
  return useTheme().palette;
}
