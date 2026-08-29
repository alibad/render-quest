/**
 * 4x4 matrices, stored column-major — the same layout WebGL expects, so a
 * `Mat4` can go straight into `gl.uniformMatrix4fv(loc, false, m)` with no
 * transpose flag and no surprises.
 *
 * Column-major means index = column * 4 + row:
 *
 *     m[0]  m[4]  m[8]   m[12]        Xx  Yx  Zx  Tx
 *     m[1]  m[5]  m[9]   m[13]   =    Xy  Yy  Zy  Ty
 *     m[2]  m[6]  m[10]  m[14]        Xz  Yz  Zz  Tz
 *     m[3]  m[7]  m[11]  m[15]        0   0   0   1
 *
 * So the last *column* (indices 12..14) is the translation — the single fact
 * that trips up everyone who has read the maths in row-major textbook notation
 * and then printed the array. `toRows()` exists to bridge the two.
 */

export type Mat4 = Float32Array;

export function identity(): Mat4 {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/**
 * Returns `a * b`.
 *
 * Order matters and reads right-to-left: the rightmost matrix is applied to the
 * vertex first. `multiply(T, R)` rotates, *then* translates.
 */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Multiplies a chain left-to-right: `multiplyAll(T, R, S)` === `T * R * S`. */
export function multiplyAll(...mats: Mat4[]): Mat4 {
  return mats.reduce((acc, m) => multiply(acc, m), identity());
}

export function translation(x: number, y: number, z: number): Mat4 {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);
}

export function scaling(x: number, y: number, z: number): Mat4 {
  // prettier-ignore
  return new Float32Array([
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]);
}

export function rotationX(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ]);
}

export function rotationY(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  // prettier-ignore
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ]);
}

export function rotationZ(radians: number): Mat4 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  // prettier-ignore
  return new Float32Array([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

/** Shear along one axis, driven by another. `shear('xy', k)` slides x by k*y. */
export function shear(plane: 'xy' | 'xz' | 'yx' | 'yz' | 'zx' | 'zy', k: number): Mat4 {
  const m = identity();
  const axis = { x: 0, y: 1, z: 2 } as const;
  const row = axis[plane[0] as 'x' | 'y' | 'z'];
  const col = axis[plane[1] as 'x' | 'y' | 'z'];
  m[col * 4 + row] = k;
  return m;
}

/**
 * Perspective projection. `fovY` is the *vertical* field of view in radians.
 *
 * The magic lives in m[11] = -1: it copies -z into the w component, and the
 * perspective divide that the GPU performs after the vertex shader (x/w, y/w)
 * is what actually makes distant things small.
 */
export function perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const rangeInv = 1 / (near - far);
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * rangeInv, -1,
    0, 0, far * near * rangeInv * 2, 0,
  ]);
}

/**
 * Orthographic projection — a box, not a pyramid. No perspective divide
 * happens because m[11] stays 0 and w stays 1, so parallel lines stay parallel.
 */
export function orthographic(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Mat4 {
  const w = right - left;
  const h = top - bottom;
  const d = far - near;
  // prettier-ignore
  return new Float32Array([
    2 / w, 0, 0, 0,
    0, 2 / h, 0, 0,
    0, 0, -2 / d, 0,
    -(right + left) / w, -(top + bottom) / h, -(far + near) / d, 1,
  ]);
}

/** Builds a view matrix: the inverse of where the camera is standing. */
export function lookAt(
  eye: readonly [number, number, number],
  target: readonly [number, number, number],
  up: readonly [number, number, number],
): Mat4 {
  const zx = eye[0] - target[0];
  const zy = eye[1] - target[1];
  const zz = eye[2] - target[2];
  const zLen = Math.hypot(zx, zy, zz) || 1;
  const z: [number, number, number] = [zx / zLen, zy / zLen, zz / zLen];

  const xRaw: [number, number, number] = [
    up[1] * z[2] - up[2] * z[1],
    up[2] * z[0] - up[0] * z[2],
    up[0] * z[1] - up[1] * z[0],
  ];
  const xLen = Math.hypot(...xRaw) || 1;
  const x: [number, number, number] = [xRaw[0] / xLen, xRaw[1] / xLen, xRaw[2] / xLen];

  const y: [number, number, number] = [
    z[1] * x[2] - z[2] * x[1],
    z[2] * x[0] - z[0] * x[2],
    z[0] * x[1] - z[1] * x[0],
  ];

  // prettier-ignore
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
    -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
    -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
    1,
  ]);
}

/** General 4x4 inverse. Returns the identity for a singular matrix. */
export function invert(m: Mat4): Mat4 {
  const inv = new Float32Array(16);

  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (det === 0) return identity();

  const invDet = 1 / det;
  for (let i = 0; i < 16; i++) inv[i] *= invDet;
  return inv;
}

/** The 3x3 inverse-transpose, for transforming normals under non-uniform scale. */
export function normalMatrix(model: Mat4): Float32Array {
  const inv = invert(model);
  // Transpose while narrowing to the upper-left 3x3.
  // prettier-ignore
  return new Float32Array([
    inv[0], inv[4], inv[8],
    inv[1], inv[5], inv[9],
    inv[2], inv[6], inv[10],
  ]);
}

/**
 * The upper-left 3x3, used *incorrectly* on purpose in the shading lab: this is
 * what you get if you transform normals with the model matrix directly. Under
 * non-uniform scale it tilts them off the surface. Compare `normalMatrix`.
 */
export function upperLeft3x3(m: Mat4): Float32Array {
  // prettier-ignore
  return new Float32Array([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ]);
}

export type Vec4 = [number, number, number, number];

/** Applies `m` to a homogeneous point. Returns clip space — w is *not* divided. */
export function transformVec4(m: Mat4, v: Vec4): Vec4 {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
    m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3],
  ];
}

/** The perspective divide the GPU does for you between clip space and NDC. */
export function perspectiveDivide(clip: Vec4): [number, number, number] {
  const w = clip[3];
  if (w === 0) return [clip[0], clip[1], clip[2]];
  return [clip[0] / w, clip[1] / w, clip[2] / w];
}

/**
 * Regroups the column-major array into visual rows, so a matrix can be printed
 * the way it is written on a whiteboard. `toRows(m)[0]` is the top row.
 */
export function toRows(m: Mat4): number[][] {
  const rows: number[][] = [];
  for (let row = 0; row < 4; row++) {
    rows.push([m[row], m[4 + row], m[8 + row], m[12 + row]]);
  }
  return rows;
}

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;
