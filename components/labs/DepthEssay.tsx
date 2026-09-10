'use client';

import { Check } from '@/components/lab/Check';
import { Slider, Toggle } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';
import { usePalette } from '@/components/site/ThemeProvider';
import {
  createScene,
  DEFAULTS,
  smallestResolvableGap,
  type Params as DepthParams,
} from '@/components/labs/DepthLab';
import { REPO_URL } from '@/lib/site';

/**
 * The written half of lab 9.
 *
 * Every figure drives the lab's own `createScene` with the lab's own params, so
 * a figure cannot drift away from the instrument at the foot of the page. The
 * two transparency figures sit at an azimuth of 2.5 rather than the lab's
 * opening 0.12, and that is deliberate: from the opening viewpoint the camera
 * is at z ≈ +14.7, the pane array (z = −3, 0, +3) is already back to front, and
 * all four combinations of the two switches render identical pixels. A figure
 * showing nothing would be worse than no figure — and the fact that the failure
 * is view-dependent is the section's whole point, so it is written down rather
 * than hidden.
 */

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(
  overrides: Partial<DepthParams>,
  palette: DepthParams['palette'],
): DepthParams {
  return {
    azimuth: 0.12,
    elevation: 0.16,
    scene: 'zfight',
    near: 0.05,
    far: 200,
    distance: 80,
    separation: 0.002,
    sorted: true,
    depthWrite: false,
    opacity: 0.55,
    palette,
    ...overrides,
  };
}

/** The prediction, beside the picture it predicts — the lab's readout, cut down. */
function GapReadout({ near, far, distance, separation }: {
  near: number;
  far: number;
  distance: number;
  separation: number;
}) {
  const gap = smallestResolvableGap(near, far, distance);
  const fights = separation <= gap;

  return (
    <div className="grid gap-3 sm:w-40 sm:grid-cols-1">
      <div>
        <div className="eyebrow mb-1.5">Smallest resolvable gap</div>
        <div className="tabular font-mono text-lg text-accent">{gap.toExponential(2)}</div>
      </div>
      <div>
        <div className="eyebrow mb-1.5">The panels are apart by</div>
        <div className="tabular font-mono text-lg text-fg">{separation.toFixed(3)}</div>
      </div>
      <div>
        <div className="eyebrow mb-1.5">Prediction</div>
        <div className={`font-mono text-lg ${fights ? 'text-amber' : 'text-axis-y'}`}>
          {fights ? 'will fight' : 'resolvable'}
        </div>
      </div>
    </div>
  );
}

function NearFigure() {
  const palette = usePalette();
  // 0.02 is the slider's bottom stop, and it stays there. It is the one number
  // the paragraph above and the caption below both name, and it is where the
  // failure is largest: the resolvable gap is 1.91e-2 against a separation of
  // 0.002, so the reader arrives at slivers rather than having to find them.
  // The argument only runs one way — raise the near plane and the fight goes —
  // and it crosses at 0.1906, a tenth of the way along.
  const [state, setState] = useFigureState(
    'near-plane',
    { near: 0.02 },
    // The figure's own range, which is narrower than the lab's 0.01–5. Below
    // 0.02 the caption's arithmetic describes a picture nobody is looking at.
    { near: (value) => value >= 0.02 && value <= 2 },
  );
  const params = figureParams({ near: state.near }, palette);

  return (
    <Figure
      id="near-plane"
      // The whole params record, palette and all: Figure strips everything that
      // is not a control before it reaches the address bar, so the essay hands
      // over the object it already built rather than a second, hand-curated one
      // that would drift away from the picture.
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="near plane"
          value={state.near}
          min={0.02}
          max={2}
          step={0.01}
          onChange={(near) => setState({ near })}
        />
      }
      readout={<GapReadout near={state.near} far={200} distance={80} separation={0.002} />}
      caption={
        <>
          At a near plane of 0.02 the buffer cannot resolve anything finer than
          1.9&nbsp;&times;&nbsp;10&#8315;&sup2;, nearly ten times the gap between
          the panels, and the red panel behind cuts up through the blue one in
          slivers. Past about 0.19 the prediction crosses the separation and the
          slivers are gone for good. Below it they come and go as you drag:
          whether two depths a fraction of a step apart land in different steps
          depends on where the step boundaries happen to fall.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={1}
        label="Two panels two thousandths of a unit apart at eighty units, fighting for the same depth as the near plane moves"
      />
    </Figure>
  );
}

