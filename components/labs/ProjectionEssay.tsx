'use client';

import type { ReactNode } from 'react';

import { Segmented, Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { MatrixView } from '@/components/lab/MatrixView';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';
import { usePalette } from '@/components/site/ThemeProvider';
import {
  buildProjection,
  createCameraScene,
  createWorldScene,
  CAMERA_ASPECT,
  DEFAULTS,
  type ProjectionParams,
} from '@/components/labs/ProjectionLab';

/**
 * The written half of lab 2.
 *
 * Every figure drives the lab's own `createWorldScene` and `createCameraScene`,
 * so a figure cannot drift away from the instrument at the foot of the page —
 * same renderer, same six boxes, one control exposed at a time.
 *
 * That is also why all four pass `state` to `<Figure>` and none of them omits
 * it: the record `figureParams` builds is the instrument's own control record
 * with a palette spread in, so every figure here has a configuration the
 * instrument can be opened at. `figureParams` starts from the lab's defaults
 * value for value, so the link each figure builds carries only the one control
 * that figure exposes — which is the whole claim it was isolating.
 */

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(
  overrides: Partial<ProjectionParams>,
  palette: ProjectionParams['palette'],
): ProjectionParams {
  return {
    mode: 'perspective',
    fov: 50,
    near: 1.5,
    far: 11,
    orthoHeight: 4,
    showFrustum: true,
    azimuth: 0.95,
    elevation: 0.38,
    palette,
    ...overrides,
  };
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-mono text-2xs uppercase tracking-wider text-fg-faint">
      {children}
    </p>
  );
}

function FieldOfViewFigure() {
  const palette = usePalette();
  // 50° is kept rather than defaulted-into. The caption's two checkable claims
  // are both on screen here: the closest box needs 40.6° of vertical angle to
  // clear the frustum edge (it sits 3.03 out with its centre 1.12 off-axis), so
  // at 50 it is in the picture and a short drag takes it out; and the two boxes
  // at 12.8 and 15.8 are ghosted at every angle, because far is 11. An angle has
  // no identity value to open at — the pyramid is the subject and it is already
  // a pyramid.
  const [s, setS] = useFigureState(
    'field-of-view',
    { fov: 50 },
    { fov: (value) => value >= 10 && value <= 120 },
  );
  const params = figureParams({ fov: s.fov }, palette);

  return (
    <Figure
      id="field-of-view"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="field of view"
          value={s.fov}
          min={10}
          max={120}
          step={1}
          precision={0}
          unit="°"
          onChange={(fov) => setS({ fov })}
        />
      }
      caption={
        <>
          Widening the angle opens the pyramid sideways and leaves the near and
          far planes where they were. Below about 41° the closest box drops out
          and dims — near the camera, a small step sideways is a large angle.
          Above 50° nothing new arrives however wide it gets: the two ghosted
          boxes at the back stand 12.8 and 15.8 units away, past a far plane at
          11, and they are outside on depth rather than on angle.
        </>
      }
    >
      <GLCanvas
        create={createWorldScene}
        params={params}
        aspect={16 / 9}
        label="The camera's frustum drawn as a wireframe in the world, widening and narrowing with the field of view"
      />
    </Figure>
  );
}

