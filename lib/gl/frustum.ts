/**
 * Frustum geometry derived from a projection matrix.
 *
 * The insight worth keeping: a view frustum is not a separate thing you build.
 * It is simply the canonical clip cube pulled back through the projection —
 * `inverse(projection)` applied to the eight corners of [-1, 1]^3. Change the
 * field of view and the same eight corners land somewhere else.
 */

import { BOX_EDGES, NDC_CORNERS } from './geometry';
import {
  invert,
  multiply,
  perspectiveDivide,
  transformVec4,
  type Mat4,
} from '../math/mat4';


/** The eight frustum corners in world space, in `NDC_CORNERS` order. */
export function frustumCorners(
  projection: Mat4,
  view: Mat4,
): [number, number, number][] {
  const inverseViewProjection = invert(multiply(projection, view));
  return NDC_CORNERS.map((corner) =>
    perspectiveDivide(
      transformVec4(inverseViewProjection, [corner[0], corner[1], corner[2], 1]),
    ),
  ) as [number, number, number][];
}

/** 12 edges of the frustum as line-segment pairs — 24 vertices. */
export function frustumEdges(corners: [number, number, number][]): Float32Array {
  const out = new Float32Array(BOX_EDGES.length * 6);
  BOX_EDGES.forEach(([a, b], i) => {
    out.set(corners[a], i * 6);
    out.set(corners[b], i * 6 + 3);
  });
  return out;
}

/** Four rays from the eye through the far corners — 8 vertices. */
export function eyeRays(
  eye: readonly [number, number, number],
  corners: [number, number, number][],
): Float32Array {
  const out = new Float32Array(4 * 6);
  [4, 5, 6, 7].forEach((cornerIndex, i) => {
    out.set(eye, i * 6);
    out.set(corners[cornerIndex], i * 6 + 3);
  });
  return out;
}

/**
 * Is a world-space point inside the volume this matrix clips to?
 *
 * This is the actual clipping test the GPU runs, before the perspective
 * divide: a point survives when each of x, y, z lies within ±w. Doing it on
 * the CPU here lets the lab show you *which* objects the camera will keep.
 */
export function isInsideFrustum(
  viewProjection: Mat4,
  point: readonly [number, number, number],
): boolean {
  const [x, y, z, w] = transformVec4(viewProjection, [
    point[0],
    point[1],
    point[2],
    1,
  ]);
  if (w <= 0) return false; // behind the eye
  return (
    x >= -w && x <= w &&
    y >= -w && y <= w &&
    z >= -w && z <= w
  );
}
