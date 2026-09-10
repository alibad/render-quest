'use client';

import { Segmented, Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';
import { usePalette } from '@/components/site/ThemeProvider';
import { createScene, DEFAULTS, type TextureParams } from '@/components/labs/TextureLab';
import type { MagFilter, MinFilter } from '@/lib/gl/texture';
import { degToRad } from '@/lib/math/mat4';
import { REPO_URL } from '@/lib/site';

/**
 * The written half of lab 5.
 *
 * Every figure drives the lab's own `createScene`, so the plane in a figure is
 * the plane in the instrument at the foot of the page — same quad, same 256²
 * test texture, same sampler. A figure that rendered differently from the thing
 * it introduces would be worse than no figure.
 */

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(
  overrides: Partial<TextureParams>,
  palette: TextureParams['palette'],
): TextureParams {
  return {
    // The lab's own default viewpoint: down the plane from just above it.
    azimuth: 0,
    elevation: 0.07,
    wrapS: 'repeat',
    wrapT: 'repeat',
    minFilter: 'linear-mip-linear',
    magFilter: 'linear',
    repeat: 6,
    offset: 0,
    palette,
    ...overrides,
  };
}

function FootprintFigure() {
  const palette = usePalette();
  // Four tiles, not the one this used to open at.
  //
  // The caption's subject is the boundary where the checker stops resolving,
  // so the boundary has to start somewhere it can walk both ways. Taking it as
  // the point where the footprint passes 16 texels — half the 32-texel checker
  // cell, past which the checker cannot be represented — and measuring this
  // camera against an 800x450 canvas: at one tile the boundary sits 45% of the
  // way down the visible plane with the slider already at its stop; at four it
  // sits at 19%, and the nearest ground is still 1.31 texels per pixel, so
  // there is crisp checker in front of the break to compare it against; at 24
  // it has reached 3%. All three are on the same slider from here.
  const [state, setState] = useFigureState(
    'tile-count',
    { repeat: 4 },
    // The slider's own range. Without the guard a URL can put the scene
    // somewhere the control cannot describe: ?tile-count.repeat=400 draws four
    // hundred tiles with the thumb stuck against the right-hand stop.
    { repeat: (value) => value >= 1 && value <= 24 },
  );
  // Nearest on both filters: no averaging anywhere, so what you see is the raw
  // relationship between the pixel grid and the texel grid.
  const params = figureParams(
    { repeat: state.repeat, minFilter: 'nearest', magFilter: 'nearest' },
    palette,
  );

  return (
    <Figure
      id="tile-count"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="tiles across"
          value={state.repeat}
          min={1}
          max={24}
          step={0.5}
          precision={1}
          onChange={(repeat) => setState({ repeat })}
        />
      }
      caption={
        <>
          Even at one tile the far edge is already breaking up — the plane is
          sixty units deep and nearly edge-on, so a pixel back there swallows
          more than one checker square whatever you do. Raise the count and the
          boundary where the checker stops resolving walks steadily towards you.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A tiled ground plane sampled with no filtering, tiling from one repeat to twenty-four"
      />
    </Figure>
  );
}

const MAGNIFICATION_OPTIONS: { value: MagFilter; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'linear', label: 'Linear' },
];

