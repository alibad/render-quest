'use client';

import { useCallback, useMemo, useState } from 'react';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import {
  ControlGroup,
  ResetButton,
  Segmented,
  Slider,
  Toggle,
} from '@/components/lab/Controls';
import { AxisKey, LabLayout } from '@/components/lab/LabLayout';
import { useTheme } from '@/components/site/ThemeProvider';
import { grid } from '@/lib/gl/geometry';
import { flatShaded, normalLines, uvSphere } from '@/lib/gl/sphere';
import {
  bindAttribute,
  createProgram,
  type Program,
} from '@/lib/gl/program';
import {
  beginFrame,
  createDynamicLines,
  createSceneKit,
  uploadLines,
  uploadMesh,
  type MeshHandle,
} from '@/lib/gl/scene';
import {
  degToRad,
  identity,
  lookAt,
  multiply,
  normalMatrix,
  perspective,
  scaling,
  translation,
  upperLeft3x3,
  type Mat4,
} from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import type { CanvasPalette } from '@/lib/theme';

type Model = 'flat' | 'gouraud' | 'phong';

interface ShadingParams {
  model: Model;
  lightAzimuth: number;
  lightElevation: number;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  stretch: number;
  correctNormals: boolean;
  showNormals: boolean;
  azimuth: number;
  elevation: number;
  palette: CanvasPalette;
}

type ShadingControls = Omit<ShadingParams, 'palette'>;

const DEFAULTS: ShadingControls = {
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
};

/* ------------------------------------------------------------------ shaders */

/** Shared lighting maths, pasted into whichever stage evaluates it. */
const LIGHTING = `
vec3 shade(vec3 normal, vec3 worldPos) {
  vec3 N = normalize(normal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uEyePos - worldPos);

  // Lambert: how squarely the surface faces the light, clamped so surfaces
  // pointing away are simply unlit rather than negatively lit.
  float lambert = max(dot(N, L), 0.0);

  // Blinn-Phong: the halfway vector stands in for a mirror reflection and is
  // cheaper than reflect(). Gated on lambert so unlit faces cannot glint.
  vec3 H = normalize(L + V);
  float spec = lambert > 0.0 ? pow(max(dot(N, H), 0.0), uShininess) : 0.0;

  return uBaseColor * (uAmbient + uDiffuse * lambert) + vec3(uSpecular * spec);
}
`;

const UNIFORMS = `
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;
uniform vec3 uLightDir;
uniform vec3 uEyePos;
uniform vec3 uBaseColor;
uniform float uAmbient;
uniform float uDiffuse;
uniform float uSpecular;
uniform float uShininess;
`;

/** Gouraud: lighting runs per vertex and the *result* is interpolated. */
const GOURAUD_VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
${UNIFORMS}
varying vec3 vShaded;
${LIGHTING}
void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vShaded = shade(uNormalMatrix * aNormal, worldPos.xyz);
  gl_Position = uViewProjection * worldPos;
}
`;

const GOURAUD_FS = `
precision mediump float;
varying vec3 vShaded;
void main() { gl_FragColor = vec4(vShaded, 1.0); }
`;

/** Phong: the *normal* is interpolated and lighting runs per fragment. */
const PHONG_VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vNormal = uNormalMatrix * aNormal;
  vWorldPos = worldPos.xyz;
  gl_Position = uViewProjection * worldPos;
}
`;

const PHONG_FS = `
precision mediump float;
${UNIFORMS}
varying vec3 vNormal;
varying vec3 vWorldPos;
${LIGHTING}
void main() { gl_FragColor = vec4(shade(vNormal, vWorldPos), 1.0); }
`;

/* -------------------------------------------------------------------- scene */

function lightDirection(azimuth: number, elevation: number): [number, number, number] {
  return orbitToCartesian(azimuth, elevation, 1);
}

