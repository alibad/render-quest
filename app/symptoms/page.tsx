import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { pageMetadata } from '@/lib/metadata';
import {
  SYMPTOMS,
  symptomExplanationHref,
  symptomLab,
  symptomLabSlugs,
  symptomReproduceHref,
} from '@/lib/symptoms';

export const metadata: Metadata = pageMetadata({
  title: 'Symptoms',
  description:
    `${SYMPTOMS.length} things graphics code does wrong — z-fighting, shimmering textures, ` +
    'washed-out gamma, transparency that vanishes, a black shader with no error — each one ' +
    'in the words people use when it happens, and each one linked to a live lab that ' +
    'reproduces it on your own screen.',
  path: '/symptoms',
});

/**
 * The door for the reader who did not come here to take a course.
 *
 * The symptoms come first and the framing comes last, which is the opposite of
 * every other page on this site and is deliberate. Somebody arriving here has a
 * bug open in another tab; an introduction is a thing to scroll past, and a
 * paragraph explaining what the page is for is a paragraph in the way of the
 * page. Whatever needs saying is said underneath, where a reader who did not
 * find their bug will get to it.
 *
 * Nothing here is written down twice. The lab number and title come from
 * `lib/labs.ts`, the two hrefs are built by `lib/symptoms.ts` from a slug, a
 * heading id and a set of control keys, and test/symptoms.test.ts checks all
 * four against the sources that own them.
 */
export default function Symptoms() {
  const labs = symptomLabSlugs().length;

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-5xl px-5 py-14">
        <p className="eyebrow">Symptoms</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Start at the bug, not at lesson one.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {SYMPTOMS.length} things graphics code does wrong, in the words people use
          when it happens. Every row ends in a link that does not describe the
          bug &mdash; it reproduces it, on your screen, with the arithmetic that
          predicted it printed beside it.
        </p>

        <div
          className="mt-10 hidden gap-8 border-b border-line-strong pb-2 md:grid md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_10.5rem]"
          aria-hidden="true"
        >
          <p className="eyebrow">What you see</p>
          <p className="eyebrow">Why</p>
          <p className="eyebrow">See it happen</p>
        </div>

        <ul className="mt-2">
          {SYMPTOMS.map((symptom) => {
            const lab = symptomLab(symptom);
            return (
              <li
                key={symptom.id}
                id={symptom.id}
                className="grid scroll-mt-24 gap-3 border-b border-line py-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_10.5rem] md:gap-8"
              >
                <h2 className="text-[0.9375rem] font-medium leading-snug text-fg">
                  {symptom.symptom}
                </h2>

                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-fg-faint">
                    <span className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
                      You think:{' '}
                    </span>
                    {symptom.belief}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                    {symptom.correction}
                  </p>
                </div>

                <div className="text-sm">
                  <Link
                    href={symptomReproduceHref(symptom)}
                    className="link-accent font-medium"
                  >
                    Reproduce it
                  </Link>
                  <p className="mt-1 text-2xs leading-relaxed text-fg-faint">
                    Lab {lab.order},{' '}
                    <Link href={symptomExplanationHref(symptom)} className="link-accent">
                      {lab.title}
                    </Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <section className="mt-12 max-w-prose">
          <h2 className="text-lg font-semibold tracking-tight">
            Why the links carry state
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Every lab on this site keeps its controls in the address bar, so any
            configuration of any figure is a URL. That is what makes the
            reproduce links possible: one opens the depth lab with the near plane
            already at 0.02, another opens the shading lab with the normals
            already transformed by the wrong matrix. The failure is on screen
            before you have read a word of the essay around it.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            The {labs} labs these {SYMPTOMS.length} rows point into are essays
            with the figures built into them, and each one is written to repair a
            single wrong prediction rather than to cover a topic. If none of the
            sentences above is yours, the{' '}
            <Link href="/learn" className="link-accent">
              reading path
            </Link>{' '}
            puts them in an order, the{' '}
            <Link href="/labs" className="link-accent">
              labs
            </Link>{' '}
            are the full list, and the{' '}
            <Link href="/glossary" className="link-accent">
              glossary
            </Link>{' '}
            is the vocabulary underneath both.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
