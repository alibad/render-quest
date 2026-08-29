import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { LABS } from '@/lib/labs';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Render Quest exists, how the labs are built, and what is coming next.',
  alternates: { canonical: '/about' },
};

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
            Raw WebGL, deliberately. There is no scene graph and no rendering
            framework in the way, because the plumbing a framework hides — contexts,
            buffers, attribute pointers, the perspective divide — is the actual
            subject. The matrix library is a few hundred readable lines, and it ships
            with a numeric test suite: every claim the site makes about a projection
            matrix is checked on every commit, not asserted in prose.
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
            section renders one identical scene in WebGL, WebGPU, Three.js and vgpu,
            so you can see what each layer does for you and what it costs you — the
            first two actually running on the page, the other two honestly labelled
            as code.
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
          {building.length > 0 ? (
            <p>
              More labs are in progress:{' '}
              {building.map((lab) => lab.title).join(', ')}. They ship when they teach
              something properly, not before.
            </p>
          ) : null}

          <p className="pt-4">
            Built by Ali Bader Eddin. The source is{' '}
            <a
              href="https://github.com/alibad/render-quest"
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
