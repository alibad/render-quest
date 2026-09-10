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

/** Code only is a fact about the page, not a warning, so it is faint, not amber. */
const demoTone = (demo: string) =>
  demo === 'code-only' ? 'text-fg-faint' : 'text-accent';

/*
 * One class list for the table's column headers and for the field names in the
 * stacked cards that replace the table below md. The claim that the two shapes
 * are the same object only holds if the labels look identical, and two copies
 * of a class list drift.
 */
const COLUMN_LABEL = 'font-mono text-2xs font-normal uppercase tracking-wider';

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
        {/*
          Two shapes for one comparison, because a five-column table does not
          survive a phone. At 375px the wrapper is 335px wide (px-5 either side)
          and the table was 768px, so the three columns this section exists for
          began at x=392, x=454 and x=536 — measured on the live site in issue
          #17, every one of them off-screen, behind a swipe with nothing on
          screen to suggest a swipe was possible. overflow-x-auto
          kept the *page* from scrolling sideways, which is all the smoke test
          asks for, so the failure sat there looking healthy (issue #17).

          The other two shapes are worse here. A sticky first column keeps the
          technology name in view and still hides four of its five values
          behind that same undiscoverable swipe. A transposed table puts the
          four technologies across the top, which is four value columns plus a
          label column in 335px — the same overflow with the axes relabelled.
          Stacking one block per technology is the only shape that gets every
          figure on screen at once. What it costs is the comparison down a
          column, which is the entire reason to draw a table, so it is confined
          to the widths where a table cannot fit; both shapes map the same
          TECHNOLOGIES through the same lineFigure, so no figure can differ
          between them.
        */}
        <div className="mt-5 border-t border-line md:hidden">
          {TECHNOLOGIES.map((tech) => (
            <div key={tech.slug} className="border-b border-line/70 py-4">
              <Link
                href={`/tech/${tech.slug}`}
                className="font-semibold tracking-tight text-fg transition-colors hover:text-accent"
              >
                {tech.name}
              </Link>
              <p className="mt-0.5 text-sm text-fg-muted">{tech.kind}</p>
              <dl className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className={`${COLUMN_LABEL} text-fg-faint`}>Plasma</dt>
                  <dd className="tabular font-mono text-sm text-fg-muted">
                    {lineFigure(tech.plasmaLines)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className={`${COLUMN_LABEL} text-fg-faint`}>Lit cube</dt>
                  <dd className="tabular font-mono text-sm text-fg">
                    {lineFigure(tech.cubeLines)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className={`${COLUMN_LABEL} text-fg-faint`}>Demo</dt>
                  <dd
                    className={`text-right font-mono text-2xs uppercase tracking-wider ${demoTone(
                      tech.demo,
                    )}`}
                  >
                    {DEMO_LABEL[tech.demo]}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/*
          The floor is 44rem rather than the 48rem it was: this is hidden below
          md, and at md exactly the content box is 728px, so a 768px floor made
          a tablet scroll 40px sideways for no reason. overflow-x-auto stays as
          a backstop — nothing should reach it now, but a cell that grows later
          must not be able to push the page itself sideways.
        */}
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-fg-faint">
                <th className={`pb-3 ${COLUMN_LABEL}`}>Technology</th>
                <th className={`pb-3 ${COLUMN_LABEL}`}>What it is</th>
                <th className={`pb-3 text-right ${COLUMN_LABEL}`}>Plasma</th>
                <th className={`pb-3 text-right ${COLUMN_LABEL}`}>Lit cube</th>
                <th className={`pb-3 pl-6 ${COLUMN_LABEL}`}>Demo</th>
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
                      className={`font-mono text-2xs uppercase tracking-wider ${demoTone(
                        tech.demo,
                      )}`}
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
          the figures here cannot disagree with the code underneath them. The{' '}
          {inWords(ESTIMATED.length)} carrying a tilde —{' '}
          {joinList(ESTIMATED.map((entry) => `${entry.tech.name}’s ${entry.scene}`))} —
          are estimates of a complete implementation, because those listings are
          excerpts and there is nothing printed to count. Either way the figure is the
          plumbing around the shader, not a quality score: fewer lines means more is
          being done for you, which is exactly what you want in one situation and
          exactly what you do not want in another. Of the two scenes the cube is the more
          honest: the plasma has no geometry, no camera and no depth buffer, so it
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
