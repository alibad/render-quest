'use client';

import { useCallback, useMemo } from 'react';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { CopyLink } from '@/components/lab/CopyLink';
import { useLabState } from '@/components/lab/useLabState';
import {
  ControlGroup,
  Presets,
  ResetButton,
  Segmented,
  Slider,
  type Preset,
} from '@/components/lab/Controls';
import { AxisKey, LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { useTheme } from '@/components/site/ThemeProvider';
import { bindAttribute, createBuffer, createProgram } from '@/lib/gl/program';
import { beginFrame } from '@/lib/gl/scene';
import {
  MAG_FILTER_ENUM,
  MIN_FILTER_ENUM,
  USES_MIPMAPS,
  WRAP_ENUM,
  createTestTexture,
  type MagFilter,
  type MinFilter,
  type WrapMode,
} from '@/lib/gl/texture';
import {
  degToRad,
  lookAt,
  multiply,
  perspective,
  type Mat4,
} from '@/lib/math/mat4';
import type { CanvasPalette } from '@/lib/theme';
import { orbitToCartesian } from '@/lib/math/vec3';

/**
 * A ground plane running to the horizon is the classic minification test: the
 * same texture is magnified in the foreground and crushed into a few pixels at
 * the back, so one scene shows every sampler decision at once.
 */

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;

uniform mat4 uViewProjection;
uniform vec2 uRepeat;
uniform vec2 uOffset;

void main() {
  vUv = aPosition * uRepeat + uOffset;
  // The quad is built in the XZ plane and stretched far into -Z.
  gl_Position = uViewProjection * vec4(aPosition.x, 0.0, aPosition.y, 1.0);
}
`;

const FRAGMENT = `
precision mediump float;

varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uFog;

void main() {
  vec4 texel = texture2D(uTexture, vUv);
  gl_FragColor = vec4(texel.rgb, 1.0);
}
`;

export interface TextureParams {
  azimuth: number;
  elevation: number;
  wrapS: WrapMode;
  wrapT: WrapMode;
  minFilter: MinFilter;
  magFilter: MagFilter;
  repeat: number;
  offset: number;
  palette: CanvasPalette;
}

type TextureControls = Omit<TextureParams, 'palette'>;

const DEFAULTS: TextureControls = {
  // Reproduces the fixed viewpoint this lab used to have: looking down the
  // plane from just above it, which is where minification bites hardest.
  azimuth: 0,
  elevation: 0.07,
  wrapS: 'repeat',
  wrapT: 'repeat',
  minFilter: 'linear-mip-linear',
  magFilter: 'linear',
  repeat: 6,
  offset: 0,
};

export const createScene: SceneFactory<TextureParams> = (gl) => {
  const program = createProgram(gl, VERTEX, FRAGMENT);
  const texture = createTestTexture(gl);

  // A long strip in the XZ plane: near edge at z = +1, far edge at z = -60.
  const quad = createBuffer(
    gl,
    new Float32Array([
      -14, 1, 14, 1, -14, -60,
      -14, -60, 14, 1, 14, -60,
    ]),
  );

  const position = program.attrib('aPosition');

  return {
    draw({ width, height, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);

      // Orbit around the far end of the plane rather than a fixed eye. The
      // viewing angle is not decoration here: flattening it lengthens the
      // texture footprint of every pixel, which is exactly what minification
      // has to cope with — the shallower you look, the more the filters matter.
      const target: [number, number, number] = [0, 0.55, -6];
      const offset = orbitToCartesian(params.azimuth, params.elevation, 11.53);
      const eye: [number, number, number] = [
        target[0] + offset[0],
        target[1] + offset[1],
        target[2] + offset[2],
      ];
      const view = lookAt(eye, target, [0, 1, 0]);
      const projection = perspective(degToRad(55), width / height, 0.1, 200);
      const viewProjection: Mat4 = multiply(projection, view);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, WRAP_ENUM[params.wrapS]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, WRAP_ENUM[params.wrapT]);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        MIN_FILTER_ENUM[params.minFilter],
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        MAG_FILTER_ENUM[params.magFilter],
      );

      gl.useProgram(program.program);
      bindAttribute(gl, quad, position, 2);
      gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);
      // The plane spans 28 x 61 world units; dividing keeps "repeat" meaning
      // tiles-across rather than an arbitrary multiplier.
      gl.uniform2f(program.uniform('uRepeat'), params.repeat / 28, params.repeat / 28);
      gl.uniform2f(program.uniform('uOffset'), params.offset, params.offset);
      gl.uniform1i(program.uniform('uTexture'), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      program.dispose();
      gl.deleteBuffer(quad);
      gl.deleteTexture(texture);
    },
  };
};

const MIN_FILTER_NOTE: Record<MinFilter, string> = {
  nearest:
    'One texel, nearest to the sample point, no mip chain. The distance shimmers violently as you move — that is aliasing, and it is what mipmaps exist to fix.',
  linear:
    'Bilinear within the base level only. Smoother up close, but still no mip chain, so the far end still boils.',
  'nearest-mip-nearest':
    'Picks the nearest mip level, then the nearest texel in it. The aliasing is gone; look for the visible bands where one level hands over to the next.',
  'linear-mip-nearest':
    'Bilinear inside a single mip level. Clean within a band, but the seams between levels are still visible as you move.',
  'linear-mip-linear':
    'Trilinear: bilinear in the two nearest levels, then blended between them. No shimmer and no seams — the usual default, and the most expensive of the five.',
};

const MAG_FILTER_NOTE: Record<MagFilter, string> = {
  nearest:
    'Up close each texel is a hard square. Correct for pixel art, wrong for almost everything else.',
  linear: 'Bilinear blend between the four nearest texels — soft edges up close.',
};

const SOURCE = [
  { label: 'Vertex shader', language: 'glsl' as const, source: VERTEX.trim() },
  { label: 'Fragment shader', language: 'glsl' as const, source: FRAGMENT.trim() },
];

export function TextureLab() {
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS);
  const { palette } = useTheme();
  const params = useMemo<TextureParams>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  // Elevation is clamped well above zero: below the plane there is nothing to
  // see, and the lesson lives in the shallow angles just above it.
  const onDrag = useCallback((dx: number, dy: number) => {
    setControls((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.006,
      elevation: Math.max(0.02, Math.min(0.75, prev.elevation + dy * 0.004)),
    }));
  }, [setControls]);

  const set = useCallback(<K extends keyof TextureControls>(
    key: K,
    value: TextureControls[K],
  ) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  }, [setControls]);

  const usesMips = USES_MIPMAPS[controls.minFilter];

const PRESETS: Preset<TextureControls>[] = [
  {
    label: 'Watch it boil',
    note: 'Nearest, no mip chain, tiled hard. The distance shimmers as the camera holds still — that is aliasing, hundreds of texels fighting over one pixel.',
    values: { minFilter: 'nearest', magFilter: 'nearest', repeat: 16 },
  },
  {
    label: 'Mipmaps fix it',
    note: 'Same tiling, trilinear filtering. The shimmer is gone, because there is now always a mip level where one texel is about one pixel.',
    values: { minFilter: 'linear-mip-linear', magFilter: 'linear', repeat: 16 },
  },
  {
    label: 'Clamp smears',
    note: 'One tile, clamped, pushed off-centre. Outside 0…1 the edge texel repeats forever — that stripe is CLAMP_TO_EDGE doing exactly what it says.',
    values: { wrapS: 'clamp', wrapT: 'clamp', repeat: 1, offset: 0.45 },
  },
  {
    label: 'Mirror hides the seam',
    note: 'Mirrored repeat flips alternate tiles, so the borders meet themselves and the seam disappears. Watch the amber marker alternate direction.',
    values: { wrapS: 'mirror', wrapT: 'mirror', repeat: 4, offset: 0 },
  },
];

  return (
    <LabLayout
      readoutTitle="What the sampler is doing"
      canvas={
        <GLCanvas
          create={createScene}
          params={params}
          aspect={16 / 9}
          onDrag={onDrag}
          label="A textured ground plane running to the horizon, showing texture filtering and wrap modes"
          overlay={
            <AxisKey
              items={[
                { color: 'bg-amber', label: 'orientation marker' },
                { color: 'bg-accent', label: 'tile edge' },
              ]}
              hint={usesMips ? 'mipmaps on' : 'no mipmaps — watch the distance'}
            />
          }
        />
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
            title="Minification"
            action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
          >
            <Segmented
              value={controls.minFilter}
              options={[
                { value: 'nearest', label: 'Near' },
                { value: 'linear', label: 'Linear' },
                { value: 'linear-mip-linear', label: 'Tri' },
              ]}
              onChange={(v) => set('minFilter', v as MinFilter)}
            />
            <Segmented
              value={controls.minFilter}
              options={[
                { value: 'nearest-mip-nearest', label: 'N·mip N' },
                { value: 'linear-mip-nearest', label: 'L·mip N' },
              ]}
              onChange={(v) => set('minFilter', v as MinFilter)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              {MIN_FILTER_NOTE[controls.minFilter]}
            </p>
          </ControlGroup>

          <ControlGroup title="Magnification">
            <Segmented
              value={controls.magFilter}
              options={[
                { value: 'nearest', label: 'Nearest' },
                { value: 'linear', label: 'Linear' },
              ]}
              onChange={(v) => set('magFilter', v as MagFilter)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              {MAG_FILTER_NOTE[controls.magFilter]}
            </p>
          </ControlGroup>

          <ControlGroup title="Wrap">
            <Segmented
              label="across the plane (S)"
              value={controls.wrapS}
              options={[
                { value: 'repeat', label: 'Repeat' },
                { value: 'clamp', label: 'Clamp' },
                { value: 'mirror', label: 'Mirror' },
              ]}
              onChange={(v) => set('wrapS', v as WrapMode)}
            />
            <Segmented
              label="into the distance (T)"
              value={controls.wrapT}
              options={[
                { value: 'repeat', label: 'Repeat' },
                { value: 'clamp', label: 'Clamp' },
                { value: 'mirror', label: 'Mirror' },
              ]}
              onChange={(v) => set('wrapT', v as WrapMode)}
            />
          </ControlGroup>

          <ControlGroup title="Coordinates">
            <Slider
              label="tiles"
              value={controls.repeat}
              min={0.5}
              max={24}
              step={0.5}
              precision={1}
              onChange={(v) => set('repeat', v)}
            />
            <Slider
              label="offset"
              value={controls.offset}
              min={-1}
              max={1}
              onChange={(v) => set('offset', v)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              UVs outside 0…1 are what wrap modes decide about. Push the offset with
              clamp selected and the edge texel smears into a stripe — that is
              CLAMP_TO_EDGE doing exactly what it says.
            </p>
          </ControlGroup>
          {/* Last in the column: it describes the state above it. */}
          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="texture" value="256²" />
          <Stat label="mip levels" value={usesMips ? '9' : '1 used'} />
          <Stat label="tiles across" value={controls.repeat.toFixed(1)} />
          <Stat label="wrap" value={`${controls.wrapS[0].toUpperCase()} / ${controls.wrapT[0].toUpperCase()}`} />
        </dl>
      }
      source={<LabSource samples={SOURCE} />}
      readoutCaption={
        <>
          The far end of this plane compresses hundreds of texels into one pixel. A
          sampler with no mip chain has to pick one of them and the choice changes
          every frame you move — which is the shimmer. A mipmap is the same image
          pre-shrunk nine times, so there is always a level where one texel is
          about one pixel. It costs a third more memory and removes an entire class of
          artefact, which is why it is almost always the right default.
        </>
      }
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-2xs uppercase tracking-wider text-fg-faint">
        {label}
      </dt>
      <dd className="tabular mt-1 font-mono text-lg text-fg">{value}</dd>
    </div>
  );
}
