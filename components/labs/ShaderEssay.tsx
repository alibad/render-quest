'use client';

import { useMemo, type ReactNode } from 'react';

import { Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { useFigureState } from '@/components/lab/useFigureState';
import { PREAMBLE, PRESETS_SOURCE } from '@/components/labs/ShaderLab';

/**
 * The written half of lab 10.
 *
 * The figures here are SVG and JavaScript rather than live canvases, on
 * purpose. This lab manages its own WebGL context; standing up three more to
 * illustrate it would cost three more contexts on one page, and on a machine
 * without WebGL every one of them would render a failure card in the middle of
 * the prose. The listing figure reads the lab's own PREAMBLE and preset source,
 * so it cannot describe a preamble the instrument has stopped prepending; where
 * a figure needs the shader's arithmetic — the starter's circle, the radius its
 * knob swings — the expression is transcribed from that preset line for line
 * and evaluated on the CPU, and the caption says so.
 */

const ASPECT = 16 / 9;

/** GLSL's smoothstep, so a figure evaluates what the shader evaluates. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The two colours the `circle` preset mixes between, as the shader writes them. */
const INSIDE: [number, number, number] = [0.16, 0.72, 1.0];
const OUTSIDE: [number, number, number] = [1.0, 0.68, 0.25];

const rgb = (c: [number, number, number]) =>
  `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;

/**
 * The body of the `circle` preset, transcribed, with uTime held at zero — which
 * is also why uKnob is absent here: in that shader it only ever multiplies
 * sin(uTime), and sin(0) is nothing.
 */
function circleColour(u: number, v: number): string {
  const px = (u * 2 - 1) * ASPECT;
  const py = v * 2 - 1;
  const d = Math.hypot(px, py) - 0.55;
  const t = smoothstep(-0.02, 0.02, d);
  const channel = (i: 0 | 1 | 2) =>
    Math.round(255 * (INSIDE[i] + (OUTSIDE[i] - INSIDE[i]) * t));
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Thousands separated without depending on the reader's locale. */
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Numbers beside a figure, in the same voice as the labs' own readouts. */
function Readout({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="space-y-2.5">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
            {label}
          </dt>
          <dd className="tabular font-mono text-xs text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The starter shader evaluated once per cell, at whatever resolution you ask for. */
function PixelFigure() {
  // 20 across is 20 × 11 = 220 cells: coarse enough that the picture is
  // visibly assembled out of them, fine enough that four of them land in the
  // smoothstep band the caption calls muddy. It is 36% of the 4–48 range, so
  // both of the caption's directions are still open — down to four, where
  // nothing circular is left, and up to where the cells stop being cells.
  const [state, setState] = useFigureState(
    'once-per-pixel',
    { across: 20 },
    // The number becomes that many <rect> elements, so an unguarded
    // `?once-per-pixel.across=100000` would ask the browser for 100,000 ×
    // 56,250 of them and never come back. decodeState range-checks only what
    // it is handed a guard for; this repeats the slider's own bounds.
    { across: (value) => value >= 4 && value <= 48 },
  );
  const cols = Math.round(state.across);
  const rows = Math.max(1, Math.round((cols * 9) / 16));
  const height = (cols * 9) / 16;
  const cellHeight = height / rows;

  const cells = useMemo(() => {
    const out: ReactNode[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        out.push(
          <rect
            key={`${i}-${j}`}
            x={i}
            y={j * cellHeight}
            width={1}
            height={cellHeight}
            // vUv.y counts upward in GL and downward in SVG.
            fill={circleColour((i + 0.5) / cols, 1 - (j + 0.5) / rows)}
          />,
        );
      }
    }
    return out;
  }, [cols, rows, cellHeight]);

  return (
    <Figure
      id="once-per-pixel"
      control={
        <Slider
          label="pixels across"
          value={cols}
          min={4}
          max={48}
          step={1}
          precision={0}
          onChange={(across) => setState({ across })}
        />
      }
      readout={
        <Readout
          rows={[
            ['grid', `${cols} × ${rows}`],
            ['calls', group(cols * rows)],
            ['the canvas below', group(1536 * 864)],
          ]}
        />
      }
      caption={
        <>
          Drag down to four and nothing circular is left. Nothing here draws a
          circle: the shader measures each cell&rsquo;s distance from the centre,
          compares it against 0.55 and picks one of two colours, and the circle
          is what those answers look like once you have asked enough of them. The
          muddy cells are the ones whose centre landed in the narrow band where
          the two colours are mixed rather than chosen between.
        </>
      }
    >
      <svg
        viewBox={`0 0 ${cols} ${height}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="The circle preset evaluated once per cell on a coarse grid"
        className="block w-full rounded-md overflow-hidden"
      >
        {cells}
      </svg>
    </Figure>
  );
}

