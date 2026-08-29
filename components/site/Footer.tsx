import Link from 'next/link';

import { Mark } from './Mark';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Mark className="h-6 w-6 text-fg-faint" />
          <p className="text-xs leading-relaxed text-fg-faint">
            Render Quest — interactive graphics, built in the open.
            <br />
            Every lab runs live on your GPU. Nothing here is pre-rendered.
          </p>
        </div>
        <div className="flex gap-5 text-xs text-fg-faint">
          <Link href="/labs" className="transition-colors hover:text-fg">
            Labs
          </Link>
          <Link href="/tech" className="transition-colors hover:text-fg">
            Tech
          </Link>
          <Link href="/learn" className="transition-colors hover:text-fg">
            Learn
          </Link>
          <Link href="/glossary" className="transition-colors hover:text-fg">
            Glossary
          </Link>
          <Link href="/about" className="transition-colors hover:text-fg">
            About
          </Link>
          <a
            href="https://github.com/alibad/render-quest"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-fg"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