function FarFigure() {
  const palette = usePalette();
  // Opens at 400, not at the slider's bottom stop of 100. The claim here is that
  // the control does nothing, and nothing-happening is only visible if you can
  // move — parked at the stop the reader can drag one way and has to take the
  // return trip on trust. Costs nothing to move off it: the prediction is
  // 7.63e-3 at 100, at 400 and at 1000 alike, and 0.002 of separation loses to
  // all three, so the panels are already fighting when the reader arrives.
  const [state, setState] = useFigureState(
    'far-plane',
    { far: 400 },
    { far: (value) => value >= 100 && value <= 1000 },
  );
  const params = figureParams({ far: state.far }, palette);

  return (
    <Figure
      id="far-plane"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="far plane"
          value={state.far}
          min={100}
          max={1000}
          step={10}
          precision={0}
          onChange={(far) => setState({ far })}
        />
      }
      readout={<GapReadout near={0.05} far={state.far} distance={80} separation={0.002} />}
      caption={
        <>
          A factor of ten on the far plane, and to the three significant figures
          on display the prediction did not move at all. The banding comes and
          goes while you drag &mdash; rounding, not progress; it is back again at
          the far end of the slider &mdash; but the steady improvement the
          control looks like it ought to buy never arrives.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={1}
        label="The same two panels while the far plane is dragged from a hundred units to a thousand"
      />
    </Figure>
  );
}

function DepthWriteFigure() {
  const palette = usePalette();
  // On, which is the broken state and the one the caption opens on: three
  // sheets at 55% opacity and not one showing through another. The switch is
  // here to take the failure away, not to produce it.
  const [state, setState] = useFigureState('depth-write', { depthWrite: true });
  const params = figureParams(
    { scene: 'blend', azimuth: 2.5, sorted: false, depthWrite: state.depthWrite },
    palette,
  );

  return (
    <Figure
      id="depth-write"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Toggle
          label="Write depth"
          checked={state.depthWrite}
          onChange={(depthWrite) => setState({ depthWrite })}
        />
      }
      caption={
        <>
          With writing on, the pane nearest the camera stamps its depth into the
          buffer and the two behind it fail the test outright &mdash; three sheets
          at 55% opacity and not one of them shows through another. Turn it off
          and the blending comes back. It is still wrong; the order is the next
          figure.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="Three translucent panes drawn front to back, with depth writing occluding the two behind"
      />
    </Figure>
  );
}

function SortFigure() {
  const palette = usePalette();
  // Unsorted, for the same reason as the figure above: the caption's first
  // sentence is about the blue pane at z = +3 reading as though it were on top,
  // and at azimuth 2.5 that is what arrives on screen before anything is
  // touched.
  const [state, setState] = useFigureState('sort-order', { sorted: false });
  const params = figureParams(
    { scene: 'blend', azimuth: 2.5, depthWrite: false, sorted: state.sorted },
    palette,
  );

  return (
    <Figure
      id="sort-order"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Toggle
          label="Sort back to front"
          checked={state.sorted}
          onChange={(sorted) => setState({ sorted })}
        />
      }
      caption={
        <>
          Unsorted, the panes are drawn in the order the array holds them &mdash;
          red at z&nbsp;=&nbsp;&minus;3, green at 0, blue at +3 &mdash; and from
          this side that is front to back, so the blue pane, the farthest of the
          three, comes out reading as though it were on top. Sorted, the overlap
          is red over green over blue, which is where they actually are.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="Three translucent panes blended in array order and then sorted back to front"
      />
    </Figure>
  );
}

