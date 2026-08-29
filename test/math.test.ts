/**
 * Numeric checks for the matrix core. Run with:  npm run test:math
 *
 * Every lab on the site renders through these functions, so a wrong sign here
 * is a wrong lesson everywhere.
 */
import assert from 'node:assert/strict';
import {
  degToRad, identity, invert, lookAt, multiply, multiplyAll, normalMatrix,
  orthographic, perspective, perspectiveDivide, rotationY, rotationZ, scaling,
  toRows, transformVec4, translation, upperLeft3x3, type Mat4, type Vec4,
} from '../lib/math/mat4.ts';
import { cross, dot, length, normalize } from '../lib/math/vec3.ts';
import {
  eyeRays,
  frustumCorners,
  frustumEdges,
  isInsideFrustum,
} from '../lib/gl/frustum.ts';
import { flatShaded, normalLines, uvSphere } from '../lib/gl/sphere.ts';
import {
  bufferInSpace,
  lerpBuffers,
  positionInSpace,
  traceVertex,
  type PipelineContext,
} from '../lib/gl/pipeline.ts';

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

const close = (a: number, b: number, eps = 1e-5) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);
const closeArr = (a: ArrayLike<number>, b: number[], eps = 1e-5) => {
  assert.equal(a.length, b.length);
  for (let i = 0; i < b.length; i++) close(a[i], b[i], eps);
};

console.log('mat4');

check('identity leaves a point untouched', () => {
  closeArr(transformVec4(identity(), [3, -4, 5, 1]), [3, -4, 5, 1]);
});

check('translation lives in the last column (indices 12..14)', () => {
  const t = translation(7, 8, 9);
  closeArr([t[12], t[13], t[14]], [7, 8, 9]);
  closeArr(transformVec4(t, [1, 1, 1, 1]), [8, 9, 10, 1]);
});

check('translation does not move a direction vector (w = 0)', () => {
  closeArr(transformVec4(translation(7, 8, 9), [1, 0, 0, 0]), [1, 0, 0, 0]);
});

check('rotationZ(90deg) maps +X to +Y', () => {
  closeArr(transformVec4(rotationZ(degToRad(90)), [1, 0, 0, 1]), [0, 1, 0, 1]);
});

check('rotationY(90deg) maps +Z to +X', () => {
  closeArr(transformVec4(rotationY(degToRad(90)), [0, 0, 1, 1]), [1, 0, 0, 1]);
});

check('multiply order is right-to-left: T*S scales then translates', () => {
  const m = multiply(translation(10, 0, 0), scaling(2, 2, 2));
  closeArr(transformVec4(m, [1, 0, 0, 1]), [12, 0, 0, 1]);
});

check('multiply order is not commutative: S*T differs from T*S', () => {
  const m = multiply(scaling(2, 2, 2), translation(10, 0, 0));
  closeArr(transformVec4(m, [1, 0, 0, 1]), [22, 0, 0, 1]);
});

check('multiplyAll(T,R,S) equals multiply(multiply(T,R),S)', () => {
  const T = translation(1, 2, 3);
  const R = rotationY(0.7);
  const S = scaling(2, 3, 4);
  closeArr(multiplyAll(T, R, S), Array.from(multiply(multiply(T, R), S)));
});

check('invert round-trips a composed transform', () => {
  const m = multiplyAll(translation(3, -2, 5), rotationY(1.1), scaling(2, 0.5, 3));
  const round = multiply(invert(m), m);
  closeArr(round, Array.from(identity()));
});

check('invert of a singular matrix falls back to identity', () => {
  closeArr(invert(scaling(0, 0, 0)), Array.from(identity()));
});

check('perspective puts -1 in m[11] so w picks up -z', () => {
  const p = perspective(degToRad(60), 1, 0.1, 100);
  close(p[11], -1);
  const clip = transformVec4(p, [0, 0, -5, 1]) as Vec4;
  close(clip[3], 5, 1e-4);
});

check('perspective divide shrinks distant geometry', () => {
  const p = perspective(degToRad(60), 1, 0.1, 100);
  const near = perspectiveDivide(transformVec4(p, [1, 0, -2, 1]) as Vec4);
  const far = perspectiveDivide(transformVec4(p, [1, 0, -20, 1]) as Vec4);
  assert.ok(Math.abs(far[0]) < Math.abs(near[0]), 'far x should be nearer the centre');
});

check('perspective maps the near and far planes to NDC -1 and +1', () => {
  const p = perspective(degToRad(60), 1.5, 0.1, 100);
  close(perspectiveDivide(transformVec4(p, [0, 0, -0.1, 1]) as Vec4)[2], -1, 1e-4);
  close(perspectiveDivide(transformVec4(p, [0, 0, -100, 1]) as Vec4)[2], 1, 1e-4);
});

