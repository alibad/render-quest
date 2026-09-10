'use client';

import { useCallback, useMemo } from 'react';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { CopyLink } from '@/components/lab/CopyLink';
import { useLabState } from '@/components/lab/useLabState';
import {
  ControlGroup,
  Presets,
  ResetButton,
  Toggle,
  type Preset,
} from '@/components/lab/Controls';
import { AxisKey, LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { useTheme } from '@/components/site/ThemeProvider';
import { axes, boxWireframe, grid } from '@/lib/gl/geometry';
import { frustumCorners, frustumEdges } from '@/lib/gl/frustum';
import {
  SPACES,
  SPACE_LABELS,
  bufferInSpace,
  lerpBuffers,
  traceVertex,
  type PipelineContext,
  type Space,
} from '@/lib/gl/pipeline';
import {
  beginFrame,
  createDynamicLines,
  createSceneKit,
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
  perspective,
  rotationY,
  translation,
  type Mat4,
} from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import type { CanvasPalette } from '@/lib/theme';

/** The camera whose pipeline we are following. Fixed — the stages are the subject. */
const STUDY_VIEW = lookAt([0, 0.9, 3], [0, 0, -0.8], [0, 1, 0]);
const STUDY_PROJECTION = perspective(degToRad(45), 16 / 10, 1, 4.5);
const STUDY_MODEL = multiplyAll(translation(0.55, 0.3, -1), rotationY(degToRad(28)));

export const CTX: PipelineContext = {
  model: STUDY_MODEL,
  view: STUDY_VIEW,
  projection: STUDY_PROJECTION,
  viewport: { width: 960, height: 600 },
};

/** Same pipeline, minus the model step — for geometry that is already world-space. */
const WORLD_CTX: PipelineContext = { ...CTX, model: identity() };

/** The cube corner we follow all the way to a pixel. */
export const TRACKED: [number, number, number] = [0.5, 0.5, 0.5];

const UNIT_CUBE_CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
] as [number, number, number][];

/** How far the observer sits back in each space, so every stage stays framed. */
/**
 * Each space has a wildly different scale — a 1-unit cube in model space, a
 * 4-unit frustum in world space, a 2-unit cube in NDC. The observer pulls back
 * to suit, so every stage arrives framed instead of overflowing or vanishing.
 */
const OBSERVER_RADIUS: Record<Space, number> = {
  model: 3.4,
  world: 9,
  view: 9,
  clip: 13,
  ndc: 5.2,
  screen: 5.4,
};

/** The ground grid and the frustum only mean something in some of the spaces. */
const GRID_VISIBILITY: Record<Space, number> = {
  model: 0, world: 1, view: 1, clip: 0.25, ndc: 0, screen: 0,
};
const FRUSTUM_VISIBILITY: Record<Space, number> = {
  model: 0, world: 1, view: 1, clip: 1, ndc: 1, screen: 0.4,
};

export interface PipelineParams {
  stage: number;
  showGrid: boolean;
  azimuth: number;
  elevation: number;
  palette: CanvasPalette;
}

type PipelineControls = Omit<PipelineParams, 'palette'>;

export const DEFAULTS: PipelineControls = {
  stage: 0,
  showGrid: true,
  azimuth: 0.62,
  elevation: 0.34,
};

const PRESETS: Preset<PipelineControls>[] = [
  {
    label: 'Where it starts',
    note: 'Model space: the vertex as the artist authored it, before any matrix has touched it. Every number in the readout below is the one in the buffer.',
    values: { stage: 0, showGrid: true },
  },
  {
    label: 'The moment of the divide',
    note: 'Clip space, where w stops being 1. Watch the w column in the readout: everything the perspective divide is about to do is already sitting in that one number.',
    values: { stage: 3, showGrid: true },
  },
  {
    label: 'After the divide',
    note: 'NDC — the divide has happened and everything visible now lies inside a cube from -1 to 1. Anything that fell outside it was clipped on the way, not shrunk.',
    values: { stage: 4, showGrid: false },
  },
  {
    label: 'The pixel it lands on',
    note: 'Screen space. The last step is the least mysterious one: scale NDC by the viewport and flip y, because the window counts down from the top and the maths counts up from the bottom.',
    values: { stage: 5, showGrid: false },
  },
];