function MagnificationFigure() {
  const palette = usePalette();
  // Nearest, because that is the state the caption describes first and the one
  // with something to look at: hard texel edges in the foreground.
  const [state, setState] = useFigureState(
    'magnification-filter',
    { magFilter: 'nearest' as MagFilter },
    // A URL is user input, and an unrecognised filter name would reach
    // texParameteri as undefined — a GL error and a blank plane.
    { magFilter: (value) => MAGNIFICATION_OPTIONS.some((o) => o.value === value) },
  );
  // One tile, camera lifted: the near ground is magnified hard, the far ground
  // is still minified, and only one of the two responds to this control.
  //
  // Do not raise the elevation to the lab preset's 0.9 to make the effect
  // bigger. Measured against this camera on an 800x450 canvas, elevation 0.25
  // puts the nearest visible ground at 0.10 texels per pixel — one texel about
  // ten pixels across, magnified hard — and the far edge at 1.4, minified, so
  // the caption's last sentence holds. At 0.9 the far edge is 0.4 texels per
  // pixel: magnified too, and that sentence becomes false.
  const params = figureParams(
    { magFilter: state.magFilter, repeat: 1, elevation: 0.25 },
    palette,
  );

  return (
    <Figure
      id="magnification-filter"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Segmented
          label="magnification filter"
          value={state.magFilter}
          options={MAGNIFICATION_OPTIONS}
          onChange={(magFilter) => setState({ magFilter })}
        />
      }
      caption={
        <>
          In the foreground each texel is a few pixels across. Nearest hands back
          the one texel the pixel centre landed in, so the boundary between two
          checker squares stays a hard edge and the grey lines stay blocky;
          linear mixes the four nearest and the same boundary becomes a ramp
          about a texel wide. The far end of the plane is identical under both
          settings, pixel for pixel — it is being minified up there, and the
          magnification filter has no vote.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A single texture tile on a ground plane, magnified in the foreground, switching between nearest and linear filtering"
      />
    </Figure>
  );
}

const MINIFICATION_OPTIONS: { value: MinFilter; label: string }[] = [
  { value: 'nearest', label: 'Near' },
  { value: 'linear', label: 'Linear' },
  { value: 'linear-mip-linear', label: 'Tri' },
];

function MipmapFigure() {
  const palette = usePalette();
  // Near, because that is where the phenomenon is. At 16 tiles the footprint
  // runs from 5.25 texels per pixel at the nearest visible ground to about a
  // thousand at the far edge (800x450 canvas), so without a mip chain the
  // plane is undersampled from the front row back and the reader arrives at
  // the aliasing rather than having to produce it. Tri takes it away.
  const [state, setState] = useFigureState(
    'minification-filter',
    { minFilter: 'nearest' as MinFilter },
    // Only the three this figure offers: a filter the segmented control cannot
    // show would leave every option unselected.
    { minFilter: (value) => MINIFICATION_OPTIONS.some((o) => o.value === value) },
  );
  const params = figureParams(
    { minFilter: state.minFilter, repeat: 16, magFilter: 'linear' },
    palette,
  );

  return (
    <Figure
      id="minification-filter"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Segmented
          label="minification filter"
          value={state.minFilter}
          options={MINIFICATION_OPTIONS}
          onChange={(minFilter) => setState({ minFilter })}
        />
      }
      caption={
        <>
          Nearest and linear look almost the same, and that is the lesson: both
          read level 0 and nothing else, so both answer with one small sample of
          the several hundred texels under the pixel. Bilinear filtering is not a
          fix for minification. Trilinear reads the chain, and most of the plane
          goes quiet.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A heavily tiled ground plane compared under nearest, bilinear and trilinear minification"
      />
    </Figure>
  );
}

const HANDOVER_OPTIONS: { value: MinFilter; label: string }[] = [
  { value: 'nearest-mip-nearest', label: 'N·mip N' },
  { value: 'linear-mip-nearest', label: 'L·mip N' },
  { value: 'linear-mip-linear', label: 'Tri' },
];