check('orthographic keeps w at 1, so no perspective divide happens', () => {
  const o = orthographic(-2, 2, -2, 2, 0.1, 100);
  const a = transformVec4(o, [1, 0, -2, 1]) as Vec4;
  const b = transformVec4(o, [1, 0, -50, 1]) as Vec4;
  close(a[3], 1);
  close(b[3], 1);
  close(a[0], b[0]); // same x regardless of depth — that is the whole point
});

check('orthographic maps its box corners to the NDC cube', () => {
  const o = orthographic(-2, 6, -1, 3, 1, 9);
  closeArr(perspectiveDivide(transformVec4(o, [-2, -1, -1, 1]) as Vec4), [-1, -1, -1]);
  closeArr(perspectiveDivide(transformVec4(o, [6, 3, -9, 1]) as Vec4), [1, 1, 1]);
});

check('lookAt places the eye at the view-space origin', () => {
  const v = lookAt([4, 3, 10], [0, 0, 0], [0, 1, 0]);
  closeArr(transformVec4(v, [4, 3, 10, 1]), [0, 0, 0, 1]);
});

check('lookAt puts the target down the -Z axis', () => {
  const v = lookAt([0, 0, 8], [0, 0, 0], [0, 1, 0]);
  const t = transformVec4(v, [0, 0, 0, 1]);
  close(t[0], 0);
  close(t[1], 0);
  close(t[2], -8);
});

check('lookAt basis is orthonormal', () => {
  const v = lookAt([3, 4, 5], [1, 0, -2], [0, 1, 0]);
  const x: [number, number, number] = [v[0], v[4], v[8]];
  const y: [number, number, number] = [v[1], v[5], v[9]];
  const z: [number, number, number] = [v[2], v[6], v[10]];
  for (const axis of [x, y, z]) close(length(axis), 1);
  close(dot(x, y), 0);
  close(dot(y, z), 0);
  close(dot(x, z), 0);
});

check('toRows transposes storage into whiteboard notation', () => {
  const rows = toRows(translation(7, 8, 9));
  closeArr(rows[0], [1, 0, 0, 7]);
  closeArr(rows[3], [0, 0, 0, 1]);
});

console.log('vec3');

check('cross of X and Y is Z (right-handed)', () => {
  closeArr(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
});

check('normalize returns unit length', () => {
  close(length(normalize([3, 4, 12])), 1);
});

check('normalize tolerates the zero vector', () => {
  closeArr(normalize([0, 0, 0]), [0, 0, 0]);
});

console.log(`\n${passed} checks passed`);

console.log('frustum');

check('frustum corners sit on the near and far planes', () => {
  const near = 2;
  const far = 20;
  const proj = perspective(degToRad(60), 1.6, near, far);
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]); // camera at origin, -Z
  const corners = frustumCorners(proj, view);
  for (let i = 0; i < 4; i++) close(corners[i][2], -near, 1e-3);
  for (let i = 4; i < 8; i++) close(corners[i][2], -far, 1e-3);
});

check('near-plane half-height equals near * tan(fov/2)', () => {
  const fov = degToRad(60);
  const near = 2;
  const proj = perspective(fov, 1.6, near, 20);
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const corners = frustumCorners(proj, view);
  close(Math.abs(corners[0][1]), near * Math.tan(fov / 2), 1e-3);
  close(Math.abs(corners[0][0]), near * Math.tan(fov / 2) * 1.6, 1e-3);
});

check('a wider field of view produces a wider frustum', () => {
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const narrow = frustumCorners(perspective(degToRad(30), 1, 1, 10), view);
  const wide = frustumCorners(perspective(degToRad(90), 1, 1, 10), view);
  assert.ok(Math.abs(wide[4][0]) > Math.abs(narrow[4][0]));
});

check('an orthographic frustum is a box: near and far are the same size', () => {
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const corners = frustumCorners(orthographic(-3, 3, -2, 2, 1, 10), view);
  close(Math.abs(corners[0][0]), 3);
  close(Math.abs(corners[4][0]), 3);
  close(Math.abs(corners[0][1]), 2);
  close(Math.abs(corners[4][1]), 2);
});

check('the frustum follows the camera', () => {
  const proj = perspective(degToRad(60), 1, 1, 10);
  const centre = (corners: [number, number, number][]) =>
    corners.reduce((sum, c) => sum + c[0], 0) / corners.length;
  close(centre(frustumCorners(proj, lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]))), 0, 1e-3);
  close(centre(frustumCorners(proj, lookAt([5, 0, 0], [5, 0, -1], [0, 1, 0]))), 5, 1e-3);
});

