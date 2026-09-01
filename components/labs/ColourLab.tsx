'use client';

import { useCallback, useMemo } from 'react';

import {
  ControlGroup,
  Presets,
  ResetButton,
  Slider,
  Toggle,
  type Preset,
} from '@/components/lab/Controls';
import { CopyLink } from '@/components/lab/CopyLink';
import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { useLabState } from '@/components/lab/useLabState';
import { useTheme } from '@/components/site/ThemeProvider';
import { bindAttribute, createBuffer, createIndexBuffer, createProgram } from '@/lib/gl/program';
import { uvSphere } from '@/lib/gl/sphere';
import { lookAt, multiply, perspective } from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';

/**
 * The lab that corrects the other labs.
 *
 * Every shader on this site — including the shared lit one — did its arithmetic
 * on sRGB-encoded numbers and wrote the result straight to the framebuffer. The
 * maths was right and the colour space was wrong, which is the single most
 * common bug in real renderers because nothing about it looks like an error.
 * It looks like a lighting choice.
 *
 * A slider splits the sphere down the middle: the same geometry, the same
 * light, the same Lambert term, decoded and encoded on one side and not on the
 * other. Nothing else differs.
 */

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vNormal = aNormal;
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  gl_Position = uViewProjection * world;
}
`;

const FRAGMENT = `
precision highp float;

varying vec3 vNormal;
varying vec3 vWorld;

uniform vec3 uBaseColor;
uniform vec3 uLightDir;
uniform float uIntensity;
uniform float uAmbient;
uniform float uSplit;      // where the divider sits, in clip x
uniform float uGamma;
uniform float uForceBoth;  // 1.0 = show the corrected pipeline everywhere

// sRGB is not a linear scale. It devotes more of its 256 steps to the dark end,
// because eyes do too — which is exactly why arithmetic on those numbers is
// not arithmetic on light.
vec3 toLinear(vec3 c, float gamma) {
  return pow(c, vec3(gamma));
}

vec3 toSrgb(vec3 c, float gamma) {
  return pow(c, vec3(1.0 / gamma));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);
  float lambert = max(dot(N, L), 0.0);

  bool corrected = uForceBoth > 0.5 || gl_FragCoord.x > uSplit;

  vec3 result;
  if (corrected) {
    // Decode the colour to light, do the physics there, encode back for the
    // display. The only order in which "twice as much light" means anything.
    vec3 base = toLinear(uBaseColor, uGamma);
    vec3 lit = base * (uAmbient + uIntensity * lambert);
    result = toSrgb(lit, uGamma);
  } else {
    // What every lab on this site used to do: multiply the encoded numbers and
    // hope. The midtones come out dark and the terminator hardens.
    result = uBaseColor * (uAmbient + uIntensity * lambert);
  }

  gl_FragColor = vec4(result, 1.0);
}
`;

/** A screen-space strip: the grey that is actually half as much light. */
const STRIP_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const STRIP_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float uGamma;
uniform vec2 uResolution;
uniform float uShowStrip;

void main() {
  if (uShowStrip < 0.5) discard;
  // Bottom fifth of the canvas only.
  if (vUv.y > 0.2) discard;

  float third = 1.0 / 3.0;

  // Left third: alternating black and white rows. Averaged by your eye (or by
  // squinting), this is physically 50% light — the honest reference.
  if (vUv.x < third) {
    float row = mod(floor(gl_FragCoord.y), 2.0);
    gl_FragColor = vec4(vec3(row), 1.0);
    return;
  }

  // Middle third: the number 0.5 written straight to the framebuffer. It looks
  // darker than the reference, because sRGB 0.5 is about 21% of the light.
  if (vUv.x < third * 2.0) {
    gl_FragColor = vec4(vec3(0.5), 1.0);
    return;
  }

  // Right third: 50% light, encoded properly. This is the one that matches.
  gl_FragColor = vec4(vec3(pow(0.5, 1.0 / uGamma)), 1.0);
}
`;

interface ColourControls {
  intensity: number;
  ambient: number;
  split: number;
  gamma: number;
  showStrip: boolean;
  bothCorrect: boolean;
}

const DEFAULTS: ColourControls = {
  intensity: 1,
  ambient: 0.05,
  split: 0.5,
  gamma: 2.2,
  showStrip: true,
  bothCorrect: false,
};