/** The three vertices in clip space, and how much of the triangle is thrown away. */
function TriangleFigure() {
  const X = (x: number) => 76 + 46 * x;
  const Y = (y: number) => 162 - 46 * y;

  return (
    <Figure
      id="oversized-triangle"
      caption={
        <>
          The square is the viewport; the triangle is four times its area. Two
          corners sit off-screen on purpose, and everything past the
          square&rsquo;s edge is clipped before the rasteriser makes a fragment
          of it. <code>vUv</code> reaches 2 at those far corners, and no pixel
          you can see gets a value above 1.
        </>
      }
    >
      <svg
        viewBox="0 0 262 246"
        role="img"
        aria-label="A triangle spanning from minus one to three in clip space, with the viewport square in its lower left corner"
        className="mx-auto block w-full max-w-[26rem] overflow-hidden"
      >
        <path
          d={`M ${X(-1)} ${Y(-1)} L ${X(3)} ${Y(-1)} L ${X(-1)} ${Y(3)} Z`}
          className="fill-accent/10 stroke-accent"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <rect
          x={X(-1)}
          y={Y(1)}
          width={X(1) - X(-1)}
          height={Y(-1) - Y(1)}
          className="fill-accent/25 stroke-fg"
          strokeWidth="1.6"
        />
        {[
          [-1, -1],
          [3, -1],
          [-1, 3],
        ].map(([x, y]) => (
          <circle key={`${x},${y}`} cx={X(x)} cy={Y(y)} r="3.4" className="fill-accent" />
        ))}

        <g className="fill-fg-muted font-mono" fontSize="9">
          <text x={X(-1)} y={222}>
            (-1, -1)
          </text>
          <text x={X(3)} y={222} textAnchor="end">
            (3, -1)
          </text>
          <text x={X(-1) + 10} y={18}>
            (-1, 3)
          </text>
        </g>
        <g className="fill-fg-faint font-mono" fontSize="8">
          <text x={X(-1)} y={234}>
            vUv 0, 0
          </text>
          <text x={X(3)} y={234} textAnchor="end">
            vUv 2, 0
          </text>
          <text x={X(-1) + 10} y={30}>
            vUv 0, 2
          </text>
          <text x={X(1) + 5} y={Y(1) - 4}>
            vUv 1, 1
          </text>
          <text x={160} y={196} textAnchor="middle">
            clipped away
          </text>
        </g>
        <text x={X(0)} y={Y(0) + 3} textAnchor="middle" fontSize="9" className="fill-fg font-mono">
          viewport
        </text>
      </svg>
    </Figure>
  );
}