check('frustumEdges emits 12 segments (24 vertices)', () => {
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const edges = frustumEdges(frustumCorners(perspective(1, 1, 1, 10), view));
  assert.equal(edges.length, 12 * 2 * 3);
});

check('eyeRays connects the eye to the four far corners', () => {
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const corners = frustumCorners(perspective(degToRad(60), 1, 1, 10), view);
  const rays = eyeRays([0, 0, 0], corners);
  assert.equal(rays.length, 4 * 2 * 3);
  for (let i = 0; i < 4; i++) {
    closeArr(rays.slice(i * 6, i * 6 + 3), [0, 0, 0]);
    close(rays[i * 6 + 5], -10, 1e-3); // far corners land on the far plane
  }
});

console.log(`\nall checks passed`);

check('isInsideFrustum keeps a point in front and rejects one behind', () => {
  const vp = multiply(
    perspective(degToRad(60), 1, 1, 10),
    lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]),
  );
  assert.equal(isInsideFrustum(vp, [0, 0, -5]), true);
  assert.equal(isInsideFrustum(vp, [0, 0, 5]), false);
});

check('isInsideFrustum respects the near and far planes', () => {
  const vp = multiply(
    perspective(degToRad(60), 1, 2, 8),
    lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]),
  );
  assert.equal(isInsideFrustum(vp, [0, 0, -1]), false); // nearer than near
  assert.equal(isInsideFrustum(vp, [0, 0, -5]), true);
  assert.equal(isInsideFrustum(vp, [0, 0, -9]), false); // beyond far
});

check('isInsideFrustum respects the side planes, and widening admits a point', () => {
  const view = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
  const outside: [number, number, number] = [4, 0, -5];
  assert.equal(
    isInsideFrustum(multiply(perspective(degToRad(30), 1, 1, 10), view), outside),
    false,
  );
  assert.equal(
    isInsideFrustum(multiply(perspective(degToRad(100), 1, 1, 10), view), outside),
    true,
  );
});

console.log('\nfrustum clipping verified');

console.log('\npipeline');

const ctx: PipelineContext = {
  model: translation(2, 0, -1),
  view: lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]),
  projection: perspective(degToRad(60), 2, 1, 50),
  viewport: { width: 960, height: 480 },
};

check('the model stage is the untouched input', () => {
  closeArr(traceVertex([0.5, -0.25, 0.75], ctx).model, [0.5, -0.25, 0.75, 1]);
});

check('world applies the model matrix, view then stacks on top of it', () => {
  const t = traceVertex([0, 0, 0], ctx);
  closeArr(t.world, [2, 0, -1, 1]);
  closeArr(t.view, [2, 0, -6, 1]); // camera at z=5 looking down -Z
});

check('clip carries depth in w, and NDC is clip divided by it', () => {
  const t = traceVertex([0, 0, 0], ctx);
  close(t.clip[3], 6); // w === -z_view
  closeArr(t.ndc, [t.clip[0] / t.clip[3], t.clip[1] / t.clip[3], t.clip[2] / t.clip[3]]);
});

check('a point on the view axis lands dead centre of the screen', () => {
  const centred: PipelineContext = { ...ctx, model: translation(0, 0, 0) };
  const t = traceVertex([0, 0, 0], centred);
  closeArr(t.ndc.slice(0, 2), [0, 0]);
  closeArr(t.screen, [480, 240]); // half of 960 x 480
});

check('screen y is flipped: NDC top maps to pixel row 0', () => {
  const centred: PipelineContext = { ...ctx, model: translation(0, 0, 0) };
  const top = traceVertex([0, 1, 0], centred);
  const bottom = traceVertex([0, -1, 0], centred);
  assert.ok(top.ndc[1] > 0 && bottom.ndc[1] < 0);
  assert.ok(top.screen[1] < bottom.screen[1], 'screen y should grow downward');
});

check('orthographic leaves w at 1, so clip and NDC agree', () => {
  const ortho: PipelineContext = {
    ...ctx,
    model: translation(0, 0, 0),
    projection: orthographic(-4, 4, -2, 2, 1, 50),
  };
  const t = traceVertex([1, 0.5, 0], ortho);
  close(t.clip[3], 1);
  closeArr(t.ndc, [t.clip[0], t.clip[1], t.clip[2]]);
});

check('screen space is drawn as NDC widened by the viewport aspect', () => {
  const p = positionInSpace([0, 0, 0], 'screen', ctx);
  const ndc = traceVertex([0, 0, 0], ctx).ndc;
  close(p[0], ndc[0] * 2); // 960 / 480
  close(p[1], ndc[1]);
  close(p[2], 0); // depth is gone
});

