'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
import { LabLayout } from '@/components/lab/LabLayout';
import { useLabState } from '@/components/lab/useLabState';
import { LabSource } from '@/components/lab/LabSource';
import { useTheme } from '@/components/site/ThemeProvider';
import { lookAt, multiply, perspective } from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';

/**
 * The lab about the cost of asking.
 *
 * Both modes draw the identical cubes, from the identical buffer, through the
 * identical shader and pipeline. The only difference is how many times the CPU
 * says "draw": once, or once per cube. The triangle count never moves, and the
 * frame time does — which is the whole lesson, and the reason a scene with
 * fewer triangles can be slower than one with more.
 *
 * The two modes differ by one loop. `draw(36, n, 0, 0)` submits n instances in
 * one call; the other mode rebinds group 1 at a per-object dynamic offset and
 * calls `draw(36, 1, 0, 0)` n times, so `objectRef.index` does the counting
 * that `@builtin(instance_index)` did before. Same pipeline, same shader, same
 * instance buffer — and the rebinding, not the draw, is where the money goes.
 *
 * ⚠️ This block used to describe the per-object mode as `draw(36, 1, 0, i)`
 * using `firstInstance`. It never did that, and the wrong account hides the
 * actual lesson: a bare draw is cheap, and it is pointing the GPU at a
 * different object beforehand that costs.
 */

const MAX_INSTANCES = 10_000;
const VERTICES_PER_CUBE = 36;
const TRIANGLES_PER_CUBE = 12;
/** Bytes per instance: vec3 offset + phase + vec3 tint + scale. */
const INSTANCE_STRIDE = 32;

const SHADER = /* wgsl */ `
struct Instance {
  offset: vec3f,
  phase: f32,
  tint: vec3f,
  scale: f32,
};

struct Params {
  viewProjection: mat4x4f,
  time: f32,
  spin: f32,
  scale: f32,
  dark: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;

// The per-object binding. Drawing one object at a time means telling the GPU
// which object each call is about, and that rebinding — not the draw itself —
// is where per-object rendering actually spends its money.
struct ObjectRef { index: u32 };
@group(1) @binding(0) var<uniform> objectRef: ObjectRef;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) tint: vec3f,
};

// A unit cube with no vertex buffer at all: 6 faces of 6 vertices, built from
// the vertex index. Geometry this small costs less to compute than to fetch.
fn cubeCorner(index: u32) -> vec2f {
  var quad = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  return quad[index % 6u];
}

fn faceNormal(face: u32) -> vec3f {
  switch face {
    case 0u: { return vec3f(1.0, 0.0, 0.0); }
    case 1u: { return vec3f(-1.0, 0.0, 0.0); }
    case 2u: { return vec3f(0.0, 1.0, 0.0); }
    case 3u: { return vec3f(0.0, -1.0, 0.0); }
    case 4u: { return vec3f(0.0, 0.0, 1.0); }
    default: { return vec3f(0.0, 0.0, -1.0); }
  }
}

fn facePoint(face: u32, p: vec2f) -> vec3f {
  switch face {
    case 0u: { return vec3f(1.0, p.y, -p.x); }
    case 1u: { return vec3f(-1.0, p.y, p.x); }
    case 2u: { return vec3f(p.x, 1.0, -p.y); }
    case 3u: { return vec3f(p.x, -1.0, p.y); }
    case 4u: { return vec3f(p.x, p.y, 1.0); }
    default: { return vec3f(-p.x, p.y, -1.0); }
  }
}

fn rotateY(v: vec3f, angle: f32) -> vec3f {
  let s = sin(angle);
  let c = cos(angle);
  return vec3f(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VSOut {
  // Instanced: one call, instanceIndex counts 0..n while objectRef stays 0.
  // Per object: n calls, instanceIndex is always 0 while objectRef is rebound
  // to each object in turn. Same sum, same shader, same pipeline — the two
  // modes differ only in which side of the addition is doing the counting.
  let inst = instances[instanceIndex + objectRef.index];

  let face = vertexIndex / 6u;
  let local = facePoint(face, cubeCorner(vertexIndex)) * inst.scale * params.scale;

  let angle = inst.phase + params.time * params.spin;
  let world = rotateY(local, angle) + inst.offset;

  var out: VSOut;
  out.position = params.viewProjection * vec4f(world, 1.0);
  out.normal = rotateY(faceNormal(face), angle);
  out.tint = inst.tint;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let lightDir = normalize(vec3f(0.45, 0.85, 0.35));
  let lambert = max(dot(normalize(in.normal), lightDir), 0.0);
  // Enough ambient that a face turned away still reads as a face.
  let ambient = select(0.30, 0.42, params.dark < 0.5);
  return vec4f(in.tint * (ambient + lambert * 0.85), 1.0);
}
`;

