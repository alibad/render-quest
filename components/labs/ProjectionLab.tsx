'use client';

import { useCallback, useMemo } from 'react';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { CopyLink } from '@/components/lab/CopyLink';
import { useLabState } from '@/components/lab/useLabState';
import {
  ControlGroup,
  ResetButton,
  Segmented,
  Slider,
  Toggle,
  Presets,
  type Preset,
} from '@/components/lab/Controls';
import { MatrixView } from '@/components/lab/MatrixView';
import { AxisKey, LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { cube, grid } from '@/lib/gl/geometry';
import {
  eyeRays,
  frustumCorners,
  frustumEdges,
  isInsideFrustum,
} from '@/lib/gl/frustum';
import {
  beginFrame,
  createDynamicLines,
  createSceneKit,
  uploadLines,
  uploadMesh,
  LIT_FRAGMENT,
  LIT_VERTEX,
  FLAT_VERTEX,
  FLAT_FRAGMENT,
} from '@/lib/gl/scene';
import {
  degToRad,
  identity,
  lookAt,
  multiply,
  multiplyAll,
  normalMatrix,
  orthographic,
  perspective,
  scaling,
  translation,
  type Mat4,
} from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import { useTheme } from '@/components/site/ThemeProvider';
import type { CanvasPalette } from '@/lib/theme';

type Mode = 'perspective' | 'orthographic';

export interface ProjectionParams {
  mode: Mode;
  fov: number;
  near: number;
  far: number;
  orthoHeight: number;
  showFrustum: boolean;
  azimuth: number;
  elevation: number;
  palette: CanvasPalette;
}

type ProjectionControls = Omit<ProjectionParams, 'palette'>;

const DEFAULTS: ProjectionControls = {
  mode: 'perspective',
  fov: 50,
  near: 1.5,
  far: 11,
  orthoHeight: 4,
  showFrustum: true,
  azimuth: 0.95,
  elevation: 0.38,
};

const PRESETS: Preset<ProjectionControls>[] = [
  {
    label: 'The divide, exaggerated',
    note: 'A wide field of view makes the perspective divide impossible to miss: the near face of a box is enormous and the far face is small, and both are the same size in the model. Everything between them is w doing its work.',
    values: { mode: 'perspective', fov: 90, near: 1.5, far: 11, showFrustum: true },
  },
  {
    label: 'Flatten it',
    note: 'Orthographic. Parallel edges stay parallel and distance stops mattering at all — every box is the size it is, wherever it stands. This is why CAD and isometric games use it, and why it looks wrong for a camera.',
    values: { mode: 'orthographic', orthoHeight: 4, showFrustum: true },
  },
  {
    label: 'Clip the near plane',
    note: 'Push the near plane past the closest box and it does not fade or dim — it is gone. The next box back is caught mid-way, sliced flat where the plane crosses it. Clipping is a hard test, not a distance fade.',
    values: { mode: 'perspective', fov: 50, near: 4.4, far: 11, showFrustum: true },
  },
  {
    label: 'Squeeze the depth range',
    note: 'Near and far pulled close together. The frustum becomes a thin slab, and anything outside it disappears at both ends — the same test, applied twice.',
    values: { mode: 'perspective', fov: 50, near: 3, far: 6, showFrustum: true },
  },
];

/** The camera being *studied*. Fixed, so only the projection is in play. */
const CAMERA_EYE: [number, number, number] = [0, 1.9, 7];
const CAMERA_TARGET: [number, number, number] = [0, 0.4, -2];
export const CAMERA_ASPECT = 16 / 10;

/** Boxes spread through depth, so near/far clipping has something to bite on. */
/**
 * Boxes resting on the ground plane — each centre sits at half its own height,
 * so the y = 0 grid reads as a floor rather than slicing through the geometry.
 */
const SUBJECTS: { position: [number, number, number]; scale: number }[] = [
  { position: [0, 0.5, -0.5], scale: 1.0 },
  { position: [-1.7, 0.45, -3.2], scale: 0.9 },
  { position: [1.9, 0.55, -5.8], scale: 1.1 },
  { position: [1.1, 0.35, 2.4], scale: 0.7 },
  { position: [-1.4, 0.3, 4.2], scale: 0.6 },
  { position: [0.3, 0.65, -8.8], scale: 1.3 },
];

/** Only needs the lens controls, so it accepts them with or without a palette. */
export function buildProjection(p: ProjectionControls): Mat4 {
  if (p.mode === 'perspective') {
    return perspective(degToRad(p.fov), CAMERA_ASPECT, p.near, p.far);
  }
  const halfHeight = p.orthoHeight / 2;
  const halfWidth = halfHeight * CAMERA_ASPECT;
  return orthographic(-halfWidth, halfWidth, -halfHeight, halfHeight, p.near, p.far);
}

const cameraView = () => lookAt(CAMERA_EYE, CAMERA_TARGET, [0, 1, 0]);

/** Shared subject-drawing so both canvases render the identical scene. */
function makeSubjectDrawer(gl: WebGLRenderingContext) {
  const kit = createSceneKit(gl);
  const mesh = uploadMesh(gl, cube());
  const models = SUBJECTS.map((s) =>
    multiply(translation(...s.position), scaling(s.scale, s.scale, s.scale)),
  );
  const normals = models.map(normalMatrix);

  return {
    kit,
    drawSubjects(
      viewProjection: Mat4,
      opacityFor?: (index: number) => number,
      ambient = 0.35,
    ) {
      models.forEach((model, i) => {
        kit.drawMesh(
          mesh,
          model,
          viewProjection,
          normals[i],
          opacityFor?.(i) ?? 1,
          ambient,
        );
      });
    },
  };
}

/** The god view: the frustum drawn as an object in the world it clips. */
export const createWorldScene: SceneFactory<ProjectionParams> = (gl) => {
  const { kit, drawSubjects } = makeSubjectDrawer(gl);
  const gridLines = uploadLines(gl, grid(12, 1), [1, 1, 1]);
  const frustumLines = createDynamicLines(gl, 24);
  const rayLines = createDynamicLines(gl, 8);
  const ident = identity();

  return {
    draw({ width, height, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);

      const eye = orbitToCartesian(params.azimuth, params.elevation, 23);
      const view = lookAt([eye[0], eye[1] + 1.5, eye[2]], [0, 0, -2], [0, 1, 0]);
      const viewProjection = multiply(
        perspective(degToRad(42), width / height, 0.5, 120),
        view,
      );

      // The same clip test the GPU will run, so a box the camera is about to
      // drop fades here before it vanishes from the render below.
      const cameraClip = multiply(buildProjection(params), cameraView());
      const opacityFor = (index: number) =>
        isInsideFrustum(cameraClip, SUBJECTS[index].position) ? 1 : 0.16;

      kit.drawLines(gridLines, ident, viewProjection, 0.85, palette.grid);
      drawSubjects(viewProjection, opacityFor, palette.ambient);

      if (params.showFrustum) {
        const corners = frustumCorners(buildProjection(params), cameraView());
        frustumLines.setPositions(frustumEdges(corners));
        rayLines.setPositions(eyeRays(CAMERA_EYE, corners));

        gl.disable(gl.DEPTH_TEST);
        kit.drawLines(rayLines, ident, viewProjection, 0.55, palette.accentDim);
        kit.drawLines(frustumLines, ident, viewProjection, 0.95, palette.accent);
        gl.enable(gl.DEPTH_TEST);
      }
    },
    dispose() {
      kit.dispose();
    },
  };
};

/** What that camera actually renders. */
export const createCameraScene: SceneFactory<ProjectionParams> = (gl) => {
  const { kit, drawSubjects } = makeSubjectDrawer(gl);
  const gridLines = uploadLines(gl, grid(12, 1), [1, 1, 1]);
  const ident = identity();

  return {
    draw({ width, height, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);
      const viewProjection = multiply(buildProjection(params), cameraView());
      kit.drawLines(gridLines, ident, viewProjection, 0.9, palette.grid);
      drawSubjects(viewProjection, undefined, palette.ambient);
    },
    dispose() {
      kit.dispose();
    },
  };
};

const SOURCE = [
  { label: 'Vertex shader', language: 'glsl' as const, source: LIT_VERTEX.trim() },
  { label: 'Fragment shader', language: 'glsl' as const, source: LIT_FRAGMENT.trim() },
  { label: 'Line vertex shader', language: 'glsl' as const, source: FLAT_VERTEX.trim() },
  { label: 'Line fragment shader', language: 'glsl' as const, source: FLAT_FRAGMENT.trim() },
];

export function ProjectionLab() {
  const [controls, setParams, shareQuery] = useLabState(DEFAULTS);
  const { palette } = useTheme();
  const params = useMemo<ProjectionParams>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  const set = useCallback(<K extends keyof ProjectionControls>(
    key: K,
    value: ProjectionControls[K],
  ) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      // The near plane must stay in front of the far plane or the projection
      // matrix divides by zero and the scene vanishes with no explanation.
      if (next.near >= next.far) {
        if (key === 'near') next.far = next.near + 0.5;
        else next.near = Math.max(0.1, next.far - 0.5);
      }
      return next;
    });
  }, [setParams]);

  const onDrag = useCallback((dx: number, dy: number) => {
    setParams((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.008,
      elevation: Math.max(-0.2, Math.min(1.2, prev.elevation + dy * 0.006)),
    }));
  }, [setParams]);

  const projection = useMemo(() => buildProjection(controls), [controls]);
  const isPerspective = params.mode === 'perspective';

  return (
    <LabLayout
      readoutTitle="The projection matrix"
      canvas={
        <div className="space-y-4">
          <GLCanvas
            create={createWorldScene}
            params={params}
            onDrag={onDrag}
            aspect={16 / 9}
            label="A view of the scene from outside, showing the camera's frustum as a wireframe"
            overlay={
              <>
                <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-ink-900/70 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider text-fg-muted backdrop-blur-sm">
                  World · the frustum from outside
                </span>
                <AxisKey
                  items={[
                    { color: 'bg-accent', label: 'frustum' },
                    { color: 'bg-fg', label: 'kept' },
                    { color: 'bg-fg-faint/30', label: 'clipped' },
                  ]}
                  hint="drag to orbit"
                />
              </>
            }
          />
          <GLCanvas
            create={createCameraScene}
            params={params}
            aspect={CAMERA_ASPECT}
            label="The same scene rendered through the camera being adjusted"
            overlay={
              <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-ink-900/70 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider text-fg-muted backdrop-blur-sm">
                Camera · what it renders
              </span>
            }
          />
        </div>
      }
      controls={
        <>
          <ControlGroup title="Start here">
            <Presets
              presets={PRESETS}
              onApply={(values) => setParams((prev) => ({ ...prev, ...values }))}
            />
          </ControlGroup>

          <ControlGroup
            title="Projection"
            action={<ResetButton onClick={() => setParams(DEFAULTS)} />}
          >
            <Segmented
              value={params.mode}
              options={[
                { value: 'perspective', label: 'Perspective' },
                { value: 'orthographic', label: 'Ortho' },
              ]}
              onChange={(v) => set('mode', v)}
            />
          </ControlGroup>

          <ControlGroup title="Shape">
            {isPerspective ? (
              <Slider
                label="field of view"
                value={params.fov}
                min={10}
                max={120}
                step={1}
                precision={0}
                unit="°"
                onChange={(v) => set('fov', v)}
              />
            ) : (
              <Slider
                label="view height"
                value={params.orthoHeight}
                min={1}
                max={14}
                step={0.1}
                precision={1}
                onChange={(v) => set('orthoHeight', v)}
              />
            )}
            <Slider label="near" value={params.near} min={0.1} max={9} step={0.1} precision={1} onChange={(v) => set('near', v)} />
            <Slider label="far" value={params.far} min={1} max={26} step={0.1} precision={1} onChange={(v) => set('far', v)} />
          </ControlGroup>

          <ControlGroup title="Display">
            <Toggle
              label="Show frustum"
              checked={params.showFrustum}
              onChange={(v) => set('showFrustum', v)}
            />
          </ControlGroup>

          <p className="border-t border-line pt-4 text-2xs leading-relaxed text-fg-faint">
            {isPerspective ? (
              <>
                Widen the field of view and the frustum opens out: more of the world
                fits, and everything in it gets smaller. Pull <code className="text-accent">far</code> in
                until the back boxes pop out of existence — that is the clip, not a fade.
              </>
            ) : (
              <>
                Orthographic turns the pyramid into a box. Depth no longer changes size,
                which is why CAD and isometric games use it — and why it looks wrong for
                anything meant to feel like a photograph.
              </>
            )}
          </p>
          {/* Last in the column: it describes the state above it. */}
          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <MatrixView
          matrix={projection}
          label={isPerspective ? 'P  perspective' : 'P  orthographic'}
          precision={3}
          highlightChanges={false}
        />
      }
      source={<LabSource samples={SOURCE} />}
      readoutCaption={
        isPerspective ? (
          <>
            The <span className="text-fg-muted">−1</span> in the bottom row is the whole
            trick. It copies <span className="text-fg-muted">−z</span> into{' '}
            <span className="text-fg-muted">w</span>, and the divide the GPU performs
            after your vertex shader — x/w, y/w — is what makes distant things small.
            Switch to orthographic and that entry becomes 0: w stays 1, nothing shrinks.
          </>
        ) : (
          <>
            Bottom row <span className="text-fg-muted">0 0 0 1</span>: w never changes, so
            no perspective divide happens and parallel lines stay parallel. This matrix
            only scales and offsets the box between <code className="text-accent">near</code>{' '}
            and <code className="text-accent">far</code> into the clip cube.
          </>
        )
      }
    />
  );
}
