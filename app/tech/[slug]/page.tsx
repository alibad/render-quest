import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CodeBlock } from '@/components/tech/CodeBlock';
import { CubeWebGL } from '@/components/tech/CubeWebGL';
import { CubeWebGPU } from '@/components/tech/CubeWebGPU';
import { PlasmaWebGL } from '@/components/tech/PlasmaWebGL';
import { PlasmaWebGPU } from '@/components/tech/PlasmaWebGPU';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { ALL_RESOURCES } from '@/lib/resources';
import { pageMetadata } from '@/lib/metadata';
import {
  CUBE_SCENE,
  TECHNOLOGIES,
  getTechnology,
  lineFigure,
} from '@/lib/technologies';


/**
 * `params` is a promise from Next 15 onwards, on a statically generated route
 * as much as on a dynamic one. Awaiting it is the whole of the change here —
 * `generateStaticParams` below still hands back plain objects, and the four
 * pages are still prerendered at build time.
 */
interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TECHNOLOGIES.map((tech) => ({ slug: tech.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tech = getTechnology(slug);
  if (!tech) return {};
  return pageMetadata({
    title: tech.name,
    description: `${tech.tagline} What ${tech.name} is for, when to reach for it, and the same two reference scenes written in it.`,
    path: `/tech/${tech.slug}`,
  });
}

export default async function TechnologyPage({ params }: Params) {
  const { slug } = await params;
  const tech = getTechnology(slug);
  if (!tech) notFound();

  const index = TECHNOLOGIES.findIndex((t) => t.slug === tech.slug);
  const next = TECHNOLOGIES[(index + 1) % TECHNOLOGIES.length];
  const reading = tech.learnUrls
    .map((url) => ALL_RESOURCES.find((resource) => resource.url === url))
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource));

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-5 py-10">
        <nav className="mb-6">
          <Link
            href="/tech"
            className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
          >
            ← All technologies
          </Link>
        </nav>

        <header className="max-w-prose">
          <p className="eyebrow">{tech.kind}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{tech.name}</h1>
          <p className="mt-3 text-base leading-relaxed text-fg-muted">
            {tech.tagline}
          </p>
        </header>

        {/* The scene */}
        <section className="mt-10">
          <h2 className="eyebrow mb-3">The reference scene</h2>
          {tech.demo === 'webgl' ? (
            <>
              <PlasmaWebGL />
              <p className="mt-2 font-mono text-2xs text-fg-faint">
                Live · running on WebGL in your browser right now
              </p>
            </>
          ) : tech.demo === 'webgpu' ? (
            <PlasmaWebGPU />
          ) : (
            <div className="rounded-lg border border-dashed border-line-strong bg-ink-800 p-6">
              <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
                <span className="text-fg">Not running on this page.</span>{' '}
                {tech.name} is not a dependency of this site, and rendering a
                screenshot while implying it was live would be exactly the kind of
                thing this site exists not to do. The code below is real and is what
                you would write — the{' '}
                <Link href="/tech/webgl" className="link-accent">
                  WebGL
                </Link>{' '}
                and{' '}
                <Link href="/tech/webgpu" className="link-accent">
                  WebGPU
                </Link>{' '}
                pages have the same scene actually running, for comparison.
              </p>
            </div>
          )}
        </section>

        {/* What it is */}
        <section className="mt-12 max-w-prose">
          <h2 className="text-lg font-semibold tracking-tight">What it is</h2>
          <div className="mt-3 space-y-4 text-sm leading-relaxed text-fg-muted">
            {tech.what.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* When */}
        <section className="mt-12 grid gap-5 sm:grid-cols-2">
          <div className="panel p-5">
            <h2 className="eyebrow mb-3 text-accent">Reach for it when</h2>
            <ul className="space-y-2.5">
              {tech.reachFor.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="eyebrow mb-3">Look elsewhere when</h2>
            <ul className="space-y-2.5">
              {tech.avoid.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-fg-muted">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-fg-faint" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Code */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">The code</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            The same plasma, written the way {tech.name} wants it written.
          </p>
          <div className="mt-5 space-y-5">
            {tech.samples.map((sample) => (
              <CodeBlock key={sample.label} sample={sample} />
            ))}
          </div>
        </section>

        {/*
          The second reference scene. The plasma is a full-screen effect and
          compares almost nothing — no geometry, no camera, no depth buffer.
          This is the one where the four actually diverge.
        */}
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            {CUBE_SCENE.title}
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
            {CUBE_SCENE.description}
          </p>
          <p className="mt-3 font-mono text-2xs uppercase tracking-wider text-fg-faint">
            {lineFigure(tech.cubeLines)} lines here, against{' '}
            {lineFigure(tech.plasmaLines)} for the plasma
          </p>

          <div className="mt-5 max-w-2xl">
            {tech.demo === 'webgl' ? (
              <>
                <CubeWebGL />
                <p className="mt-2 font-mono text-2xs text-fg-faint">
                  Live · running on WebGL in your browser right now
                </p>
              </>
            ) : tech.demo === 'webgpu' ? (
              // CubeWebGPU captions itself, because only it knows whether the
              // device actually started.
              <CubeWebGPU />
            ) : (
              <div className="rounded-lg border border-dashed border-line-strong bg-ink-800 p-6">
                <p className="max-w-prose text-sm leading-relaxed text-fg-muted">
                  <span className="text-fg">Not running on this page</span>, for the
                  same reason as above — {tech.name} is not a dependency of this
                  site. The code is real; the picture it makes is the one on the{' '}
                  <Link href="/tech/webgl" className="link-accent">
                    WebGL
                  </Link>{' '}
                  page.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-5">
            {tech.cubeSamples.map((sample) => (
              <CodeBlock key={sample.label} sample={sample} />
            ))}
          </div>
        </section>

        {/* Gotchas */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">
            Things that will catch you
          </h2>
          <dl className="mt-5 space-y-5">
            {tech.gotchas.map((gotcha) => (
              <div key={gotcha.title} className="border-l-2 border-line pl-4">
                <dt className="text-sm font-medium text-fg">{gotcha.title}</dt>
                <dd className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg-muted">
                  {gotcha.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Learn more */}
        {reading.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-lg font-semibold tracking-tight">Where to learn it</h2>
            <ul className="mt-5 space-y-2.5">
              {reading.map((resource) => (
                <li key={resource.url}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                  >
                    <span className="text-sm font-medium text-fg transition-colors group-hover:text-accent">
                      {resource.title}
                    </span>
                    <span className="text-2xs text-fg-faint">{resource.author}</span>
                    {!resource.free ? (
                      <span className="font-mono text-2xs uppercase tracking-wider text-amber">
                        Paid
                      </span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-fg-muted">
              These and {ALL_RESOURCES.length - reading.length} more on the{' '}
              <Link href="/learn" className="link-accent">
                reading path
              </Link>
              .
            </p>
          </section>
        ) : null}

        <nav className="mt-14 flex items-center justify-between gap-4 border-t border-line pt-6">
          <Link
            href="/tech"
            className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
          >
            ← All technologies
          </Link>
          <Link
            href={`/tech/${next.slug}`}
            className="font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
          >
            {next.name} →
          </Link>
        </nav>
      </main>
      <Footer />
    </>
  );
}
