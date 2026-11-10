import Link from 'next/link';

import { HqHero, HqStones, HqSunset } from '@/components/hq-path/hq-path';
import { RqFamilyFooter } from '@/components/hq-path/RqFamilyFooter';
import { RqQuestbar } from '@/components/hq-path/RqQuestbar';
import { fraunces, instrumentSans } from '@/components/hq-path/fonts';
import { HeroCanvas } from '@/components/site/HeroCanvas';
import { LabGlyph } from '@/components/site/LabGlyph';
import { essayOutline } from '@/lib/essay-outline';
import { LIVE_LABS, ORDERED_LABS, type Lab } from '@/lib/labs';
import { ALL_RESOURCES, TRACKS } from '@/lib/resources';
import { ASK_URL, REPO_URL, REPORT_URL, SITE_SUBHEAD, SITE_TAGLINE } from '@/lib/site';
import {
  CODE_ONLY,
  REFERENCE_SCENES,
  RUNS_HERE,
  SHARED_SCENE,
  TECHNOLOGIES,
  inWords,
  lineFigure,
  nameList,
} from '@/lib/technologies';
import { CANVAS_PALETTE, type CanvasPalette, type Theme } from '@/lib/theme';

import '@/components/hq-path/hq-path.css';
import '@/components/hq-path/render-quest-path.css';

/**
 * The hero scene in the Human Quest family's colours: the card's warm paper
 * behind it, the frustum in ember (sun-orange after dark), the eye rays in the
 * Tools territory's lavender. Everything else — the axis-coloured boxes, the
 * lighting — is the projection lab's own palette, untouched.
 */
const PATH_HERO: Record<Theme, CanvasPalette> = {
  light: {
    ...CANVAS_PALETTE.light,
    clear: [1, 0.98, 0.945],
    grid: [0.8, 0.72, 0.6],
    accent: [0.878, 0.353, 0.157],
    accentDim: [0.592, 0.529, 0.733],
  },
  dark: {
    ...CANVAS_PALETTE.dark,
    clear: [0.165, 0.114, 0.082],
    grid: [0.33, 0.25, 0.19],
    accent: [0.953, 0.643, 0.243],
    accentDim: [0.66, 0.6, 0.82],
  },
};

const capitalise = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

/** The tagline from lib/site.ts, with its verb in the family's italic ember. */
function Tagline() {
  const word = 'moving';
  const at = SITE_TAGLINE.indexOf(word);
  if (at < 0) return <>{SITE_TAGLINE}</>;
  return (
    <>
      {SITE_TAGLINE.slice(0, at)}
      <em>{word}</em>
      {SITE_TAGLINE.slice(at + word.length)}
    </>
  );
}

