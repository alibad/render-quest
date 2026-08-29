/**
 * Sphere geometry — the right surface for a shading lab, because a curved,
 * closed shape shows every term of a lighting model at once.
 */

import type { Mesh } from './geometry';

/**
 * A UV sphere of radius 0.5 with smooth (per-vertex) normals.
 *
 * The normal of a point on a unit sphere centred at the origin is just its own
 * normalised position, which makes this the cheapest possible correct normal.
 */
export function uvSphere(segments = 64, rings = 40): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring++) {
    const v = ring / rings;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let segment = 0; segment <= segments; segment++) {
      const u = segment / segments;
      const theta = u * Math.PI * 2;

      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      positions.push(nx * 0.5, ny * 0.5, nz * 0.5);
      normals.push(nx, ny, nz);
      colors.push(1, 1, 1);
    }
  }

  // The pole rows collapse to a single point, so the quad there is really a
  // triangle. Emitting both halves would produce zero-area faces — invisible in
  // smooth shading, but black facets once flat normals are computed from them.
  const stride = segments + 1;
  for (let ring = 0; ring < rings; ring++) {
    const atNorthPole = ring === 0;
    const atSouthPole = ring === rings - 1;

    for (let segment = 0; segment < segments; segment++) {
      const a = ring * stride + segment;
      const b = a + stride;

      if (!atNorthPole) indices.push(a, b, a + 1);
      if (!atSouthPole) indices.push(a + 1, b, b + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
}

/**
 * Rebuilds a mesh with one normal per triangle instead of per vertex.
 *
 * Vertices can no longer be shared — a corner belonging to two faces needs two
 * different normals — so this expands the index buffer into unique vertices.
 * The result is flat shading: visible facets, no interpolation across a face.
 */
export function flatShaded(mesh: Mesh): Mesh {
  const triangleCount = mesh.indices.length / 3;
  const positions = new Float32Array(triangleCount * 9);
  const normals = new Float32Array(triangleCount * 9);
  const colors = new Float32Array(triangleCount * 9);
  const indices = new Uint16Array(triangleCount * 3);

  for (let t = 0; t < triangleCount; t++) {
    const i0 = mesh.indices[t * 3];
    const i1 = mesh.indices[t * 3 + 1];
    const i2 = mesh.indices[t * 3 + 2];

    const p0 = [mesh.positions[i0 * 3], mesh.positions[i0 * 3 + 1], mesh.positions[i0 * 3 + 2]];
    const p1 = [mesh.positions[i1 * 3], mesh.positions[i1 * 3 + 1], mesh.positions[i1 * 3 + 2]];
    const p2 = [mesh.positions[i2 * 3], mesh.positions[i2 * 3 + 1], mesh.positions[i2 * 3 + 2]];

    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1];
    const ny = e1[2] * e2[0] - e1[0] * e2[2];
    const nz = e1[0] * e2[1] - e1[1] * e2[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    const normal = [nx / len, ny / len, nz / len];

    const corners = [p0, p1, p2];
    for (let corner = 0; corner < 3; corner++) {
      const base = (t * 3 + corner) * 3;
      positions.set(corners[corner], base);
      normals.set(normal, base);
      colors.set([1, 1, 1], base);
      indices[t * 3 + corner] = t * 3 + corner;
    }
  }

  return { positions, normals, colors, indices };
}

/** Line segments showing each vertex normal, for the "show normals" toggle. */
export function normalLines(mesh: Mesh, length = 0.12): Float32Array {
  const count = mesh.positions.length / 3;
  const out = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const px = mesh.positions[i * 3];
    const py = mesh.positions[i * 3 + 1];
    const pz = mesh.positions[i * 3 + 2];
    out[i * 6] = px;
    out[i * 6 + 1] = py;
    out[i * 6 + 2] = pz;
    out[i * 6 + 3] = px + mesh.normals[i * 3] * length;
    out[i * 6 + 4] = py + mesh.normals[i * 3 + 1] * length;
    out[i * 6 + 5] = pz + mesh.normals[i * 3 + 2] * length;
  }
  return out;
}
