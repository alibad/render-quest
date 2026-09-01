import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { TechnologyChooser } from '@/components/tech/TechnologyChooser';
import { TECHNOLOGIES } from '@/lib/technologies';
import { pageMetadata } from '@/lib/metadata';

/**
 * "Which should I use" is a question people type into a search box, and a
 * settled, reasoned answer is a far more linkable thing than a category page
 * that happens to contain one. The chooser lives here now and is embedded back
 * into /tech, rather than the other way round.
 */
export const metadata: Metadata = pageMetadata({
  title: 'WebGL, WebGPU, Three.js or vgpu — which should you use?',
  description:
    'Answer three questions about what you are building, who has to run it, and how much you want to write yourself — and get a reasoned recommendation, with the scoring shown rather than asserted.',
  path: '/tech/choose',
});

export default function ChoosePage() {
  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Technologies</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          There is no best one. There is a best one for a target.
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
          Answer three questions about what you are building, who has to be able to
          run it, and how much of the plumbing you want to write yourself. The
          answer comes with its reasoning, and with what the other three would have
          cost you.
        </p>

        <div className="mt-8">
          <TechnologyChooser />
        </div>

        <section className="mt-14 border-t border-line pt-8">
          <h2 className="text-lg font-semibold tracking-tight">
            Or read them side by side
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            Every one of these renders the same reference scene, so the only thing
            that differs between the pages is the code you have to write around it.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {TECHNOLOGIES.map((tech) => (
              <Link
                key={tech.slug}
                href={`/tech/${tech.slug}`}
                className="panel group block p-5 transition-colors hover:border-line-strong hover:bg-ink-600/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-fg">
                    {tech.name}
                  </h3>
                  <span className="mt-0.5 shrink-0 font-mono text-2xs uppercase tracking-wider text-accent">
                    Open →
                  </span>
                </div>
                <p className="eyebrow mt-1.5">{tech.kind}</p>
                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">
                  {tech.tagline}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-fg-faint">
            <Link href="/tech" className="link-accent">
              All four compared on one page →
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
