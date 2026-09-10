'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ASK_URL, REPO_URL } from '@/lib/site';

import { Wordmark } from './Mark';
import { SearchDialog } from './SearchDialog';
import { ThemeToggle } from './ThemeToggle';

/**
 * One list, rendered twice — the wide bar and the menu read from it, so the two
 * cannot drift apart.
 *
 * Symptoms leads. Labs / Tech / Learn / Glossary / About reads as a syllabus,
 * and a syllabus asks a stranger to accept that they are at lesson one; almost
 * nobody arrives that way. They arrive with the bug already open in the next
 * tab, and /symptoms is the only entry that meets them there. It is first
 * rather than second because the first slot is the one read before the reader
 * decides this is a course they have no time for.
 */
const NAV = [
  { href: '/symptoms', label: 'Symptoms' },
  { href: '/labs', label: 'Labs' },
  { href: '/tech', label: 'Tech' },
  { href: '/learn', label: 'Learn' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // A route change should always leave the menu closed.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Escape closes it, which is what every disclosure ought to do.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink-900/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-5">
        <Link href="/" className="rounded-md" title="Render Quest home">
          <Wordmark />
        </Link>

        {/* Desktop navigation.
            lg, not md. Measured in Chromium on a replica of this row built
            from the same box model and the site's own Inter subset: the six
            items are 55.8, 94.2, 56.4, 61.8, 82.2 and 63.5px
            wide, 433.9px with their gaps, and the row around them costs a
            133.6px wordmark plus 160px of controls. Six items first fit at
            795px, so at the md breakpoint's own 768px the header overflows by
            27px — and a header wider than the viewport scrolls the whole page
            sideways, on every route at once. Tightening the item padding
            recovers 24px at most (px-3 to px-2, six items), which is still
            three short, so the breakpoint is the only lever that works. */}
        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? 'text-fg' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {item.label}
                  {/* The active marker sits on the header's own bottom border. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-3 -bottom-[calc(0.375rem+1px)] h-px transition-colors ${
                      active ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex items-center gap-1.5">
          <SearchDialog />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source on GitHub"
            title="Source on GitHub"
            className="hidden h-8 w-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg sm:grid"
          >
            <GitHubMark />
          </a>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="grid h-8 w-8 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg lg:hidden"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-[15px] w-[15px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden
            >
              {menuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu. Now the only navigation from 375px to 1023px, which is why
          the way to reach a person lives in it too rather than in the wide bar
          alone. */}
      {menuOpen ? (
        <div id="site-menu" className="border-t border-line/70 bg-ink-900 lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm transition-colors ${
                      active ? 'text-accent' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1 w-1 rounded-full ${
                        active ? 'bg-accent' : 'bg-line-strong'
                      }`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-line pt-1">
              <a
                href={ASK_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                <span aria-hidden className="h-1 w-1 rounded-full bg-line-strong" />
                Ask a question
              </a>
            </li>
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                <span aria-hidden className="h-1 w-1 rounded-full bg-line-strong" />
                Source on GitHub
              </a>
            </li>
          </ul>
        </div>
      ) : null}
    </header>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-[15px] w-[15px]" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
