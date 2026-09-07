'use client';

import { useState } from 'react';

import { Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { MatrixView } from '@/components/lab/MatrixView';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { usePalette } from '@/components/site/ThemeProvider';
import { composeModel, createScene, type TransformParams } from '@/components/labs/TransformLab';

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
  const [tx, setTx] = useState(0);
  const params = figureParams({ tx }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      control={
        <Slider label="move along x" tone="x" value={tx} min={-3} max={3} onChange={setTx} />
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
  const [ry, setRy] = useState(0);
  const params = figureParams({ ry, showBasis: true }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      control={
        <Slider
          label="turn about y"
          tone="y"
          value={ry}
          min={-180}
          max={180}
          step={1}
          precision={0}
          unit="°"
          onChange={setRy}
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

function ScaleFigure() {
  const palette = usePalette();
  const [sy, setSy] = useState(1);
  const params = figureParams({ ry: 25, sy, showBasis: true }, palette);
  const { M } = composeModel(params);

  return (
    <Figure
      control={
        <Slider label="stretch along y" tone="y" value={sy} min={-1} max={2.5} onChange={setSy} />
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
  const [t, setT] = useState(0);
  // One slider drives both matrices: at 0 nothing has happened, at 1 both the
  // rotation and the translation are fully applied. The two orders agree at
  // the start and disagree everywhere after it.
  const shared = { ry: 55 * t, tx: 2.2 * t, sx: 1, sy: 1, sz: 1 };
  const trs = figureParams({ ...shared, order: 'trs' }, palette);
  const srt = figureParams({ ...shared, order: 'srt' }, palette);

  return (
    <Figure
      control={
        <Slider label="apply the transform" value={t} min={0} max={1} onChange={setT} />
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
        translation and a normal or a light vector is rotated without being
        dragged across the scene with the object.
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
        arrows. The first column is where the object&rsquo;s own x axis has ended
        up in the world; the second is its y; the third is its z. Read the
        readout and the picture together for a moment — the numbers in column one
        are the coordinates of the red arm.
      </p>
      <p>
        Once you have seen that, a model matrix stops being a grid of numbers and
        becomes a sentence with four clauses:{' '}
        <strong>here is where your x points, here is your y, here is your z, and
        here is where you are.</strong> Everything else in this lab follows from
        that reading.
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
        surface. They need the inverse-transpose instead. That bug is waiting in{' '}
        <a href="/labs/shading">Light &amp; Normals</a> with a preset that turns
        it on.
      </p>
      <p>
        A negative scale is worth a second of your attention because it is the
        one transform here that changes the <em>winding</em> of the triangles —
        the order their corners appear in on screen. Backface culling decides
        what to throw away using exactly that, so a mirrored object rendered
        without thinking about it comes out with its faces inside out.
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
        translate</em> — is just this observation with the usual answer already
        chosen. Written as a product it reads <code>T · R · S</code>, backwards
        from the order it happens in. That is not a quirk of notation to memorise
        around; it is what right-to-left evaluation means, and once the chain is
        read that way it stops being something to get wrong.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Everything above is one control at a time. Below is the whole matrix with
        nothing held back: nine numbers of rotation and scale, three of position,
        the composition order, and the factors it multiplies out from. The presets
        are worth starting with — each one sets the controls to something that
        makes a point, and says what to look at.
      </p>
    </Prose>
  );
}