type Status = 'checking' | 'running' | 'unsupported' | 'failed';
type Mode = 'instanced' | 'per-object';

interface InstancingControls {
  count: number;
  mode: Mode;
  scale: number;
  spin: number;
  spinning: boolean;
}

const DEFAULTS: InstancingControls = {
  count: 4000,
  mode: 'instanced',
  scale: 1,
  spin: 0.5,
  spinning: true,
};

const PRESETS: Preset<InstancingControls>[] = [
  {
    label: 'Ten thousand, one call',
    note: 'Ten thousand cubes, 120,000 triangles, and a single draw call. Note the CPU figure, then switch the mode below without touching anything else.',
    values: { count: MAX_INSTANCES, mode: 'instanced' },
  },
  {
    label: 'Ten thousand calls',
    note: 'The same ten thousand cubes, the same 120,000 triangles, the same shader. Only the number of times the CPU asked has changed — and that is the whole difference you are looking at.',
    values: { count: MAX_INSTANCES, mode: 'per-object' },
  },
  {
    label: 'Where it starts to hurt',
    note: 'A thousand draw calls is a modest scene by triangle count and already a measurable slice of a frame. This is the number that decides how much you can draw, not the triangles.',
    values: { count: 1000, mode: 'per-object', scale: 1.6 },
  },
];

/**
 * A golden-angle spiral, so raising the count grows the field outward rather
 * than reshuffling it — the arrangement you already looked at stays put.
 */
function seedInstances(): Float32Array {
  const data = new Float32Array(MAX_INSTANCES * (INSTANCE_STRIDE / 4));
  for (let i = 0; i < MAX_INSTANCES; i++) {
    const t = i / MAX_INSTANCES;
    const angle = i * 2.399963;
    const radius = Math.sqrt(t) * 9.5;
    const base = i * 8;

    data[base] = Math.cos(angle) * radius;
    // A standing wave through the disc, so the field has relief to shade
    // against rather than reading as a flat plate of dots.
    data[base + 1] = Math.sin(radius * 0.85 - 1.2) * 2.1;
    data[base + 2] = Math.sin(angle) * radius;
    data[base + 3] = angle;

    // The same cool-to-warm ramp the compute lab uses, so the two WebGPU labs
    // look like they come from the same place.
    const warm = Math.min(1, radius / 9.5);
    data[base + 4] = 0.24 + warm * 0.76;
    data[base + 5] = 0.62 + warm * 0.1;
    data[base + 6] = 1.0 - warm * 0.65;
    data[base + 7] = 0.155;
  }
  return data;
}

const SOURCE = [
  {
    label: 'The shader both modes run',
    language: 'wgsl' as const,
    source: SHADER.trim(),
    note: 'One module, one pipeline, one bind group — used unchanged by both modes. Nothing in here knows how many draw calls produced it.',
  },
  {
    label: 'The only line that differs',
    language: 'typescript' as const,
    source: `// One call. Bind object 0, and let instance_index
// count through the rest.
pass.setBindGroup(1, objectBind, [0]);
pass.draw(36, count, 0, 0);

// One call each. Every object needs the GPU pointed
// at it first, and that rebinding is the real cost.
for (let i = 0; i < count; i++) {
  pass.setBindGroup(1, objectBind, [i * align]);
  pass.draw(36, 1, 0, 0);
}`,
    note: 'The same vertices, the same instance buffer, the same pipeline and the same shader. Only the number of times the CPU speaks to the GPU changes.',
  },
];

