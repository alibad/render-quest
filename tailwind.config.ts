import type { Config } from 'tailwindcss';
import { fontFamily } from 'tailwindcss/defaultTheme';

/**
 * Render Quest looks like an instrument, not a brochure: near-black ground,
 * hairline rules, one cyan accent for interaction, and the three axis colours
 * reserved for X / Y / Z so they mean the same thing in the UI as on canvas.
 */
/** Wires a CSS custom property up so Tailwind opacity modifiers still work. */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: token('--bg'), // page
          800: token('--sunken'), // sunken / canvas
          700: token('--surface'), // card
          600: token('--raised'),
          500: token('--hover'),
        },
        line: {
          DEFAULT: token('--line'),
          strong: token('--line-strong'),
        },
        fg: {
          DEFAULT: token('--fg'),
          muted: token('--fg-muted'),
          faint: token('--fg-faint'),
        },
        accent: {
          DEFAULT: token('--accent'),
          dim: token('--accent-dim'),
          contrast: token('--accent-contrast'),
        },
        // Axis colours. These are a convention, not decoration — the same
        // three appear in the matrix readouts and in every rendered scene.
        axis: {
          x: token('--axis-x'),
          y: token('--axis-y'),
          z: token('--axis-z'),
        },
        amber: token('--amber'),
        red: token('--red'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        prose: '68ch',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        glow: '0 0 0 1px rgb(var(--accent) / 0.25), 0 0 32px -8px rgb(var(--accent) / 0.35)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
