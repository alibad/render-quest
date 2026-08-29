'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ControlGroup, ResetButton, Slider, Toggle } from '@/components/lab/Controls';
import { LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { useTheme } from '@/components/site/ThemeProvider';
import type { CanvasPalette } from '@/lib/theme';

/**
 * The one lab that cannot be built on WebGL.
 *
 * Every particle's position and velocity lives in a GPU storage buffer and is
 * stepped by a compute shader. The CPU never touches a particle — it writes
 * eight floats of uniforms per frame and issues two dispatches. WebGL has no
 * compute stage and no storage buffers, so the usual workaround is to smuggle
 * state through textures and fake it in a fragment shader. This is what it
 * looks like when you simply do not have to.
 */

const MAX_PARTICLES = 120_000;
const WORKGROUP_SIZE = 64;

const SHADER = /* wgsl */ `
struct Particle {
  pos: vec2f,
  vel: vec2f,
};

struct Params {
  attractor: vec2f,
  attraction: f32,
  damping: f32,
  dt: f32,
  count: f32,
  pointSize: f32,
  aspect: f32,
  swirl: f32,
  brightness: f32,
  dark: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;

// One invocation per particle. 120k particles is 1,875 workgroups of 64, all
// in flight at once — this is the whole reason the stage exists.
@compute @workgroup_size(${WORKGROUP_SIZE})
fn cs(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u32(params.count)) { return; }

  var p = particles[i];

  let toCentre = params.attractor - p.pos;
  let dist = max(length(toCentre), 0.03);
  let dir = toCentre / dist;
  // A tangential component turns a collapse into an orbit. Pure attraction
  // pulls every particle into one dot within a second; the perpendicular term
  // gives them angular momentum, which is what makes a field instead of a blob.
  let tangent = vec2f(-dir.y, dir.x);
  // Softened inverse-square: the +0.08 stops the force exploding at the centre.
  let force = (dir + tangent * params.swirl) * params.attraction
    / (dist * dist + 0.08);

  p.vel = (p.vel + force * params.dt) * params.damping;
  p.pos = p.pos + p.vel * params.dt;

  // Wrap rather than clamp, so the field keeps breathing instead of collapsing.
  if (p.pos.x < -1.4) { p.pos.x = 1.4; }
  if (p.pos.x > 1.4) { p.pos.x = -1.4; }
  if (p.pos.y < -1.4) { p.pos.y = 1.4; }
  if (p.pos.y > 1.4) { p.pos.y = -1.4; }

  particles[i] = p;
}

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) speed: f32,
};

@group(0) @binding(0) var<storage, read> readParticles: array<Particle>;
@group(0) @binding(1) var<uniform> rparams: Params;

// Six vertices per particle, read straight out of the same storage buffer the
// compute pass just wrote. Nothing round-trips through the CPU.
@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VSOut {
  let particle = readParticles[vertexIndex / 6u];
  let corner = vertexIndex % 6u;

  var offsets = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );

  let offset = offsets[corner] * rparams.pointSize;

  var out: VSOut;
  out.position = vec4f(
    particle.pos.x + offset.x / rparams.aspect,
    particle.pos.y + offset.y,
    0.0,
    1.0
  );
  out.uv = offsets[corner];
  out.speed = length(particle.vel);
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let r = length(in.uv);
  if (r > 1.0) { discard; }

  let falloff = 1.0 - r * r;
  let heat = clamp(in.speed * 1.6, 0.0, 1.0);
  // Slow particles read cool, fast ones warm — velocity made visible.
  let cool = vec3f(0.24, 0.62, 1.0);
  let warm = vec3f(1.0, 0.72, 0.35);
  let colour = mix(cool, warm, heat);

  let b = rparams.brightness;

  if (rparams.dark > 0.5) {
    // Additive on a dark ground: overlapping sprites accumulate into light.
    // Scaled down because 60,000 of them saturate to white long before they
    // look like anything.
    return vec4f(colour * falloff * b, falloff * b);
  }

  // On a light ground adding light does nothing — the background is already
  // near white. Deepen the colour instead and let alpha do the accumulating.
  return vec4f(colour * 0.42, falloff * b * 1.9);
}
`;

type Status = 'checking' | 'running' | 'unsupported' | 'failed';

interface ComputeControls {
  count: number;
  attraction: number;
  swirl: number;
  damping: number;
  pointSize: number;
  brightness: number;
  running: boolean;
}

const DEFAULTS: ComputeControls = {
  count: 60_000,
  attraction: 0.5,
  swirl: 1.35,
  damping: 0.992,
  pointSize: 0.005,
  brightness: 0.28,
  running: true,
};

function seedParticles(): Float32Array {
  const data = new Float32Array(MAX_PARTICLES * 4);
  for (let i = 0; i < MAX_PARTICLES; i++) {
    // A disc, so the opening frame reads as a shape rather than a square.
    const angle = (i * 2.399963) % (Math.PI * 2); // golden-angle spiral
    const radius = Math.sqrt(i / MAX_PARTICLES) * 1.1;
    data[i * 4] = Math.cos(angle) * radius;
    data[i * 4 + 1] = Math.sin(angle) * radius;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 0;
  }
  return data;
}

const SOURCE = [
  {
    label: 'The compute and render shaders',
    language: 'wgsl' as const,
    source: SHADER.trim(),
    note: 'One module. The compute entry point steps the storage buffer; the vertex entry point reads the same buffer back. Nothing round-trips through the CPU.',
  },
];

export function ComputeLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [controls, setControls] = useState<ComputeControls>(DEFAULTS);
  const [status, setStatus] = useState<Status>('checking');
  const [detail, setDetail] = useState('');
  const { palette, theme } = useTheme();

  const controlsRef = useRef(controls);
  controlsRef.current = controls;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const isDarkRef = useRef(theme === 'dark');
  isDarkRef.current = theme === 'dark';
  // Attractor in clip space; follows the pointer, drifts on its own otherwise.
  const attractorRef = useRef<[number, number] | null>(null);
  const resetRef = useRef(0);

  const set = useCallback(<K extends keyof ComputeControls>(
    key: K,
    value: ComputeControls[K],
  ) => {
    setControls((prev) => ({ ...prev, [key]: value }));
  }, []);

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

        const particleBuffer = device.createBuffer({
          size: MAX_PARTICLES * 4 * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        const seed = seedParticles();
        device.queue.writeBuffer(particleBuffer, 0, seed);

        // 10 floats padded to 48 — a uniform block must be a multiple of 16.
        const paramsBuffer = device.createBuffer({
          size: 48,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const computePipeline = device.createComputePipeline({
          layout: 'auto',
          compute: { module: shaderModule, entryPoint: 'cs' },
        });

        // Blend state is baked into a pipeline, so the two grounds need two of
        // them. `layout: 'auto'` would give each its own implicit bind group
        // layout, and a bind group made from one is then invalid on the other —
        // so the layout is declared once, explicitly, and shared.
        const renderBindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: { type: 'read-only-storage' },
            },
            {
              binding: 1,
              visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
              buffer: { type: 'uniform' },
            },
          ],
        });
        const renderPipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [renderBindGroupLayout],
        });

        const makeRenderPipeline = (blend: GPUBlendState) =>
          device!.createRenderPipeline({
            layout: renderPipelineLayout,
            vertex: { module: shaderModule, entryPoint: 'vs' },
            fragment: {
              module: shaderModule,
              entryPoint: 'fs',
              targets: [{ format, blend }],
            },
            primitive: { topology: 'triangle-list' },
          });

        const additivePipeline = makeRenderPipeline({
          color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
        });
        const alphaPipeline = makeRenderPipeline({
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
        });

        // The same buffer, bound read_write for compute and read for render.
        const computeBind = device.createBindGroup({
          layout: computePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: paramsBuffer } },
          ],
        });
        // One bind group, valid on both pipelines because they share a layout.
        const renderBind = device.createBindGroup({
          layout: renderBindGroupLayout,
          entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: paramsBuffer } },
          ],
        });

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const rect = canvas.getBoundingClientRect();
          canvas.width = Math.max(1, Math.round(rect.width * dpr));
          canvas.height = Math.max(1, Math.round(rect.height * dpr));
        };
        observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        const params = new Float32Array(12);
        let lastReset = resetRef.current;
        let previous = performance.now();

        const loop = (now: number) => {
          if (disposed || !device) return;
          const dt = Math.min((now - previous) / 1000, 0.05);
          previous = now;

          const current = controlsRef.current;

          if (resetRef.current !== lastReset) {
            lastReset = resetRef.current;
            device.queue.writeBuffer(particleBuffer, 0, seed);
          }

          const time = now / 1000;
          const pointer = attractorRef.current;
          const attractor: [number, number] = pointer ?? [
            Math.cos(time * 0.31) * 0.55,
            Math.sin(time * 0.43) * 0.45,
          ];

          params[0] = attractor[0];
          params[1] = attractor[1];
          params[2] = current.attraction;
          params[3] = current.damping;
          params[4] = current.running ? dt : 0;
          params[5] = current.count;
          params[6] = current.pointSize;
          params[7] = canvas.width / canvas.height;
          params[8] = current.swirl;
          params[9] = current.brightness;
          params[10] = isDarkRef.current ? 1 : 0;
          device.queue.writeBuffer(paramsBuffer, 0, params);

          const encoder = device.createCommandEncoder();

          const compute = encoder.beginComputePass();
          compute.setPipeline(computePipeline);
          compute.setBindGroup(0, computeBind);
          compute.dispatchWorkgroups(Math.ceil(current.count / WORKGROUP_SIZE));
          compute.end();

          const clear = paletteRef.current.clear;
          const render = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: clear[0], g: clear[1], b: clear[2], a: 1 },
              },
            ],
          });
          render.setPipeline(
            isDarkRef.current ? additivePipeline : alphaPipeline,
          );
          render.setBindGroup(0, renderBind);
          render.draw(current.count * 6);
          render.end();

          device.queue.submit([encoder.finish()]);
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
      device?.destroy();
    };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    attractorRef.current = [
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    ];
  }, []);

  const dispatches = useMemo(
    () => Math.ceil(controls.count / WORKGROUP_SIZE),
    [controls.count],
  );

  return (
    <LabLayout
      readoutTitle="What the GPU is doing"
      canvas={
        <div>
          <div
            className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
            style={{ aspectRatio: '16 / 10' }}
          >
            <canvas
              ref={canvasRef}
              onPointerMove={onPointerMove}
              onPointerLeave={() => {
                attractorRef.current = null;
              }}
              aria-label="A field of particles moved by a GPU compute shader"
              role="img"
              className="block h-full w-full touch-none"
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
                        There is no fallback here, and that is the point. The other
                        four labs run on WebGL because their maths does not care which
                        API draws it. This one is a compute shader — a stage WebGL does
                        not have — so it is the honest example of a target that decides
                        your technology for you.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-red">WebGPU failed to start.</p>
                      <p className="mt-2 font-mono text-2xs text-fg-faint">{detail}</p>
                    </>
                  )}
                </div>
              </div>
            ) : null}
            {status === 'running' ? (
              <span className="pointer-events-none absolute inset-x-3 bottom-3 text-right font-mono text-2xs text-fg-faint">
                move the pointer to pull the field
              </span>
            ) : null}
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup
            title="Simulation"
            action={<ResetButton onClick={() => setControls(DEFAULTS)} />}
          >
            <Slider
              label="particles"
              value={controls.count}
              min={5000}
              max={MAX_PARTICLES}
              step={1000}
              precision={0}
              onChange={(v) => set('count', v)}
            />
            <Slider label="attraction" value={controls.attraction} min={0} max={2} onChange={(v) => set('attraction', v)} />
            <Slider label="swirl" value={controls.swirl} min={0} max={3} onChange={(v) => set('swirl', v)} />
            <Slider label="damping" value={controls.damping} min={0.95} max={1} step={0.001} precision={3} onChange={(v) => set('damping', v)} />
            <Slider label="size" value={controls.pointSize} min={0.002} max={0.02} step={0.001} precision={3} onChange={(v) => set('pointSize', v)} />
            <Slider label="brightness" value={controls.brightness} min={0.05} max={1} onChange={(v) => set('brightness', v)} />
          </ControlGroup>

          <ControlGroup title="Run">
            <Toggle
              label="Running"
              checked={controls.running}
              onChange={(v) => set('running', v)}
            />
            <button
              type="button"
              onClick={() => {
                resetRef.current += 1;
              }}
              className="w-full rounded-md border border-line px-3 py-1.5 font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              Reseed the field
            </button>
          </ControlGroup>

          <p className="border-t border-line pt-4 text-2xs leading-relaxed text-fg-faint">
            Every particle&rsquo;s position and velocity lives in GPU memory and is
            stepped there. The CPU writes eight floats per frame and issues two
            passes; it never sees a particle. That is the difference a compute stage
            makes.
          </p>
        </>
      }
      readout={
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Stat label="particles" value={controls.count.toLocaleString()} />
          <Stat label="workgroups" value={dispatches.toLocaleString()} />
          <Stat label="invocations" value={(dispatches * WORKGROUP_SIZE).toLocaleString()} />
          <Stat label="floats from CPU" value="8" />
        </dl>
      }
      source={<LabSource samples={SOURCE} />}
      readoutCaption={
        <>
          {dispatches.toLocaleString()} workgroups of {WORKGROUP_SIZE}, dispatched once
          per frame, each invocation owning one particle. The equivalent in WebGL means
          encoding positions into a floating-point texture, stepping them in a fragment
          shader, ping-ponging between two framebuffers and reading them back as
          vertices — a well-known trick, and a workaround for a missing stage rather
          than a way of expressing the problem.
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
