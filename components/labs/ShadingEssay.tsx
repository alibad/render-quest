'use client';

import { useState } from 'react';

import { Segmented, Slider, Toggle } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { GLCanvas } from '@/components/lab/GLCanvas';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { usePalette } from '@/components/site/ThemeProvider';
import { Matrix3, createScene, type ShadingParams } from '@/components/labs/ShadingLab';
import { normalMatrix, scaling, upperLeft3x3 } from '@/lib/math/mat4';

/**
 * The written half of lab 4.
 *
 * Every figure drives the lab's own `createScene`, so a figure and the
 * instrument at the foot of the page are the same renderer with a different
 * number of controls exposed. A figure that rendered differently from the thing
 * it introduces would be worse than no figure.
 */

/** A figure's scene, with everything the figure is not about held still. */
function figureParams(
  overrides: Partial<ShadingParams>,
  palette: ShadingParams['palette'],
): ShadingParams {
  return {
    model: 'phong',
    lightAzimuth: 0.9,
    lightElevation: 0.6,
    ambient: 0.12,
    diffuse: 0.8,
    specular: 0.5,
    shininess: 32,
    stretch: 1,
    correctNormals: true,
    showNormals: false,
    azimuth: 0.5,
    elevation: 0.25,
    palette,
    ...overrides,
  };
}

