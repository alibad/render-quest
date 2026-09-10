import Link from 'next/link';

import { ASK_URL, AUTHOR, DISCUSSIONS_URL, REPORT_URL, REPO_URL } from '@/lib/site';

import { Mark } from './Mark';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70">
      {/* This site has no accounts, no comments and no analytics, so the routes
          named here are the only ones a reader has — and until today there were
          none: no address anywhere on 23 routes, Discussions off, and the lab
          footer's feedback link 404ing into a private repository. Two links
          rather than one because reporting a defect and admitting you got lost
          are different acts with different costs. There is deliberately no
          email: the owner has not published one. Adding it is one constant in
          lib/site.ts and a third sentence here. */}
      <div className="mx-auto max-w-6xl px-5 pt-10">
        <p className="text-sm leading-relaxed text-fg-muted">
          Found a mistake here — bad arithmetic, a figure that will not run?{' '}
          <a
            href={REPORT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Open an issue
          </a>
          . Stuck on a lab, or want to say which explanation did not land?{' '}
          <a
            href={ASK_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Ask in Discussions
          </a>
          . Both reach me, and both are public.
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pb-10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Mark className="h-6 w-6 text-fg-faint" />
          <p className="text-xs leading-relaxed text-fg-faint">
            Render Quest — interactive graphics, built in the open.
            <br />
            Every lab runs live on your GPU. Nothing here is pre-rendered.
            <br />
            © 2026 {AUTHOR} — code under the{' '}
            <a
              href={`${REPO_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 transition-colors hover:text-fg"
            >
              MIT licence
            </a>
            , prose under{' '}
            <a
              href={`${REPO_URL}/blob/main/LICENSE-CONTENT`}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-2 transition-colors hover:text-fg"
            >
              CC BY 4.0
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-faint">
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
          <Link href="/roadmap" className="transition-colors hover:text-fg">
            Roadmap
          </Link>
          <Link href="/changelog" className="transition-colors hover:text-fg">
            Changelog
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-fg">
            Privacy
          </Link>
          <Link href="/about" className="transition-colors hover:text-fg">
            About
          </Link>
          <a
            href={DISCUSSIONS_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-fg"
          >
            Discussions
          </a>
          <a
            href={REPO_URL}
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