export function DepthEssay() {
  return (
    <Prose>
      <p>
        Every pixel on screen carries a colour and one other number: how far away
        the thing that coloured it was. That second number is the{' '}
        <Term name="Depth buffer">depth buffer</Term>, and it is what lets
        triangles be submitted in any order and still come out with the near ones
        in front. Before a <Term name="Fragment">fragment</Term> is written its
        depth is compared against what is already stored there, and if it loses the
        comparison it is discarded &mdash; the draw call that produced it is
        never told.
      </p>
      <p>
        The buffer is finite, twenty-four bits per pixel in the arithmetic the
        readouts here use, and it is spent very unevenly along the view
        direction. Both of the failures in this lab come out of that one fact.{' '}
        <Term name="Z-fighting">Z-fighting</Term> is the buffer running out of
        precision and being unable to
        decide between two surfaces; broken transparency is the buffer deciding
        when it should have kept out of it.
      </p>

      <ProseHeading id="near">The near plane spends the buffer</ProseHeading>
      <p>
        Perspective does not store distance. After the{' '}
        <Term name="Perspective divide">divide</Term>, the value written for a
        surface <code>d</code> units away is{' '}
        <code>f(d &minus; n) / (d(f &minus; n))</code> &mdash; hyperbolic in{' '}
        <code>d</code>, not linear. Half of the buffer&rsquo;s entire range is
        gone by the time that expression reaches 0.5, which happens at{' '}
        <code>d = 2nf/(f + n)</code>. With a near plane of 0.02 and a far plane of
        200, half of every value the buffer can hold is spent between 0.02 and
        0.04 units in front of the camera. Everything from there to the far plane
        shares the rest.
      </p>
      <p>
        The two panels below are two thousandths of a unit apart, eighty units
        away. Whether the buffer can tell them apart is arithmetic rather than
        luck, and the readout does it: a 24-bit buffer resolves about{' '}
        <code>z²(f &minus; n) / (n·f·2²⁴)</code> at distance <code>z</code>. Move
        the near plane and watch the prediction and the picture change together.
      </p>

      <NearFigure />

      <p>
        Nothing about the geometry changed. The panels are the same size, the
        same distance away, the same two thousandths apart; two entries of the
        projection matrix changed and the failure went with them. Pushing the near
        plane from 0.02 out to 1 buys a factor of fifty &mdash;{' '}
        1.9&nbsp;&times;&nbsp;10&#8315;&sup2; down to
        3.8&nbsp;&times;&nbsp;10&#8315;&#8308; &mdash; because the resolvable gap
        is inversely proportional to <code>n</code> and to almost nothing else.
      </p>
      <p>
        Distance is the other half of it, and it is quadratic. Those same panels
        in that same frustum need 1.2&nbsp;&times;&nbsp;10&#8315;&sup3; of
        separation to be safe at twenty units, 4.8&nbsp;&times;&nbsp;10&#8315;&sup3;{' '}
        at forty and 1.9&nbsp;&times;&nbsp;10&#8315;&sup2; at eighty. Doubling how
        far away something is quadruples the gap you have to leave inside it,
        which is why coplanar decals &mdash; a poster on a wall, a tyre mark on a
        road &mdash; sit still under the camera and shimmer at the end of the
        street.
      </p>

      <ProseHeading id="far">The far plane is the control that does nothing</ProseHeading>
      <p>
        Write the prediction as <code>z²/(n·2²⁴) × (1 &minus; n/f)</code> and the
        far plane&rsquo;s entire contribution is that second factor. With a near
        plane of 0.05, dragging <code>f</code> from 10 to 1000 moves it from 0.995
        to 0.99995.
      </p>

      <FarFigure />

      <p>
        It is nevertheless the first control most people reach for, and close to
        the least effective one on offer. It is also the one with a hard floor:
        in the instrument below the far slider goes down to 10, and taking it
        under the panels&rsquo; own eighty units does not dim them or fade them
        out &mdash; they disappear. Near and far are a clip rather than a
        falloff, which is what{' '}
        <a href="/labs/projection#clipping">Projection &amp; the Frustum</a> is about.
      </p>
      <p>
        The flicker deserves a moment on its own. Below the threshold, which of
        two surfaces wins a given pixel is settled by rounding, and rounding
        changes when the camera moves. That is why z-fighting in a real scene is
        not a fixed pattern sitting on a wall; it is a shimmer that follows you
        around the room.
      </p>

      <Check
        question={
          <>
            Your scene is 200 units deep and the distant walls are z-fighting.
            Which change fixes it?
          </>
        }
        options={[
          {
            option: <>Pull the far plane in from 1000 to 400.</>,
            response: (
              <>
                The far plane is nearly free. Depth is distributed
                hyperbolically, so almost the whole buffer is spent in the first
                few units; pulling the far plane in by 600 buys back a sliver of
                precision that was never the problem. The instrument below prints
                the smallest resolvable gap &mdash; move the far plane and watch
                it barely move.
              </>
            ),
          },
          {
            option: <>Push the near plane out from 0.01 to 0.5.</>,
            correct: true,
            response: (
              <>
                This is the one. Precision at 200 units is governed by the near
                plane, which is why the fix for a problem far away is a number
                describing something close.
              </>
            ),
          },
          {
            option: <>Move the two walls further apart.</>,
            response: (
              <>
                It works, and it is the wrong fix. You have changed the model to
                suit the camera, and the next scene will fight again.
              </>
            ),
          },
          {
            option: <>Ask for a higher-precision depth buffer.</>,
            response: (
              <>
                Sometimes available, and it treats the symptom. A near plane at
                0.01 wastes so much of the range that more bits mostly buys back
                what the frustum threw away.
              </>
            ),
          },
        ]}
      />

      <ProseHeading id="transparency">
        The buffer answers what is nearest; transparency asks what is behind
      </ProseHeading>
      <p>
        Switch scenes. Three translucent panes, three units apart, drawn with
        premultiplied <em>over</em>: the fragment shader emits{' '}
        <code>vec4(colour * opacity, opacity)</code> and the{' '}
        <Term name="Alpha blending">blend function</Term> is{' '}
        <code>ONE, ONE_MINUS_SRC_ALPHA</code>. Read that literally and it says the
        result is this pane&rsquo;s contribution plus whatever was already in the
        framebuffer, faded by how opaque this pane is. It requires that what is
        behind the pane has already been drawn.
      </p>
      <p>
        The depth buffer&rsquo;s whole job is to stop what is behind from being
        drawn. The two requirements are in direct opposition, and the switch that
        decides between them is depth writing.
      </p>

      <DepthWriteFigure />

      <p>
        Depth <em>testing</em> stays on the entire time: translucent geometry
        still has to be hidden by the opaque geometry in front of it. Only the
        write comes off. A pane that tests but does not write is still occluded by
        anything nearer that has already claimed the pixel, and hides nothing
        drawn after it &mdash; which is what you wanted, and also why there is now
        nothing left to put the three of them in order.
      </p>

      <ProseHeading id="sorting">Sorting is the half you have to do yourself</ProseHeading>
      <p>
        <em>Over</em> is not commutative. Red over green is a different colour
        from green over red, so the panes have to arrive back to front, and no
        piece of render state arranges that. The lab sorts them on the CPU, every
        frame, from where the camera is at that moment.
      </p>

      <SortFigure />

      <p>
        That the sort is per camera is not a detail. From the viewpoint the lab
        opens at, the camera sits at about <code>z = +14.7</code> and the array
        order &mdash; red, green, blue &mdash; is already back to front; all four
        combinations of the two switches render the same pixels there, and both
        bugs stay invisible until you drag the panes round. Come at them from the
        other side and the identical array is front to back, and both failures
        appear at once.
      </p>
      <p>
        That also answers the optimisation everyone proposes. The order cannot be
        computed once and stored with the model, because it is not a property of
        the model. It changes when the camera moves, so it is redone every frame,
        on the CPU, for as long as the scene contains anything translucent. That
        is the real cost of transparency, and it is paid in{' '}
        <Term name="Draw order">draw-call ordering</Term> rather than in shading.
      </p>
      <p>
        One thing worth checking in the instrument, once you have dragged the
        panes round: sort them correctly and then turn depth writing back{' '}
        <em>on</em>, and the pixels do not change. In back-to-front order every
        pane is nearer than everything
        already in the buffer, so nothing is ever rejected. Depth writing only
        bites when the order is already wrong &mdash; another way of saying that
        the sort is the load-bearing half.
      </p>

      <ProseHeading id="mistake">
        What I got wrong here: the scene that never fought
      </ProseHeading>
      <p>
        The first build of this lab never fought. Its distance control orbited
        the camera around the panels, and the belief underneath that is worth
        naming: that distance is a property of the picture. Move the panels away,
        or pull the camera back, and they arrive on screen at the same size, so
        the two looked like the same operation. They are not the same operation
        for the depth buffer, which is indifferent to where the panels sit and
        cares only how far the frustum has to reach to hold them.
      </p>
      <p>
        The symptom was a lab that looked well behaved. The slider said anything
        from 5 units to 120 and the view distance stayed pinned at 14, so the
        scene sat comfortably inside precision at every setting and the panels
        never tore. A clean render makes no complaint. It reads as a lab that
        works, or at worst as a failure that some other control has to be turned
        up to produce &mdash; and the control that was supposed to produce it was
        the one holding it off.
      </p>
      <p>
        What caught it was measuring the pixels rather than looking at them.
        Counting how much of the far panel breaks through the near one turns
        &ldquo;it looks fine&rdquo; into a number: at a near plane of 0.02 with
        the panels 0.002 apart, 52 pixels of the far panel come through, in 52
        separate transitions, and at a near plane of 1 the count is 0. In the
        broken build nothing tore at any setting, so that count was flat wherever
        it was taken. The arithmetic beside the picture was right the whole time;
        it was the camera that was wrong, which is why reading the source would
        not have found it either.
      </p>
      <p>
        The fix, in{' '}
        {/* Built from the constant rather than written out: test/content.test.ts
            fails any file that restates a lib/site.ts URL in full. */}
        <a href={`${REPO_URL}/commit/ba5d487`}>commit ba5d487</a>
        , stops the camera. The eye sits 1.5 units from the origin and the panels
        move away from it, sized in proportion to distance so that the picture
        holds still and only the precision behind it changes. What guards a
        control that does nothing is the check{' '}
        <code>moving a control changes the picture</code> in{' '}
        <code>test/render.smoke.ts</code>, which drives one control on every
        lab&rsquo;s instrument in a real browser and fails the build when the
        canvas does not move further than that lab&rsquo;s own noise. It is
        honest about what it cannot see: on this lab it drives the scene switch
        rather than the frustum, because the bands are finer than its sampler
        resolves &mdash; moving the near plane from 0.02 to 1 under the{' '}
        <em>Make it fight</em> preset changes 0.049 per cent of the picture even
        at the canvas&rsquo;s native resolution.
      </p>

      <ProseHeading id="instrument">Both failures, with every control</ProseHeading>
      <p>
        Below is the instrument the figures were cut from. The segmented control
        picks which failure you are looking at. Z-fighting gets the frustum
        &mdash; near, far, distance, and the separation between the panels
        &mdash; with the prediction computed live beside the picture. Transparency
        gets the two switches and an opacity slider. The presets are the quickest
        way in: three of them are the frustum arguments above, already dialled
        in.
      </p>
      <p>
        One case the arithmetic above does not cover. Take the separation to
        exactly zero and the panels stop fighting rather than start: identical
        geometry produces identical depth, the test is <code>LEQUAL</code>, and
        the panel drawn second passes and wins every pixel cleanly. It is the one
        setting where a smaller gap is more stable than a larger one, and the
        readout calls it out rather than predicting a fight.
      </p>
    </Prose>
  );
}