function LambertFigure() {
  const palette = usePalette();
  const [lightAzimuth, setLightAzimuth] = useState(0.9);
  const params = figureParams(
    { lightAzimuth, lightElevation: 0.35, ambient: 0, specular: 0, diffuse: 1 },
    palette,
  );

  return (
    <Figure
      control={
        <Slider
          label="where the light is"
          value={lightAzimuth}
          min={-3.14}
          max={3.14}
          precision={2}
          onChange={setLightAzimuth}
        />
      }
      caption={
        <>
          Ambient and specular are at zero, so this is the cosine and nothing
          else. While the light is on your side of the sphere the brightest point
          sits at the foot of the amber stub — the one spot whose normal aims
          straight at the light — and everything else falls away from it. Carry
          the light round behind and the lit part shrinks to a crescent along the
          silhouette, while everything the light has turned away from goes
          exactly black: the clamp has taken the cosine to zero and there is no
          other term in the sum.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A sphere lit by the diffuse term alone, with the light direction sweeping around it"
      />
    </Figure>
  );
}

function SpecularFigure() {
  const palette = usePalette();
  const [shininess, setShininess] = useState(8);
  const params = figureParams(
    { shininess, specular: 1, diffuse: 0.6, ambient: 0.08 },
    palette,
  );

  return (
    <Figure
      control={
        <Slider
          label="shininess"
          value={shininess}
          min={1}
          max={160}
          step={1}
          precision={0}
          onChange={setShininess}
        />
      }
      caption={
        <>
          The light has not moved and neither have you; one exponent changed. At
          the bottom of the range the specular term washes over the whole lit
          hemisphere, which reads as a chalky surface. At the top it has
          collapsed into a small bright disc, which reads as a polished one. The
          highlight is white at every setting because the term is added to the
          shaded colour rather than multiplied into it.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A lit sphere whose specular exponent tightens the highlight from a wash to a disc"
      />
    </Figure>
  );
}

function ModelFigure() {
  const palette = usePalette();
  const [model, setModel] = useState<ShadingParams['model']>('gouraud');
  const params = figureParams(
    { model, specular: 1.1, shininess: 120, diffuse: 0.7, ambient: 0.08 },
    palette,
  );

  return (
    <Figure
      control={
        <Segmented
          label="where the lighting runs"
          value={model}
          options={[
            { value: 'flat', label: 'Flat' },
            { value: 'gouraud', label: 'Gouraud' },
            { value: 'phong', label: 'Phong' },
          ]}
          onChange={setModel}
        />
      }
      caption={
        <>
          Gouraud and Phong here are the same mesh, the same light and the same
          equation. What changes is the shape of the highlight: Gouraud draws it
          as a small polygon blended from the values at three corners, dimmer in
          the middle of a triangle than the equation says by as much as 0.19 of
          the specular term; Phong draws the same spot round. Flat swaps in a coarser mesh with one
          normal per triangle, so the highlight becomes whichever facets happen
          to face the halfway vector.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A sphere with a tight specular highlight, shaded flat, per vertex or per fragment"
      />
    </Figure>
  );
}

function StretchFigure() {
  const palette = usePalette();
  const [stretch, setStretch] = useState(1);
  const params = figureParams(
    { stretch, showNormals: true, specular: 0.35, elevation: 0.32 },
    palette,
  );

  return (
    <Figure
      control={
        <Slider
          label="stretch y"
          tone="y"
          value={stretch}
          min={0.25}
          max={2.2}
          onChange={setStretch}
        />
      }
      caption={
        <>
          The green hairs are the mesh&rsquo;s own vertex normals drawn as line
          segments, and they are pushed through the model matrix like any other
          geometry — which is what makes them wrong. Squash the sphere and they
          squash with it, leaning towards the equator, while the surface they
          stand on has become shallower and needs them leaning further up; take
          the slider above 1 and they lean wrongly the other way. Only at 1 do
          they stand perpendicular to the surface everywhere. The shading in this figure is not
          using them.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A sphere being stretched along y with its vertex normals drawn as green hairs"
      />
    </Figure>
  );
}

const SQUASHED = scaling(1, 0.4, 1);

function NormalMatrixFigure() {
  const palette = usePalette();
  const [correctNormals, setCorrectNormals] = useState(false);
  const params = figureParams(
    { stretch: 0.4, correctNormals, specular: 0.9, shininess: 48, elevation: 0.32 },
    palette,
  );
  const normals = correctNormals ? normalMatrix(SQUASHED) : upperLeft3x3(SQUASHED);

  return (
    <Figure
      control={
        <Toggle
          label="Inverse-transpose"
          checked={correctNormals}
          onChange={setCorrectNormals}
        />
      }
      readout={
        <div>
          <p className="eyebrow mb-2">The matrix the normals go through</p>
          <Matrix3 values={normals} />
        </div>
      }
      caption={
        <>
          The sphere is drawn at 0.4 of its height in both states, and the
          geometry never moves. With the toggle off the middle entry of the matrix
          beside it reads 0.40 — the model matrix, used directly. Turn it on and
          that entry reads 2.50, and the highlight drops by more than a third of
          the sphere&rsquo;s height on screen. One of those two pictures
          is of a squashed sphere; the other is of a tall one that is not there.
        </>
      }
    >
      <GLCanvas
        create={createScene}
        params={params}
        aspect={16 / 9}
        label="A squashed sphere lit with the inverse-transpose normal matrix and without it"
      />
    </Figure>
  );
}

export function ShadingEssay() {
  return (
    <Prose>
      <p>
        Nothing in this lab simulates light. No ray leaves the lamp and no photon
        arrives at the eye. There is an equation, evaluated somewhere on a
        surface, that takes three directions — the surface normal{' '}
        <code>N</code>, the direction to the light <code>L</code>, and the
        direction to the eye <code>V</code> — and returns a colour. The three
        terms it adds together are the whole of the shading in every picture
        below.
      </p>
      <p>
        The arguments worth having are about the inputs rather than the sum.
        Where the equation is evaluated decides what a curved surface looks like,
        and how the normal was transformed on its way in decides whether the
        answer describes the surface at all.
      </p>

      <ProseHeading id="lambert">Diffuse brightness is a cosine</ProseHeading>
      <p>
        The diffuse term is one line of the shader:{' '}
        <code>float lambert = max(dot(N, L), 0.0);</code>. Both vectors are unit
        length, so their dot product is the cosine of the angle between them. A
        patch of surface facing the light square on gets 1. Tipped sixty degrees
        away it gets exactly a half. Past ninety degrees the cosine turns
        negative, which would have the light subtracting brightness from a
        surface it cannot reach; the <code>max</code> is what stops that, and it
        is why the far side of the sphere is unlit rather than negatively lit.
      </p>

      <LambertFigure />

      <p>
        That black is what the ambient term exists to prevent. It is a constant —{' '}
        <code>uAmbient</code> defaults to 0.12 in the instrument below — added to
        the cosine before the base colour multiplies through, so the shadowed
        side comes out a dark version of the material rather than a grey one. It
        is not a model of anything. Light arriving off the floor and the walls is
        real, and a single constant is what stands in for it here — which is why
        raising it washes out the difference between the lit and unlit sides
        until the sphere stops reading as round.
      </p>
      <p>
        The light is a direction and not a place: <code>uLightDir</code> is
        normalised once and used unchanged at every point on the surface, so
        there is no distance to the lamp and no falloff — a sun rather than a
        bulb, and the sphere would receive the same light a mile away. What the
        cosine scales is an amount of light rather than a number to be written
        down: the shader decodes the base colour, multiplies there, and encodes
        the result on the way out, which is why halving the light does not halve
        the number that reaches the framebuffer. That round trip is the subject
        of <a href="/labs/colour">Colour &amp; Gamma</a>.
      </p>

      <ProseHeading id="specular">The highlight belongs to the eye</ProseHeading>
      <p>
        Nothing in the diffuse term mentions where you are standing. Orbit the
        camera in the instrument below and the diffuse shading does not move at
        all; it is painted onto the surface. The specular term is the opposite
        kind of thing, and it is two lines:{' '}
        <code>vec3 H = normalize(L + V);</code> and then{' '}
        <code>pow(max(dot(N, H), 0.0), uShininess)</code>.
      </p>
      <p>
        <code>H</code> is the halfway vector, the direction sitting exactly
        between the light and the eye. It is the normal a mirror would need in
        order to send this light into this eye, so the surface is brightest where
        its own normal matches <code>H</code> and falls off as it departs from
        it. Move the camera and <code>H</code> moves, and the highlight slides
        across the surface after it. The older formulation reflects{' '}
        <code>L</code> about <code>N</code> and compares the result against{' '}
        <code>V</code>; Blinn&rsquo;s halfway vector costs less and the lab uses
        it.
      </p>

      <SpecularFigure />

      <p>
        The exponent is a width control. At a shininess of 32 the term has
        already halved by the time the normal is twelve degrees away from the
        halfway vector; at 120 it takes six degrees to lose the same half. The
        term is added as <code>vec3(uSpecular * spec)</code> — white, outside the
        multiplication by the base colour — so the highlight carries the colour
        of the light rather than of the surface. That is right for plastic and
        wrong for gold. It is also gated on the diffuse term, <code>lambert &gt; 0.0</code>, so a
        face turned away from the light cannot glint at a camera it happens to be
        facing.
      </p>

      <ProseHeading id="models">The three models differ only in where the equation runs</ProseHeading>
      <p>
        Flat, Gouraud and Phong are not three lighting equations. They are one
        equation, and what differs is the stage of the pipeline it runs in and
        what the stage before it hands over.
      </p>
      <p>
        Gouraud runs the lighting in the vertex shader and passes the resulting
        colour along as a varying, so the hardware interpolates a colour across
        each triangle. The smooth sphere here carries 2,665 vertices, so the
        lighting runs 2,665 times a frame however large the sphere is on screen.
        Phong interpolates the normal instead and runs the lighting in the
        fragment shader, once per fragment the sphere covers — a cost that grows
        with the size of the sphere on screen and ignores the mesh entirely.
      </p>
      <p>
        Flat is not a third program in this lab. It is the per-fragment shader
        handed a different mesh: <code>flatShaded()</code> rebuilds the sphere so
        that all three corners of every triangle carry the same face normal, and
        interpolating three identical normals returns that normal. The faceted
        mesh is deliberately coarser as well — 952 triangles against the smooth
        one&rsquo;s 4,992 — because facets too small to see teach nothing.
      </p>

      <ModelFigure />

      <p>
        The exponent in that figure is 120, which puts the half-brightness point
        of the highlight about six degrees from its centre while the
        sphere&rsquo;s triangles are around five degrees across. A mesh this
        dense does not lose the highlight — some vertex nearly always lands close
        enough to catch it — but a straight line between three samples cannot
        reconstruct a cosine raised to the 120th, and what it draws instead has
        flat sides. Sweep the light in the instrument below with Gouraud
        selected and the peak of the highlight pulses as the bright spot is
        dragged from one vertex to the next: full strength when a vertex happens
        to sit under it, dimmer whenever it falls between three.
      </p>
      <p>
        This is a trade rather than a mistake. Gouraud moves the work from a
        stage with millions of invocations to one with thousands, and on a
        surface with no tight highlight it is indistinguishable from Phong at a
        fraction of the cost. Both models encode in the fragment stage: the
        Gouraud vertex shader passes linear light through the varying and the
        fragment shader raises it to 1/2.2 there, because interpolating encoded
        values would mix the samples in the wrong space and add a second error to
        the one being demonstrated.
      </p>

      <ProseHeading id="normals">A normal is not a position</ProseHeading>
      <p>
        The stretch slider does something that looks harmless: it builds{' '}
        <code>scaling(1, stretch, 1)</code> — a scale on the y axis and nothing
        more — and multiplies the vertex positions by it. Positions come out
        where they belong. Push the normals through the same matrix and the
        lighting stops describing the surface it is lighting.
      </p>

      <StretchFigure />

      <p>
        A normal is not a little arrow attached to the surface. It is the
        direction perpendicular to the surface, and perpendicularity is a
        relationship that a non-uniform scale does not preserve. Flatten a sphere
        and its surface becomes shallower, so the normals must tilt further
        towards vertical; scaling them the way the geometry was scaled tilts them
        the opposite way. The transform that preserves the relationship is the
        inverse-transpose of the model matrix.
      </p>
      <p>
        For a diagonal matrix that is short enough to check by eye. The inverse
        of <code>diag(1, s, 1)</code> is <code>diag(1, 1/s, 1)</code>, and a
        diagonal matrix is its own transpose, so the normal&rsquo;s y component
        is divided by the scale where the position&rsquo;s was multiplied by it.
        Draw the sphere at 0.4 of its height and the correct normal matrix
        carries 2.5.
      </p>

      <NormalMatrixFigure />

      <p>
        The wrong picture is not noise. Feeding the normals through{' '}
        <code>diag(1, 0.4, 1)</code> gives exactly the normal field of a sphere
        stretched to two and a half times its height, because 0.4 is what the
        inverse-transpose of that stretch produces. The flattened sphere is
        therefore lit correctly — as the tall ellipsoid it is not. That is the
        signature of this bug in a real scene: nothing looks broken, and the
        object is confidently lit as something it is not.
      </p>
      <p>
        Two facts explain why it survives so long in codebases. Under a uniform
        scale the inverse-transpose is the model matrix divided by the scale
        squared, and <code>normalize()</code> in the shader deletes that factor,
        so both matrices produce identical shading. For a pure rotation the
        inverse is the transpose, so the inverse-transpose is the rotation
        itself. The mistake is invisible through every rotation and every uniform
        scale in the project, and shows up on the day somebody squashes one axis
        of one model — which is the bug{' '}
        <a href="/labs/transform">The Model Matrix</a> said was waiting here.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Every figure above holds everything still but one control. Below is the
        instrument with nothing held back: the three models, a light you can move
        around the sphere, the four constants of the equation, the stretch and
        the toggle that breaks it. The equation is printed beside the canvas with
        your own values in it, and the 3&times;3 underneath is whichever matrix
        the normals are going through. The presets are the shortest way in: one
        of them is this lab&rsquo;s bug, already switched on.
      </p>
    </Prose>
  );
}