/** One uniform, and the one number in the starter it reaches. */
function KnobFigure() {
  // uKnob 1 is an identity for a multiplier but not a null for this figure: it
  // is the full 0.08 swing the preset was written around, which puts the two
  // dashed outlines 3.6 units either side of a 24.75-unit disc — the sweep the
  // caption describes, plainly visible before anything is touched. It is also
  // the midpoint of 0–2 and ShaderLab's own DEFAULTS.knob, so the figure and
  // the instrument below it do not open disagreeing about the same uniform.
  const [state, setState] = useFigureState(
    'knob-sweep',
    { knob: 1 },
    // The lab's guard, repeated: a link carrying knob=1e6 makes `base - swing`
    // negative, and an SVG circle with a negative r is dropped, so the figure
    // would quietly lose the outline that is the whole point of it.
    { knob: (value) => value >= 0 && value <= 2 },
  );
  const knob = state.knob;
  const unit = 45;
  const base = 0.55;
  const swing = 0.08 * knob;

  return (
    <Figure
      id="knob-sweep"
      control={
        <Slider
          label="uKnob"
          value={knob}
          min={0}
          max={2}
          onChange={(value) => setState({ knob: value })}
        />
      }
      readout={
        <Readout
          rows={[
            ['uKnob', knob.toFixed(2)],
            ['0.08 × uKnob', swing.toFixed(3)],
            ['radius sweeps', `${(base - swing).toFixed(2)} – ${(base + swing).toFixed(2)}`],
          ]}
        />
      }
      caption={
        <>
          The disc is the radius the shader compares distances against: 0.55. The
          dashed outlines are where that radius reaches at the extremes of{' '}
          <code>sin(uTime)</code>, 0.08 × uKnob either side of it. At the top of
          the slider the circle breathes between 0.39 and 0.71; at zero both
          outlines land on the edge of the disc and it stops moving, because the
          term is still computed and then multiplied by nothing.
        </>
      }
    >
      <svg
        viewBox="0 0 160 90"
        role="img"
        aria-label="A disc with dashed outlines marking the radius the knob sweeps it through"
        className="block w-full rounded-md overflow-hidden"
      >
        <rect width="160" height="90" fill={rgb(OUTSIDE)} />
        <circle cx="80" cy="45" r={base * unit} fill={rgb(INSIDE)} />
        <circle
          cx="80"
          cy="45"
          r={(base + swing) * unit}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.9"
          strokeWidth="0.7"
          strokeDasharray="2.5 2.5"
        />
        <circle
          cx="80"
          cy="45"
          r={(base - swing) * unit}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.9"
          strokeWidth="0.7"
          strokeDasharray="2.5 2.5"
        />
      </svg>
    </Figure>
  );
}

/**
 * Exactly the text the driver is handed when the fourth preset is loaded —
 * taken from the lab itself, so the listing cannot describe a preamble the
 * instrument has stopped prepending.
 */
const PREAMBLE_LINES = PREAMBLE.trimEnd().split('\n');
const BROKEN_LINES = PRESETS_SOURCE.broken.split('\n');

/** The statement that forgot its semicolon; the compiler notices on the next one. */
const MISSING_SEMICOLON = BROKEN_LINES.findIndex((line) => /^\s*\w.*[^;{}]$/.test(line));