function MipLevelFigure() {
  const palette = usePalette();
  // N·mip N is the only one of the three that shows the hard handover the
  // caption sends the reader to look for; the other two are what removes it.
  const [state, setState] = useFigureState(
    'mip-handover',
    { minFilter: 'nearest-mip-nearest' as MinFilter },
    { minFilter: (value) => HANDOVER_OPTIONS.some((o) => o.value === value) },
  );
  const params = figureParams(
    { minFilter: state.minFilter, repeat: 16, magFilter: 'linear' },
    palette,
  );

  return (
    <Figure
      id="mip-handover"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Segmented
          label="within a level · between levels"
          value={state.minFilter}
          options={HANDOVER_OPTIONS}
          onChange={(minFilter) => setState({ minFilter })}
        />
      }
      caption={
        <>
          All three read the chain; what differs is what happens where one level
          hands over to the next. Under <code>N·mip N</code> the handover is a
          hard horizontal boundary partway down the plane, with the ground
          visibly coarser above it than below. Filtering inside the level softens
          that boundary without moving it. Trilinear blends the two levels either
          side of it and there is no boundary left to find.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A tiled ground plane showing the visible bands where one mip level hands over to the next"
      />
    </Figure>
  );
}

function AngleFigure() {
  const palette = usePalette();
  // 24°, a little over half the 2–43° range, because the caption starts from
  // above — "the ground holds its detail nearly to the far edge" — and then
  // asks the reader to drop the camera. At the 6° this used to open at, it did
  // not: measured on an 800x450 canvas the footprint is already 2.06 texels
  // per pixel at the nearest visible ground and 411 at the far edge, so the
  // reader arrived at the soft picture with four degrees of slider left to
  // produce it in. At 24° the near ground is back to 1.14 texels, detail
  // survives to 43% up the visible plane rather than 34%, the far edge is 120
  // texels rather than 411, and the drop the caption describes is 22° of
  // travel away.
  const [state, setState] = useFigureState(
    'grazing-angle',
    { degrees: 24 },
    // The slider's own range. Its top, 43°, is the lab's own drag clamp of
    // 0.75 radians, so no link can put this figure's camera anywhere the
    // instrument at the foot of the page would refuse to go.
    { degrees: (value) => value >= 2 && value <= 43 },
  );
  // Elevation is the lab's own orbit control, in degrees so the readout means
  // something. The lab clamps the camera between about 1° and 43°.
  const params = figureParams(
    { elevation: degToRad(state.degrees), repeat: 8 },
    palette,
  );

  return (
    <Figure
      id="grazing-angle"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="camera above the plane"
          value={state.degrees}
          min={2}
          max={43}
          step={1}
          precision={0}
          unit="°"
          onChange={(degrees) => setState({ degrees })}
        />
      }
      caption={
        <>
          From above, the ground holds its detail nearly to the far edge. Drop
          the camera towards the plane and the same ground goes soft long before
          it gets there. Nothing about the texture or the filter changed — the
          footprint became a sliver, and a level coarse enough for its long side
          is far too coarse for its short one.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A trilinear-filtered ground plane seen from a steep angle down to a grazing one"
      />
    </Figure>
  );
}

