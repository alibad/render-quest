import type { Metadata } from 'next';
import Link from 'next/link';

import { TechnologyChooser } from '@/components/tech/TechnologyChooser';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { SHARED_SCENE, TECHNOLOGIES } from '@/lib/technologies';

export const metadata: Metadata = {
  title: 'Technologies',
  description:
    'WebGL, WebGPU, Three.js and vgpu compared by rendering the identical scene in each — what every one is for, when to reach for it, and the actual code.',
  alternates: { canonical: '/tech' },
};

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

        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Which should you use?
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            There is no best one — there is a best one for a target. Answer three
            questions and see what falls out, along with the reasoning.
          </p>
          <div className="mt-5">
            <TechnologyChooser />
          </div>
        </section>

        <h2 className="mt-14 text-lg font-semibold tracking-tight">
          Side by side
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-faint">
                <th className="pb-3 font-mono text-2xs font-normal uppercase tracking-wider">
                  Technology
                </th>
                <th className="pb-3 font-mono text-2xs font-normal uppercase tracking-wider">
                  What it is
                </th>
                <th className="pb-3 text-right font-mono text-2xs font-normal uppercase tracking-wider">
                  Lines for this scene
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
                  <td className="tabular py-4 text-right font-mono text-fg">
                    ~{tech.linesForPlasma}
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
          in one situation and exactly what you do not want in another.
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
            are all built on it, and the{' '}
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