const createScene: SceneFactory<ShadingParams> = (gl) => {
  const kit = createSceneKit(gl);

  const smooth = uvSphere(64, 40);
  const faceted = flatShaded(uvSphere(28, 18));
  const smoothHandle = uploadMesh(gl, smooth);
  const flatHandle = uploadMesh(gl, faceted);

  const gouraud = createProgram(gl, GOURAUD_VS, GOURAUD_FS);
  const phong = createProgram(gl, PHONG_VS, PHONG_FS);

  const gridLines = uploadLines(gl, grid(4, 0.5), [1, 1, 1]);
  const normalsHandle = uploadLines(gl, normalLines(uvSphere(20, 14), 0.16), [1, 1, 1]);
  const lightLine = createDynamicLines(gl, 2);
  const ident = identity();
  // The floor sits below the sphere at every stretch value, so it reads as
  // ground rather than slicing the surface along its equator.
  const groundModel = translation(0, -1.2, 0);

  const drawSphere = (
    program: Program,
    handle: MeshHandle,
    model: Mat4,
    viewProjection: Mat4,
    normals: Float32Array,
    eye: [number, number, number],
    params: ShadingParams,
  ) => {
    gl.useProgram(program.program);
    bindAttribute(gl, handle.positions, program.attrib('aPosition'), 3);
    bindAttribute(gl, handle.normals, program.attrib('aNormal'), 3);
    gl.uniformMatrix4fv(program.uniform('uModel'), false, model);
    gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);
    gl.uniformMatrix3fv(program.uniform('uNormalMatrix'), false, normals);
    gl.uniform3fv(program.uniform('uLightDir'), lightDirection(params.lightAzimuth, params.lightElevation));
    gl.uniform3fv(program.uniform('uEyePos'), eye);
    gl.uniform3fv(program.uniform('uBaseColor'), [0.42, 0.62, 0.85]);
    gl.uniform1f(program.uniform('uAmbient'), params.ambient);
    gl.uniform1f(program.uniform('uDiffuse'), params.diffuse);
    gl.uniform1f(program.uniform('uSpecular'), params.specular);
    gl.uniform1f(program.uniform('uShininess'), Math.max(1, params.shininess));
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, handle.indices);
    gl.drawElements(gl.TRIANGLES, handle.count, gl.UNSIGNED_SHORT, 0);
  };

  return {
    draw({ width, height, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);

      const eye = orbitToCartesian(params.azimuth, params.elevation, 3.1);
      const viewProjection = multiply(
        perspective(degToRad(42), width / height, 0.1, 60),
        lookAt(eye, [0, 0, 0], [0, 1, 0]),
      );

      const model = scaling(1, params.stretch, 1);
      // The whole point of the lab: which matrix transforms the normals.
      const normals = params.correctNormals
        ? normalMatrix(model)
        : upperLeft3x3(model);

      kit.drawLines(gridLines, groundModel, viewProjection, 0.5, palette.grid);

      const useFlat = params.model === 'flat';
      drawSphere(
        params.model === 'gouraud' ? gouraud : phong,
        useFlat ? flatHandle : smoothHandle,
        model,
        viewProjection,
        normals,
        eye,
        params,
      );

      if (params.showNormals) {
        gl.disable(gl.DEPTH_TEST);
        kit.drawLines(normalsHandle, model, viewProjection, 0.55, palette.axisY);
        gl.enable(gl.DEPTH_TEST);
      }

      // A line from the surface out toward the light, so the direction the
      // sliders control is visible rather than inferred.
      const dir = lightDirection(params.lightAzimuth, params.lightElevation);
      lightLine.setPositions(
        new Float32Array([
          dir[0] * 0.6, dir[1] * 0.6, dir[2] * 0.6,
          dir[0] * 1.15, dir[1] * 1.15, dir[2] * 1.15,
        ]),
      );
      gl.disable(gl.DEPTH_TEST);
      kit.drawLines(lightLine, ident, viewProjection, 0.95, palette.amber);
      gl.enable(gl.DEPTH_TEST);
    },
    dispose() {
      kit.dispose();
      gouraud.dispose();
      phong.dispose();
    },
  };
};

/* ---------------------------------------------------------------------- UI */