function ListingRow({
  driver,
  yours,
  text,
  tone,
}: {
  driver: number;
  yours: number | null;
  text: string;
  tone: 'preamble' | 'yours' | 'error';
}) {
  return (
    <div
      className={`grid grid-cols-[3.5rem_2.75rem_1fr] items-baseline px-3 py-[3px] font-mono text-2xs leading-relaxed ${
        tone === 'error' ? 'bg-red/10' : ''
      }`}
    >
      <span className="tabular text-fg-faint">{driver}</span>
      <span className={`tabular ${yours === null ? 'text-fg-faint/40' : 'text-accent'}`}>
        {yours ?? '·'}
      </span>
      <span
        className={`whitespace-pre ${
          tone === 'preamble' ? 'text-fg-faint' : tone === 'error' ? 'text-red' : 'text-fg-muted'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

/** Why the driver's line number is not the line number in your editor. */
function PreambleFigure() {
  return (
    <Figure
      id="preamble-offset"
      caption={
        <>
          The preamble is five lines, and the driver compiles it and your source
          as one file, counting from the top of a listing you never see: your
          line 3 is its line 8. The panel subtracts five before printing the
          number — the whole distance between an error message and a fix.
        </>
      }
    >
      <div className="overflow-x-auto rounded-md border border-line bg-ink-800">
        <div className="min-w-max">
          <div className="grid grid-cols-[3.5rem_2.75rem_1fr] border-b border-line px-3 py-2 font-mono text-2xs uppercase tracking-wider text-fg-faint">
            <span>driver</span>
            <span>you</span>
            <span>what the compiler is handed</span>
          </div>
          {PREAMBLE_LINES.map((text, i) => (
            <ListingRow key={`p${i}`} driver={i + 1} yours={null} text={text} tone="preamble" />
          ))}
          {BROKEN_LINES.map((text, i) => (
            <ListingRow
              key={`b${i}`}
              driver={PREAMBLE_LINES.length + i + 1}
              yours={i + 1}
              text={text}
              tone={
                MISSING_SEMICOLON >= 0 && (i === MISSING_SEMICOLON || i === MISSING_SEMICOLON + 1)
                  ? 'error'
                  : 'yours'
              }
            />
          ))}
        </div>
      </div>
    </Figure>
  );
}

export function ShaderEssay() {
  return (
    <Prose>
      <p>
        Nine labs have handed you sliders onto shaders somebody else wrote. This
        one hands over the keyboard: the editor at the foot of the page holds a
        fragment shader, and the next animation frame after you change a
        character compiles it and draws with the result.
      </p>
      <p>
        What makes shaders feel hard is not the mathematics. It is that a mistake
        produces a black rectangle and a message in a console nobody was looking
        at, so the first hour goes on guessing which of thirteen lines the driver
        objected to. Here the compiler&rsquo;s own words appear under the canvas,
        the line number is corrected to match your editor, and the last shader
        that worked stays on screen while you repair the one that does not.
      </p>

      <ProseHeading id="function">
        The whole picture is one function, run once per pixel
      </ProseHeading>
      <p>
        A fragment shader is a function. Its inputs are a coordinate and a few
        values you supply; its output is four floats written to{' '}
        <code>gl_FragColor</code> — red, green, blue and alpha. It runs once for
        every pixel that gets drawn, and each run knows nothing about any other:
        it cannot read a neighbour&rsquo;s colour and has no way to loop over the
        image. Everything it produces comes from the coordinate it was handed.
      </p>

      <PixelFigure />

      <p>
        The starter is that comparison and little else.{' '}
        <code>length(p) - 0.55</code> is negative inside the circle and positive
        outside, and <code>smoothstep(-0.02, 0.02, d)</code> turns the sign into
        a 0 or a 1 with a ramp four hundredths of a unit wide — the entire
        antialiasing of that edge. Swap it for <code>step</code> and the edge
        becomes a staircase of pixels.
      </p>
      <p>
        The independence buys the speed: calls that cannot see each other may run
        in any order, so the hardware runs thousands at once. The canvas below is
        768 CSS pixels across in a full-width window and the lab clamps the
        device-pixel ratio at two, so on a retina screen it is 1536 by 864 device
        pixels — 1,327,104 invocations of your function per frame, close to
        eighty million a second. You never write that loop; writing its body is
        the whole job.
      </p>

      <ProseHeading id="triangle">
        There is no geometry — three vertices, and none of them are the picture
      </ProseHeading>
      <p>
        A fragment shader has to be run over something, and in every earlier lab
        that something was a model — vertices, a buffer, a matrix, a camera. Here
        the vertex buffer holds six floats. The corners are{' '}
        <code>(-1, -1)</code>, <code>(3, -1)</code> and <code>(-1, 3)</code> —
        one triangle, twice the width and twice the height of the screen, drawn
        by a single <code>gl.drawArrays(gl.TRIANGLES, 0, 3)</code>.
      </p>

      <TriangleFigure />

      <p>
        A quad would do the same job with two triangles and a seam through the
        middle of the picture, and the 2×2 pixel blocks that seam crosses get
        shaded for both of them. One oversized triangle has no interior edge: one
        primitive, three vertices, twenty-four bytes of buffer. It is the
        standard shape of full-screen work — post-processing, tone mapping, a
        blur — where the geometry is a formality.
      </p>
      <p>
        The vertex shader is six lines and never changes. It writes{' '}
        <code>gl_Position</code> straight from the attribute, because the
        attribute is already in clip space: no model matrix, no view, no
        projection. Nothing from <a href="/labs/transform">The Model Matrix</a>{' '}
        applies here, because there is no model to place. Its other statement is{' '}
        <code>vUv = aPosition * 0.5 + 0.5</code>, which turns those −1…1 corners
        into the 0…1 the fragment stage reads.
      </p>

      <ProseHeading id="uniforms">
        Uniforms are the arguments, and every invocation is handed the same ones
      </ProseHeading>
      <p>
        Four names are declared above your code and exist whether you use them or
        not. <code>vUv</code> is a varying: interpolated across the triangle and
        different in every invocation, the only input that changes from pixel to
        pixel. <code>uTime</code>, <code>uResolution</code> and <code>uKnob</code>{' '}
        are uniforms — one value each, set before the draw call and identical in
        all 1,327,104 invocations that follow. Which things vary and which do not
        is most of the vocabulary.
      </p>
      <p>
        <code>uResolution</code> is the canvas in device pixels rather than CSS
        pixels, and it matters the moment you care about shape. A distance
        measured in <code>vUv</code> is stretched, because the canvas is wider
        than it is tall; <code>p.x *= uResolution.x / uResolution.y</code> undoes
        that, and without the line the disc arrives as an ellipse 1.78 times as
        wide as it is high.
      </p>

      <KnobFigure />

      <p>
        <code>uKnob</code> is a float between 0 and 2 wired to nothing in
        particular: multiply something by it and you have a slider onto whatever
        number you were about to hard-code. The rings preset spends it on ring
        frequency, <code>14.0 + uKnob * 30.0</code>. At the top of its range the
        bright part of each ring is about seven tenths of a pixel wide on this
        canvas — narrower than the thing sampling it — so what you see is not
        rings but the noise of sampling them too rarely, which is{' '}
        <a href="/labs/textures#footprint">Textures &amp; Sampling</a> arriving from the
        other side.
      </p>
      <p>
        <code>uTime</code> is seconds since the canvas started, and animation is
        nothing more than a term in an expression. No state carries from one
        frame to the next, because there is nowhere to put it: a fragment shader
        cannot remember. When you need it to — a particle whose position now
        depends on where it was last frame — you need a buffer and a different
        kind of shader, which is{' '}
        <a href="/labs/compute#storage">Compute &amp; Particles</a>.
      </p>

      <ProseHeading id="errors">
        The compiler tells you what is wrong, once something shows you
      </ProseHeading>
      <p>
        Break it and see; the fourth preset breaks it for you, with a{' '}
        <code>vec3</code> assigned to a <code>vec4</code> and a missing
        semicolon. Three things then happen that would not happen in an ordinary
        project. The last program that linked stays bound, so your picture
        survives the typo. The driver&rsquo;s log is printed verbatim. And the
        line number is put back where you can use it.
      </p>

      <PreambleFigure />

      <p>
        The wording comes from your graphics driver and differs between machines,
        which is worth knowing before you paste a message into a search engine.
        The shapes do not differ. Nearly everything you will hit is one of three
        things: a missing semicolon, which the compiler cannot notice until it
        has read the next statement, so it names the line after the one you must
        change; a type that will not convert, because GLSL will not turn a{' '}
        <code>vec3</code> into a <code>vec4</code> for you; and a name that does
        not exist, usually a swizzle with a letter that is not in the vector.
      </p>
      <p>
        The messages will also name things you did not write. This is GLSL ES
        1.00, the dialect WebGL 1 speaks: <code>attribute</code>,{' '}
        <code>varying</code>, and a colour assigned to <code>gl_FragColor</code>.
        WebGL 2 spells the same ideas as <code>in</code>, <code>out</code> and an
        output you declare; the WebGPU labs are in WGSL. The ideas carry across,
        the keywords do not.
      </p>

      <ProseHeading id="instrument">Now type into it</ProseHeading>
      <p>
        The instrument below holds nothing still: four presets, the knob, the
        compiler&rsquo;s output, and a text area that rebuilds the program on the
        next frame after every keystroke. It answers every question at once,
        which is why it cannot isolate a single one.
      </p>
      <p>
        Start by changing a number. The <code>0.55</code> is the radius; make it
        0.2 and the disc shrinks, make it 2.0 and it swallows the frame. Then
        delete a semicolon on purpose, so that the first time the panel turns red
        it is because you meant it to. Switching preset replaces what is in the
        editor, so copy anything you want to keep first; the share link carries
        the preset and the knob but not your source.
      </p>
      <p>
        The shader is thirteen lines, the compiler answers within a frame, and a
        wrong guess costs you the time it takes to read one sentence. That loop —
        type, look, read the error, type again — is what writing shaders consists
        of, and it is why the ones you find in the wild are usually short.
      </p>
    </Prose>
  );
}