const PRESETS: Preset<ColourControls>[] = [
  {
    label: 'The bug, side by side',
    note: 'One sphere, one light, one Lambert term. Left multiplies the encoded numbers; right decodes to light, multiplies, and encodes back. The left is darker through the midtones and its terminator is a hard edge — that is the whole of the bug, and it looks like a lighting choice rather than an error.',
    values: { split: 0.5, intensity: 1, ambient: 0.05, bothCorrect: false, showStrip: false },
  },
  {
    label: 'Which grey is half?',
    note: 'The left strip is alternating black and white rows, so it is physically half the light. Step back from the screen. The middle patch is the number 0.5 — visibly darker. The right patch is half the light, correctly encoded, and it is the one that matches.',
    values: { showStrip: true, split: 0.5, intensity: 1 },
  },
  {
    label: 'Turn the light up',
    note: 'At high intensity the uncorrected side blows out to flat white while the corrected side still has shape in the highlight. Doubling a number is not doubling light unless you are in the space where light adds.',
    values: { intensity: 2.6, ambient: 0.02, split: 0.5, showStrip: false, bothCorrect: false },
  },
  {
    label: 'Gamma 1.0 — no encoding at all',
    note: 'With gamma at 1.0 the two halves become identical, because the correction is doing nothing. It is a useful sanity check: the divider should vanish completely.',
    values: { gamma: 1, split: 0.5, showStrip: false, bothCorrect: false },
  },
];

const SOURCE = [
  {
    label: 'The fragment shader, both paths',
    language: 'glsl' as const,
    source: FRAGMENT.trim(),
    note: 'Both branches compute the same Lambert term from the same normal and the same light. The only difference is which space the multiply happens in.',
  },
  {
    label: 'The grey strip',
    language: 'glsl' as const,
    source: STRIP_FRAGMENT.trim(),
    note: 'A one-pixel black/white dither is a physically exact 50% grey. Comparing it against 0.5 and against the correctly-encoded 50% is the shortest proof that the two are not the same colour.',
  },
];

interface Params extends ColourControls {
  palette: { clear: [number, number, number] };
  azimuth: number;
  elevation: number;
}

const createScene: SceneFactory<Params> = (gl) => {
  const program = createProgram(gl, VERTEX, FRAGMENT);
  const strip = createProgram(gl, STRIP_VERTEX, STRIP_FRAGMENT);

  // Smooth normals, deliberately: the difference between the two halves lives
  // in the terminator roll-off, and faceting would hide exactly that.
  const mesh = uvSphere(96, 56);
  const positions = createBuffer(gl, mesh.positions);
  const normals = createBuffer(gl, mesh.normals);
  const indices = createIndexBuffer(gl, mesh.indices);

  const quad = createBuffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));

  return {
    draw({ width, height, params }) {
      gl.viewport(0, 0, width, height);
      gl.clearColor(
        params.palette.clear[0],
        params.palette.clear[1],
        params.palette.clear[2],
        1,
      );
      gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const eye = orbitToCartesian(params.azimuth, params.elevation, 3.6);
      const viewProjection = multiply(
        perspective(Math.PI / 4, width / height, 0.1, 100),
        lookAt(eye, [0, 0, 0], [0, 1, 0]),
      );

      gl.useProgram(program.program);
      bindAttribute(gl, positions, program.attrib('aPosition'), 3);
      bindAttribute(gl, normals, program.attrib('aNormal'), 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);

      gl.uniformMatrix4fv(program.uniform('uModel'), false, new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]));
      gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);
      gl.uniform3f(program.uniform('uBaseColor'), 0.82, 0.34, 0.28);
      gl.uniform3f(program.uniform('uLightDir'), 0.5, 0.7, 0.6);
      gl.uniform1f(program.uniform('uIntensity'), params.intensity);
      gl.uniform1f(program.uniform('uAmbient'), params.ambient);
      gl.uniform1f(program.uniform('uSplit'), params.split * width);
      gl.uniform1f(program.uniform('uGamma'), params.gamma);
      gl.uniform1f(program.uniform('uForceBoth'), params.bothCorrect ? 1 : 0);

      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);

      // The strip sits in front of everything, so depth testing is off for it.
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(strip.program);
      bindAttribute(gl, quad, strip.attrib('aPosition'), 2);
      gl.uniform1f(strip.uniform('uGamma'), params.gamma);
      gl.uniform2f(strip.uniform('uResolution'), width, height);
      gl.uniform1f(strip.uniform('uShowStrip'), params.showStrip ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      program.dispose();
      strip.dispose();
      gl.deleteBuffer(positions);
      gl.deleteBuffer(normals);
      gl.deleteBuffer(indices);
      gl.deleteBuffer(quad);
    },
  };
};

