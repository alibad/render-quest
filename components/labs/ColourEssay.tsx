'use client';

import { Check } from '@/components/lab/Check';
import { Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';
import { usePalette } from '@/components/site/ThemeProvider';
import { createScene, DEFAULTS, type Params as ColourParams } from '@/components/labs/ColourLab';
import { REPO_URL } from '@/lib/site';

/**
 * The written half of lab 8.
 *
 * Every figure drives the lab's own `createScene`, so a figure cannot drift
 * away from the instrument at the foot of the page — they are the same two
 * shaders with one control exposed at a time.
 */

/** The lab's own defaults, with everything a figure is not about held still. */
function figureParams(
  overrides: Partial<ColourParams>,
  palette: ColourParams['palette'],
): ColourParams {
  return {
    azimuth: 0.6,
    elevation: 0.25,
    intensity: 1,
    ambient: 0.05,
    split: 0.5,
    gamma: 2.2,
    showStrip: false,
    bothCorrect: false,
    palette,
    ...overrides,
  };
}

/**
 * What a hand-edited URL is allowed to say.
 *
 * A figure's state comes off the address bar now, and a URL is user input.
 * `?grey-test.gamma=0` reaches `1.0 / uGamma` in the fragment shader, and
 * `pow(c, 0.0)` is 1.0 in every channel, so the sphere goes white with no error
 * anywhere. These are the sliders' own min and max below, and the same three
 * guards `ColourLab` already hands `useLabState`.
 */
const GAMMA_RANGE = { gamma: (value: number) => value >= 1 && value <= 3 };
const SPLIT_RANGE = { split: (value: number) => value >= 0 && value <= 1 };
const INTENSITY_RANGE = { intensity: (value: number) => value >= 0 && value <= 3 };

/** Numbers beside a figure, in the same shape the lab's own readout uses. */
function Readout({
  rows,
}: {
  rows: { label: string; value: string; tone?: string }[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:w-48 sm:grid-cols-1">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="eyebrow mb-1">{row.label}</dt>
          <dd className={`tabular font-mono text-base ${row.tone ?? 'text-fg'}`}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The grey test, alone.
 *
 * `split` is pinned to 1, which puts the whole sphere on the uncorrected
 * branch — and that branch never reads `uGamma`. So the slider moves exactly
 * one thing on screen: the right-hand patch of the strip.
 */
function GreyFigure() {
  const palette = usePalette();
  const [{ gamma }, setState] = useFigureState('grey-test', { gamma: 2.2 }, GAMMA_RANGE);
  const params = figureParams({ gamma, showStrip: true, split: 1 }, palette);

  return (
    <Figure
      id="grey-test"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="gamma"
          value={gamma}
          min={1}
          max={3}
          onChange={(next) => setState({ gamma: next })}
        />
      }
      readout={
        <Readout
          rows={[
            { label: 'the dither', value: '50.0% light' },
            {
              label: 'the number 0.5',
              value: `${(Math.pow(0.5, gamma) * 100).toFixed(1)}% light`,
              tone: 'text-amber',
            },
            {
              label: 'half the light',
              value: Math.pow(0.5, 1 / gamma).toFixed(3),
              tone: 'text-axis-y',
            },
          ]}
        />
      }
      caption={
        <>
          Only the right-hand patch responds to the slider; the sphere is on the
          uncorrected branch, which never reads gamma at all. At 2.20 the
          right-hand patch is 0.730, and once the rows on the left have blurred
          into a single tone it is the one they match — the middle patch, the
          literal number 0.5, sits below both. Drag gamma down to 1.00 and the
          right patch slides all the way down onto the middle one.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A lit sphere above a three-part grey strip: a black and white dither, the number 0.5, and half the light encoded"
      />
    </Figure>
  );
}

/** The divider, wiping the correction across a sphere lit one way. */
function SplitFigure() {
  const palette = usePalette();
  const [{ split }, setState] = useFigureState('divider', { split: 0.5 }, SPLIT_RANGE);
  const params = figureParams({ split }, palette);

  return (
    <Figure
      id="divider"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="divider"
          value={split}
          min={0}
          max={1}
          onChange={(next) => setState({ split: next })}
        />
      }
      caption={
        <>
          At the far left of the slider the whole sphere is corrected; at the far
          right, none of it is. Anywhere between, the same surface is lit two ways
          within a pixel of itself. The uncorrected side is darker everywhere but
          the highlight, and its terminator arrives as an edge rather than a
          fade.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A lit sphere with a movable vertical divider, sRGB lighting on the left and linear lighting on the right"
      />
    </Figure>
  );
}

/**
 * Intensity, which decides which half of the sphere is the brighter one.
 *
 * Opens at 1.35, not at the lab's default of 1. The caption makes three claims
 * and at intensity 1 only the first is visible: the halves agree at lambert
 * 0.950, which is a cap the size of the highlight rather than a ring, and
 * neither highlight has clamped — the left one does not reach 1.0 until 1.17
 * and the right not until 1.50, so "the left highlight is losing its colour
 * while the right one keeps it" is false everywhere below 1.17. At 1.35 the
 * left half's red channel is 1.148 and clamped, the right's is 0.956 and is
 * not, and the seam is a ring at lambert 0.704. Both directions stay open: down
 * the ring closes onto the highlight and the left half recovers its colour, up
 * it sweeps towards the terminator and the right half blows out too.
 */
function IntensityFigure() {
  const palette = usePalette();
  const [{ intensity }, setState] = useFigureState(
    'error-changes-sign',
    { intensity: 1.35 },
    INTENSITY_RANGE,
  );
  const params = figureParams({ intensity }, palette);

  // Read back from the params rather than restating them, so the numbers
  // beside the picture cannot drift away from the ones inside it.
  const peak = params.ambient + params.intensity;
  const seam = (1 - params.ambient) / params.intensity;

  return (
    <Figure
      id="error-changes-sign"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="intensity"
          value={intensity}
          min={0}
          max={3}
          onChange={(next) => setState({ intensity: next })}
        />
      }
      readout={
        <Readout
          rows={[
            {
              label: 'left multiplies by',
              value: peak.toFixed(3),
              tone: 'text-amber',
            },
            {
              label: 'right multiplies by',
              value: Math.pow(peak, 1 / params.gamma).toFixed(3),
              tone: 'text-axis-y',
            },
            {
              label: 'they agree at lambert',
              value: seam <= 1 ? seam.toFixed(3) : 'nowhere',
            },
          ]}
        />
      }
      caption={
        <>
          The first two rows are what each half multiplies the base colour by at
          the brightest point on the sphere. Below an intensity of 0.95 they
          never meet and the left half is darker everywhere. Above it a seam
          opens where the two agree exactly, and widens into a ring as you keep
          going. The left half&rsquo;s red channel reaches 1.0 and clamps at an
          intensity of about 1.17, the right half&rsquo;s at about 1.50, and in
          between the two the left highlight is losing its colour while the
          right one keeps it.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A split-lit sphere as the light intensity rises, the uncorrected half blowing out first"
      />
    </Figure>
  );
}

/**
 * Gamma on the sphere: the control experiment.
 *
 * Opens at 2.2, not at 1. The heading above it is an instruction — set gamma to
 * 1 — and a figure already sitting at 1 leaves nothing to set: the reader
 * arrives at a sphere with no divider in it and a slider already pinned at its
 * minimum, having never seen the two halves apart, which is the only thing that
 * would make their merging mean anything. At 2.2, the value every other figure
 * on this page and the instrument below run at, the seam is plainly there and
 * dragging down to 1.00 closes it. The caption is unchanged and still true: it
 * says what happens at 1.00 and what happens as you raise it, and both are now
 * one drag away in either direction.
 */
function GammaFigure() {
  const palette = usePalette();
  const [{ gamma }, setState] = useFigureState('only-difference', { gamma: 2.2 }, GAMMA_RANGE);
  const params = figureParams({ gamma }, palette);

  return (
    <Figure
      id="only-difference"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="gamma"
          value={gamma}
          min={1}
          max={3}
          onChange={(next) => setState({ gamma: next })}
        />
      }
      caption={
        <>
          At 1.00 the divider is gone — the two branches are computing the same
          expression, and a screenshot could not tell you which pixel came from
          which. Raise it and the right half separates a little further at every
          step. Nothing else about the two branches differs, so there is nothing
          else the seam could be measuring.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A split-lit sphere whose two halves are identical at gamma 1 and diverge as gamma rises"
      />
    </Figure>
  );
}

export function ColourEssay() {
  return (
    <Prose>
      <p>
        A framebuffer holds numbers between 0 and 1, and a display turns each of
        those numbers into an amount of light. The relationship between the two
        is not a straight line. Write <code>0.5</code> and the screen emits
        roughly a fifth of the light it emits for <code>1.0</code> — and every
        shader on this site once multiplied colours as though it emitted half.
      </p>
      <p>
        That is the bug this lab is about, and it is the one that survives
        longest in a renderer, because nothing it does looks like an error.
        Midtones that come out too dark read as mood. A terminator that falls off
        a cliff reads as contrast. Below, one sphere is split down the middle and
        both halves are lit by the same light with the same{' '}
        <Term name="Lambert">Lambert term</Term>, in two different colour spaces,
        so the difference has an edge you can look at.
      </p>

      <ProseHeading id="encoding">The number 0.5 is about a fifth of the light</ProseHeading>
      <p>
        <Term name="sRGB">sRGB</Term> spends its 256 codes unevenly, on purpose.
        Your eye resolves far finer differences in the dark than in the light, so
        an encoding that spaced its codes evenly across the light would waste
        most of them at the bright end and band visibly in the shadows. sRGB
        stores roughly the 1/2.2 power of the light instead, which bunches the
        codes up where the eye is sensitive. It is a good encoding, and it is not
        a quantity you can do arithmetic with.
      </p>
      <p>
        The strip along the bottom of the figure is the shortest proof of that.
        Its left third is alternating rows of black and white — half the pixels
        emitting nothing and half emitting everything, so half the light. Its
        middle third is the number 0.5 written straight into the framebuffer. Its
        right third is half the light, encoded. Step back from the screen until
        the rows blur into one tone, then compare the three.
      </p>

      <GreyFigure />

      <p>
        At <Term name="Gamma">gamma</Term> 2.2, half the light is the number
        0.730, which is code 186 of 255. About three quarters of the available
        codes are spent below the halfway point of the light. That is the whole
        reason the encoding exists and the whole reason it is a trap: the
        midpoint of the numbers and the midpoint of the light are nowhere near
        each other, so a routine that averages two colours, or halves one, is not
        doing what its name says.
      </p>

      <Check
        question={
          <>
            A cross-fade blends two colours by averaging their sRGB numbers
            frame by frame, and halfway through the transition the picture
            visibly dips darker than either end of the fade. What is happening?
          </>
        }
        options={[
          {
            option: (
              <>
                Nothing is: a mixture of two colours is duller than either of
                them, and that is what a fade through the middle looks like.
              </>
            ),
            response: (
              <>
                This is the reading the bug survives on, here and in real
                renderers, and it is why nobody files it. The dip is made by the
                arithmetic rather than carried in by the two ends: the encoding
                curve bends so that the number halfway between two codes always
                stands for less light than halfway between them. Fade red to a
                green of the same brightness and the midpoint emits 43.5 per
                cent of the light it should.
              </>
            ),
          },
          {
            option: (
              <>
                Decode both colours to light, average them there, and encode the
                result back.
              </>
            ),
            correct: true,
            response: (
              <>
                This is the one. The average of two codes is not the code for the
                average of two lights, so linear is the only space where the word
                average means what it says. Half the light is the number 0.730
                and its code is 186, not 128 — the middle and right patches of{' '}
                <a href="#grey-test">the grey test above</a> are those two
                numbers side by side.
              </>
            ),
          },
          {
            option: (
              <>
                Add a brightness boost that peaks in the middle of the fade,
                tuned until the dip goes away.
              </>
            ),
            response: (
              <>
                It works, and it is the wrong fix. The curve is tuned to this
                pair of colours, and the size of the dip depends on where the two
                codes sit, so the next pair sags by a different amount and the
                one that fades a colour to itself needs no boost at all. What you
                have compensated for is the encoding, and the encoding is one
                decode and one encode away from being right everywhere.
              </>
            ),
          },
          {
            option: <>Give the framebuffer more bits per channel.</>,
            response: (
              <>
                Precision is not what is wrong here. Sixteen bits under the
                same encoding put the midpoint at the same fraction of the
                light, with more decimals behind it, and about three quarters of
                the codes still sit below half the light. What moves the midpoint is
                averaging in linear, not describing the wrong one more finely.
              </>
            ),
          },
        ]}
      />
      <p>
        The blurring has to happen in your eye, which sums light. Zoom the page
        out, or screenshot it and resize the file, and whatever resamples the
        image will almost certainly average those rows as numbers instead: a
        black row and a white row become 0.5, the dither collapses onto the
        middle patch, and the figure appears to prove the opposite of what it
        shows. Gamma-incorrect image scaling is the same bug as gamma-incorrect
        lighting, met in a different room.
      </p>
      <p>
        The lab raises to a plain power of gamma rather than using sRGB&rsquo;s
        actual piecewise transfer function, which has a short linear segment near
        black. The two agree closely away from the darkest few codes, and nothing
        here turns on the difference — the exponent is left on a slider precisely
        so it stops looking like a constant to memorise.
      </p>

      <ProseHeading id="multiply">Every multiply in the shader is on the wrong quantity</ProseHeading>
      <p>
        A diffuse shader has one instruction in it: take the surface&rsquo;s base
        colour and multiply it by how much light lands there. The lab&rsquo;s
        fragment shader computes that amount once, as{' '}
        <code>uAmbient + uIntensity * max(dot(N, L), 0.0)</code>, and both halves
        of the sphere use the same number from the same normal. What differs is
        which colour it multiplies. The left half multiplies{' '}
        <code>uBaseColor</code> directly. The right half raises{' '}
        <code>uBaseColor</code> to the power of gamma first, multiplies there,
        and raises the result back by <code>1.0 / gamma</code> on the way out.
      </p>

      <SplitFigure />

      <p>
        Call that amount of light <em>k</em>, and the base colour{' '}
        <em>c</em>. The left half writes <code>c · k</code>. The right half
        writes <code>(c^γ · k)^(1/γ)</code>, and because a power distributes over
        a product that is exactly <code>c · k^(1/γ)</code>. The colour comes back
        untouched by the round trip; the entire difference between the two halves
        is <em>k</em> against <em>k</em> raised to 1/γ.
      </p>
      <p>
        With the lab&rsquo;s defaults the two are stark. The base colour&rsquo;s
        red channel is 0.82, ambient is 0.05, intensity is 1. Where the surface
        turns away from the light, k is 0.05: the left half writes 0.041 and the
        right half writes 0.210, five times as much. At the point facing the
        light squarely, k is 1.05 and they write 0.861 and 0.838 — within three
        per cent of each other. The error is negligible in the highlight and
        enormous in the shadow, which is why the uncorrected sphere reads as a
        high-contrast lighting choice rather than as a broken one.
      </p>

      <ProseHeading id="intensity">Turn the light up and the error changes sign</ProseHeading>
      <p>
        Gamma is greater than one, so 1/γ is less than one, and raising a
        positive number to a power below one pulls it towards 1. Below k = 1 that
        means k^(1/γ) is larger than k and the corrected half is the brighter of
        the two. Above k = 1 the inequality reverses. At k = 1 exactly, both
        halves compute c and the divider has nothing to show.
      </p>
      <p>
        k is <code>ambient + intensity × lambert</code>, so the two halves agree
        wherever lambert equals (1 − ambient) / intensity. At the default ambient
        of 0.05 and intensity of 1 that is lambert 0.95, a small cap sitting on
        the highlight. Raise the intensity and the cap opens out into a ring that
        sweeps across the sphere.
      </p>

      <IntensityFigure />

      <p>
        This is why the mistake outlives code review. It is not a constant offset
        that somebody would flag as too dark; it is the wrong curve applied on
        the wrong side of the encoding, so it crushes the shadows and blows the
        highlights at once, and both of those are things a person can deliberately
        want. Doubling <code>uIntensity</code> only means doubling the light in
        the space where light adds, and the left half is not in it.
      </p>

      <ProseHeading id="control">Set gamma to 1 and the two halves become the same shader</ProseHeading>
      <p>
        The claim so far is that the encoding is the only difference between the
        halves, and that is worth testing rather than believing.{' '}
        <code>toLinear(c, 1.0)</code> is <code>pow(c, 1.0)</code>, which is c;
        so is <code>toSrgb(c, 1.0)</code>. At gamma 1 the corrected branch
        decodes with an identity, multiplies, and encodes with an identity — it
        is the uncorrected branch with three more instructions in it.
      </p>

      <GammaFigure />

      <p>
        In a real renderer nobody writes those powers by hand at each multiply.
        A texture authored in sRGB is decoded once, when it is sampled, which is
        what an sRGB texture format is for and what the sampler hardware does at
        no cost. Lighting, blending and accumulation all happen in{' '}
        <Term name="Linear colour">linear space</Term> after that. The encode
        happens once, at the very end, when everything has been added up.
      </p>
      <p>
        Which textures get that decode is a decision, not a default. A base
        colour map and an emissive map were authored by someone looking at a
        screen, so they hold encoded colour and have to be decoded. A normal map
        holds vectors, and a roughness, metalness or occlusion map holds a
        coefficient; none of those are colours, none of them went through an
        encoder, and raising them to the power 2.2 bends the numbers into
        nonsense — a normal-map texel of 0.5, which stands for a component of
        zero, comes back as 0.218 and stands for −0.56 instead. Marking a whole
        texture set sRGB because most of it looks like an image is a second
        version of the same mistake, running in the opposite direction.
      </p>
      <p>
        Encoding before the end costs you a second bug on top of the first.
        Encode before you interpolate and the interpolation is wrong too, which
        is exactly what Gouraud shading would do — so in{' '}
        <a href="/labs/shading#models">Light &amp; Normals</a> the vertex stage
        returns linear light, the <Term name="Varying">varying</Term> carries
        linear light, and the fragment stage raises it by 1/2.2 at the last
        possible moment. That lab, and every other one on this site, was written
        the wrong way round first; this is the lab that corrected them.
      </p>

      <ProseHeading id="mistake">
        What I got wrong here: every shader multiplied sRGB
      </ProseHeading>
      <p>
        The shared lit shader behind four of these labs, and both of the shading
        lab&rsquo;s own stages, took the base colour exactly as it was written,
        multiplied it by the light term and wrote the result straight to the
        framebuffer. The belief underneath is the one this lab exists to take
        apart: that a colour is a quantity, so scaling the number scales the
        colour. Nobody decided to skip the decode. The arithmetic looked like
        arithmetic.
      </p>
      <p>
        The symptom was that every scene on the site came out slightly moody.
        Midtones sat darker than they should and terminators arrived as edges
        rather than roll-offs — the two effects the left half of the sphere above
        still shows on purpose. Both are things a person can deliberately want,
        so nothing on screen read as a fault and nothing threw. The arithmetic is
        valid; it was on the wrong quantity.
      </p>
      <p>
        What caught it was building this lab. Two branches on one sphere a pixel
        apart, under the same light and the same Lambert term, left the
        difference nowhere to hide — and once the split sphere existed it was
        plain which side of it every other lab was rendering on. The grey test
        settled the rest: the number 0.5 and half the light are visibly different
        tones, and every shader here had been treating them as one.
      </p>
      <p>
        The correction shipped with the lab, in{' '}
        <a
          href={`${REPO_URL}/commit/de15cad`}
          target="_blank"
          rel="noreferrer noopener"
        >
          commit de15cad
        </a>
        : decode, multiply in light, encode on the way out — in the shared
        shader and in both of the shading lab&rsquo;s stages, where for Gouraud
        the encode had to move after the interpolation rather than before it.
        What holds it now is the check{' '}
        <code>moving a control changes the picture</code> in{' '}
        <code>test/render.smoke.ts</code>, which drives this lab&rsquo;s gamma
        slider to 1 in a real browser and measures the canvas against its own
        noise floor. At gamma 1 the two branches compute the same expression, so
        if the decode and the encode ever leave this lab&rsquo;s fragment shader
        the slider stops changing anything and the check fails.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Below is the instrument, carrying every control the figures above were
        pinning down: the divider, the exponent, the intensity and ambient terms
        of the light, a toggle that corrects both halves so the divider
        disappears, the grey test, and a camera you can drag. The readout keeps
        the two numbers the whole lab rests on — what the number 0.5 is worth in
        light, and what half the light is worth as a number — recomputed at
        whatever gamma you have left the slider on.
      </p>
    </Prose>
  );
}