function NearPlaneFigure() {
  const palette = usePalette();
  // Opens at 3.10, not at the lab's 1.5. Everything this caption describes lives
  // in one narrow window and at 1.5 none of it was on screen: the reader arrived
  // to an uncut scene under a sentence about a box being cut open, and to a
  // canvas whose own label says "the nearest box cut open by the near plane".
  //
  // The window is the closest box, a 0.6 cube whose centre is 3.025 along the
  // camera's forward axis; a cube of half-size 0.3 reaches 0.3 × (0.164 + 0.986)
  // = 0.345 either way along that axis, so it spans 2.68 to 3.37 — the caption's
  // "between about 2.7 and 3.4". 3.10 is chosen inside it rather than at its
  // middle because it has to be past 3.025 for the world panel's centre test to
  // drop the box, and well short of 3.37 so the camera panel still has 0.27 of
  // it left to draw. That is the disagreement the caption is about, and both
  // halves of it are visible before the reader touches anything. Nothing culls
  // back faces in this lab, so the cut really does show the far wall's inside.
  const [s, setS] = useFigureState(
    'near-plane',
    { near: 3.1 },
    { near: (value) => value >= 0.5 && value <= 6 },
  );
  const params = figureParams({ near: s.near }, palette);

  return (
    <Figure
      id="near-plane"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="near plane"
          value={s.near}
          min={0.5}
          max={6}
          step={0.05}
          precision={2}
          onChange={(near) => setS({ near })}
        />
      }
      caption={
        <>
          Between about 2.7 and 3.4 the near plane is passing through the
          closest box, and what happens there is not a fade: the plane cuts it,
          and the hole shows you the inside of its far wall. Past 3.4 it is gone.
          The two panels disagree in the middle of that on purpose — the world
          panel tests a single point, the box&rsquo;s centre, so it dims the box
          at 3.0, while the camera panel is clipped by the hardware triangle by
          triangle and keeps drawing whatever is left.
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <PanelLabel>World &middot; the volume</PanelLabel>
          <GLCanvas
            create={createWorldScene}
            params={params}
            aspect={CAMERA_ASPECT}
            label="The frustum from outside, with boxes outside it drawn faint"
          />
        </div>
        <div>
          <PanelLabel>Camera &middot; the picture</PanelLabel>
          <GLCanvas
            create={createCameraScene}
            params={params}
            aspect={CAMERA_ASPECT}
            label="The same scene rendered through the camera, with the nearest box cut open by the near plane"
          />
        </div>
      </div>
    </Figure>
  );
}

function DivideFigure() {
  const palette = usePalette();
  // Perspective is the state the caption is written from — it says "switch to
  // orthographic" and "the bottom row went from 0 0 −1 0", so opening in ortho
  // would run the figure backwards. It is also the loaded half of the pair: it
  // is orthographic that is the identity here, w = 1 and a divide by one. Both
  // numbers hold on arrival — the 0.6 box lands 1.89× the height of the 1.0 box
  // in perspective, and exactly 0.600 of it in ortho.
  //
  // Id is "perspective-divide", not "divide": the heading this figure sits under
  // is already <ProseHeading id="divide">, and two elements cannot share an id.
  const [s, setS] = useFigureState(
    'perspective-divide',
    { mode: 'perspective' as ProjectionParams['mode'] },
    // A string comes out of the URL as whatever was typed. Unguarded,
    // ?perspective-divide.mode=x reaches buildProjection, misses the
    // perspective branch, and silently draws an orthographic scene under a
    // control showing neither option selected.
    { mode: (value) => value === 'perspective' || value === 'orthographic' },
  );
  const params = figureParams({ mode: s.mode }, palette);

  return (
    <Figure
      id="perspective-divide"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Segmented
          value={s.mode}
          options={[
            { value: 'perspective', label: 'Perspective' },
            { value: 'orthographic', label: 'Ortho' },
          ]}
          onChange={(mode) => setS({ mode })}
        />
      }
      readout={
        <MatrixView
          matrix={buildProjection(params)}
          label={s.mode === 'perspective' ? 'P  perspective' : 'P  orthographic'}
          precision={3}
          highlightChanges={false}
        />
      }
      caption={
        <>
          The box nearest the camera is 0.6 units on a side; the largest one in
          the picture is a full unit. In perspective the small one lands nearly
          twice as tall on screen. Switch to orthographic and it lands at
          exactly 0.6 of the other&rsquo;s height — the ratio of the models, with
          distance taken out. In the matrix, the bottom row went from{' '}
          <code>0 0 −1 0</code> to <code>0 0 0 1</code>.
        </>
      }
    >
      <GLCanvas
        create={createCameraScene}
        params={params}
        aspect={CAMERA_ASPECT}
        label="What the camera renders, switching between a perspective and an orthographic projection"
      />
    </Figure>
  );
}

