'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SearchDialog } from '@/components/site/SearchDialog';
import { useTheme } from '@/components/site/ThemeProvider';
import { ASK_URL, REPO_URL } from '@/lib/site';

import { HQ_HUB } from './hq-path';

/** The same six the site header carries, in its order: Symptoms leads. */
const NAV = [
  { href: '/symptoms', label: 'Symptoms' },
  { href: '/labs', label: 'Labs' },
  { href: '/tech', label: 'Tech' },
  { href: '/learn', label: 'Learn' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/about', label: 'About' },
];

/**
 * The Human Quest questbar, as Render Quest wears it.
 *
 * Built from the kit's classes rather than its `HqQuestbar` for three reasons
 * that are all this site's own: search stays in the bar (Ctrl K works on every
 * page), the moon drives the site's ThemeProvider — the canvases read their
 * palette from it, and its one localStorage key is the one /privacy names — and
 * the family mark is served from this origin, because /privacy also promises no
 * request to any other host.
 */
export function RqQuestbar() {
  // Every route wears this bar (components/site/Header.tsx renders it), so it
  // marks where the reader is, as the old site header did.
  const pathname = usePathname() ?? '';
  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? ('page' as const) : undefined;
  return (
    <header className="hqp-questbar rq-questbar" data-hqp-t="tools">
      <Link className="hqp-mark" href="/" title="Render Quest home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={34} height={34} />
        Render Quest
      </Link>
      <a className="hqp-family" href={HQ_HUB} title="Part of Human Quest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hq-family/humanquest.png" alt="" width={18} height={18} />
        Human Quest · Tools
      </a>
      <nav className="hqp-nav" aria-label="Main">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} aria-current={current(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="rq-qb-tools">
        <span className="rq-search">
          <SearchDialog />
        </span>
        <a
          className="rq-round rq-github"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Source on GitHub"
          title="Source on GitHub"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
        <MoonButton />
      </div>
      <details className="hqp-menu">
        <summary>Menu</summary>
        <div>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={current(item.href)}>
              {item.label}
            </Link>
          ))}
          <Link href="/labs/transform">Open the first lab</Link>
          <a href={ASK_URL} target="_blank" rel="noreferrer noopener">
            Ask a question
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
          <a href={HQ_HUB}>Human Quest</a>
        </div>
      </details>
      <Link className="hqp-btn hqp-btn-ember hqp-btn-cta" href="/labs/transform">
        Open the first lab
      </Link>
    </header>
  );
}

/** The family's moon, wired to this site's own light/dark switch. */
function MoonButton() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="hqp-theme"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <g className="hqp-sunicon"><circle cx="12" cy="12" r="4.6" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7" /></g><path className="hqp-moonicon" d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
      </svg>
    </button>
  );
}
