'use client';

import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const nextLabel = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      className="grid h-8 w-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-[15px] w-[15px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden
      >
        {theme === 'dark' ? (
          // Moon — shown while dark, because it describes the current state.
          <path
            d="M16 12.3A6.5 6.5 0 1 1 7.7 4a5.6 5.6 0 0 0 8.3 8.3Z"
            fill="currentColor"
            stroke="none"
          />
        ) : (
          <>
            <circle cx="10" cy="10" r="3.4" fill="currentColor" stroke="none" />
            <path d="M10 2.4v1.8M10 15.8v1.8M17.6 10h-1.8M4.2 10H2.4M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3M15.4 15.4l-1.3-1.3M5.9 5.9 4.6 4.6" />
          </>
        )}
      </svg>
    </button>
  );
}