export function InstancingLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // A shared link is user input that reaches a draw loop: `?count=1e9` in
  // per-object mode would issue a billion draw calls and hang the tab.
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS, {
    count: (value) => Number.isInteger(value) && value >= 1 && value <= MAX_INSTANCES,
    mode: (value) => value === 'instanced' || value === 'per-object',
    scale: (value) => value >= 0.3 && value <= 2.5,
    spin: (value) => value >= 0 && value <= 2,
  });
  const [status, setStatus] = useState<Status>('checking');
  const [detail, setDetail] = useState('');
  const [stats, setStats] = useState({ cpu: 0, fps: 0 });
  const { palette, theme } = useTheme();

  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const isDarkRef = useRef(theme === 'dark');
  isDarkRef.current = theme === 'dark';

  // Camera, driven by dragging on the canvas like every other lab.
  const orbitRef = useRef({ azimuth: 0.7, elevation: 0.42 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const set = useCallback(
    <K extends keyof InstancingControls>(key: K, value: InstancingControls[K]) => {
      setControls((prev) => ({ ...prev, [key]: value }));
    },
    [setControls],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!navigator.gpu) {
      setStatus('unsupported');
      return;
    }

    let disposed = false;
    let frameId = 0;
    let device: GPUDevice | undefined;
    let observer: ResizeObserver | undefined;
    let depth: GPUTexture | undefined;

    (async () => {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          if (!disposed) setStatus('unsupported');
          return;
        }
        device = await adapter.requestDevice();
        if (disposed) {
          device.destroy();
          return;
        }

        const context = canvas.getContext('webgpu');
        if (!context) {
          setStatus('unsupported');
          return;
        }
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format, alphaMode: 'opaque' });

        const shaderModule = device.createShaderModule({ code: SHADER });

        const instanceBuffer = device.createBuffer({
          size: MAX_INSTANCES * INSTANCE_STRIDE,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(instanceBuffer, 0, seedInstances());

        // mat4 (64) + four floats (16).
        const paramsBuffer = device.createBuffer({
          size: 80,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
              buffer: { type: 'uniform' },
            },
            {
              binding: 1,
              visibility: GPUShaderStage.VERTEX,
              buffer: { type: 'read-only-storage' },
            },
          ],
        });

        // One slot per object, each at the alignment the device demands, so a
        // draw can be pointed at any single object by offset alone.
        const align = device.limits.minUniformBufferOffsetAlignment;
        const objectBuffer = device.createBuffer({
          size: align * MAX_INSTANCES,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const objectSlots = new Uint32Array((align / 4) * MAX_INSTANCES);
        for (let i = 0; i < MAX_INSTANCES; i++) objectSlots[i * (align / 4)] = i;
        device.queue.writeBuffer(objectBuffer, 0, objectSlots);

        const objectLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: { type: 'uniform', hasDynamicOffset: true, minBindingSize: 4 },
            },
          ],
        });
        const objectBind = device.createBindGroup({
          layout: objectLayout,
          entries: [
            { binding: 0, resource: { buffer: objectBuffer, size: 4 } },
          ],
        });

        const pipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout, objectLayout],
          }),
          vertex: { module: shaderModule, entryPoint: 'vs' },
          fragment: {
            module: shaderModule,
            entryPoint: 'fs',
            targets: [{ format }],
          },
          primitive: { topology: 'triangle-list', cullMode: 'back' },
          depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: true,
            depthCompare: 'less',
          },
        });

        const bindGroup = device.createBindGroup({
          layout: bindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: paramsBuffer } },
            { binding: 1, resource: { buffer: instanceBuffer } },
          ],
        });

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width === width && canvas.height === height && depth) return;
          canvas.width = width;
          canvas.height = height;
          depth?.destroy();
          depth = device!.createTexture({
            size: { width, height },
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });
        };
        observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        const params = new Float32Array(20);
        let elapsed = 0;
        let previous = performance.now();
        // Exponential averages: a per-frame number flickers too fast to read.
        let cpuAverage = 0;
        let fpsAverage = 0;
        let lastReport = 0;

        const loop = (now: number) => {
          if (disposed || !device || !depth) return;
          const dt = Math.min((now - previous) / 1000, 0.05);
          previous = now;

          const current = controlsRef.current;
          if (current.spinning) elapsed += dt;

          const aspect = canvas.width / canvas.height;
          const eye = orbitToCartesian(
            orbitRef.current.azimuth,
            orbitRef.current.elevation,
            24,
          );
          const viewProjection = multiply(
            perspective(Math.PI / 4, aspect, 0.1, 200),
            lookAt(eye, [0, 0, 0], [0, 1, 0]),
          );

          params.set(viewProjection, 0);
          params[16] = elapsed;
          params[17] = current.spin;
          params[18] = current.scale;
          params[19] = isDarkRef.current ? 1 : 0;
          device.queue.writeBuffer(paramsBuffer, 0, params);

          const clear = paletteRef.current.clear;

          // Everything between these two marks is CPU work: building the pass,
          // issuing the draws, and handing the buffer to the driver. This is
          // the number the lab exists to move.
          const cpuStart = performance.now();

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: clear[0], g: clear[1], b: clear[2], a: 1 },
              },
            ],
            depthStencilAttachment: {
              view: depth.createView(),
              depthLoadOp: 'clear',
              depthStoreOp: 'store',
              depthClearValue: 1,
            },
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);

          if (current.mode === 'instanced') {
            // Bind once at object 0 and let instanceIndex do the counting.
            pass.setBindGroup(1, objectBind, [0]);
            pass.draw(VERTICES_PER_CUBE, current.count, 0, 0);
          } else {
            // What drawing objects one at a time actually looks like: point the
            // per-object binding at this object, then ask for it.
            for (let i = 0; i < current.count; i++) {
              pass.setBindGroup(1, objectBind, [i * align]);
              pass.draw(VERTICES_PER_CUBE, 1, 0, 0);
            }
          }

          pass.end();
          device.queue.submit([encoder.finish()]);

          const cpu = performance.now() - cpuStart;

          cpuAverage = cpuAverage === 0 ? cpu : cpuAverage * 0.9 + cpu * 0.1;
          const fps = dt > 0 ? 1 / dt : 0;
          fpsAverage = fpsAverage === 0 ? fps : fpsAverage * 0.9 + fps * 0.1;

          // Throttled, because setting React state every frame would itself
          // become a measurable part of what this lab claims to measure.
          if (now - lastReport > 200) {
            lastReport = now;
            setStats({ cpu: cpuAverage, fps: fpsAverage });
          }

          frameId = requestAnimationFrame(loop);
        };

        setStatus('running');
        frameId = requestAnimationFrame(loop);
      } catch (error) {
        if (disposed) return;
        setStatus('failed');
        setDetail(error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      depth?.destroy();
      device?.destroy();
    };
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const orbit = orbitRef.current;
    orbit.azimuth += (event.clientX - drag.x) * 0.007;
    orbit.elevation = Math.max(
      -1.4,
      Math.min(1.4, orbit.elevation + (event.clientY - drag.y) * 0.007),
    );
    dragRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  // A reading only exists once the loop has actually produced one.
  const measured = status === 'running' && stats.fps > 0;
  const drawCalls = controls.mode === 'instanced' ? 1 : controls.count;
  const triangles = controls.count * TRIANGLES_PER_CUBE;

  return (
    <LabLayout
      readoutTitle="What the frame cost"
      canvas={
        <div>
          <div
            className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
            style={{ aspectRatio: '16 / 10' }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-label="A field of cubes drawn either in one instanced call or one call each"
              role="img"
              className="block h-full w-full cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'pan-y' }}
            />
            {status !== 'running' ? (
              <div className="absolute inset-0 grid place-items-center bg-ink-800 p-8 text-center">
                <div className="max-w-md">
                  {status === 'checking' ? (
                    <p className="text-sm text-fg-muted">Checking for WebGPU…</p>
                  ) : status === 'unsupported' ? (
                    <>
                      <p className="text-sm font-medium text-fg">
                        This lab needs WebGPU, and this browser does not have it.
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
                        The measurement here is the CPU cost of a draw call, and
                        WebGL and WebGPU do not charge the same price for one —
                        running it on WebGL would answer a different question and
                        report it as this one.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-fg">
                        WebGPU is here, but the device would not start.
                      </p>
                      <p className="mt-3 font-mono text-2xs leading-relaxed text-fg-faint">
                        {detail}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <p className="mt-2 font-mono text-2xs text-fg-faint">
            Drag to orbit · {drawCalls.toLocaleString()} draw{' '}
            {drawCalls === 1 ? 'call' : 'calls'} per frame
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

          <Segmented<Mode>
            label="How to draw them"
            value={controls.mode}
            options={[
              { value: 'instanced', label: 'One call' },
              { value: 'per-object', label: 'One each' },
            ]}
            onChange={(value) => set('mode', value)}
          />

          <ControlGroup title="The scene">
            <Slider
              label="Cubes"
              value={controls.count}
              min={1}
              max={MAX_INSTANCES}
              step={1}
              precision={0}
              onChange={(value) => set('count', Math.round(value))}
            />
            <Slider
              label="Cube size"
              value={controls.scale}
              min={0.3}
              max={2.5}
              step={0.05}
              onChange={(value) => set('scale', value)}
            />
            <Slider
              label="Spin"
              value={controls.spin}
              min={0}
              max={2}
              step={0.05}
              onChange={(value) => set('spin', value)}
            />
            <Toggle
              label="Animate"
              checked={controls.spinning}
              onChange={(value) => set('spinning', value)}
            />
          </ControlGroup>

          <ResetButton onClick={() => setControls(DEFAULTS)} />
          {/* Last in the column: it describes the state above it. */}
          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
          </div>
        </>
      }
      readout={
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Draw calls"
            value={drawCalls.toLocaleString()}
            tone={controls.mode === 'instanced' ? 'good' : 'warn'}
          />
          <Stat label="Triangles" value={triangles.toLocaleString()} />
          {/*
            Only the measured stats are gated. Draw calls and triangles are
            arithmetic on the controls and stay true whether or not the device
            started; CPU and frame rate are readings, and reading 0.00 ms in the
            "good" green on a browser that never ran the lab is the readout
            lying about the one number the lab exists to show.
          */}
          <Stat
            label="CPU per frame"
            value={measured ? `${stats.cpu.toFixed(2)} ms` : '—'}
            tone={
              !measured
                ? 'neutral'
                : stats.cpu > 8
                  ? 'warn'
                  : stats.cpu > 3
                    ? 'neutral'
                    : 'good'
            }
          />
          <Stat
            label="Frame rate"
            value={measured ? `${Math.round(stats.fps)} fps` : '—'}
          />
        </div>
      }
      readoutCaption={
        <>
          Switch the mode and watch which number moves. The triangle count does not
          change, the shader does not change, and the buffer does not change — the
          GPU is asked for exactly the same picture either way, and produces it. What
          changes is how many times it was asked, and on a real scene that is usually
          the number standing between you and the frame budget. This is why engines
          batch, why materials get merged, and why &ldquo;reduce your poly count&rdquo;
          is so often the wrong advice.
          <br />
          <br />
          <span className="text-fg-muted">CPU per frame</span> is measured around
          encoding and submitting the pass, so it is the cost of asking rather than of
          drawing. It is a real measurement from your machine, and it will differ from
          anyone else&rsquo;s.
          <br />
          <br />
          On a fast machine the frame rate may not move at all, and that is worth
          understanding rather than hiding: ten thousand cubes is a small scene, and
          the milliseconds here are being spent out of a budget nothing else is
          competing for. The figure to carry away is the ratio, not the absolute —
          whatever the CPU cost of one call is on your hardware, per-object drawing
          pays it ten thousand times, and a real frame has a game in it as well.
        </>
      }
      source={<LabSource samples={SOURCE} />}
    />
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'neutral' | 'warn';
}) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      <div
        className={`tabular font-mono text-lg ${
          tone === 'good' ? 'text-axis-y' : tone === 'warn' ? 'text-amber' : 'text-fg'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
