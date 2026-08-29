'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The same scene, on real WebGPU. Runs if the browser has it and says so
 * plainly if it does not — a page comparing technologies should not pretend
 * one of them is available when it is not.
 */
const SHADER = `
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) index: u32) -> VSOut {
  var corners = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var out: VSOut;
  out.pos = vec4f(corners[index], 0, 1);
  out.uv = corners[index] * 0.5 + 0.5;
  return out;
}

struct Uniforms { time: f32 };
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
  let colour = 0.5 + 0.5 * cos(u.time + vec3f(uv, uv.x) + vec3f(0.0, 2.0, 4.0));
  return vec4f(colour, 1.0);
}
`;

type Status = 'checking' | 'running' | 'unsupported' | 'failed';

export function PlasmaWebGPU() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [detail, setDetail] = useState('');

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
        // requestAdapter resolves to null on unsupported hardware rather than
        // throwing — the single most common WebGPU crash is not checking this.
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
        const pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module: shaderModule, entryPoint: 'vs' },
          fragment: { module: shaderModule, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        });

        // A lone f32 still needs a 16-byte buffer: uniform blocks are padded.
        const uniforms = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: { buffer: uniforms } }],
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

        const start = performance.now();
        const loop = (now: number) => {
          if (disposed || !device) return;
          device.queue.writeBuffer(
            uniforms,
            0,
            new Float32Array([(now - start) / 1000, 0, 0, 0]),
          );

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
              },
            ],
          });
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(3);
          pass.end();
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

  return (
    <div>
      <div
        className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
        style={{ aspectRatio: '16 / 7' }}
      >
        <canvas
          ref={canvasRef}
          aria-label="An animated cosine-palette plasma rendered with WebGPU"
          role="img"
          className="block h-full w-full"
        />
        {status !== 'running' ? (
          <div className="absolute inset-0 grid place-items-center bg-ink-800 p-6 text-center">
            <p className="max-w-sm text-xs leading-relaxed text-fg-muted">
              {status === 'checking' ? (
                'Checking for WebGPU…'
              ) : status === 'unsupported' ? (
                <>
                  <span className="text-fg">This browser has no WebGPU.</span> The
                  WebGL demo above is running; this one cannot. That gap is the whole
                  practical argument for keeping a fallback.
                </>
              ) : (
                <>
                  <span className="text-red">WebGPU failed to start.</span>
                  <span className="mt-2 block font-mono text-2xs text-fg-faint">
                    {detail}
                  </span>
                </>
              )}
            </p>
          </div>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-2xs text-fg-faint">
        {status === 'running'
          ? 'Live · running on WebGPU in your browser right now'
          : 'Not running in this browser'}
      </p>
    </div>
  );
}
