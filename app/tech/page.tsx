import type { Metadata } from 'next';
import Link from 'next/link';

import { PlasmaWebGL } from '@/components/tech/PlasmaWebGL';
import { TechnologyChooser } from '@/components/tech/TechnologyChooser';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { SHARED_SCENE, TECHNOLOGIES } from '@/lib/technologies';
import { pageMetadata } from '@/lib/metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Technologies',
  description:
    'WebGL, WebGPU, Three.js and vgpu compared by rendering the same two reference scenes in each — what every one is for, when to reach for it, and the actual code.',
  path: '/tech',
});

const DEMO_LABEL: Record<string, string> = {
  webgl: 'Runs here',
  webgpu: 'Runs here, with WebGPU',
  'code-only': 'Code only',
};

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
          The page opens by saying every technology below renders one identical
          thing, and then showed it zero times. Here is that thing, running — so
          the comparison starts from the picture rather than from a promise.
        */}
        {/* GLCanvas draws its own frame, so this only bounds the width. */}
        <figure className="mt-8 max-w-2xl">
          <PlasmaWebGL />
          <figcaption className="mt-2.5 text-xs text-fg-faint">
            The reference scene, running here in WebGL. Every technology page
            renders this same image — only the code around it changes.
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
                    ~{tech.linesForPlasma}
                  </td>
                  <td className="tabular py-4 pl-4 text-right font-mono text-fg">
                    ~{tech.linesForCube}
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
          Line counts are for the plumbing around the shader, not a quality score —
          fewer lines means more is being done for you, which is exactly what you want
          in one situation and exactly what you do not want in another. The cube column
          is the more honest of the two: the plasma has no geometry, no camera and no
          depth buffer, so it barely exercises the differences at all.
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
