'use client';

import { useCallback, useMemo } from 'react';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { CopyLink } from '@/components/lab/CopyLink';
import { useLabState } from '@/components/lab/useLabState';
import {
  ControlGroup,
  ResetButton,
  Segmented,
  Presets,
  Slider,
  Toggle,
  type Preset,
} from '@/components/lab/Controls';
import { MatrixProduct } from '@/components/lab/MatrixView';
import { AxisKey, LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { axes, boxWireframe, cube, grid } from '@/lib/gl/geometry';
import {
  beginFrame,
  createSceneKit,
  updateLineColors,
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
  perspective,
  rotationX,
  rotationY,
  rotationZ,
  scaling,
  translation,
} from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import { usePalette, useTheme } from '@/components/site/ThemeProvider';
import type { CanvasPalette } from '@/lib/theme';

type Order = 'trs' | 'srt';

interface TransformParams {
  tx: number; ty: number; tz: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number; sz: number;
  order: Order;
  showGhost: boolean;
  showBasis: boolean;
  azimuth: number;
  elevation: number;
  palette: CanvasPalette;
}

type TransformDefaults = Omit<TransformParams, 'palette'>;

const DEFAULTS: TransformDefaults = {
  tx: 1.4, ty: 0.5, tz: 0,
  rx: 0, ry: 25, rz: 0,
  sx: 1, sy: 1, sz: 1,
  order: 'trs',
  showGhost: true,
  showBasis: true,
  azimuth: 0.72,
  elevation: 0.42,
};

/** Corners of the unit cube, matching the mesh the lab renders. */
const UNIT_CUBE_CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
] as [number, number, number][];

/** Builds T, R, S and their product in the requested order. */
function composeModel(p: TransformParams) {
  const T = translation(p.tx, p.ty, p.tz);
  const R = multiplyAll(
    rotationZ(degToRad(p.rz)),
    rotationY(degToRad(p.ry)),
    rotationX(degToRad(p.rx)),
  );
  const S = scaling(p.sx, p.sy, p.sz);
  const M = p.order === 'trs' ? multiplyAll(T, R, S) : multiplyAll(S, R, T);
  return { T, R, S, M };
}

