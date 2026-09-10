import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LABS } from '@/lib/labs';
import {
  REFERENCE_SCENES,
  TECHNOLOGIES,
  inWords,
  nameList,
} from '@/lib/technologies';
import { pageMetadata } from '@/lib/metadata';
import { AUTHOR, REPO_URL } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Why Render Quest exists, how the labs are built, and how the claims it makes about itself are checked.',
  path: '/about',
});

export default function About() {
  const building = LABS.filter((lab) => lab.status === 'building');
  const live = LABS.filter((lab) => lab.status === 'live');

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">About</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
          Graphics is a subject you have to move to understand.
        </h1>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-fg-muted">
          <p>
            Most graphics material explains a matrix by printing it. You read the
            sixteen numbers, you nod, and nothing happens — because a transform is
            not a table of numbers, it is a <em className="text-fg">motion</em>, and
            you cannot see a motion in a static page.
          </p>
          <p>
            Render Quest puts the numbers under your fingers instead. Every lab is a
            live canvas with the maths exposed beside it: drag a slider, and the
            matrix, the geometry and the rendered pixels all change together. The
            point is to build the intuition first, so the API you eventually write
            has somewhere to land.
          </p>

          <h2 className="pt-4 text-base font-semibold text-fg">How it is built</h2>
          <p>
            Raw WebGL and WebGPU, deliberately — no scene graph, no rendering
            framework. The plumbing a framework hides — contexts, buffers, attribute
            pointers, the perspective divide — is the actual subject. The matrix
            library is a few hundred readable lines and ships with a numeric test
            suite: every claim the site makes about a projection matrix is checked on
            every commit, not asserted in prose.
          </p>
          <p>
            Most labs are built on WebGL, and that is a decision about reach rather
            than a preference. A matrix does not care which API multiplies it, so the
            concepts transfer unchanged — and where a lab genuinely cannot be built on
            WebGL, like the compute one, it says so and uses WebGPU. Which to reach for
            in your own work is a separate question, and the{' '}
            <Link href="/tech" className="link-accent">
              technology guide
            </Link>{' '}
            has a tool that answers it.
          </p>
          <p>
            The visuals are the same story. Nothing on this site is stock art or a
            pre-rendered image — the scene on the home page is the projection lab with
            its controls removed, running live in your browser at this moment.
          </p>

          <h2 className="pt-4 text-base font-semibold text-fg">What is here</h2>
          <p>
            {live.length} labs, each isolating one idea and handing you the controls
            to it:
          </p>
          <ul className="space-y-2 pt-1">
            {live.map((lab) => (
              <li key={lab.slug} className="flex gap-3">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>
                  <Link href={`/labs/${lab.slug}`} className="link-accent font-medium">
                    {lab.title}
                  </Link>
                  {' — '}
                  {lab.takeaway}
                </span>
              </li>
            ))}
          </ul>
          <p>
            The{' '}
            <Link href="/tech" className="link-accent">
              Tech
            </Link>{' '}
            section covers the same {inWords(REFERENCE_SCENES.length)} reference
            scenes in {nameList(TECHNOLOGIES)}, so you can see what each layer does
            for you and what it costs you — the first two actually running on the
            page, the other two honestly labelled as code.
          </p>
          <p>
            Alongside those, the{' '}
            <Link href="/learn" className="link-accent">
              Learn
            </Link>{' '}
            page is a curated path through the rest of the subject — the best
            courses, books and interactive explainers on the web for graphics and for
            building games, arranged in the order that makes each one easier than the
            last.
          </p>
          <p>
            What comes next, and what was proposed and turned down, is on the{' '}
            <Link href="/roadmap" className="link-accent">
              roadmap
            </Link>
            {building.length > 0 ? (
              <>
                {' '}— including the labs still in progress:{' '}
                {building.map((lab) => lab.title).join(', ')}. They ship when they
                teach something properly, not before.
              </>
            ) : (
              // With nothing in progress the old trailing sentence began "They
              // ship when…" with no antecedent, because the list it referred to
              // had been suppressed.
              <>
                , along with the reason for each. Everything planned there has
                shipped; what gets added next depends on what turns out to be
                missing.
              </>
            )}
          </p>

          <p className="pt-4">
            Built by {AUTHOR}. The source is{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline-offset-4 hover:underline"
            >
              on GitHub
            </a>
            , and the{' '}
            <Link href="/labs" className="text-accent underline-offset-4 hover:underline">
              labs are here
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
