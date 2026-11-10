'use client';

import { RqQuestbar } from '@/components/hq-path/RqQuestbar';

/**
 * The top bar of every route except the home page, which renders the same bar
 * itself.
 *
 * Since the Human Quest Path rollout (8 Nov 2026) this is the family questbar,
 * so moving from the home page to a lab no longer swaps one header for
 * another. Nothing the old header carried is lost: the same six links in the
 * same order (Symptoms first), the current page marked with aria-current,
 * search with Ctrl K, the GitHub link, the light/dark switch driving the site's
 * own ThemeProvider (the canvases read their palette from it), and "Ask a
 * question" in the menu. Below 1220px the links move into the menu.
 *
 * It stays a <header> rendered as a direct child of <body>, so the print
 * stylesheet in app/globals.css still drops it from paper.
 */
export function Header() {
  return <RqQuestbar />;
}