const createScene: SceneFactory<TransformParams> = (gl, initial) => {
  const kit = createSceneKit(gl);
  const cubeMesh = uploadMesh(gl, cube());
  // Theme-neutral lines go up white and are tinted at draw time; the axes carry
  // real per-vertex colours, so they are built from the palette at mount.
  const gridLines = uploadLines(gl, grid(6, 1), [1, 1, 1]);
  const ghostLines = uploadLines(gl, boxWireframe(UNIT_CUBE_CORNERS), [1, 1, 1]);
  const axesGeo = axes(1.6, initial.palette);
  const worldAxes = uploadLines(gl, axesGeo.positions, axesGeo.colors);
  const basisGeo = axes(1, initial.palette);
  const localAxes = uploadLines(gl, basisGeo.positions, basisGeo.colors);
  const ident = identity();

  // The axes carry per-vertex colour, so they are the one thing here that a
  // theme change invalidates. Re-upload rather than rebuild the scene.
  let appliedPalette = initial.palette;

  return {
    draw({ width, height, params }) {
      const { palette } = params;

      if (palette !== appliedPalette) {
        appliedPalette = palette;
        updateLineColors(gl, worldAxes, axes(1.6, palette).colors);
        updateLineColors(gl, localAxes, axes(1, palette).colors);
      }

      beginFrame(gl, width, height, palette);

      const eye = orbitToCartesian(params.azimuth, params.elevation, 7.5);
      const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
      const projection = perspective(degToRad(45), width / height, 0.1, 100);
      const viewProjection = multiply(projection, view);

      kit.drawLines(gridLines, ident, viewProjection, 0.9, palette.grid);
      kit.drawLines(worldAxes, ident, viewProjection, 0.5);

      const { M } = composeModel(params);

      // The untransformed cube, so the change has something to be measured
      // against. Drawn before the solid so depth sorting stays honest.
      if (params.showGhost) {
        kit.drawLines(ghostLines, ident, viewProjection, 0.85, palette.ghost);
      }

      kit.drawMesh(cubeMesh, M, viewProjection, normalMatrix(M), 1, palette.ambient);

      // Drawing the axes *through* M renders the matrix's own basis columns:
      // the red arm is column 0, green is column 1, blue is column 2.
      if (params.showBasis) {
        gl.disable(gl.DEPTH_TEST);
        kit.drawLines(localAxes, M, viewProjection, 1);
        gl.enable(gl.DEPTH_TEST);
      }
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

export function TransformLab() {
  const [controls, setParams, shareQuery] = useLabState(DEFAULTS);
  const { palette } = useTheme();
  const params = useMemo<TransformParams>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  const set = useCallback(<K extends keyof TransformDefaults>(
    key: K,
    value: TransformDefaults[K],
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, [setParams]);

  const onDrag = useCallback((dx: number, dy: number) => {
    setParams((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.008,
      elevation: Math.max(
        -1.35,
        Math.min(1.35, prev.elevation + dy * 0.008),
      ),
    }));
  }, [setParams]);

  const { T, R, S, M } = useMemo(() => composeModel(params), [params]);

  const orderedFactors = params.order === 'trs'
    ? [
        { label: 'T  translate', matrix: T },
        { label: 'R  rotate', matrix: R },
        { label: 'S  scale', matrix: S },
      ]
    : [
        { label: 'S  scale', matrix: S },
        { label: 'R  rotate', matrix: R },
        { label: 'T  translate', matrix: T },
      ];

const PRESETS: Preset<TransformDefaults>[] = [
  {
    label: 'Mirror it',
    note: 'Scale x is −1. The cube is inside out — look at the red arm, now pointing the other way. A reflection is a scale, not a rotation, and no rotation can produce it.',
    values: { sx: -1, sy: 1, sz: 1, rx: 0, ry: 25, rz: 0, tx: 1.4, ty: 0.5, tz: 0 },
  },
  {
    label: 'Order matters',
    note: 'Same translate, rotate and scale — but composed S · R · T. The translation is now being rotated and scaled along with everything else, which is why the cube is nowhere near where you asked for.',
    values: { order: 'srt', tx: 1.4, ty: 0.5, tz: 0, ry: 55, sx: 1.6, sy: 1.6, sz: 1.6 },
  },
  {
    label: 'Squash one axis',
    note: 'Non-uniform scale. The basis vectors are no longer the same length, and they are no longer perpendicular to the faces — which is the whole reason normals need their own matrix.',
    values: { sx: 2.2, sy: 0.4, sz: 1, ry: 35, tx: 0, ty: 0, tz: 0 },
  },
  {
    label: 'Back to identity',
    note: 'Every slider neutral. The matrix is the identity, and the cube sits exactly on its wireframe ghost — which is what "no transform" looks like.',
    values: { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, order: 'trs' },
  },
];

  return (
    <LabLayout
      canvas={
        <GLCanvas
          create={createScene}
          params={params}
          onDrag={onDrag}
          aspect={16 / 11}
          label="A unit cube transformed by the model matrix, with the untransformed cube shown as a wireframe"
          overlay={<AxisKey />}
        />
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
            title="Translate"
            action={<ResetButton onClick={() => setParams((p) => ({ ...p, tx: 0, ty: 0, tz: 0 }))} />}
          >
            <Slider label="x" tone="x" value={params.tx} min={-3} max={3} onChange={(v) => set('tx', v)} />
            <Slider label="y" tone="y" value={params.ty} min={-3} max={3} onChange={(v) => set('ty', v)} />
            <Slider label="z" tone="z" value={params.tz} min={-3} max={3} onChange={(v) => set('tz', v)} />
          </ControlGroup>

          <ControlGroup
            title="Rotate"
            action={<ResetButton onClick={() => setParams((p) => ({ ...p, rx: 0, ry: 0, rz: 0 }))} />}
          >
            <Slider label="x" tone="x" value={params.rx} min={-180} max={180} step={1} precision={0} unit="°" onChange={(v) => set('rx', v)} />
            <Slider label="y" tone="y" value={params.ry} min={-180} max={180} step={1} precision={0} unit="°" onChange={(v) => set('ry', v)} />
            <Slider label="z" tone="z" value={params.rz} min={-180} max={180} step={1} precision={0} unit="°" onChange={(v) => set('rz', v)} />
          </ControlGroup>

          <ControlGroup
            title="Scale"
            action={<ResetButton onClick={() => setParams((p) => ({ ...p, sx: 1, sy: 1, sz: 1 }))} />}
          >
            <Slider label="x" tone="x" value={params.sx} min={-2} max={2.5} onChange={(v) => set('sx', v)} />
            <Slider label="y" tone="y" value={params.sy} min={-2} max={2.5} onChange={(v) => set('sy', v)} />
            <Slider label="z" tone="z" value={params.sz} min={-2} max={2.5} onChange={(v) => set('sz', v)} />
          </ControlGroup>

          <ControlGroup title="Composition">
            <Segmented
              value={params.order}
              options={[
                { value: 'trs', label: 'T · R · S' },
                { value: 'srt', label: 'S · R · T' },
              ]}
              onChange={(v) => set('order', v)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              A matrix chain is read <strong className="text-fg-muted">right to left</strong>:
              the rightmost matrix reaches the vertex first. <code className="text-accent">T · R · S</code>{' '}
              scales, then rotates, then moves — the sane default. Flip it and the
              translation gets rotated and scaled along with everything else.
            </p>
          </ControlGroup>

          <ControlGroup
            title="Display"
            action={<ResetButton onClick={() => setParams(DEFAULTS)} />}
          >
            <Toggle label="Original position" checked={params.showGhost} onChange={(v) => set('showGhost', v)} />
            <Toggle label="Basis vectors" checked={params.showBasis} onChange={(v) => set('showBasis', v)} />
          </ControlGroup>
          {/* Last in the column: it describes the state above it. */}
          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <MatrixProduct
          factors={orderedFactors}
          result={{ label: `M = ${params.order === 'trs' ? 'T · R · S' : 'S · R · T'}`, matrix: M }}
        />
      }
      source={<LabSource samples={SOURCE} />}
      readoutCaption={
        <>
          The first three columns of <span className="text-fg-muted">M</span> are the
          cube&rsquo;s own axes after the transform — that is exactly what the
          <span className="text-axis-x"> red</span>,
          <span className="text-axis-y"> green</span> and
          <span className="text-axis-z"> blue</span> arms on the canvas are drawing.
          The fourth column, in <span className="text-amber">amber</span>, is where its
          origin ended up. Drag a translate slider and watch only that column move.
        </>
      }
    />
  );
}
