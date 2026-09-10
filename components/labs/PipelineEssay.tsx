'use client';

import type { ReactNode } from 'react';

import { Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { useFigureState } from '@/components/lab/useFigureState';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { usePalette } from '@/components/site/ThemeProvider';
import {
  CTX,
  DEFAULTS,
  TRACKED,
  createScene,
  type PipelineParams,
} from '@/components/labs/PipelineLab';
import {
  SPACES,
  SPACE_LABELS,
  traceVertex,
  type Space,
} from '@/lib/gl/pipeline';

/**
 * The written half of lab 3.
 *
 * Every figure drives the lab's own `createScene` with the lab's own `CTX`, so
 * the numbers in a figure's readout are the same numbers the instrument prints
 * at the foot of the page — one renderer, one traced vertex, different controls
 * exposed.
 */

/** The vertex the whole lab follows, resolved once. */
const TRACE = traceVertex(TRACKED, CTX);

/** Its coordinates in each space, in the order the table prints them. */
const TRACE_ROWS: Record<Space, number[]> = {
  model: [...TRACE.model],
  world: [...TRACE.world],
  view: [...TRACE.view],
  clip: [...TRACE.clip],
  ndc: [...TRACE.ndc],
  screen: [...TRACE.screen],
};

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(
  overrides: Partial<PipelineParams>,
  palette: PipelineParams['palette'],
): PipelineParams {
  return {
    stage: 0,
    showGrid: true,
    azimuth: 0.62,
    elevation: 0.34,
    palette,
    ...overrides,
  };
}

/** Two rows of the lab's own table, with the one you are nearer lit up. */
function TraceRows({
  spaces,
  active,
}: {
  spaces: readonly [Space, Space];
  active: Space;
}) {
  return (
    <div>
      <div className="eyebrow mb-2">tracked vertex</div>
      <table className="tabular font-mono text-2xs">
        <thead>
          <tr className="text-fg-faint">
            <th className="pb-1 text-left font-normal" />
            {['x', 'y', 'z', 'w'].map((axis) => (
              <th key={axis} className="pb-1 pl-3 text-right font-normal">
                {axis}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spaces.map((space) => {
            const values = TRACE_ROWS[space];
            const on = space === active;
            return (
              <tr
                key={space}
                className={`border-t border-line transition-colors ${
                  on ? 'text-fg' : 'text-fg-faint'
                }`}
              >
                <td className="py-1.5 pr-2">
                  <span
                    className={`uppercase tracking-wider ${on ? 'text-accent' : ''}`}
                  >
                    {SPACE_LABELS[space].title}
                  </span>
                </td>
                {[0, 1, 2, 3].map((i) => (
                  <td key={i} className="py-1.5 pl-3 text-right">
                    {values[i] === undefined ? (
                      <span className="text-fg-faint/40">&mdash;</span>
                    ) : (
                      values[i].toFixed(space === 'screen' ? 0 : 2)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Where a handover figure opens.
 *
 * At 0 the five figures showed nothing but the space the previous figure had
 * already finished in, under captions about a transformation that had not
 * happened: the frustum was still a widescreen rectangle beneath "becomes a
 * square", and the clip-space pyramid was still a pyramid beneath "the pyramid
 * becomes a cube". Past 0.5 the readout lights the destination row, which is
 * the row whose numbers the captions quote. Short of 1 the slider still has
 * somewhere to go in both directions, and a reader who wants the untouched
 * space the caption starts from can drag left to reach it.
 */
const OPEN_AT = 0.6;

/**
 * One handover, and nothing else.
 *
 * The slider runs 0 to 1 across a single pair of spaces rather than 0 to 5
 * across all six, so the only thing a reader can do in a figure is the thing
 * the paragraph above it just described.
 */
function StageFigure({
  id,
  from,
  to,
  caption,
  sceneLabel,
}: {
  /** Forwarded to `<Figure>` and used as this figure's URL namespace: they must agree. */
  id: string;
  from: number;
  to: number;
  caption: ReactNode;
  sceneLabel: string;
}) {
  const palette = usePalette();
  const [s, setS] = useFigureState(
    id,
    { t: OPEN_AT },
    // A t outside the slider's own range would blend to a space this figure's
    // caption never mentions — at t = 5 the model-to-world figure is showing
    // screen space — so a URL that asks for one is ignored rather than obeyed.
    { t: (value) => value >= 0 && value <= 1 },
  );
  const spaces: readonly [Space, Space] = [SPACES[from], SPACES[to]];
  const params = figureParams({ stage: from + (to - from) * s.t }, palette);
  /*
   * The whole stage the figure is nearer — which is the row its readout lights
   * and the space its caption argues about — and the only thing that may be
   * handed to the instrument.
   *
   * The instrument indexes the space list with `stage` directly
   * (`SPACES[controls.stage]`, PipelineLab.tsx), so the blend a figure's slider
   * actually sits on would arrive as `SPACES[3.4]`, which is `undefined`, and
   * `SPACE_LABELS[undefined].title` throws before the lab renders anything.
   * Checked against the real modules rather than assumed.
   */
  const landing = s.t < 0.5 ? from : to;

  return (
    <Figure
      id={id}
      /*
       * `params` still carries the palette from the theme provider; `Figure`
       * runs both records through `shareableControls`, which drops it by name,
       * so the guard is what keeps a theme out of the address bar rather than
       * this call site remembering to.
       */
      state={{ defaults: DEFAULTS, current: { ...params, stage: landing } }}
      control={
        <Slider
          label={`${SPACE_LABELS[spaces[0]].title} to ${SPACE_LABELS[spaces[1]].title}`}
          value={s.t}
          min={0}
          max={1}
          onChange={(t) => setS({ t })}
        />
      }
      readout={<TraceRows spaces={spaces} active={SPACES[landing]} />}
      caption={caption}
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 10}
        label={sceneLabel}
      />
    </Figure>
  );
}

export function PipelineEssay() {
  return (
    <Prose>
      <p>
        A vertex arrives at the GPU as three numbers in a buffer and leaves as a
        position measured in pixels. In between it passes through six coordinate
        systems, and each of the six is somebody else&rsquo;s decision about
        where the origin sits and what one unit means.
      </p>
      <p>
        This lab follows a single vertex the whole way &mdash; the corner of a
        cube at <code>(0.5, 0.5, 0.5)</code> &mdash; through{' '}
        <Term name="Model space">model</Term>, world, view, clip,{' '}
        <Term name="NDC">NDC</Term> and screen space. The cube never moves and
        the camera being studied never moves. What changes is which of the six
        spaces you are standing in while you look at them.
      </p>

      <ProseHeading id="handover">Each matrix hands the vertex to the next</ProseHeading>
      <p>
        Three matrices do the work, and each exists to take coordinates in the
        space the previous one produced and hand back coordinates in the next.
        Only the first is usually yours to write.
      </p>

      <StageFigure
        id="model-to-world"
        from={0}
        to={1}
        sceneLabel="A cube moving from model space into world space, where a ground grid and the camera frustum appear"
        caption={
          <>
            At the left of the slider there is no ground and no camera, because
            in model space neither has been mentioned yet &mdash; only the cube
            around its own origin, a faint set of axes, and the red cross on the
            corner being tracked. Drag across and the model matrix carries that
            corner from <code>(0.50, 0.50, 0.50)</code> to{' '}
            <code>(1.23, 0.80, &minus;0.79)</code>, and the world it was carried
            into appears around it. The cube looks smaller at the end only
            because the observer pulls back to fit the grid in.
          </>
        }
      />

      <p>
        The model matrix here is a 28&deg; turn about y followed by a move to{' '}
        <code>(0.55, 0.30, &minus;1.00)</code>, and it is the only step in the
        chain most programs author by hand; that matrix on its own is{' '}
        <a href="/labs/transform">The Model Matrix</a>. What follows it is the
        camera, and the camera is not in the scene.
      </p>

      <StageFigure
        id="world-to-view"
        from={1}
        to={2}
        sceneLabel="The world rotating and sliding around a fixed camera as it moves into view space"
        caption={
          <>
            Everything swings at once. The camera has not moved &mdash; it
            cannot, because it is not in the scene &mdash; so instead the entire
            world rotates and slides until the camera would be at the origin
            facing down &minus;z. The near face of the frustum comes to rest
            exactly one unit in front of that origin, which is the near value
            the projection was built with.
          </>
        }
      />

      <p>
        A view matrix is the inverse of where the camera is standing. The
        hardware has no notion of a camera at all, only of geometry, so &ldquo;put
        the eye at <code>(0, 0.9, 3)</code> looking at{' '}
        <code>(0, 0, &minus;0.8)</code>&rdquo; is implemented by moving
        everything else the other way. Watch the x column across those two rows:
        1.23 in world space, 1.23 in <Term name="View space">view space</Term>.
        This camera stands on the plane <code>x = 0</code> and its right-hand
        axis is the world&rsquo;s x axis, so that coordinate passes through
        untouched.
      </p>
      <p>
        Through all three rows so far, <code>w</code> is still 1. Both matrices
        are a rotation and a translation; distances and angles survive them, and
        the cube is still a cube of side 1 that happens to be somewhere else.
      </p>

      <ProseHeading id="clip">w stops being 1 at clip space</ProseHeading>
      <p>
        The projection matrix is the first one that is not a rigid move, and the
        entry responsible is <code>m[11]</code>, which is <code>&minus;1</code>.
        It is the only entry anywhere in the chain that makes <code>w</code>{' '}
        depend on the vertex at all, and what it puts there is the negated
        view-space z: the vertex&rsquo;s distance in front of the eye.
      </p>

      <StageFigure
        id="view-to-clip"
        from={2}
        to={3}
        sceneLabel="The view frustum changing shape as it moves into clip space, its cross-section becoming square"
        caption={
          <>
            The frustum&rsquo;s cross-section stops being a widescreen rectangle
            and becomes a square: the projection has divided the aspect ratio out
            of x, which is the whole of what it does about the shape of the
            window. Nothing has been divided by <code>w</code> yet, so the far
            face is still 4.5 times the near one &mdash; 9 units across against 2
            &mdash; and the shape is still a pyramid rather than a cube.
          </>
        }
      />

      <p>
        The vertex leaves view space at{' '}
        <code>(1.23, 0.78, &minus;3.71, 1.00)</code> and arrives in{' '}
        <Term name="Clip space">clip space</Term> at{' '}
        <code>(1.85, 1.88, 3.27, 3.71)</code>. Read the last number of that row
        against the third number of the row above it. <code>w</code> is 3.71;
        view z was &minus;3.71. Nothing has divided anything. The projection has
        only arranged for a later step to be possible, and parked the number that
        step will need where it cannot be lost.
      </p>
      <p>
        This is also, as the name says, where clipping happens &mdash; against
        each vertex&rsquo;s own w rather than against the &plusmn;1 cube, which
        does not exist yet. Two of this cube&rsquo;s eight corners fail that
        test, coming out a little past the far plane at 4.5. The lab transforms
        geometry and does not clip it, so it draws them anyway &mdash; a real
        rasteriser would have cut those triangles here, before the divide, not
        after.
      </p>

      <ProseHeading id="divide">No matrix performs the divide</ProseHeading>
      <p>
        Between clip space and NDC there is a step that no matrix in the chain
        performs. The hardware does it, once per vertex, after your vertex shader
        has returned.
      </p>

      <StageFigure
        id="clip-to-ndc"
        from={3}
        to={4}
        sceneLabel="The clip-space pyramid collapsing into the normalised device cube after the perspective divide"
        caption={
          <>
            The pyramid becomes a cube. It does so because each corner is divided
            by its own <code>w</code> &mdash; the near four by 1, which moves them
            not at all, the far four by 4.5, which pulls them in by that factor
            &mdash; and both ends land on &plusmn;1. The cube&rsquo;s own corners
            divide by numbers between 3.26 and 4.80, which is exactly why its
            nearer face stays the larger one.
          </>
        }
      />

      <p>
        A matrix applies the same linear map to every vertex it touches. Division
        by a number that differs from vertex to vertex is not that, and the
        difference is the entire reason distant things come out small. The fourth
        coordinate exists so that the projection can compute the divisor without
        performing the division: the matrix parks it in <code>w</code>, and the
        division happens later, at one fixed point in the pipeline, for
        everything at once.
      </p>
      <p>
        That deferral is why <code>gl_Position</code> is a <code>vec4</code>:
        what a vertex shader writes is in clip space, and nothing it can write
        ever sees the result of the divide. In the readout, the <code>w</code>{' '}
        column goes blank at the NDC row, because once the division has happened
        there is nothing left to carry. Under an orthographic projection{' '}
        <code>m[11]</code> is zero, so the step runs with nothing left to do
        &mdash; the difference between a volume that converges and one that does
        not, which is{' '}
        <a href="/labs/projection#orthographic">Projection &amp; the Frustum</a>.
      </p>

      <ProseHeading id="screen">The viewport transform is the least mysterious step</ProseHeading>
      <p>
        The last step is two lines of arithmetic, and the lab performs precisely
        these:
      </p>
      <p>
        <code>x = ((ndc.x + 1) / 2) * width</code>
        <br />
        <code>y = ((1 &minus; ndc.y) / 2) * height</code>
      </p>

      <StageFigure
        id="ndc-to-screen"
        from={4}
        to={5}
        sceneLabel="The normalised device cube flattening into a plane as depth is dropped for screen space"
        caption={
          <>
            The cube flattens. Screen space keeps x and y, stretches x by the
            viewport&rsquo;s aspect &mdash; 960 by 600 &mdash; and drops z
            entirely, so the frustum collapses into the rectangle that is the
            border of the image and the cube becomes the outline the camera would
            have photographed.
          </>
        }
      />

      <p>
        The <code>+ 1</code> and the halving map &minus;1&hellip;1 onto
        0&hellip;1; the multiplication scales that to the{' '}
        <Term name="Viewport">viewport</Term>. The only part worth committing
        to memory is the subtraction in the second line. NDC
        counts upwards from the bottom and a window counts downwards from the
        top, so y is flipped, and when a coordinate you computed lands mirrored
        vertically on screen, this is the line that did it.
      </p>
      <p>
        Our vertex sits at NDC <code>(0.50, 0.50)</code> and lands on pixel{' '}
        <code>(719, 149)</code>: three-quarters of the way across, and a quarter
        of the way <em>down</em> rather than a quarter of the way up. The z and w
        columns of that row are blank. Depth has not been discarded &mdash; it
        goes to the depth buffer, and what happens to it there is{' '}
        <a href="/labs/depth">Depth &amp; Transparency</a>.
      </p>

      <ProseHeading id="instrument">Now step through all six</ProseHeading>
      <p>
        Everything above is one handover at a time. Below is the whole chain: six
        stages to walk with Back and Next, the vertex&rsquo;s coordinates in all
        six spaces at once so you can read any row against any other, a ground
        grid you can switch off once it stops meaning anything, and a scene you
        can orbit &mdash; worth doing in clip space, where one viewpoint is not
        enough to see that the shape is still a pyramid. The four presets each
        jump to a stage and say what to look at once you are there.
      </p>
    </Prose>
  );
}
