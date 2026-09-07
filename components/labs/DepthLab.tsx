'use client';

import { useCallback, useMemo } from 'react';

import {
  ControlGroup,
  Presets,
  ResetButton,
  Segmented,
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
import { bindAttribute, createBuffer, createProgram } from '@/lib/gl/program';
import { lookAt, multiply, perspective } from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import type { CanvasPalette } from '@/lib/theme';

/**
 * The two things every renderer gets wrong first.
 *
 * Both are failures of the depth buffer, from opposite directions: z-fighting
 * is the buffer not having the precision to decide, and broken transparency is
 * the buffer deciding when it should not have. Neither is a bug in the
 * geometry, which is why neither is findable by staring at the model.
 */

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec3 vColor;
uniform float uOpacity;
void main() {
  // Premultiplied: the blend function expects the colour already scaled.
  gl_FragColor = vec4(vColor * uOpacity, uOpacity);
}
`;

/** A unit quad in the XY plane: two triangles. */
function quadPositions(): Float32Array {
  return new Float32Array([
    -1, -1, 0, 1, -1, 0, -1, 1, 0,
    -1, 1, 0, 1, -1, 0, 1, 1, 0,
  ]);
}

function quadColors(r: number, g: number, b: number): Float32Array {
  const colors = new Float32Array(18);
  for (let i = 0; i < 6; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  return colors;
}

type Scene = 'zfight' | 'blend';

export interface DepthControls {
  azimuth: number;
  elevation: number;
  scene: Scene;
  near: number;
  far: number;
  separation: number;
  distance: number;
  sorted: boolean;
  depthWrite: boolean;
  opacity: number;
}

const DEFAULTS: DepthControls = {
  azimuth: 0.12,
  elevation: 0.16,
  scene: 'zfight',
  near: 0.1,
  far: 200,
  separation: 0.01,
  distance: 40,
  sorted: true,
  depthWrite: false,
  opacity: 0.5,
};

const PRESETS: Preset<DepthControls>[] = [
  {
    label: 'Make it fight',
    note: 'A near plane of 0.02 spends nearly the whole depth buffer on the first few centimetres, leaving almost nothing for the distance. The two panels tear into each other in bands. Nothing about the geometry changed — only the range you asked the buffer to cover.',
    values: { scene: 'zfight', near: 0.02, far: 200, separation: 0.002, distance: 80 },
  },
  {
    label: 'Fix it from the frustum',
    note: 'Pull the near plane out to 1 and the fighting stops, with no change to the model at all. Depth precision is decided almost entirely by the near plane — which is why the fix for z-fighting is so rarely in the geometry.',
    values: { scene: 'zfight', near: 1, far: 200, separation: 0.002, distance: 80 },
  },
  {
    label: 'The far plane barely matters',
    note: 'Now drag the far plane between 10 and 1000 and watch how little the prediction moves. It is the control everybody reaches for first, and close to the least effective one here.',
    values: { scene: 'zfight', near: 0.05, far: 1000, separation: 0.002, distance: 80 },
  },
  {
    label: 'Transparency, drawn wrong',
    note: 'Three translucent panes with depth writing on and no sorting. Whichever pane is drawn first stamps the depth buffer, and the ones behind it are discarded — so panes vanish according to array order rather than where they are in space.',
    values: { scene: 'blend', depthWrite: true, sorted: false, opacity: 0.55 },
  },
  {
    label: 'Transparency, drawn right',
    note: 'Depth writing off, so a translucent pane never occludes what is behind it, and sorted back to front so the blending happens in the right order. That is the entire recipe, and the reason transparency is not a switch.',
    values: { scene: 'blend', depthWrite: false, sorted: true, opacity: 0.55 },
  },
];

const SOURCE = [
  {
    label: 'The shader — both scenes',
    language: 'glsl' as const,
    source: `${VERTEX.trim()}\n\n/* ---------------- fragment ---------------- */\n\n${FRAGMENT.trim()}`,
    note: 'Deliberately trivial, because neither failure has anything to do with the shader. Both are decided by the depth and blend state around the draw.',
  },
  {
    label: 'The state that decides it',
    language: 'typescript' as const,
    source: `// Opaque geometry: test and write, in any order you like.
gl.enable(gl.DEPTH_TEST);
gl.depthMask(true);

// Translucent geometry: test, but do NOT write. A pane that wrote depth
// would stop everything behind it drawing at all — and "behind it" is
// exactly what you were trying to see through it.
gl.depthMask(false);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

// Then sort back to front yourself, every frame, from the live camera —
// because blending is not commutative:
//   over(a, over(b, c))  is not  over(b, over(a, c))
panes.sort((a, b) => depthFromCamera(b) - depthFromCamera(a));`,
    note: 'The depth buffer answers "what is nearest". Transparency needs "what is behind", which it cannot answer — hence the sort, on the CPU, forever.',
  },
];

export interface Params extends DepthControls {
  palette: CanvasPalette;
  azimuth: number;
  elevation: number;
}

/**
 * The smallest gap a 24-bit depth buffer can still resolve at distance `z`.
 *
 * Exported because the essay's figures put the same number beside the same
 * picture; two copies of this arithmetic would eventually disagree, and the
 * one on the essay is the one a reader would believe.
 */
export function smallestResolvableGap(near: number, far: number, z: number): number {
  const steps = 2 ** 24;
  return (z * z * (far - near)) / (near * far * steps);
}

export const createScene: SceneFactory<Params> = (gl) => {
  const program = createProgram(gl, VERTEX, FRAGMENT);

  const positions = createBuffer(gl, quadPositions());
  const redColors = createBuffer(gl, quadColors(0.85, 0.32, 0.28));
  const blueColors = createBuffer(gl, quadColors(0.3, 0.55, 0.92));

  const panes = [
    { colors: createBuffer(gl, quadColors(0.95, 0.36, 0.3)), z: -3 },
    { colors: createBuffer(gl, quadColors(0.36, 0.82, 0.46)), z: 0 },
    { colors: createBuffer(gl, quadColors(0.4, 0.6, 0.95)), z: 3 },
  ];

  const drawQuad = (colors: WebGLBuffer, model: Float32Array, opacity: number) => {
    bindAttribute(gl, positions, program.attrib('aPosition'), 3);
    bindAttribute(gl, colors, program.attrib('aColor'), 3);
    gl.uniformMatrix4fv(program.uniform('uModel'), false, model);
    gl.uniform1f(program.uniform('uOpacity'), opacity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  /** Column-major scale + translate, written out to keep the intent obvious. */
  const placed = (sx: number, sy: number, z: number) =>
    new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, 0, 0, z, 1]);

  return {
    draw({ width, height, params }) {
      gl.viewport(0, 0, width, height);
      const clear = params.palette.clear;
      gl.clearColor(clear[0], clear[1], clear[2], 1);
      gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program.program);

      if (params.scene === 'zfight') {
        gl.disable(gl.BLEND);
        // The camera stays put and the PANELS move away, because the whole
        // point of the distance control is to change how far the depth buffer
        // has to reach. An earlier version orbited the camera around the panels
        // and so held the view distance constant at 14 units no matter what the
        // slider said — the scene was always well within precision and never
        // fought, which measuring caught and looking at it did not.
        const eye = orbitToCartesian(params.azimuth, params.elevation, 1.5);
        const viewProjection = multiply(
          perspective(Math.PI / 4, width / height, params.near, params.far),
          lookAt(eye, [0, 0, -params.distance], [0, 1, 0]),
        );
        gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);

        // Sized in proportion to distance, so the panels subtend the same angle
        // however far away they are. The picture holds still; only the depth
        // precision behind it changes.
        const w = params.distance * 0.15;
        const h = params.distance * 0.095;
        drawQuad(redColors, placed(w, h, -params.distance), 1);
        drawQuad(blueColors, placed(w, h, -params.distance + params.separation), 1);
        return;
      }

      const eye = orbitToCartesian(params.azimuth, params.elevation, 15);
      const viewProjection = multiply(
        perspective(Math.PI / 4, width / height, 0.5, 100),
        lookAt(eye, [0, 0, 0], [0, 1, 0]),
      );
      gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(params.depthWrite);

      const order = [...panes];
      if (params.sorted) {
        // Back to front, measured from where the camera actually is.
        order.sort((a, b) => (b.z - eye[2]) ** 2 - (a.z - eye[2]) ** 2);
      }

      for (const pane of order) {
        drawQuad(pane.colors, placed(3.2, 3.2, pane.z), params.opacity);
      }

      gl.depthMask(true);
    },
    dispose() {
      program.dispose();
      gl.deleteBuffer(positions);
      gl.deleteBuffer(redColors);
      gl.deleteBuffer(blueColors);
      for (const pane of panes) gl.deleteBuffer(pane.colors);
    },
  };
};

export function DepthLab() {
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS, {
    scene: (value) => value === 'zfight' || value === 'blend',
    near: (value) => value >= 0.01 && value <= 5,
    far: (value) => value >= 10 && value <= 1000,
    distance: (value) => value >= 5 && value <= 120,
    separation: (value) => value >= 0 && value <= 0.2,
    opacity: (value) => value >= 0.05 && value <= 1,
    elevation: (value) => value >= -1.2 && value <= 1.2,
  });
  const { palette } = useTheme();

  const set = useCallback(
    <K extends keyof DepthControls>(key: K, value: DepthControls[K]) => {
      setControls((prev) => ({ ...prev, [key]: value }));
    },
    [setControls],
  );

  // Orbiting matters more here than in most labs: seeing the three panes from
  // the side is what makes their separation, and the order they blend in,
  // visible at all.
  const onDrag = useCallback((dx: number, dy: number) => {
    setControls((prev) => ({
      ...prev,
      azimuth: prev.azimuth - dx * 0.008,
      elevation: Math.max(-1.2, Math.min(1.2, prev.elevation + dy * 0.008)),
    }));
  }, [setControls]);

  const params = useMemo<Params>(
    () => ({ ...controls, palette }),
    [controls, palette],
  );

  /**
   * The smallest gap a 24-bit depth buffer can still resolve at the panels'
   * distance. This is the number the near-plane slider is really moving, and
   * watching it climb past the separation is the moment the picture breaks.
   */
  const resolvableGap = useMemo(
    () => smallestResolvableGap(controls.near, controls.far, controls.distance),
    [controls],
  );

  const willFight = controls.separation <= resolvableGap;

  return (
    <LabLayout
      readoutTitle={
        controls.scene === 'zfight'
          ? 'What the depth buffer can tell apart'
          : 'Why the order matters'
      }
      canvas={
        <div>
          <GLCanvas
            create={createScene}
            params={params}
            aspect={16 / 10}
            onDrag={onDrag}
            label="Two nearly coplanar panels competing for the same depth, or three translucent panes blended in front of each other"
          />
          <p className="mt-2 font-mono text-2xs text-fg-faint">
            {controls.scene === 'zfight'
              ? `Two panels ${controls.separation.toFixed(3)} apart, ${controls.distance.toFixed(0)} units away · near ${controls.near.toFixed(2)}`
              : `Three panes at ${(controls.opacity * 100).toFixed(0)}% · depth write ${controls.depthWrite ? 'ON' : 'off'} · ${controls.sorted ? 'sorted back to front' : 'unsorted'}`}
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

          <Segmented<Scene>
            label="Which failure"
            value={controls.scene}
            options={[
              { value: 'zfight', label: 'Z-fighting' },
              { value: 'blend', label: 'Transparency' },
            ]}
            onChange={(value) => set('scene', value)}
          />

          {controls.scene === 'zfight' ? (
            <ControlGroup
              title="The frustum"
              action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
            >
              <Slider label="near" value={controls.near} min={0.01} max={5} step={0.01}
                onChange={(value) => set('near', value)} />
              <Slider label="far" value={controls.far} min={10} max={1000} step={1} precision={0}
                onChange={(value) => set('far', value)} />
              <Slider label="distance" value={controls.distance} min={5} max={120} step={1} precision={0}
                onChange={(value) => set('distance', value)} />
              <Slider label="separation" value={controls.separation} min={0} max={0.2} step={0.001} precision={3}
                onChange={(value) => set('separation', value)} />
            </ControlGroup>
          ) : (
            <ControlGroup
              title="Blending"
              action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
            >
              <Toggle label="Write depth" checked={controls.depthWrite}
                onChange={(value) => set('depthWrite', value)} />
              <Toggle label="Sort back to front" checked={controls.sorted}
                onChange={(value) => set('sorted', value)} />
              <Slider label="opacity" value={controls.opacity} min={0.05} max={1}
                onChange={(value) => set('opacity', value)} />
            </ControlGroup>
          )}

          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        controls.scene === 'zfight' ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="eyebrow mb-1.5">
                Smallest gap resolvable at {controls.distance.toFixed(0)} units
              </div>
              <div className="tabular font-mono text-lg text-accent">
                {resolvableGap.toExponential(2)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">The panels are apart by</div>
              <div className="tabular font-mono text-lg text-fg">
                {controls.separation.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Prediction</div>
              <div className={`font-mono text-lg ${willFight ? 'text-amber' : 'text-axis-y'}`}>
                {willFight ? 'will fight' : 'resolvable'}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="eyebrow mb-1.5">Depth writing</div>
              <div className={`font-mono text-lg ${controls.depthWrite ? 'text-amber' : 'text-axis-y'}`}>
                {controls.depthWrite ? 'on — panes occlude' : 'off — correct'}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1.5">Draw order</div>
              <div className={`font-mono text-lg ${controls.sorted ? 'text-axis-y' : 'text-amber'}`}>
                {controls.sorted ? 'back to front' : 'whatever the array said'}
              </div>
            </div>
          </div>
        )
      }
      readoutCaption={
        controls.scene === 'zfight' ? (
          <>
            The prediction above is arithmetic, not a guess: a 24-bit depth buffer
            distributed <em className="not-italic text-fg-muted">hyperbolically</em> resolves
            roughly z²(f−n) / (n·f·2²⁴) at distance z. Set the separation below that
            number and the panels must fight; set it above and they cannot. Move the
            near plane and watch the prediction and the picture change together.
            <br />
            <br />
            Almost all of that precision is decided by the near plane, because the
            buffer spends most of its range close to the camera. The far plane is the
            control everybody reaches for first, and dragging it from 10 to 1000
            barely moves the number. That is why the fix for z-fighting is so rarely
            in the model.
          </>
        ) : (
          <>
            The depth buffer answers exactly one question — what is nearest — and
            transparency needs a different one: what is behind. A translucent pane
            that writes depth tells everything behind it not to bother drawing, which
            is precisely what you were trying to see through it.
            <br />
            <br />
            Turning depth writing off fixes the occlusion but not the order, because
            blending is not commutative: red over green is not green over red. So the
            panes have to be sorted back to front, on the CPU, every frame, from the
            current camera. No render state does this for you, and that is the whole
            reason transparency stays expensive and slightly wrong in real engines.
          </>
        )
      }
      source={<LabSource samples={SOURCE} />}
    />
  );
}