/** A small 3-axis cross marking the tracked vertex. */
function marker(at: readonly [number, number, number], r: number): Float32Array {
  const [x, y, z] = at;
  // prettier-ignore
  return new Float32Array([
    x - r, y, z, x + r, y, z,
    x, y - r, z, x, y + r, z,
    x, y, z - r, x, y, z + r,
  ]);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const createScene: SceneFactory<PipelineParams> = (gl, initial) => {
  const kit = createSceneKit(gl);
  const ident = identity();

  const cubeSource = boxWireframe(UNIT_CUBE_CORNERS);
  const gridSource = grid(5, 1);
  const frustumSource = frustumEdges(
    frustumCorners(STUDY_PROJECTION, STUDY_VIEW),
  );
  const axesGeo = axes(1.2, initial.palette);

  const cubeLines = createDynamicLines(gl, cubeSource.length / 3);
  const gridLines = createDynamicLines(gl, gridSource.length / 3);
  const frustumLines = createDynamicLines(gl, frustumSource.length / 3);
  const axisLines = createDynamicLines(gl, axesGeo.positions.length / 3);
  const markerLines = createDynamicLines(gl, 6);

  // Precompute every buffer in every space once; per frame we only blend.
  const cubeBySpace = {} as Record<Space, Float32Array>;
  const gridBySpace = {} as Record<Space, Float32Array>;
  const frustumBySpace = {} as Record<Space, Float32Array>;
  const axesBySpace = {} as Record<Space, Float32Array>;
  const trackedBySpace = {} as Record<Space, [number, number, number]>;

  for (const space of SPACES) {
    cubeBySpace[space] = bufferInSpace(cubeSource, space, CTX);
    gridBySpace[space] = bufferInSpace(gridSource, space, WORLD_CTX);
    frustumBySpace[space] = bufferInSpace(frustumSource, space, WORLD_CTX);
    axesBySpace[space] = bufferInSpace(axesGeo.positions, space, WORLD_CTX);
    const t = bufferInSpace(
      new Float32Array(TRACKED),
      space,
      CTX,
    );
    trackedBySpace[space] = [t[0], t[1], t[2]];
  }

  // Animated stage position, smoothed toward the selected stage.
  let current = initial.stage;

  return {
    draw({ width, height, dt, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);

      // Exponential smoothing — frame-rate independent enough for a UI morph.
      current += (params.stage - current) * Math.min(1, dt * 7);
      if (Math.abs(params.stage - current) < 0.0005) current = params.stage;

      const low = Math.max(0, Math.min(SPACES.length - 1, Math.floor(current)));
      const high = Math.min(SPACES.length - 1, low + 1);
      const t = current - low;
      const a = SPACES[low];
      const b = SPACES[high];

      const radius = lerp(OBSERVER_RADIUS[a], OBSERVER_RADIUS[b], t);
      const eye = orbitToCartesian(params.azimuth, params.elevation, radius);
      const viewProjection = multiply(
        perspective(degToRad(42), width / height, 0.1, 200),
        lookAt(eye, [0, 0, 0], [0, 1, 0]),
      );

      const blend = (by: Record<Space, Float32Array>) =>
        lerpBuffers(by[a], by[b], t);

      axisLines.setPositions(blend(axesBySpace));
      kit.drawLines(axisLines, ident, viewProjection, 0.45);

      const gridAlpha = lerp(GRID_VISIBILITY[a], GRID_VISIBILITY[b], t);
      if (params.showGrid && gridAlpha > 0.01) {
        gridLines.setPositions(blend(gridBySpace));
        kit.drawLines(gridLines, ident, viewProjection, gridAlpha, palette.grid);
      }

      const frustumAlpha = lerp(FRUSTUM_VISIBILITY[a], FRUSTUM_VISIBILITY[b], t);
      if (frustumAlpha > 0.01) {
        frustumLines.setPositions(blend(frustumBySpace));
        kit.drawLines(
          frustumLines,
          ident,
          viewProjection,
          frustumAlpha * 0.95,
          palette.accent,
        );
      }

      cubeLines.setPositions(blend(cubeBySpace));
      kit.drawLines(cubeLines, ident, viewProjection, 1, palette.outline);

      const trackedPos: [number, number, number] = [
        lerp(trackedBySpace[a][0], trackedBySpace[b][0], t),
        lerp(trackedBySpace[a][1], trackedBySpace[b][1], t),
        lerp(trackedBySpace[a][2], trackedBySpace[b][2], t),
      ];
      markerLines.setPositions(marker(trackedPos, radius * 0.035));
      gl.disable(gl.DEPTH_TEST);
      kit.drawLines(markerLines, ident, viewProjection, 1, palette.axisX);
      gl.enable(gl.DEPTH_TEST);
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

export function PipelineLab() {
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS);
  const { palette } = useTheme();
  const params = useMemo<PipelineParams>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  const onDrag = useCallback((dx: number, dy: number) => {
    setControls((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.008,
      elevation: Math.max(-1.2, Math.min(1.2, prev.elevation + dy * 0.007)),
    }));
  }, [setControls]);

  const trace = useMemo(() => traceVertex(TRACKED, CTX), []);
  const space = SPACES[controls.stage];
  const info = SPACE_LABELS[space];

  const rows: { space: Space; values: number[]; note?: string }[] = [
    { space: 'model', values: [...trace.model] },
    { space: 'world', values: [...trace.world] },
    { space: 'view', values: [...trace.view] },
    { space: 'clip', values: [...trace.clip], note: 'w now carries depth' },
    { space: 'ndc', values: [...trace.ndc], note: '÷ w' },
    { space: 'screen', values: [...trace.screen], note: 'pixels' },
  ];

  return (
    <LabLayout
      readoutTitle="One vertex, all the way down"
      canvas={
        <GLCanvas
          create={createScene}
          params={params}
          onDrag={onDrag}
          aspect={16 / 10}
          label={`The scene shown in ${info.title} space, with the tracked cube corner marked`}
          overlay={
            <>
              <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-ink-900/70 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider text-fg-muted backdrop-blur-sm">
                {controls.stage + 1} / {SPACES.length} · {info.title} space
              </span>
              <AxisKey
                items={[
                  { color: 'bg-accent', label: 'frustum' },
                  { color: 'bg-axis-x', label: 'tracked vertex' },
                ]}
                hint="drag or arrow keys to orbit"
              />
            </>
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
            title="Stage"
            explains="handover"
            action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
          >
            <ol className="space-y-1">
              {SPACES.map((name, index) => {
                const active = index === controls.stage;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => setControls((p) => ({ ...p, stage: index }))}
                      aria-current={active ? 'step' : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                        active
                          ? 'bg-accent/15 text-accent'
                          : 'text-fg-faint hover:bg-ink-600 hover:text-fg-muted'
                      }`}
                    >
                      <span className="font-mono text-2xs opacity-70">
                        {index + 1}
                      </span>
                      <span className="font-mono text-2xs uppercase tracking-wider">
                        {SPACE_LABELS[name].title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="flex gap-2 pt-1">
              <StepButton
                label="Back"
                disabled={controls.stage === 0}
                onClick={() =>
                  setControls((p) => ({ ...p, stage: Math.max(0, p.stage - 1) }))
                }
              />
              <StepButton
                label="Next"
                primary
                disabled={controls.stage === SPACES.length - 1}
                onClick={() =>
                  setControls((p) => ({
                    ...p,
                    stage: Math.min(SPACES.length - 1, p.stage + 1),
                  }))
                }
              />
            </div>
          </ControlGroup>

          <ControlGroup title={info.title}>
            <p className="text-2xs leading-relaxed text-fg-faint">{info.note}</p>
          </ControlGroup>

          <ControlGroup title="Display">
            <Toggle
              label="Ground grid"
              checked={controls.showGrid}
              onChange={(v) => setControls((p) => ({ ...p, showGrid: v }))}
            />
          </ControlGroup>
          {/* Last in the column: it describes the state above it. */}
          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[26rem] font-mono text-xs">
            <thead>
              <tr className="text-fg-faint">
                <th className="pb-2 text-left font-normal text-2xs uppercase tracking-wider">
                  Space
                </th>
                <th className="pb-2 text-right font-normal">x</th>
                <th className="pb-2 text-right font-normal">y</th>
                <th className="pb-2 text-right font-normal">z</th>
                <th className="pb-2 text-right font-normal">w</th>
                <th className="pb-2 pl-4 text-left font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const active = row.space === space;
                return (
                  <tr
                    key={row.space}
                    className={`border-t border-line transition-colors ${
                      active ? 'text-fg' : 'text-fg-faint'
                    }`}
                  >
                    <td className="py-1.5 pr-4">
                      <span
                        className={`text-2xs uppercase tracking-wider ${
                          active ? 'text-accent' : ''
                        }`}
                      >
                        {SPACE_LABELS[row.space].title}
                      </span>
                    </td>
                    {[0, 1, 2, 3].map((i) => (
                      <td key={i} className="py-1.5 pl-3 text-right">
                        {row.values[i] === undefined
                          ? <span className="text-fg-faint/40">—</span>
                          : row.values[i].toFixed(row.space === 'screen' ? 0 : 2)}
                      </td>
                    ))}
                    <td className="py-1.5 pl-4 text-2xs text-fg-faint">
                      {row.note ?? ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }
      source={<LabSource samples={SOURCE} />}
      readoutCaption={
        <>
          One corner of the cube, followed the whole way. Watch{' '}
          <span className="text-fg-muted">w</span> pick up the depth at the clip
          stage — every row after it is that same point divided by that number. The
          frustum you see in the canvas is not drawn separately: it is the camera&rsquo;s
          own frustum pushed through the identical pipeline, which is why it lands
          exactly on the −1…1 cube at the NDC stage.
        </>
      }
    />
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        primary
          ? 'border-accent/40 bg-accent/15 text-accent hover:bg-accent/25'
          : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}