function OrthoHeightFigure() {
  const palette = usePalette();
  // 4 is kept. The claim to be true on arrival is that the eye rays cut across
  // the volume instead of running along its edges, and at height 4 they enter
  // the near face 0.44 and 0.27 from the axis while that face reaches 3.2 and
  // 2.0 — they are nowhere near its corners, which is the point. The other
  // claim, that opening all the way to 14 leaves the back boxes dim, is a
  // sentence about moving, and it needs the reader to start below 14.
  const [s, setS] = useFigureState(
    'view-height',
    { orthoHeight: 4 },
    { orthoHeight: (value) => value >= 1 && value <= 14 },
  );
  const params = figureParams(
    { mode: 'orthographic', orthoHeight: s.orthoHeight },
    palette,
  );

  return (
    <Figure
      id="view-height"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="view height"
          value={s.orthoHeight}
          min={1}
          max={14}
          step={0.1}
          precision={1}
          onChange={(orthoHeight) => setS({ orthoHeight })}
        />
      }
      caption={
        <>
          View height scales the box and does nothing else. The four faint rays
          are still drawn from the camera&rsquo;s position to the far corners,
          and they now cut across the volume instead of running along its edges —
          there is no longer a point where the sides meet. Open the height all
          the way to 14 and the two boxes at the back stay dim: they sit past the
          far plane, and height has nothing to say about depth.
        </>
      }
    >
      <GLCanvas
        create={createWorldScene}
        params={params}
        aspect={16 / 9}
        label="An orthographic view volume drawn in the world as a box rather than a pyramid"
      />
    </Figure>
  );
}

