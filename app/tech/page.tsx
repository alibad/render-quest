import type { Metadata } from 'next';
import Link from 'next/link';

import { PlasmaWebGL } from '@/components/tech/PlasmaWebGL';
import { TechnologyChooser } from '@/components/tech/TechnologyChooser';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import {
  CODE_ONLY,
  REFERENCE_SCENES,
  RUNS_HERE,
  SHARED_SCENE,
  TECHNOLOGIES,
  inWords,
  joinList,
  lineFigure,
  nameList,
} from '@/lib/technologies';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Technologies',
  description:
    `${nameList(TECHNOLOGIES)} compared on the same ${inWords(REFERENCE_SCENES.length)} reference ` +
    `scenes — what every one is for, when to reach for it, and the actual code. ` +
    `${nameList(RUNS_HERE)} render the scenes here; ${nameList(CODE_ONLY)} are code only.`,
  path: '/tech',
});

const DEMO_LABEL: Record<string, string> = {
  webgl: 'Runs here',
  webgpu: 'Runs here, with WebGPU',
  'code-only': 'Code only',
};

/*
 * The tilde that marks an estimate comes from lineFigure, in the registry, and
 * so does the caption under the table saying which figures carry one. The table
 * printed a tilde on all eight until issue #34, including on numbers that could
 * be — and now are — counted straight from the listings on each page.
 */

const COUNTS = TECHNOLOGIES.flatMap((tech) => [
  { tech, scene: 'plasma', count: tech.plasmaLines },
  { tech, scene: 'cube', count: tech.cubeLines },
]);
const COUNTED = COUNTS.filter((entry) => entry.count.counted);
const ESTIMATED = COUNTS.filter((entry) => !entry.count.counted);

export default function Tech() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Technologies</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {SHARED_SCENE.title}.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          {SHARED_SCENE.description}
        </p>
        <p className="mt-5 inline-block rounded-lg border border-line bg-ink-800 px-4 py-2.5 font-mono text-xs text-accent">
          {SHARED_SCENE.formula}
        </p>

        {/*
          The page opens by describing the reference scenes and then showed
          neither. Here is the first of them, running — so the comparison starts
          from the picture rather than from a promise. The caption says which
          pages can do the same and which cannot, because two of them cannot.
        */}
        {/* GLCanvas draws its own frame, so this only bounds the width. */}
        <figure className="mt-8 max-w-2xl">
          <PlasmaWebGL />
          <figcaption className="mt-2.5 text-xs text-fg-faint">
            {REFERENCE_SCENES[0].title}, running here in WebGL. Of the{' '}
            {inWords(TECHNOLOGIES.length)} pages below, {nameList(RUNS_HERE)} render
            it on their own; {nameList(CODE_ONLY)} print the code that would and say
            plainly that nothing is running.
          </figcaption>
        </figure>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Which should you use?
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
                There is no best one — there is a best one for a target. Answer three
                questions and see what falls out, along with the reasoning.
              </p>
            </div>
            <Link
              href="/tech/choose"
              className="shrink-0 font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
            >
              Its own page →
            </Link>
          </div>
          <div className="mt-5">
            <TechnologyChooser />
          </div>
        </section>

        <h2 className="mt-14 text-lg font-semibold tracking-tight">
          Side by side
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-faint">
                <th className="pb-3 font-mono text-2xs font-normal uppercase tracking-wider">
                  Technology
                </th>
                <th className="pb-3 font-mono text-2xs font-normal uppercase tracking-wider">
                  What it is
                </th>
                <th className="pb-3 text-right font-mono text-2xs font-normal uppercase tracking-wider">
                  Plasma
                </th>
                <th className="pb-3 text-right font-mono text-2xs font-normal uppercase tracking-wider">
                  Lit cube
                </th>
                <th className="pb-3 pl-6 font-mono text-2xs font-normal uppercase tracking-wider">
                  Demo
                </th>
              </tr>
            </thead>
            <tbody>
              {TECHNOLOGIES.map((tech) => (
                <tr key={tech.slug} className="border-b border-line/70">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/tech/${tech.slug}`}
                      className="font-semibold tracking-tight text-fg transition-colors hover:text-accent"
                    >
                      {tech.name}
                    </Link>
                  </td>
                  <td className="py-4 pr-4 text-fg-muted">{tech.kind}</td>
                  <td className="tabular py-4 text-right font-mono text-fg-muted">
                    {lineFigure(tech.plasmaLines)}
                  </td>
                  <td className="tabular py-4 pl-4 text-right font-mono text-fg">
                    {lineFigure(tech.cubeLines)}
                  </td>
                  <td className="py-4 pl-6">
                    <span
                      className={`font-mono text-2xs uppercase tracking-wider ${
                        tech.demo === 'code-only' ? 'text-fg-faint' : 'text-accent'
                      }`}
                    >
                      {DEMO_LABEL[tech.demo]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-prose text-2xs leading-relaxed text-fg-faint">
          Of these {inWords(COUNTS.length)} numbers, {inWords(COUNTED.length)} are
          counted rather than asserted: each is the length of the listing printed on
          that page, by the same rule as the line count in the listing&rsquo;s own header, so
          the table cannot disagree with the code underneath it. The{' '}
          {inWords(ESTIMATED.length)} carrying a tilde —{' '}
          {joinList(ESTIMATED.map((entry) => `${entry.tech.name}’s ${entry.scene}`))} —
          are estimates of a complete implementation, because those listings are
          excerpts and there is nothing printed to count. Either way the figure is the
          plumbing around the shader, not a quality score: fewer lines means more is
          being done for you, which is exactly what you want in one situation and
          exactly what you do not want in another. The cube column is the more honest of
          the two: the plasma has no geometry, no camera and no depth buffer, so it
          barely exercises the differences at all.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {TECHNOLOGIES.map((tech) => (
            <Link
              key={tech.slug}
              href={`/tech/${tech.slug}`}
              className="panel group flex flex-col p-5 transition-colors hover:border-line-strong hover:bg-ink-600/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight text-fg">
                  {tech.name}
                </h2>
                <span className="mt-0.5 shrink-0 font-mono text-2xs uppercase tracking-wider text-accent">
                  Open →
                </span>
              </div>
              <p className="mt-1 font-mono text-2xs uppercase tracking-wider text-fg-faint">
                {tech.kind}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {tech.tagline}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
            Not sure which to learn first? Start with{' '}
            <Link href="/tech/webgl" className="link-accent">
              WebGL
            </Link>{' '}
            — not because it is the future, but because everything else here is a
            reaction to it, and the ideas transfer. The{' '}
            <Link href="/labs" className="link-accent">
              labs
            </Link>{' '}
            are almost all built on it — the two that cannot be are marked, and
            say why — and the{' '}
            <Link href="/learn" className="link-accent">
              reading path
            </Link>{' '}
            takes it from there.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
