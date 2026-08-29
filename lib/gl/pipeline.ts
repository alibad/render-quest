/**
 * The coordinate spaces a vertex passes through, as data.
 *
 * Model → World → View → Clip → NDC → Screen. Each step is one matrix multiply
 * except the one that is not a matrix at all — the perspective divide between
 * clip and NDC, which the GPU performs for you and which is where most of the
 * confusion lives.
 */

import {
  multiply,
  transformVec4,
  type Mat4,
  type Vec4,
} from '../math/mat4';

export const SPACES = ['model', 'world', 'view', 'clip', 'ndc', 'screen'] as const;
export type Space = (typeof SPACES)[number];

export interface PipelineContext {
  model: Mat4;
  view: Mat4;
  projection: Mat4;
  /** Viewport size in pixels, used only for the final screen mapping. */
  viewport: { width: number; height: number };
}

/** Every intermediate value for one vertex, ready to print in a table. */
export interface VertexTrace {
  model: Vec4;
  world: Vec4;
  view: Vec4;
  clip: Vec4;
  ndc: [number, number, number];
  screen: [number, number];
}

export function traceVertex(
  point: readonly [number, number, number],
  ctx: PipelineContext,
): VertexTrace {
  const model: Vec4 = [point[0], point[1], point[2], 1];
  const world = transformVec4(ctx.model, model);
  const view = transformVec4(ctx.view, world);
  const clip = transformVec4(ctx.projection, view);

  // The divide. w is -z_view for a perspective matrix, and exactly 1 for an
  // orthographic one — which is why orthographic never shrinks anything.
  const w = clip[3] === 0 ? 1 : clip[3];
  const ndc: [number, number, number] = [clip[0] / w, clip[1] / w, clip[2] / w];

  // Viewport transform. y flips because NDC counts up and pixels count down.
  const screen: [number, number] = [
    ((ndc[0] + 1) / 2) * ctx.viewport.width,
    ((1 - ndc[1]) / 2) * ctx.viewport.height,
  ];

  return { model, world, view, clip, ndc, screen };
}

/**
 * Where a point should be *drawn* when the lab is showing a given space.
 *
 * Screen space is plotted as NDC flattened onto the image plane and widened by
 * the viewport aspect — because that is what screen space is: NDC in pixels,
 * with the depth thrown away.
 */
export function positionInSpace(
  point: readonly [number, number, number],
  space: Space,
  ctx: PipelineContext,
): [number, number, number] {
  const trace = traceVertex(point, ctx);
  switch (space) {
    case 'model':
      return [trace.model[0], trace.model[1], trace.model[2]];
    case 'world':
      return [trace.world[0], trace.world[1], trace.world[2]];
    case 'view':
      return [trace.view[0], trace.view[1], trace.view[2]];
    case 'clip':
      // Raw clip coordinates, before the divide: still a pyramid, not a cube.
      return [trace.clip[0], trace.clip[1], trace.clip[2]];
    case 'ndc':
      return trace.ndc;
    case 'screen': {
      const aspect = ctx.viewport.width / ctx.viewport.height;
      return [trace.ndc[0] * aspect, trace.ndc[1], 0];
    }
  }
}

/** Transforms a flat [x,y,z,...] buffer into the given space. */
export function bufferInSpace(
  source: Float32Array,
  space: Space,
  ctx: PipelineContext,
): Float32Array {
  const out = new Float32Array(source.length);
  for (let i = 0; i < source.length; i += 3) {
    const p = positionInSpace([source[i], source[i + 1], source[i + 2]], space, ctx);
    out[i] = p[0];
    out[i + 1] = p[1];
    out[i + 2] = p[2];
  }
  return out;
}

/** Linear blend between two equal-length position buffers. */
export function lerpBuffers(
  a: Float32Array,
  b: Float32Array,
  t: number,
): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i] + (b[i] - a[i]) * t;
  }
  return out;
}

/** The full model-view-projection chain, for handing to a shader. */
export function modelViewProjection(ctx: PipelineContext): Mat4 {
  return multiply(multiply(ctx.projection, ctx.view), ctx.model);
}

export const SPACE_LABELS: Record<Space, { title: string; note: string }> = {
  model: {
    title: 'Model',
    note: 'The mesh as its author built it, around its own origin. Nothing has happened yet.',
  },
  world: {
    title: 'World',
    note: 'The model matrix places it in the scene — the only step you usually author by hand.',
  },
  view: {
    title: 'View',
    note: 'The camera does not move. The world moves so the camera sits at the origin looking down −Z.',
  },
  clip: {
    title: 'Clip',
    note: 'The projection has been applied but nothing has been divided yet, so this is still a pyramid. w now carries the depth.',
  },
  ndc: {
    title: 'NDC',
    note: 'Divide by w and the pyramid becomes a cube. Everything outside −1…1 is discarded.',
  },
  screen: {
    title: 'Screen',
    note: 'Scaled to pixels and flattened. Depth has left the picture — it survives only in the depth buffer.',
  },
};