export function ProjectionEssay() {
  return (
    <Prose>
      <p>
        A camera in a renderer is not a lens and not a position. It is a volume.
        The <Term name="View matrix">view matrix</Term> has already moved the
        world so that the camera stands at the origin looking down its own
        &minus;z; what the projection matrix adds is a shape — a bounded region
        of the space in front of that origin — and a rule for squashing whatever
        is inside it into the same cube every time,{' '}
        <code>[-1, 1]</code> on all three axes.
      </p>
      <p>
        Everything inside the volume is kept and everything outside it is thrown
        away, by comparisons rather than by fading. The lab below draws that
        volume as an object in the world it is clipping, and underneath it the
        picture the same camera produces. Two panels, because the interesting
        thing about a <Term name="Frustum">frustum</Term> is that it is a shape,
        and a shape is the one thing you cannot see from inside.
      </p>

      <ProseHeading id="frustum">The frustum is an object, not a setting</ProseHeading>
      <p>
        The wireframe in the outside view is not a drawing of the field of view.
        It is built the other way round: take the eight corners of the clip cube,
        the points <code>(±1, ±1, ±1)</code>, and push them backwards through the
        inverse of the projection and view matrices. Wherever those eight corners
        land is the region that survives, so the wireframe cannot disagree with
        the clipping — it <em>is</em> the clipping, drawn. Move the slider and
        watch the shape rather than the boxes.
      </p>

      <FieldOfViewFigure />

      <p>
        The four faint lines converging outside the near rectangle are the eye
        rays, and where they meet is the camera. A frustum is a pyramid with its
        tip cut off, and the tip is cut off at exactly the{' '}
        <Term name="Near and far planes">near plane</Term>; the rays show you the
        apex the volume would have had. In{' '}
        <Term name="Perspective projection">perspective</Term> they lie along the
        frustum&rsquo;s own side edges, because those edges pass through the eye.
      </p>
      <p>
        Field of view sets the angle of that pyramid and nothing else. Widening
        it fits more of the world into the same rectangle of pixels, which is the
        same statement as everything in the picture getting smaller. Narrowing it
        crops, and it crops the near boxes first: an object close to the camera
        covers a much wider angle than the same object further off, so the near
        ones are the first to fall outside a narrow cone.
      </p>
      <p>
        The angle the slider sets is the vertical one. The horizontal opening is
        that same angle stretched by the aspect ratio, held at 16:10 throughout
        this lab because the shape of the picture is not the thing under study.
        In the projection matrix printed further down the page it is the
        difference between the first entry, 1.340, and the second, 2.145 — one
        number, divided by 1.6 in x.
      </p>

      <ProseHeading id="clipping">Near and far are a test, not a fade</ProseHeading>
      <p>
        The clip test has no falloff in it and no distance term. A point in{' '}
        <Term name="Clip space">clip space</Term> is kept when each of x, y and z
        lies between &minus;w and +w: six comparisons and a boolean. The outside
        view runs those same six comparisons on the CPU, once per box, which is
        why a box the camera is about to lose goes dim in the world panel before
        it vanishes from the picture.
      </p>

      <NearPlaneFigure />

      <p>
        Near is the plane people set to 0.01 without thinking, and it is the most
        expensive number in the projection. Depth is not spread evenly across the
        volume: at the default near of 1.5 and far of 11, half of the depth
        buffer&rsquo;s range is used up by 2.6 units out, and dropping near to
        0.1 pulls that halfway mark in to 0.2. What the rest of the scene is left
        to share, and what happens to two surfaces sharing too little of it, is{' '}
        <a href="/labs/depth#near">Depth &amp; Transparency</a> — where the fix is
        this plane and not anything in the model.
      </p>
      <p>
        The far plane is the cheap one by comparison; it is already doing work
        you can see, since two of the six boxes are missing from the picture
        before you touch anything. They stand 12.8 and 15.8 units out, and far is
        11. The lab will not let near reach far — the handler pushes whichever
        plane you are not dragging half a unit out of the way — because at{' '}
        <code>near === far</code> the projection divides by zero and the scene
        goes with it. Near cannot be zero either, for a quieter reason: at{' '}
        <code>near = 0</code> every depth in the scene maps to the same value,
        and the depth buffer stops being able to tell anything from anything.
      </p>

      <ProseHeading id="divide">w carries the distance, and the hardware divides by it</ProseHeading>
      <p>
        Open the vertex shader in the source panel at the foot of the lab. It
        ends with{' '}
        <code>gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0)</code>{' '}
        and there is no division in it anywhere. What comes out is clip space —
        four numbers, w among them, and the perspective not yet applied.
      </p>
      <p>
        The bottom row of the perspective matrix reads <code>0 0 −1 0</code>. Dot
        that row with <code>(x, y, z, 1)</code> and it computes &minus;z: w comes
        out as the distance the point stands in front of the camera, measured
        along the camera&rsquo;s forward axis. Then, between the vertex shader
        and the <Term name="Rasterisation">rasteriser</Term>, the hardware
        divides x, y and z by w. Dividing by the distance is the whole of
        perspective. The rest of the matrix is framing.
      </p>

      <DivideFigure />

      <p>
        Nothing in the upper three rows could have done that, and no matrix
        anywhere in the chain performs the division. The matrix&rsquo;s whole
        contribution is to have the right number waiting in w when the hardware
        arrives. Where that step sits between the others — clip space, the
        divide, <Term name="NDC">normalised device coordinates</Term>, then the
        viewport transform that turns ±1 into pixels — is walked a vertex at a
        time in <a href="/labs/pipeline#divide">Coordinate Spaces</a>.
      </p>

      <ProseHeading id="orthographic">Orthographic deletes the distance</ProseHeading>
      <p>
        The <Term name="Orthographic projection">orthographic</Term> matrix keeps
        the identity&rsquo;s bottom row,{' '}
        <code>0 0 0 1</code>, so w comes out as 1 for every vertex and the divide
        divides by one. Nothing shrinks with distance because nothing consults
        the distance. The volume changes shape to match: with nothing
        converging, the near rectangle and the far rectangle are the same size,
        and what is left is not a frustum at all but a box.
      </p>

      <OrthoHeightFigure />

      <p>
        Losing the divide costs the picture its depth cue and buys back a
        guarantee: parallel edges stay parallel, and a measurement taken on
        screen means the same thing wherever on screen it is taken. That is worth
        more than realism to a CAD drawing, to an isometric game that wants a
        tile at the back of the board to match a tile at the front, and to a
        shadow map for a directional light, which has no position for anything to
        converge on. For a camera it looks wrong, and the reason it looks wrong
        sits in the bottom row.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Each figure above moved one control. Below, the camera has all of them
        live — both modes, the angle or the height, both planes, and the frustum
        drawn or hidden — with the projection matrix printed beside it to three
        decimals. Drag the top canvas to orbit: the picture underneath does not
        change while you do, because orbiting moves the viewpoint you are
        watching from and not the camera being studied. Each preset lands on a
        state worth looking at, and says what to look at once it does.
      </p>
    </Prose>
  );
}
