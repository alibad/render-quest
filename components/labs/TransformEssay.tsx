'use client';

import { Check } from '@/components/lab/Check';
import { Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { MatrixView } from '@/components/lab/MatrixView';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';
import { usePalette } from '@/components/site/ThemeProvider';
import {
  composeModel,
  createScene,
  DEFAULTS,
  type TransformParams,
} from '@/components/labs/TransformLab';

/**
 * The written half of lab 1.
 *
 * Every figure below drives the lab's own `createScene`, so a figure cannot
 * drift away from the instrument at the foot of the page — they are the same
 * renderer with different controls exposed.
 */

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(overrides: Partial<TransformParams>, palette: TransformParams['palette']): TransformParams {
  return {
    tx: 0, ty: 0, tz: 0,
    rx: 0, ry: 0, rz: 0,
    sx: 1, sy: 1, sz: 1,
    order: 'trs',
    showGhost: true,
    showBasis: false,
    azimuth: 0.72,
    elevation: 0.42,
    palette,
    ...overrides,
  };
}

function TranslateFigure() {
  const palette = usePalette();
  // Opens moved rather than at the identity. The caption says the ghost marks
  // where the cube started; at tx = 0 the cube is inside its own ghost and there
  // is nothing it can be seen to have started from. 1.2 leaves daylight between
  // the two and still sits at 70% of a track that runs to 3.
  //
  // The guard mirrors the slider's range for the reason the codec drops a NaN:
  // ?translate.tx=1e9 is finite, so it would be accepted, and the reader would
  // get an empty canvas with the slider pinned at one end explaining nothing.
  const [s, setS] = useFigureState('translate', { tx: 1.2 }, { tx: (v) => v >= -3 && v <= 3 });
  const params = figureParams({ tx: s.tx }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      id="translate"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="move along x"
          tone="x"
          value={s.tx}
          min={-3}
          max={3}
          onChange={(tx) => setS((p) => ({ ...p, tx }))}
        />
      }
      readout={<MatrixView matrix={M} label="M" />}
      caption={
        <>
          Only one number in the matrix moved, and it was in the last column. The
          ghost marks where the cube started.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A cube translated along the x axis, with the matrix beside it"
      />
    </Figure>
  );
}

function RotateFigure() {
  const palette = usePalette();
  // 35° rather than 0. At the identity the three coloured arms lie exactly along
  // the world axes drawn behind them, so the caption's "the cube is turning"
  // describes a cube that visibly is not, and the matrix beside it is all ones
  // and zeros. 35° is far enough off the camera's own 41° azimuth that the arms
  // do not foreshorten into each other.
  const [s, setS] = useFigureState('rotate', { ry: 35 }, { ry: (v) => v >= -180 && v <= 180 });
  const params = figureParams({ ry: s.ry, showBasis: true }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      id="rotate"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="turn about y"
          tone="y"
          value={s.ry}
          min={-180}
          max={180}
          step={1}
          precision={0}
          unit="°"
          onChange={(ry) => setS((p) => ({ ...p, ry }))}
        />
      }
      readout={<MatrixView matrix={M} label="M" />}
      caption={
        <>
          The last column never moves — the cube is turning, not going anywhere.
          The three coloured arms are the first three columns of the matrix,
          drawn.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A cube rotating about the y axis, with its basis vectors drawn"
      />
    </Figure>
  );
}

/**
 * The four blocks the sixteen floats fall into, tinted to match MatrixView's
 * columns — in a column-major array a column *is* a contiguous block.
 */
const MEMORY_BLOCKS = [
  { label: 'x axis', range: 'm[0]–m[3]', tint: 'text-axis-x' },
  { label: 'y axis', range: 'm[4]–m[7]', tint: 'text-axis-y' },
  { label: 'z axis', range: 'm[8]–m[11]', tint: 'text-axis-z' },
  { label: 'position', range: 'm[12]–m[15]', tint: 'text-amber' },
] as const;

/** The identity, flat, so a cell can dim while it still matches it. */
const IDENTITY_FLAT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function MemoryFigure() {
  const palette = usePalette();
  // One slider drives both halves of a model matrix: at 1 the cube has turned
  // 55° about y and moved 2.2 along x. Exactly five of the sixteen floats move
  // — m[0], m[2], m[8], m[10] from the turn and m[12] from the move.
  //
  // It opens at 0.65 rather than 0 because a cell is dimmed when it still equals
  // the identity: at 0 all sixteen are dimmed, so the five the caption says move
  // are indistinguishable from the eleven that never do. At 0.65 they read 0.81,
  // −0.58, 0.58, 0.81 and 1.43, and the eleven around them are still grey.
  const [s, setS] = useFigureState('memory-layout', { t: 0.65 }, { t: (v) => v >= 0 && v <= 1 });
  const params = figureParams({ ry: 55 * s.t, tx: 2.2 * s.t }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      id="memory-layout"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="apply the transform"
          value={s.t}
          min={0}
          max={1}
          onChange={(t) => setS((p) => ({ ...p, t }))}
        />
      }
      caption={
        <>
          Five of the sixteen floats move and eleven never do. The turn rewrites{' '}
          <code>m[0]</code>, <code>m[2]</code>, <code>m[8]</code> and{' '}
          <code>m[10]</code> — the x and z blocks, because a turn about y happens
          in the xz plane — and leaves the y block sitting at{' '}
          <code>0, 1, 0, 0</code>. The move lands entirely in <code>m[12]</code>.
          Underneath is the same array printed as a matrix, where the numbers
          read across instead of down.
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="eyebrow mb-2.5">M, as sixteen floats in order</p>
          <div className="flex flex-wrap gap-x-5 gap-y-4">
            {MEMORY_BLOCKS.map((block, blockIndex) => (
              <div key={block.label}>
                <p
                  className={`mb-1.5 font-mono text-2xs uppercase tracking-wider ${block.tint}`}
                >
                  {block.label}
                </p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((offset) => {
                    const index = blockIndex * 4 + offset;
                    // Collapse -0 so a cell never flickers to "-0.00".
                    const value = Object.is(M[index], -0) ? 0 : M[index];
                    const dim = value === IDENTITY_FLAT[index];
                    return (
                      <span
                        key={index}
                        className={`tabular w-12 rounded bg-ink-800 px-1 py-1 text-right font-mono text-2xs transition-colors ${
                          dim ? 'text-fg-faint/60' : block.tint
                        }`}
                      >
                        {value.toFixed(2)}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-1.5 font-mono text-2xs text-fg-faint">{block.range}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-4">
          <MatrixView matrix={M} label="printed in rows" />
        </div>
      </div>
    </Figure>
  );
}

function ScaleFigure() {
  const palette = usePalette();
  // 1.5 rather than 1. The basis arms are drawn at unit length and then scaled by
  // the matrix, so at sy = 1 all three are the same length and the caption's
  // green arm has not got longer than anything. At 1.5 it is half again as long
  // as the red and blue, with a third of the track left above it and the whole
  // reflection half of the range — the second thing the caption asks for — below.
  const [s, setS] = useFigureState('scale-axes', { sy: 1.5 }, { sy: (v) => v >= -1 && v <= 2.5 });
  const params = figureParams({ ry: 25, sy: s.sy, showBasis: true }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      id="scale-axes"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="stretch along y"
          tone="y"
          value={s.sy}
          min={-1}
          max={2.5}
          onChange={(sy) => setS((p) => ({ ...p, sy }))}
        />
      }
      readout={<MatrixView matrix={M} label="M" />}
      caption={
        <>
          The green arm gets longer and the other two are untouched. Take the
          slider below zero and the cube turns inside out — a negative scale is a
          reflection, and it is the one transform that changes which way the
          faces point.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A cube stretched along the y axis, with its basis vectors drawn"
      />
    </Figure>
  );
}

function OrderFigure() {
  const palette = usePalette();
  // One slider drives both matrices: at 0 nothing has happened, at 1 both the
  // rotation and the translation are fully applied. The two orders agree at
  // the start and disagree everywhere after it.
  //
  // Which is why it must not open at 0. This figure exists to show that T·R·S
  // and S·R·T differ, and at the identity the two canvases are pixel-identical:
  // it opened by demonstrating the one thing it is here to disprove. With S the
  // identity the two centres are T·(0,0,0) = (tx,0,0) and R·T·(0,0,0), so they
  // sit 2·tx·sin(ry/2) apart — 0.88 at t = 0.65, close to the cube's own width.
  const [s, setS] = useFigureState('order-matters', { t: 0.65 }, { t: (v) => v >= 0 && v <= 1 });
  const shared = { ry: 55 * s.t, tx: 2.2 * s.t, sx: 1, sy: 1, sz: 1 };
  const trs = figureParams({ ...shared, order: 'trs' }, palette);
  const srt = figureParams({ ...shared, order: 'srt' }, palette);

  return (
    <Figure
      id="order-matters"
      // The left canvas, T · R. The instrument renders one scene, so only one
      // of the two orders can travel — and the composition order is a control
      // down there, so a reader who arrives on T · R can reach S · R · T by
      // flipping the one thing this figure is about. Arriving on S · R · T
      // instead would leave them holding the counter-example.
      state={{ defaults: DEFAULTS, current: trs }}
      control={
        <Slider
          label="apply the transform"
          value={s.t}
          min={0}
          max={1}
          onChange={(t) => setS((p) => ({ ...p, t }))}
        />
      }
      caption={
        <>
          The same rotation and the same translation, composed in the two
          possible orders. On the left the cube turns where it stands and then
          moves; on the right it moves first, so the turn swings it around the
          origin like a hammer throw.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-accent">
            T · R — turn, then move
          </p>
          <GLCanvas
            create={createScene}
            params={trs}
            aspect={4 / 3}
            label="A cube rotated and then translated"
          />
        </div>
        <div>
          <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-amber">
            R · T — move, then turn
          </p>
          <GLCanvas
            create={createScene}
            params={srt}
            aspect={4 / 3}
            label="A cube translated and then rotated, swinging it around the origin"
          />
        </div>
      </div>
    </Figure>
  );
}

export function TransformEssay() {
  return (
    <Prose>
      <p>
        A model is drawn once, at the origin, facing whichever way the person who
        made it happened to be facing. The world needs it somewhere else — over
        there, turned forty degrees, half the size. Nobody edits the vertices to
        do that. Instead the object keeps the coordinates it was born with, and a
        matrix says where those coordinates should be read.
      </p>
      <p>
        That matrix is the subject of this lab. Sixteen numbers, and every one of
        them is visible below while you move it.
      </p>

      <ProseHeading id="translation">Translation lives in the last column</ProseHeading>
      <p>
        Start with the simplest instruction there is: put it over there. Drag the
        slider and watch the readout rather than the cube.
      </p>

      <TranslateFigure />

      <p>
        Three of the sixteen numbers do anything at all, and they sit in the
        rightmost column. This is the reason 3D graphics uses a{' '}
        <em>four</em>-by-four matrix for a three-dimensional world: a 3×3 matrix
        can rotate, scale, shear and reflect, but it has nowhere to put a
        displacement. Every 3×3 transform leaves the origin exactly where it
        found it, because multiplying a column of zeros can only ever give zeros
        back.
      </p>
      <p>
        The fourth column is bought with a fourth coordinate. Positions are
        carried as <code>(x, y, z, 1)</code>, and it is that trailing{' '}
        <code>1</code> that lets the last column contribute — it multiplies by
        one and is added in. Directions are carried as{' '}
        <code>(x, y, z, 0)</code> instead, which is not a technicality but the
        whole trick: a direction has no position, so the zero deletes the
        translation and a <Term name="Normal">normal</Term> or a light vector is
        rotated without being dragged across the scene with the object.
      </p>

      <ProseHeading id="rotation">The other nine numbers are the object&rsquo;s axes</ProseHeading>
      <p>
        Turn the cube and the last column stays exactly where it was. Rotation
        happens entirely inside the upper-left 3×3.
      </p>

      <RotateFigure />

      <p>
        The three coloured arms are not a decoration drawn to look like axes.
        They <em>are</em> the first three columns of the matrix, plotted as
        arrows: the object&rsquo;s{' '}
        <Term name="Basis vectors">basis vectors</Term>. The first column is
        where the object&rsquo;s own x axis has ended up in the world; the second
        is its y; the third is its z. Read the readout and the picture together
        for a moment — the numbers in column one are the coordinates of the red
        arm.
      </p>
      <p>
        Once you have seen that, a{' '}
        <Term name="Model matrix">model matrix</Term> stops being a grid of
        numbers and becomes a sentence with four clauses:{' '}
        <strong>here is where your x points, here is your y, here is your z, and
        here is where you are.</strong> Everything else in this lab follows from
        that reading.
      </p>

      <ProseHeading id="memory">
        In memory the matrix is those four columns, end to end
      </ProseHeading>
      <p>
        A <code>Mat4</code> here is a <code>Float32Array</code> of sixteen,
        stored column-major: an entry&rsquo;s index is{' '}
        <code>column * 4 + row</code>. Four columns of four, so they land as
        blocks: <code>m[0]&ndash;m[3]</code> is the first column,{' '}
        <code>m[4]&ndash;m[7]</code> the second, <code>m[8]&ndash;m[11]</code>{' '}
        the third, <code>m[12]&ndash;m[15]</code> the last. Set that beside the
        reading the arrows gave you and the layout is no longer an arbitrary
        convention — the array is the object&rsquo;s x axis, then its y axis,
        then its z axis, then where it stands.
      </p>

      <MemoryFigure />

      <p>
        The builders in <code>lib/math/mat4.ts</code> are typed out in that order
        too. <code>translation(x, y, z)</code> is the identity with{' '}
        <code>x, y, z, 1</code> on its last line, which is why the arguments land
        at indices 12, 13 and 14. <code>rotationY</code> puts its cosine at{' '}
        <code>m[0]</code> and <code>m[10]</code>, the sine at <code>m[8]</code>{' '}
        and the negated sine at <code>m[2]</code>, and never touches{' '}
        <code>m[4]&ndash;m[7]</code>: the y
        column is the axis it turns about, so the y column is the one thing it
        leaves alone.
      </p>
      <p>
        Nothing rearranges those floats on the way to the GPU. The upload is{' '}
        <code>gl.uniformMatrix4fv(location, false, m)</code>, and that{' '}
        <code>false</code> is a transpose flag: the array already sits in the
        order OpenGL wants, so it goes across as it is. In WebGL 1, which every
        canvas on this page runs on, the flag is not even a choice: passing{' '}
        <code>true</code> is an error.
      </p>
      <p>
        The one place the order does get rearranged is the readout you have been
        watching all along. <code>toRows()</code> walks the array with a stride of
        four, so the top row it prints is <code>m[0]</code>, <code>m[4]</code>,{' '}
        <code>m[8]</code>, <code>m[12]</code> — one entry taken from each column.
        That is whiteboard notation, and it is the transpose of the buffer. Read
        the sixteen floats four at a time as though they were rows instead, and
        the 2.20 you drove into <code>m[12]</code> comes out at the start of the
        bottom row rather than the top of the last column. Both pictures describe
        the same buffer. Only one of them is the buffer.
      </p>
      <p>
        The blocking buys something practical as well: a column is contiguous, so
        asking where an object is means reading three adjacent floats —{' '}
        <code>m[12]</code>, <code>m[13]</code>, <code>m[14]</code> — not
        gathering three that sit four apart.
      </p>

      <ProseHeading id="scale">Scale stretches the axes, and can invert them</ProseHeading>
      <p>
        If the columns are the axes, scaling has an obvious meaning: make one of
        them longer.
      </p>

      <ScaleFigure />

      <p>
        A uniform scale multiplies all three columns equally and is harmless. A
        non-uniform one is where trouble starts, and lab 4 is largely about the
        consequence: stretch an object along one axis and its surface normals, if
        you transform them with this same matrix, stop being perpendicular to the
        surface. They need the{' '}
        <Term name="Normal matrix">inverse-transpose</Term> instead. That bug is
        waiting in <a href="/labs/shading#normals">Light &amp; Normals</a> with a
        preset that turns it on.
      </p>
      <p>
        A negative scale is worth a second of your attention because it is the
        one transform here that changes the <em>winding</em> of the triangles —
        the order their corners appear in on screen.{' '}
        <Term name="Backface culling">Backface culling</Term> decides what to
        throw away using exactly that, so a mirrored object rendered without
        thinking about it comes out with its faces inside out.
      </p>

      <ProseHeading id="order">Order is the whole difficulty</ProseHeading>
      <p>
        Matrix multiplication is not commutative, which is a dry way of saying
        that turning something and then moving it does not put it where moving it
        and then turning it would. This is the single most common source of
        confusion in a transform chain, and it is much easier to see than to
        argue about.
      </p>

      <OrderFigure />

      <p>
        Both sides are made of the same two matrices. What differs is which one
        the vertex meets first — and the vertex meets them{' '}
        <strong>right to left</strong>. In <code>T · R · v</code> the rotation is
        adjacent to the vector, so it happens first, in the object&rsquo;s own
        frame, and the translation is applied afterwards to the already-turned
        result. Reverse them and the translation has moved the object away from
        the origin before the rotation arrives, so the rotation sweeps it through
        an arc instead of spinning it in place.
      </p>
      <p>
        The convention people are taught — <em>scale, then rotate, then
        translate</em> — is this observation with the usual answer already
        chosen. Written as a product it reads <code>T · R · S</code>, backwards
        from the order it happens in. That is not a quirk of notation to memorise
        around; it is what right-to-left evaluation means, and once the chain is
        read that way it stops being something to get wrong.
      </p>

      <Check
        question={
          <>
            You want the cube at half size, turned 90° about y, and standing 5
            units along x. Written as a product, which chain does that?
          </>
        }
        options={[
          {
            option: (
              <>
                <code>S · R · T</code> — the three instructions in the order you
                say them.
              </>
            ),
            response: (
              <>
                That is the sentence written left to right, and it is the chain
                reversed. The vertex sits on the right and meets the rightmost
                matrix first, so this one moves the cube 5 units before it turns
                it, and the turn then sweeps it through an arc around the origin
                — the right-hand canvas in{' '}
                <a href="#order-matters">the figure above</a>. The chain that
                scales first is <code>T · R · S</code>.
              </>
            ),
          },
          {
            option: (
              <>
                <code>T · R · S</code> — the same three instructions, written
                backwards.
              </>
            ),
            correct: true,
            response: (
              <>
                This is the one. The product is written backwards from the order
                it happens in, because the vertex is on the right: it meets{' '}
                <code>S</code> first and is scaled in the object&rsquo;s own
                frame, then turned, then moved into place. The instrument below
                has the composition order as a control — leave the nine numbers
                where they are and switch it, and the cube stands somewhere
                else.
              </>
            ),
          },
          {
            option: (
              <>
                Keep <code>S · R · T</code>, and turn the translation by the same
                90° first so the cube still lands at x = 5.
              </>
            ),
            response: (
              <>
                It works, and it is the wrong fix. You have folded the rotation
                into the position: the last column no longer says where the
                object stands, it says where it stands given this particular
                turn, so the next time the turn changes the position is wrong
                again. <code>T · R · S</code> keeps the two independent, because
                the translation is applied to the already-turned result rather
                than through the turn.
              </>
            ),
          },
          {
            option: (
              <>
                Any of them — matrix multiplication is associative, so the order
                of the three does not change the product.
              </>
            ),
            response: (
              <>
                Associativity is real, and it buys the other thing:{' '}
                <code>(T · R) · S</code> and <code>T · (R · S)</code> are the
                same matrix, so a chain can be multiplied out in whatever
                grouping is convenient and cached. It says nothing about order —
                that is commutativity, which matrices do not have. Swap two of
                the three and the object goes somewhere else: at the end of its
                slider the figure above leaves the two orders standing 2.03
                units apart.
              </>
            ),
          },
        ]}
      />

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Everything above is one control at a time. Below is the whole matrix with
        nothing held back: nine numbers of rotation and scale, three of position,
        the <Term name="Composition order">composition order</Term>, and the
        factors it multiplies out from. The presets are worth starting with —
        each one sets the controls to something that makes a point, and says what
        to look at.
      </p>
    </Prose>
  );
}
