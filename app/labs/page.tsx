import type { Metadata } from 'next';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import Link from 'next/link';

import { LabCard } from '@/components/site/LabCard';
import { LabsTailCard } from '@/components/site/LabsTailCard';
import { ORDERED_LABS } from '@/lib/labs';

export const metadata: Metadata = {
  title: 'Labs',
  description:
    'Interactive WebGL labs: the model matrix, projection and the view frustum, and more in progress.',
  alternates: { canonical: '/labs' },
};

export default function Labs() {
  const live = ORDERED_LABS.filter((lab) => lab.status === 'live');
  const building = ORDERED_LABS.filter((lab) => lab.status === 'building');

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Labs</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          Printed matrices hold still. These do not.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          One idea per lab, with the controls to it. Everything here runs live in your
          browser — drag inside any canvas to orbit the camera.
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-faint">
          They are numbered, and the numbering is not decoration: each one assumes the
          ideas of the one before it. Start anywhere you like — but if a lab refers to
          something it has not explained, the lab it came from is the previous number.
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
          <LabsTailCard />
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