export function ColourLab() {
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS, {
    gamma: (value) => value >= 1 && value <= 3,
    split: (value) => value >= 0 && value <= 1,
    intensity: (value) => value >= 0 && value <= 3,
    ambient: (value) => value >= 0 && value <= 0.5,
  });
  const { palette } = useTheme();

  const set = useCallback(
    <K extends keyof ColourControls>(key: K, value: ColourControls[K]) => {
      setControls((prev) => ({ ...prev, [key]: value }));
    },
    [setControls],
  );

  const params = useMemo<Params>(
    () => ({ ...controls, palette, azimuth: 0.6, elevation: 0.25 }),
    [controls, palette],
  );

  // The numbers behind the picture, so the readout is arithmetic rather than
  // an assertion that the two halves differ.
  const srgbHalfAsLight = Math.pow(0.5, controls.gamma);
  const halfLightAsSrgb = Math.pow(0.5, 1 / controls.gamma);

  return (
    <LabLayout
      readoutTitle="The numbers underneath"
      canvas={
        <div>
          <GLCanvas
            create={createScene}
            params={params}
            aspect={16 / 10}
            label="A lit sphere split down the middle, each half lit in a different colour space"
          />
          <p className="mt-2 font-mono text-2xs text-fg-faint">
            {controls.bothCorrect
              ? 'Both halves corrected — the divider should be invisible'
              : 'Left of the divider: lit in sRGB · Right: lit in linear, then encoded'}
          </p>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Start here">
            <Presets
              presets={PRESETS}
              onApply={(values) => setControls((prev) => ({ ...prev, ...values }))}
            />
          </ControlGroup>

          <ControlGroup
            title="The comparison"
            action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
          >
            <Slider
              label="divider"
              value={controls.split}
              min={0}
              max={1}
              onChange={(value) => set('split', value)}
            />
            <Slider
              label="gamma"
              value={controls.gamma}
              min={1}
              max={3}
              onChange={(value) => set('gamma', value)}
            />
            <Toggle
              label="Correct both halves"
              checked={controls.bothCorrect}
              onChange={(value) => set('bothCorrect', value)}
            />
            <Toggle
              label="Show the grey test"
              checked={controls.showStrip}
              onChange={(value) => set('showStrip', value)}
            />
          </ControlGroup>

          <ControlGroup title="The light">
            <Slider
              label="intensity"
              value={controls.intensity}
              min={0}
              max={3}
              onChange={(value) => set('intensity', value)}
            />
            <Slider
              label="ambient"
              value={controls.ambient}
              min={0}
              max={0.5}
              onChange={(value) => set('ambient', value)}
            />
          </ControlGroup>

          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="eyebrow mb-1.5">The number 0.5 is this much light</div>
              <div className="tabular font-mono text-lg text-amber">
                {(srgbHalfAsLight * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Half the light is this number</div>
              <div className="tabular font-mono text-lg text-axis-y">
                {halfLightAsSrgb.toFixed(3)}
              </div>
            </div>
          </div>
          <p className="max-w-prose text-xs leading-relaxed text-fg-faint">
            At gamma {controls.gamma.toFixed(2)}. Those two rows are the whole
            problem in one line: the midpoint of the numbers and the midpoint of
            the light are not the same place, so every multiply done on the
            former is a multiply done on the wrong quantity.
          </p>
        </div>
      }
      readoutCaption={
        <>
          Move the divider across the sphere. Both halves compute the identical
          Lambert term from the identical normal and the identical light — the
          only difference is whether the colour is decoded to light before the
          multiply and encoded back afterwards. The uncorrected half is darker
          through its midtones and its terminator is an abrupt edge rather than a
          roll-off, which is why gamma bugs get mistaken for artistic choices and
          shipped.
          <br />
          <br />
          This is a correction as much as a lesson.{' '}
          <span className="text-fg-muted">
            Every other lab on this site had it wrong
          </span>{' '}
          — the shared lit shader multiplied encoded values and wrote them
          straight out. That has been fixed, which is why the shading lab now
          looks slightly different from the screenshots in the earlier
          changelogs.
        </>
      }
      source={<LabSource samples={SOURCE} />}
    />
  );
}
