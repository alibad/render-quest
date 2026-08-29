import Link from 'next/link';

import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Mark';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink-900/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-5">
        <Link href="/" className="rounded-md" aria-label="Render Quest home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1">
          <NavLink href="/labs">Labs</NavLink>
          <NavLink href="/learn">Learn</NavLink>
          <NavLink href="/about">About</NavLink>
          <a
            href="https://github.com/alibad/render-quest"
            target="_blank"
            rel="noreferrer noopener"
            className="hidden rounded-md px-2 py-1.5 text-sm text-fg-faint transition-colors hover:text-fg sm:block sm:px-3"
          >
            Source
          </a>
          <span className="ml-1">
            <ThemeToggle />
          </span>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg sm:px-3"
    >
      {children}
    </Link>
  );
}
