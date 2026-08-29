import Link from 'next/link';

import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { HeroCanvas } from '@/components/site/HeroCanvas';
import { LabCard } from '@/components/site/LabCard';
import { LABS } from '@/lib/labs';
import { ALL_RESOURCES, TRACKS } from '@/lib/resources';

export default function Home() {
  const liveLabs = LABS.filter((lab) => lab.status === 'live').length;

  return (
    <>
      <Header />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="animate-fade-up">
              <p className="eyebrow">Interactive graphics labs</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
                Learn graphics by moving the numbers.
              </h1>
              <p className="mt-5 max-w-prose text-base leading-relaxed text-fg-muted">
                A transform is not a table of sixteen numbers — it is a motion, and you
                cannot see a motion on a static page. So here you drag the numbers
                themselves and watch the matrix, the geometry and the pixels change
                together.
              </p>
              <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
                <Stat value={String(liveLabs)} label="interactive labs" />
                <Stat value={String(ALL_RESOURCES.length)} label="curated resources" />
                <Stat value="0" label="stock images" />
              </dl>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/labs/transform"
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-accent/85"
                >
                  Open the first lab
                </Link>
                <Link
                  href="/labs"
                  className="rounded-lg border border-line px-5 py-2.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  See all labs
                </Link>
              </div>
            </div>

            <div>
              <HeroCanvas />
              <p className="mt-3 text-2xs leading-relaxed text-fg-faint">
                Live WebGL, rendering right now — the projection lab with its controls
                taken away. The cyan wireframe is a camera&rsquo;s view frustum,
                breathing as its field of view changes.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex items-end justify-between gap-6 border-b border-line pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">The labs</h2>
              <p className="mt-1.5 text-sm text-fg-muted">
                Each one isolates a single idea and gives you the controls to it.
              </p>
            </div>
            <Link
              href="/labs"
              className="shrink-0 font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
            >
              All labs →
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {LABS.map((lab) => (
              <LabCard key={lab.slug} lab={lab} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="panel overflow-hidden">
            <div className="grid gap-8 p-7 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <p className="eyebrow">Learn</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
                  Then read the best of what everyone else has written.
                </h2>
                <p className="mt-4 max-w-prose text-sm leading-relaxed text-fg-muted">
                  The labs cover the spine. For the rest there is a curated path of{' '}
                  {ALL_RESOURCES.length} resources across graphics and game
                  development — courses, books, interactive explainers and tools,
                  each with a line on why it earns your evenings, arranged so every
                  stage makes the next one easier. Most are free. Every link is
                  checked.
                </p>
                <Link
                  href="/learn"
                  className="mt-6 inline-flex rounded-lg border border-line px-5 py-2.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  Open the reading path
                </Link>
              </div>

              <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {TRACKS.map((track) => (
                  <Link
                    key={track.id}
                    href="/learn"
                    className="group h-fit rounded-lg border border-line bg-ink-800/60 p-4 transition-colors hover:border-line-strong hover:bg-ink-600/50"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold tracking-tight text-fg">
                        {track.title}
                      </h3>
                      <span className="font-mono text-2xs text-accent">
                        {track.stages.reduce((n, s2) => n + s2.resources.length, 0)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                      {track.tagline}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {track.stages.map((stage) => (
                        <li
                          key={stage.id}
                          className="flex items-center gap-2 font-mono text-2xs text-fg-faint"
                        >
                          <span className="h-px w-3 bg-line-strong" />
                          {stage.title}
                        </li>
                      ))}
                    </ul>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-6 pt-4">
          <div className="grid gap-8 border-t border-line pt-10 sm:grid-cols-3">
            <Principle title="No framework in the way">
              Raw WebGL and a few hundred lines of matrix maths. The plumbing a scene
              graph would hide is the actual subject, so none of it is hidden.
            </Principle>
            <Principle title="The maths is on screen">
              Every lab shows the live matrix next to the render. The coloured columns
              in the readout are the coloured axes on the canvas — the same thing,
              twice.
            </Principle>
            <Principle title="Checked, not asserted">
              The matrix library ships with a numeric test suite. Claims about how a
              projection behaves are verified on every commit rather than written down
              and hoped for.
            </Principle>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="tabular font-mono text-xl font-semibold text-fg">
          {value}
        </span>
        <span className="ml-2 text-xs text-fg-faint">{label}</span>
      </dd>
    </div>
  );
}

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{children}</p>
    </div>
  );
}
