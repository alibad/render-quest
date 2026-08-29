import type { Metadata } from 'next';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import Link from 'next/link';

import { LabCard } from '@/components/site/LabCard';
import { LABS } from '@/lib/labs';

export const metadata: Metadata = {
  title: 'Labs',
  description:
    'Interactive WebGL labs: the model matrix, projection and the view frustum, and more in progress.',
  alternates: { canonical: '/labs' },
};

export default function Labs() {
  const live = LABS.filter((lab) => lab.status === 'live');
  const building = LABS.filter((lab) => lab.status === 'building');

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Labs</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          One idea per lab, with the controls to it.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          Everything here runs live in your browser. Drag inside any canvas to orbit
          the camera.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-faint">
          A matrix does not care which API multiplies it, so most labs are built on
          WebGL — it runs everywhere, and the concepts transfer unchanged to WebGPU.
          Where a lab genuinely <em className="not-italic text-fg-muted">cannot</em> be
          built on WebGL, it says so and uses WebGPU instead. Which to reach for is its
          own question, and the{' '}
          <Link href="/tech" className="link-accent">
            technology guide
          </Link>{' '}
          answers it.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {live.map((lab) => (
            <LabCard key={lab.slug} lab={lab} />
          ))}
        </div>

        {building.length > 0 ? (
          <>
            <h2 className="mt-14 border-t border-line pt-8 text-sm font-semibold tracking-tight text-fg-muted">
              In progress
            </h2>
            <p className="mt-1.5 text-sm text-fg-faint">
              Listed so you know where this is going. They are not links yet, because
              they are not built yet.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {building.map((lab) => (
                <LabCard key={lab.slug} lab={lab} />
              ))}
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
