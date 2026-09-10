import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/**
 * Flat config, because there is no other kind any more.
 *
 * This was `.eslintrc.json` plus `next lint`. Next 16 removed the `next lint`
 * command outright and ESLint 9 defaults to flat config, so the same two lines
 * of configuration live here and `npm run lint` calls `eslint` directly. The
 * substance is unchanged: `next/core-web-vitals`, and `no-explicit-any` off
 * because the WebGL call sites handle objects the DOM types already model
 * loosely.
 *
 * `ignores` is the one thing flat config needs that eslintrc did not — `next
 * lint` knew which directories were its own, whereas `eslint .` walks whatever
 * it is pointed at. A flat config also stops at itself rather than cascading
 * into a `.eslintrc.json` in some parent directory, which is what made
 * `npm run lint` fail outright inside a git worktree nested under the repo.
 */
const config = [
  {
    // `.claude/worktrees` holds real git worktrees during a multi-agent run —
    // each one a full checkout with its own `.next`. Left out, `eslint .` walked
    // into a sibling's build output and reported 276 errors in minified vendor
    // chunks, none of them in this repository's own source.
    ignores: ['.next/**', 'out/**', 'next-env.d.ts', '**/.next/**', '.claude/worktrees/**'],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',

      /*
       * The two React Compiler rules that arrived with
       * eslint-plugin-react-hooks 7, demoted to warnings rather than silenced.
       *
       * `set-state-in-effect` fires twelve times and `refs` fourteen, and every
       * one of them is a pattern this codebase chose on purpose and documented
       * where it stands:
       *
       *   - ThemeProvider, LearnExplorer, SearchDialog and Header read the
       *     address bar, `localStorage`, `matchMedia` and the DOM *after*
       *     mount and set state from what they find, precisely so the first
       *     client render agrees with the server's. Seeding from `window`
       *     during render is the bug this pattern exists to avoid.
       *   - GLCanvas and the three WebGPU labs write `ref.current` during
       *     render to keep the render loop reading fresh params without
       *     restarting it. Restarting it would rebuild the GL context on every
       *     slider tick.
       *
       * Both rules are worth adopting, and both want the components rewritten
       * around `useSyncExternalStore` and the compiler's memoisation. That is
       * its own piece of work on the most hydration-sensitive code on the site,
       * not a passenger on a dependency bump — so they warn here, visibly,
       * until it is done.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];

export default config;