export default function Home() {
  const liveLabs = LIVE_LABS.length;
  const maxLines = Math.max(
    ...TECHNOLOGIES.flatMap((tech) => [tech.linesForPlasma, tech.linesForCube]),
  );

  return (
    <div
      className={`hqp-page rq-path ${fraunces.variable} ${instrumentSans.variable}`}
      data-hqp-t="tools"
    >
      <RqQuestbar />
      <main id="main-content">
        <HqHero
          territory="tools"
          eyebrow="Interactive graphics labs"
          title={<Tagline />}
          lede={SITE_SUBHEAD}
          actions={
            <>
              <Link className="hqp-btn hqp-btn-solid" href="/labs/transform">
                Open the first lab
              </Link>
              <Link className="hqp-btn hqp-btn-ghost" href="/labs">
                See all labs
              </Link>
            </>
          }
          art={
            <figure className="rq-stage">
              <div className="rq-stage-frame">
                <div className="rq-stage-bar" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <span>
                    <b className="rq-live" />
                    Projection lab · live WebGL
                  </span>
                </div>
                <HeroCanvas palettes={PATH_HERO} />
              </div>
              <figcaption>
                Rendering right now: the projection lab with its controls taken away. The
                orange wireframe is a camera&rsquo;s view frustum, breathing as its field of
                view changes.
              </figcaption>
            </figure>
          }
        >
          <dl className="rq-stats">
            <Stat value={String(liveLabs)} label="interactive labs" />
            <Stat value={String(ALL_RESOURCES.length)} label="curated resources" />
            <Stat value="0" label="stock images" />
          </dl>
        </HqHero>

        <section className="hqp-section rq-how" aria-labelledby="how-heading">
          <div className="hqp-inner">
            <div className="hqp-head">
              <div>
                <p className="hqp-eyebrow">How a lab works</p>
                <h2 id="how-heading" className="hqp-display">
                  One idea, and the <em>controls</em> to it.
                </h2>
              </div>
            </div>
            <HqStones
              steps={[
                {
                  title: 'Pick one idea',
                  text: `${liveLabs} labs in sequence, each one assuming the one before it.`,
                },
                {
                  title: 'Move the numbers',
                  text: 'Drag a matrix and watch the geometry move. The numbers driving the render sit beside it, live.',
                },
                {
                  title: 'Know where it stops',
                  text: 'Every lab ends with what you can now do, and what it did not teach you.',
                },
              ]}
            />
          </div>
        </section>

        <section className="hqp-section rq-labs" aria-labelledby="labs-heading">
          <div className="hqp-inner">
            <div className="hqp-head">
              <div>
                <p className="hqp-eyebrow">The labs</p>
                <h2 id="labs-heading" className="hqp-display">
                  {liveLabs} labs, <em>one idea</em> each.
                </h2>
              </div>
              <Link className="hqp-btn hqp-btn-ghost" href="/labs">
                All labs
              </Link>
            </div>

            {/* The same read time /labs prints, from the same cached call, so the
                two grids of the same ten labs do not disagree with each other.
                Guarded on status because a lab still being built has no essay
                file for `essayOutline` to count. */}
            <div className="rq-lab-grid">
              {ORDERED_LABS.map((lab, index) => (
                <LabTile
                  key={lab.slug}
                  lab={lab}
                  first={index === 0}
                  minutes={lab.status === 'live' ? essayOutline(lab.slug).minutes : undefined}
                />
              ))}
              {/* Sized against the lab count, like LabsTailCard on /labs: it fills
                  whatever the last row leaves, at three columns and at two. The
                  first lab spans two cells, so the labs use count + 1 of them. */}
              <div
                className="rq-tail"
                style={
                  {
                    '--rq-tail-3': 3 - ((ORDERED_LABS.length + 1) % 3),
                    '--rq-tail-2': 2 - ((ORDERED_LABS.length + 1) % 2),
                  } as React.CSSProperties
                }
              >
                <p className="hqp-eyebrow">The end of the sequence, for now</p>
                <p>
                  {liveLabs} labs, each one assuming the one before it. What comes after
                  them is written down, including what was proposed and turned down, with
                  the reason.
                </p>
                <div className="rq-tail-links">
                  <Link href="/roadmap">What is next →</Link>
                  <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noreferrer noopener">
                    Ask for a lab →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hqp-section hqp-tint rq-tech" aria-labelledby="tech-heading">
          <div className="hqp-inner">
            <div className="hqp-head">
              <div>
                <p className="hqp-eyebrow">Pick a technology</p>
                <h2 id="tech-heading" className="hqp-display">
                  {SHARED_SCENE.title.replace(/,.*$/, ',')}{' '}
                  <em>{SHARED_SCENE.title.replace(/^.*,\s*/, '')}</em>.
                </h2>
                <p className="hqp-lede">
                  {capitalise(inWords(REFERENCE_SCENES.length))} reference scenes on every
                  page. {nameList(RUNS_HERE)} run them here; {nameList(CODE_ONLY)} are shown
                  as code. What differs is only what you write around them.
                </p>
              </div>
              <Link className="hqp-btn hqp-btn-ghost" href="/tech">
                Compare them
              </Link>
            </div>

            <p className="rq-legend" aria-hidden>
              <span className="rq-key rq-key-plasma" /> plasma
              <span className="rq-key rq-key-cube" /> lit cube
              <span className="rq-legend-note">lines of code, same picture</span>
            </p>
            <div className="rq-tech-grid">
              {TECHNOLOGIES.map((tech) => (
                <Link key={tech.slug} href={`/tech/${tech.slug}`} className="hqp-card rq-tech-card">
                  <div className="rq-tech-top">
                    <h3>{tech.name}</h3>
                    <span className={tech.demo === 'code-only' ? 'rq-demo rq-demo-code' : 'rq-demo'}>
                      {tech.demo === 'code-only' ? 'Code only' : 'Runs here'}
                    </span>
                  </div>
                  <p className="rq-kind">{tech.kind}</p>
                  <p className="rq-tagline">{tech.tagline}</p>
                  <dl className="rq-bars">
                    <Bar
                      label="plasma"
                      kind="plasma"
                      figure={lineFigure(tech.plasmaLines)}
                      share={tech.linesForPlasma / maxLines}
                    />
                    <Bar
                      label="lit cube"
                      kind="cube"
                      figure={lineFigure(tech.cubeLines)}
                      share={tech.linesForCube / maxLines}
                    />
                  </dl>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="hqp-section hqp-nightband rq-learn" aria-labelledby="learn-heading">
          <div className="hqp-inner rq-learn-grid">
            <div>
              <p className="hqp-eyebrow">Learn</p>
              <h2 id="learn-heading" className="hqp-display">
                Then read the best of what <em>everyone else</em> has written.
              </h2>
              <p className="hqp-lede">
                The labs cover the spine. For the rest there is a curated path of{' '}
                {ALL_RESOURCES.length} resources across graphics and game development. Most
                are free. Every link is checked.
              </p>
              <Link className="hqp-btn hqp-btn-light" href="/learn">
                Open the reading path
              </Link>
            </div>
            <div className="rq-tracks">
              {TRACKS.map((track) => (
                <Link key={track.id} href="/learn" className="rq-track" data-track={track.id}>
                  <div className="rq-track-head">
                    <h3>{track.title}</h3>
                    <span>
                      {track.stages.reduce((n, stage) => n + stage.resources.length, 0)} resources
                    </span>
                  </div>
                  <p>{track.tagline}</p>
                  <ol>
                    {track.stages.map((stage) => (
                      <li key={stage.id}>{stage.title}</li>
                    ))}
                  </ol>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="hqp-section rq-why" aria-labelledby="why-heading">
          <div className="hqp-inner">
            <div className="hqp-head">
              <div>
                <p className="hqp-eyebrow">How it is built</p>
                <h2 id="why-heading" className="hqp-display">
                  An <em>instrument</em>, not a brochure.
                </h2>
              </div>
            </div>
            <div className="rq-principles">
              <Principle n="01" title="No framework in the way">
                Raw WebGL and WebGPU, and a few hundred lines of matrix maths. The plumbing a
                scene graph would hide is the actual subject, so none of it is hidden.
              </Principle>
              <Principle n="02" title="The numbers are on screen">
                Every lab puts the numbers driving the render next to it, live: the matrix, the
                depth budget, the measured cost of a frame.
              </Principle>
              <Principle n="03" title="Checked, not asserted">
                The matrix library ships with a numeric test suite. Claims about how a
                projection behaves are verified on every commit.
              </Principle>
            </div>
          </div>
        </section>

        <section className="hqp-section rq-last" aria-labelledby="last-heading">
          <div className="hqp-inner">
            <p className="hqp-eyebrow">Lab 01 · The Model Matrix</p>
            <h2 id="last-heading" className="hqp-display">
              Start by <em>moving</em> one number.
            </h2>
            <div className="hqp-ctas">
              <Link className="hqp-btn hqp-btn-ember" href="/labs/transform">
                Open the first lab
              </Link>
              <a className="hqp-btn hqp-btn-ghost" href={ASK_URL} target="_blank" rel="noreferrer noopener">
                Ask a question
              </a>
            </div>
            {/* The only routes back a reader has: no accounts, no comments, no
                email. Two links, because reporting a defect and admitting you got
                lost are different acts. */}
            <p className="rq-report">
              Found a mistake, bad arithmetic, a figure that will not run?{' '}
              <a href={REPORT_URL} target="_blank" rel="noreferrer noopener">
                Open an issue
              </a>
              . Stuck on a lab?{' '}
              <a href={ASK_URL} target="_blank" rel="noreferrer noopener">
                Ask in Discussions
              </a>
              . Both reach me, and both are public.
            </p>
          </div>
        </section>
      </main>
      <HqSunset sunX={1080} />
      <RqFamilyFooter />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <b>{value}</b>
        <span>{label}</span>
      </dd>
    </div>
  );
}

function Bar({
  label,
  kind,
  figure,
  share,
}: {
  label: string;
  kind: 'plasma' | 'cube';
  figure: string;
  share: number;
}) {
  return (
    <div className={`rq-bar rq-bar-${kind}`}>
      <dt>{label}</dt>
      <dd>
        <i style={{ width: `${Math.max(4, Math.round(share * 100))}%` }} />
        <span>{figure}</span>
      </dd>
    </div>
  );
}

function Principle({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rq-principle">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

/**
 * A lab on the contents page: the lab's own diagram on a sheet of graph paper,
 * then the title, the one-line blurb and the concepts it covers. Read time and
 * the API ride in the plate's corners, as on /labs.
 */
function LabTile({ lab, minutes, first }: { lab: Lab; minutes?: number; first: boolean }) {
  const live = lab.status === 'live';
  const body = (
    <>
      <div className="rq-plate">
        <span className="rq-n">{String(lab.order).padStart(2, '0')}</span>
        <span className={lab.technology === 'webgpu' ? 'rq-api rq-api-gpu' : 'rq-api'}>
          {lab.technology === 'webgpu' ? 'WebGPU' : 'WebGL'}
        </span>
        <div className="rq-glyph">
          <LabGlyph slug={lab.slug} />
        </div>
        {minutes !== undefined ? <span className="rq-min">{minutes} min read</span> : null}
      </div>
      <div className="hqp-body">
        {first ? <p className="rq-start">Start here</p> : null}
        <h3>{lab.title}</h3>
        <p>{lab.blurb}</p>
        {first ? (
          <p className="rq-takeaway">
            <span>What you should come away with</span>
            {lab.takeaway}
          </p>
        ) : null}
        <ul className="rq-tags">
          {lab.concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
        <span className="rq-open">{live ? 'Open the lab →' : 'Building'}</span>
      </div>
    </>
  );
  const className = `hqp-card rq-lab${first ? ' rq-first' : ''}${live ? '' : ' rq-building'}`;
  if (!live) return <div className={className}>{body}</div>;
  return (
    <Link href={`/labs/${lab.slug}`} className={className}>
      {body}
    </Link>
  );
}
