'use client';

import { useEffect, useRef, useState } from 'react';

import { useTheme } from '@/components/site/ThemeProvider';
import { cube } from '@/lib/gl/geometry';
import { lookAt, multiply, perspective, rotationX, rotationY } from '@/lib/math/mat4';

/**
 * The second reference scene, in WebGPU.
 *
 * Same cube, same light, same matrices, same picture as the WebGL page. What
 * differs is everything around it: an adapter and a device to request, an
 * explicit vertex buffer layout instead of loose attribute pointers, a pipeline
 * object that bakes in the depth and cull state that WebGL sets with individual
 * calls, and a depth texture you allocate and resize yourself.
 */

export const CUBE_WGSL = `struct Uniforms {
  model: mat4x4f,
  viewProjection: mat4x4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) colour: vec3f,
};

@vertex
fn vs(
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) colour: vec3f,
) -> VSOut {
  var out: VSOut;
  out.position = u.viewProjection * u.model * vec4f(position, 1.0);
  // Rotation only, so the inverse-transpose is the rotation itself.
  out.normal = (u.model * vec4f(normal, 0.0)).xyz;
  out.colour = colour;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  let light = normalize(vec3f(0.4, 0.8, 0.6));
  let lambert = max(dot(normalize(in.normal), light), 0.0);

  // Lit in linear, encoded for the display — see lab 8.
  let base = pow(in.colour, vec3f(2.2));
  let lit = base * (0.12 + 0.9 * lambert);
  return vec4f(pow(lit, vec3f(1.0 / 2.2)), 1.0);
}`;

/** Matches the antialiasing the WebGL context is asked for on the sibling page. */
const SAMPLE_COUNT = 4;

type Status = 'checking' | 'running' | 'unsupported' | 'failed';

export function CubeWebGPU() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('checking');
  const [detail, setDetail] = useState('');
  const { palette } = useTheme();
  // Read through a ref so a theme change repaints without restarting the
  // device — the same reason the compute lab does it this way.
  const clearRef = useRef(palette.clear);
  clearRef.current = palette.clear;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!navigator.gpu) {
      setStatus('unsupported');
      return;
    }

    let disposed = false;
    let frame = 0;
    let device: GPUDevice | undefined;
    let depth: GPUTexture | undefined;
    let msaa: GPUTexture | undefined;
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

        const mesh = cube();
        // One interleaved buffer would be faster; three keeps the layout
        // readable and matches what the WebGL page binds.
        const make = (data: Float32Array | Uint16Array, usage: number) => {
          const buffer = device!.createBuffer({
            size: Math.ceil(data.byteLength / 4) * 4,
            usage: usage | GPUBufferUsage.COPY_DST,
          });
          device!.queue.writeBuffer(buffer, 0, data);
          return buffer;
        };
        const positions = make(mesh.positions, GPUBufferUsage.VERTEX);
        const normals = make(mesh.normals, GPUBufferUsage.VERTEX);
        const colors = make(mesh.colors, GPUBufferUsage.VERTEX);
        const indices = make(mesh.indices, GPUBufferUsage.INDEX);

        const uniforms = device.createBuffer({
          size: 128, // two mat4x4f
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const shaderModule = device.createShaderModule({ code: CUBE_WGSL });
        const layout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: { type: 'uniform' },
            },
          ],
        });
        const pipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
          vertex: {
            module: shaderModule,
            entryPoint: 'vs',
            buffers: [
              { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
              { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
              { arrayStride: 12, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }] },
            ],
          },
          fragment: { module: shaderModule, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-list', cullMode: 'back' },
          depthStencil: {
            format: 'depth24plus',
            depthWriteEnabled: true,
            depthCompare: 'less',
          },
          // The WebGL page gets antialiasing by asking the context for it. Here
          // it is a sample count on the pipeline, a second colour texture, and a
          // resolve step — three places instead of one. Worth matching, because
          // this page's whole claim is that the picture is identical and only
          // the code differs.
          multisample: { count: SAMPLE_COUNT },
        });
        const bindGroup = device.createBindGroup({
          layout,
          entries: [{ binding: 0, resource: { buffer: uniforms } }],
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
            sampleCount: SAMPLE_COUNT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });
          msaa?.destroy();
          msaa = device!.createTexture({
            size: { width, height },
            format,
            sampleCount: SAMPLE_COUNT,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
          });
        };
        observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();

        const data = new Float32Array(32);
        const start = performance.now();

        const loop = () => {
          if (disposed || !device || !depth || !msaa) return;
          const time = (performance.now() - start) / 1000;

          const model = multiply(rotationY(time * 0.6), rotationX(time * 0.35));
          const viewProjection = multiply(
            perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100),
            lookAt([0, 1.4, 4.2], [0, 0, 0], [0, 1, 0]),
          );
          data.set(model, 0);
          data.set(viewProjection, 16);
          device.queue.writeBuffer(uniforms, 0, data);

          const c = clearRef.current;
          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                // Draw into the multisampled texture, resolve into the canvas.
                view: msaa.createView(),
                resolveTarget: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: c[0], g: c[1], b: c[2], a: 1 },
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
          pass.setVertexBuffer(0, positions);
          pass.setVertexBuffer(1, normals);
          pass.setVertexBuffer(2, colors);
          pass.setIndexBuffer(indices, 'uint16');
          pass.drawIndexed(mesh.indices.length);
          pass.end();
          device.queue.submit([encoder.finish()]);

          frame = requestAnimationFrame(loop);
        };

        setStatus('running');
        frame = requestAnimationFrame(loop);
      } catch (error) {
        if (disposed) return;
        setStatus('failed');
        setDetail(error instanceof Error ? error.message : String(error));
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      depth?.destroy();
      msaa?.destroy();
      device?.destroy();
    };
  }, []);

  return (
    <div>
      <div
        className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
        style={{ aspectRatio: '16 / 9' }}
      >
      <canvas
        ref={canvasRef}
        aria-label="A lit, depth-tested cube spinning, rendered with WebGPU"
        role="img"
        className="block h-full w-full"
      />
        {status !== 'running' ? (
          <div className="absolute inset-0 grid place-items-center bg-ink-800 p-6 text-center">
            <p className="max-w-sm text-xs leading-relaxed text-fg-muted">
              {status === 'checking'
                ? 'Checking for WebGPU…'
                : status === 'unsupported'
                  ? 'This browser does not have WebGPU, so this one is not running. The WebGL page renders the identical scene.'
                  : detail}
            </p>
          </div>
        ) : null}
      </div>
      {/*
        The caption lives here rather than on the page, because the page cannot
        know whether the device started. It used to print "Live · running on
        WebGPU right now" unconditionally — directly beneath a panel saying this
        browser has no WebGPU.
      */}
      <p className="mt-2 font-mono text-2xs text-fg-faint">
        {status === 'running'
          ? 'Live · running on WebGPU in your browser right now'
          : 'Not running in this browser'}
      </p>
    </div>
  );
}