function WrapFigure() {
  const palette = usePalette();
  // 0.70, not the 0.50 the caption names as the exact fit. The shader builds
  // u as x/28 + offset and x runs −14…14, so at 0.50 u is exactly 0…1: nothing
  // across the width of the plane is outside the range, and the smear this
  // figure exists to show does not exist yet. At 0.70 u runs 0.2…1.2, so the
  // right fifth of the plane is edge texel — the cyan stripe — with four
  // fifths of unsmeared tile beside it to compare against. The exact fit is a
  // short drag down rather than the state the reader is stranded in.
  const [state, setState] = useFigureState(
    'clamp-smear',
    { offset: 0.7 },
    { offset: (value) => value >= 0.3 && value <= 1 },
  );
  const params = figureParams(
    { offset: state.offset, wrapS: 'clamp', wrapT: 'clamp', repeat: 1, elevation: 0.3 },
    palette,
  );

  return (
    <Figure
      id="clamp-smear"
      state={{ defaults: DEFAULTS, current: params }}
      control={
        <Slider
          label="shift the coordinates"
          value={state.offset}
          // Narrower than the instrument's −1…1: past about 0.3 in either
          // direction the whole plane is clamped edge texel and there is
          // nothing left to compare the smear against.
          min={0.3}
          max={1}
          onChange={(offset) => setState({ offset })}
        />
      }
      caption={
        <>
          At an offset of 0.50 the single tile fits the width of the plane
          exactly. Move it either way and the image slides off one side, and
          everything it vacates is filled by the last row of texels it left
          behind — here the cyan border, stretched into a stripe that runs to the
          horizon.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A single clamped texture tile shifted across a ground plane, with the edge texels smearing outside the zero-to-one range"
      />
    </Figure>
  );
}

export function TexturesEssay() {
  return (
    <Prose>
      <p>
        One image covers the plane below, and by the far end of it the image has
        stopped surviving the trip. The checker breaks into rings; the fine grey
        lines disappear and reappear somewhere they are not; move the camera and
        the whole distance crawls. Nothing is wrong with the image and nothing is
        wrong with the plane. What is wrong is the fit between them — a pixel on
        screen and a <Term name="Texel">texel</Term> in the image are not the
        same size, are almost never
        the same shape, and change their ratio from one end of a triangle to the
        other.
      </p>
      <p>
        The plane is a single quad, 28 units across and 61 deep, running away
        from the camera until it is nearly edge-on, and one 256-by-256 image
        covers all of it. Turn the tile count down and a texel in the foreground
        is several pixels wide; near the far edge, one pixel covers a strip of
        ground tens of texels across and hundreds deep. Every control in this lab
        is an answer to the question that gap asks.
      </p>

      <ProseHeading id="footprint">
        A pixel covers a different number of texels everywhere you look
      </ProseHeading>
      <p>
        The shader knows none of this. It builds a{' '}
        <Term name="UV coordinates">UV</Term> from the vertex position —{' '}
        <code>vUv = aPosition * uRepeat + uOffset</code> — and reads the texture
        at it, and that is the whole of the texturing code. What varies across
        the image is not the coordinate but its rate of change: how far the UV
        moves when you step one pixel to the right. The hardware measures that by
        differencing the value between neighbouring pixels, and every decision
        below is made from the result.
      </p>

      <FootprintFigure />

      <p>
        The fine grey lines in this texture are one texel wide and repeat every
        eight; they are there to fail first. A pattern with a period of eight
        texels needs a sample at least every four to survive, so the moment a
        pixel covers more than that the lines cannot be represented at all — and
        a sampler with no <Term name="Mipmap">mip chain</Term> answers anyway,
        with whichever single texel it happened to land on. The rings and bands in the distance are that: the
        texel grid beating against the pixel grid. Move the camera and the answer
        changes every frame; that is the shimmer, and the rest of this page is
        about removing it.
      </p>

      <ProseHeading id="magnification">
        Magnification and minification are two different failures
      </ProseHeading>
      <p>
        You set two <Term name="Filtering">filters</Term>, and at any given pixel
        exactly one of them runs. The
        hardware compares the footprint against a single texel: smaller, and the
        texture is being magnified; larger, and it is being minified. You do not
        get to make that call per pixel, and you would not want to — as the
        figure above shows, it changes down the length of one triangle.
      </p>

      <MagnificationFigure />

      <p>
        Nearest magnification is not a lower setting. It is the correct one
        whenever the texels <em>are</em> the artwork rather than samples of
        something continuous: pixel art, a glyph atlas at integer scale, a lookup
        table you are indexing rather than sampling. It is wrong for a
        photograph, where the texels stand in for a surface that had no squares
        in it.
      </p>
      <p>
        There are only two values here because OpenGL offers only two. When one
        texel covers many pixels there is no smaller version of the image that
        would help; mipmaps are only ever an answer to minification.
      </p>

      <ProseHeading id="mipmaps">A mipmap is the average taken in advance</ProseHeading>
      <p>
        The far end of the plane needs the average of a few hundred texels per
        pixel, and reading a few hundred texels per pixel is not something a GPU
        will do at frame rate. So the averages are computed once, ahead of time,
        at every scale that might be wanted: the image at 256, then 128, 64, 32
        and down to a single texel — nine levels for this texture, built by the
        one <code>generateMipmap</code> call that runs when the lab starts. A
        pixel whose footprint spans sixteen texels then reads level 4, on which
        every texel is already the average of a sixteen-by-sixteen block.
      </p>

      <MipmapFigure />

      <p>
        That costs memory, and the amount is fixed: each level is a quarter of
        the one above, so the chain adds exactly a third. 256 KiB of texture
        becomes 341. It is also, on almost any real scene, faster. A minifying
        sampler reading level 0 lands on texels scattered across the whole image
        and misses the texture cache on nearly every pixel; reading a level
        scaled to the footprint means neighbouring pixels read neighbouring
        texels. Mipmapping usually buys speed with the memory rather than
        spending both. The chain is built here whichever filter you pick, which
        is why the readout below says <em>1 used</em> rather than 1 when you turn
        mipmapping off — the memory has already gone.
      </p>
      <p>
        One thing it gets wrong. <code>generateMipmap</code> averages the bytes
        as they are stored, and for a colour texture those bytes are
        sRGB-encoded, which means they are not proportional to light. The light
        and dark squares of this checker are 232 and 44 in the red channel;
        averaged as stored they give 138, where averaging the light they stand
        for and re-encoding gives 173. Every level of the chain is therefore a
        little too dark. That is a small instance of the mistake{' '}
        <a href="/labs/colour#encoding">Colour &amp; Gamma</a> is built around.
      </p>
      <p>
        The five minification settings are not a scale from worse to better.
        Three of them name two independent decisions — how to filter{' '}
        <em>inside</em> a level, and how to move <em>between</em> levels.
      </p>

      <MipLevelFigure />

      <p>
        Trilinear is both halves set to linear: bilinear in each of the two
        levels bracketing the footprint, then blended between them, at eight
        texel reads to nearest&rsquo;s one. It is the usual default because the
        artefact it removes is the one you cannot stop noticing once you have
        seen it.
      </p>
      <p>
        OpenGL has a sixth combination this lab leaves out,{' '}
        <code>NEAREST_MIPMAP_LINEAR</code>, and it is the value every texture
        starts with. That is worth knowing for one reason: the default
        minification filter reads the mip chain, so a texture uploaded without
        one and never configured samples as black.
      </p>

      <ProseHeading id="angle">A shallow angle stretches the footprint</ProseHeading>
      <p>
        Everything above assumed the footprint is roughly square. It is square
        only when you are looking straight down at the surface. Tilt towards the
        horizon and it stretches along the viewing direction, until one pixel can
        cover ten texels across the plane and several hundred into it.
      </p>

      <AngleFigure />

      <p>
        The level has to be chosen from one number. Choose it for the short axis
        of the footprint and the long axis{' '}
        <Term name="Aliasing">aliases</Term>; choose it for the long axis,
        which is what the hardware does, and the short axis is blurred by exactly
        the footprint&rsquo;s aspect ratio. A road surface at a grazing angle is
        the standard case, and it looks like mud.
      </p>
      <p>
        Anisotropic filtering is the way out — several samples spread along the
        long axis, each taken from a finer level and averaged, up to sixteen taps
        for a sixteen-to-one footprint. In WebGL 1 it is an extension,{' '}
        <code>EXT_texture_filter_anisotropic</code>, and this lab does not enable
        it. What you are looking at is isotropic filtering doing the best it can.
      </p>

      <ProseHeading id="wrap">Wrap decides what is outside 0 to 1</ProseHeading>
      <p>
        The UVs here are not confined to 0 to 1 and were never going to be. They
        come straight from the vertex position, so at six tiles across, u runs
        from −3 to 3 and v from −12.9 to 0.2. The sampler needs an answer for all
        of it. <Term name="Wrap mode">Wrap</Term> is that answer, set separately
        per axis: S across the width
        of the plane, T along its length, running away from you.
      </p>

      <WrapFigure />

      <p>
        <code>CLAMP_TO_EDGE</code> is what you have been watching: outside the
        range, take the nearest edge texel and keep taking it. It is the right
        behaviour for an image meant to be used once — a photograph on a
        billboard, a gradient ramp — and it is why the cyan border smears instead
        of the picture starting over.
      </p>
      <p>
        <code>REPEAT</code> discards the whole-number part, so u = 3.4 and u = 0.4
        read the same texel and the tile begins again.{' '}
        <code>MIRRORED_REPEAT</code> flips alternate tiles, so every seam meets
        its own reflection: the way to tile an image whose left edge does not
        match its right, at no extra cost. This texture&rsquo;s borders match
        already — the same cyan on all four sides — so what you can actually see
        change when you switch to mirror is the amber L pointing the other way in
        every second tile.
      </p>
      <p>
        Repeat, mirrored repeat and the mip chain all need a power-of-two texture
        in WebGL 1. This one is 256 square for that reason. A 257-pixel image
        gets clamping, no mipmaps, and no explanation.
      </p>

      <ProseHeading id="mistake">
        What I got wrong here: a control that did nothing
      </ProseHeading>
      <p>
        This lab shipped with a magnification filter that was wired correctly and
        never once mattered. The belief behind it was that a control which reads
        the right value and calls the right{' '}
        <code>texParameteri</code> is a working control — that the wiring is the
        feature. The note beside it described what happens up close, from a lab
        that opens looking down a heavily tiled plane and offers no view that is
        up close: every state it offered by name tiled the plane further, so
        every texel on screen was smaller than a pixel and the sampler was
        minifying everywhere.
      </p>
      <p>
        The symptom was that flipping between Nearest and Linear changed nothing
        at all, and nothing is the one result a reader will not report. The
        difference this control makes is small where it makes one — a hard texel
        edge against a ramp a texel wide — so a reader who saw no change had an
        explanation ready: they were not looking closely enough, or this is a
        setting you take on faith. The page offered nothing to correct that with.
        A control with no work to do looked like a fine distinction.
      </p>
      <p>
        What caught it was measurement rather than reading. A sweep on 8
        September 2026 drove every control on every lab in a real browser and
        compared the canvas before and after: the magnification filter moved
        0.000 per cent of the picture, the only control on the site that moved
        none.
      </p>
      <p>
        The fix, in{' '}
        {/*
         * The sha is written out; the host is not. test/content.test.ts fails
         * any file under app, components, lib or scripts that restates a
         * lib/site.ts constant as a literal, and this link was caught by it.
         */}
        <a
          href={`${REPO_URL}/commit/e49a799`}
          target="_blank"
          rel="noreferrer noopener"
        >
          commit e49a799
        </a>
        , was not to the filter. It was a preset,{' '}
        <em>Close enough to magnify</em>, that puts one tile under a camera
        looking down at it, and a line in the panel that says{' '}
        <em>Nothing to see from here</em> whenever the view is not one where the
        control has anything to do. It is guarded by the check{' '}
        <code>moving a control changes the picture</code> in{' '}
        <code>test/render.smoke.ts</code>, which applies that preset, flips the
        filter and measures the canvas: 26.4 per cent of the picture moves,
        against a noise floor of zero. Remove the preset and the number goes back
        to nothing and the check fails.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Below is the whole sampler, every setting of it live at once: both
        filters, both wrap axes, the tile count, the coordinate offset, and a
        camera you can drag.
      </p>
      <p>
        Drag it. Every figure on this page is a still frame, and aliasing is
        mostly a motion artefact — standing still it is moiré, and the moment the
        camera moves the whole distance starts to boil. Set minification to Near,
        push the tile count up, orbit slowly, and then switch to Tri without
        touching anything else. The presets set states worth looking at and say
        what to look for once they land.
      </p>
    </Prose>
  );
}