check('bufferInSpace maps every vertex of a buffer', () => {
  const source = new Float32Array([0, 0, 0, 1, 1, 1]);
  const out = bufferInSpace(source, 'world', ctx);
  closeArr(out.slice(0, 3), [2, 0, -1]);
  closeArr(out.slice(3, 6), [3, 1, 0]);
});

check('lerpBuffers blends endpoints and the midpoint', () => {
  const a = new Float32Array([0, 0, 0]);
  const b = new Float32Array([10, -4, 2]);
  closeArr(lerpBuffers(a, b, 0), [0, 0, 0]);
  closeArr(lerpBuffers(a, b, 1), [10, -4, 2]);
  closeArr(lerpBuffers(a, b, 0.5), [5, -2, 1]);
});

console.log('\npipeline verified');

console.log('\nsphere and normals');

/** Applies a 3x3 (column-major) to a vector, the way the vertex shader does. */
function applyMat3(
  m: Float32Array,
  v: [number, number, number],
): [number, number, number] {
  return [
    m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
    m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
    m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
  ];
}

check('every sphere vertex sits on the surface with a unit normal', () => {
  const mesh = uvSphere(12, 8);
  const count = mesh.positions.length / 3;
  assert.ok(count > 0);
  for (let i = 0; i < count; i++) {
    const p: [number, number, number] = [
      mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2],
    ];
    const n: [number, number, number] = [
      mesh.normals[i * 3], mesh.normals[i * 3 + 1], mesh.normals[i * 3 + 2],
    ];
    close(length(p), 0.5, 1e-5);
    close(length(n), 1, 1e-5);
  }
});

check('sphere indices stay within the 16-bit buffer they are typed as', () => {
  const mesh = uvSphere(64, 40);
  const vertexCount = mesh.positions.length / 3;
  assert.ok(vertexCount <= 65536, `too many vertices for Uint16: ${vertexCount}`);
  for (const index of mesh.indices) assert.ok(index < vertexCount);
});

check('flatShaded gives each triangle its own unshared vertices', () => {
  const mesh = flatShaded(uvSphere(8, 6));
  assert.equal(mesh.positions.length / 3, mesh.indices.length);
  for (let i = 0; i < mesh.indices.length; i++) assert.equal(mesh.indices[i], i);
});

check('flat normals are unit length and constant across each triangle', () => {
  const mesh = flatShaded(uvSphere(8, 6));
  for (let t = 0; t < mesh.indices.length / 3; t++) {
    const n0: [number, number, number] = [
      mesh.normals[t * 9], mesh.normals[t * 9 + 1], mesh.normals[t * 9 + 2],
    ];
    close(length(n0), 1, 1e-4);
    for (let corner = 1; corner < 3; corner++) {
      closeArr(mesh.normals.slice(t * 9 + corner * 3, t * 9 + corner * 3 + 3), n0, 1e-6);
    }
  }
});

check('normalLines emits one segment per vertex', () => {
  const mesh = uvSphere(6, 4);
  assert.equal(normalLines(mesh).length, (mesh.positions.length / 3) * 6);
});

check('under non-uniform scale the naive normal leaves the surface', () => {
  // A 45-degree normal on a shape squashed in y. The correct normal matrix
  // keeps it perpendicular to the stretched surface; the model matrix does not.
  const model = scaling(1, 0.25, 1);
  const n: [number, number, number] = [
    Math.SQRT1_2, Math.SQRT1_2, 0,
  ];
  const tangent: [number, number, number] = [-Math.SQRT1_2, Math.SQRT1_2, 0];

  const correct = normalize(applyMat3(normalMatrix(model), n));
  const naive = normalize(applyMat3(upperLeft3x3(model), n));

  // The tangent transforms with the model matrix, by definition.
  const movedTangent = normalize(applyMat3(upperLeft3x3(model), tangent));

  close(dot(correct, movedTangent), 0, 1e-5); // still perpendicular
  assert.ok(
    Math.abs(dot(naive, movedTangent)) > 0.2,
    'the naive normal should visibly leave the surface',
  );
});

check('under uniform scale the two agree, which is why the bug hides', () => {
  const model = scaling(2, 2, 2);
  const n: [number, number, number] = [0.6, 0.8, 0];
  closeArr(
    normalize(applyMat3(normalMatrix(model), n)),
    normalize(applyMat3(upperLeft3x3(model), n)),
    1e-5,
  );
});

console.log('\nshading maths verified');
