/**
 * Static geometry used by the labs. Everything is plain Float32Array data so
 * it can be read, logged, and reasoned about without a scene graph in the way.
 */

export interface Mesh {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
}

/**
 * A unit cube centred on the origin, one colour per face.
 *
 * Six colours rather than one so that orientation is readable: you can tell a
 * 90-degree rotation from a 270-degree one, and a reflection from a rotation.
 */
export function cube(): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const faces: { normal: [number, number, number]; color: [number, number, number] }[] = [
    { normal: [0, 0, 1], color: [0.30, 0.64, 1.00] },  // +Z front  — blue
    { normal: [0, 0, -1], color: [0.16, 0.36, 0.62] }, // -Z back   — deep blue
    { normal: [1, 0, 0], color: [1.00, 0.42, 0.42] },  // +X right  — red
    { normal: [-1, 0, 0], color: [0.62, 0.24, 0.28] }, // -X left   — deep red
    { normal: [0, 1, 0], color: [0.45, 0.90, 0.62] },  // +Y top    — green
    { normal: [0, -1, 0], color: [0.22, 0.50, 0.36] }, // -Y bottom — deep green
  ];

  for (const { normal, color } of faces) {
    // Build a basis for the face: two tangents perpendicular to the normal.
    const [nx, ny, nz] = normal;
    const up: [number, number, number] = Math.abs(ny) > 0.9 ? [0, 0, 1] : [0, 1, 0];
    const tx: [number, number, number] = [
      up[1] * nz - up[2] * ny,
      up[2] * nx - up[0] * nz,
      up[0] * ny - up[1] * nx,
    ];
    const ty: [number, number, number] = [
      ny * tx[2] - nz * tx[1],
      nz * tx[0] - nx * tx[2],
      nx * tx[1] - ny * tx[0],
    ];

    const base = positions.length / 3;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      positions.push(
        (nx + u * tx[0] + v * ty[0]) * 0.5,
        (ny + u * tx[1] + v * ty[1]) * 0.5,
        (nz + u * tx[2] + v * ty[2]) * 0.5,
      );
      normals.push(nx, ny, nz);
      colors.push(...color);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint16Array(indices),
  };
}

/** Ground grid on the XZ plane, as line-segment pairs. */
export function grid(halfExtent = 5, step = 1): Float32Array {
  const points: number[] = [];
  for (let i = -halfExtent; i <= halfExtent; i += step) {
    points.push(i, 0, -halfExtent, i, 0, halfExtent);
    points.push(-halfExtent, 0, i, halfExtent, 0, i);
  }
  return new Float32Array(points);
}

/**
 * The three world axes as coloured line segments. X red, Y green, Z blue —
 * the colours come from the active theme so they stay legible on both grounds.
 */
export function axes(
  len = 2,
  tint: {
    axisX: readonly [number, number, number];
    axisY: readonly [number, number, number];
    axisZ: readonly [number, number, number];
  },
): { positions: Float32Array; colors: Float32Array } {
  // prettier-ignore
  const positions = new Float32Array([
    0, 0, 0, len, 0, 0,
    0, 0, 0, 0, len, 0,
    0, 0, 0, 0, 0, len,
  ]);
  const colors = new Float32Array([
    ...tint.axisX, ...tint.axisX,
    ...tint.axisY, ...tint.axisY,
    ...tint.axisZ, ...tint.axisZ,
  ]);
  return { positions, colors };
}

/** The 8 corners of the canonical clip cube, in NDC. */
export const NDC_CORNERS: [number, number, number][] = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
];

/** Index pairs joining `NDC_CORNERS` into the 12 edges of a box. */
export const BOX_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/** Line-segment pairs for a wireframe box spanning the NDC cube. */
export function boxWireframe(
  corners: readonly [number, number, number][] = NDC_CORNERS,
): Float32Array {
  const points: number[] = [];
  for (const [a, b] of BOX_EDGES) {
    points.push(...corners[a], ...corners[b]);
  }
  return new Float32Array(points);
}