export function ShadingLab() {
  const [controls, setControls] = useState<ShadingControls>(DEFAULTS);
  const { theme, palette } = useTheme();
  const params = useMemo<ShadingParams>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  const set = useCallback(<K extends keyof ShadingControls>(
    key: K,
    value: ShadingControls[K],
  ) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onDrag = useCallback((dx: number, dy: number) => {
    setControls((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.008,
      elevation: Math.max(-1.2, Math.min(1.2, prev.elevation + dy * 0.008)),
    }));
  }, []);

  const stretched = Math.abs(controls.stretch - 1) > 0.02;
  const model = useMemo(() => scaling(1, controls.stretch, 1), [controls.stretch]);
  const normals = useMemo(
    () => (controls.correctNormals ? normalMatrix(model) : upperLeft3x3(model)),
    [controls.correctNormals, model],
  );

  return (
    <LabLayout
      readoutTitle="The shading equation"
      canvas={
        <GLCanvas
          key={theme}
          create={createScene}
          params={params}
          onDrag={onDrag}
          aspect={16 / 11}
          label="A lit sphere whose shading model, light direction and normal handling can be changed"
          overlay={
            <AxisKey
              items={[
                { color: 'bg-amber', label: 'light' },
                { color: 'bg-axis-y', label: 'normals' },
              ]}
              hint="drag to orbit"
            />
          }
        />
      }
      controls={
        <>
          <ControlGroup
            title="Shading model"
            action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
          >
            <Segmented
              value={controls.model}
              options={[
                { value: 'flat', label: 'Flat' },
                { value: 'gouraud', label: 'Gouraud' },
                { value: 'phong', label: 'Phong' },
              ]}
              onChange={(v) => set('model', v)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              {controls.model === 'flat'
                ? 'One normal per triangle, so every facet is a flat patch of colour. You are seeing the mesh, not the surface it approximates.'
                : controls.model === 'gouraud'
                  ? 'Lighting is computed per vertex and the resulting colour is interpolated across the triangle. Cheap — but a highlight smaller than a triangle gets smeared or lost entirely.'
                  : 'The normal is interpolated and lighting runs per pixel. Highlights land where they belong, at the cost of doing the maths far more often.'}
            </p>
          </ControlGroup>

          <ControlGroup title="Light">
            <Slider label="direction" value={controls.lightAzimuth} min={-3.14} max={3.14} precision={2} onChange={(v) => set('lightAzimuth', v)} />
            <Slider label="height" value={controls.lightElevation} min={-1.4} max={1.4} precision={2} onChange={(v) => set('lightElevation', v)} />
          </ControlGroup>

          <ControlGroup title="Terms">
            <Slider label="ambient" value={controls.ambient} min={0} max={0.6} onChange={(v) => set('ambient', v)} />
            <Slider label="diffuse" value={controls.diffuse} min={0} max={1.4} onChange={(v) => set('diffuse', v)} />
            <Slider label="specular" value={controls.specular} min={0} max={1.4} onChange={(v) => set('specular', v)} />
            <Slider label="shininess" value={controls.shininess} min={1} max={160} step={1} precision={0} onChange={(v) => set('shininess', v)} />
          </ControlGroup>

          <ControlGroup title="Normals under scale">
            <Slider label="stretch y" value={controls.stretch} min={0.25} max={2.2} onChange={(v) => set('stretch', v)} />
            <Toggle
              label="Inverse-transpose"
              checked={controls.correctNormals}
              onChange={(v) => set('correctNormals', v)}
            />
            <Toggle
              label="Show normals"
              checked={controls.showNormals}
              onChange={(v) => set('showNormals', v)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              {stretched
                ? controls.correctNormals
                  ? 'Correct. Turn the toggle off and the lighting slides around the squashed sphere — the normals are being scaled like positions, which tilts them off the surface.'
                  : 'Wrong on purpose. The normals are being transformed by the model matrix directly, so they no longer sit perpendicular to the stretched surface and the light lands in the wrong place.'
                : 'At uniform scale both choices agree — which is exactly why this bug survives so long in real codebases. Stretch y and the difference appears.'}
            </p>
          </ControlGroup>
        </>
      }
      readout={
        <div className="space-y-5">
          <pre className="overflow-x-auto rounded-lg border border-line bg-ink-800 p-4 font-mono text-2xs leading-relaxed text-fg-muted">
{`N = normalize(normalMatrix * normal)
L = normalize(lightDir)
H = normalize(L + V)

colour = base × (`}<Term value={controls.ambient} label="ambient" />
{`
                 + `}<Term value={controls.diffuse} label="diffuse" />{` × max(0, N·L))
       + `}<Term value={controls.specular} label="specular" />{` × max(0, N·H)^`}
<Term value={controls.shininess} label="shininess" precision={0} />
          </pre>

          <div>
            <p className="eyebrow mb-2">
              Normal matrix {controls.correctNormals ? '(inverse-transpose)' : '(naive — model matrix)'}
            </p>
            <Matrix3 values={normals} />
          </div>
        </div>
      }
      readoutCaption={
        <>
          A normal is not a position: it describes an orientation, so it does not
          transform like one. Scaling a sphere flat in y makes its surface shallower,
          which means the normals must tilt <em>up</em>, not get squashed down with
          the geometry. The inverse-transpose is what encodes that. Under uniform
          scale it reduces to the model matrix, which is why the mistake is invisible
          until the day someone scales one axis.
        </>
      }
    />
  );
}

function Term({
  value,
  label,
  precision = 2,
}: {
  value: number;
  label: string;
  precision?: number;
}) {
  return (
    <span className="tabular text-accent" title={label}>
      {value.toFixed(precision)}
    </span>
  );
}

function Matrix3({ values }: { values: Float32Array }) {
  const rows = [0, 1, 2].map((row) => [0, 1, 2].map((col) => values[col * 3 + row]));
  return (
    <div className="inline-flex items-stretch gap-1.5">
      <span aria-hidden className="w-1.5 shrink-0 rounded-l-sm border-y border-l border-line-strong" />
      <table className="tabular border-separate border-spacing-x-1 border-spacing-y-0.5 font-mono text-xs">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((value, c) => (
                <td
                  key={c}
                  className={`px-1 py-0.5 text-right ${
                    value === (r === c ? 1 : 0) ? 'text-fg-faint/60' : 'text-fg'
                  }`}
                >
                  {(Object.is(value, -0) ? 0 : value).toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span aria-hidden className="w-1.5 shrink-0 rounded-r-sm border-y border-r border-line-strong" />
    </div>
  );
}
