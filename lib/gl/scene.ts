/**
 * The two shader programs every lab shares: one lit-and-coloured program for
 * solid meshes, one flat program for lines. Kept deliberately small so the
 * shader source stays readable from the lab that uses it.
 */

import {
  bindAttribute,
  createBuffer,
  createIndexBuffer,
  createProgram,
  type Program,
} from './program';
import type { Mesh } from './geometry';
import type { Mat4 } from '../math/mat4';
import type { CanvasPalette } from '../theme';

export const LIT_VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vColor;

void main() {
  // The inverse-transpose keeps normals perpendicular to the surface even
  // when the model matrix scales non-uniformly.
  vNormal = normalize(uNormalMatrix * aNormal);
  vColor = aColor;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

/**
 * Lighting in linear space, encoded for the display on the way out.
 *
 * This shader used to multiply sRGB-encoded numbers directly, which is the most
 * common bug in real renderers precisely because it does not look like one — it
 * looks like a lighting choice. Lab 8 exists to show the difference; this is the
 * correction it prompted.
 */
export const LIT_FRAGMENT = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vColor;

uniform float uOpacity;
uniform float uAmbient;

const float GAMMA = 2.2;

void main() {
  vec3 lightDir = normalize(vec3(0.45, 0.85, 0.55));
  // Hemispheric wrap: never fully black, so back faces stay readable.
  float lambert = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;

  // Decode to light, do the arithmetic there, encode back. Multiplying the
  // encoded values instead crushes the midtones and hardens the terminator.
  vec3 base = pow(vColor, vec3(GAMMA));
  vec3 lit = base * (uAmbient + 0.75 * lambert);
  vec3 shaded = pow(lit, vec3(1.0 / GAMMA));

  gl_FragColor = vec4(shaded, uOpacity);
}
`;

export const FLAT_VERTEX = `
attribute vec3 aPosition;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying vec3 vColor;

void main() {
  vColor = aColor;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

export const FLAT_FRAGMENT = `
precision mediump float;
varying vec3 vColor;
uniform float uOpacity;
uniform vec3 uTint;

void main() {
  // Line buffers are uploaded white when the colour is a theme decision, and
  // with real per-vertex colours (the axes) when it is not. uTint covers both.
  gl_FragColor = vec4(vColor * uTint, uOpacity);
}
`;

export interface MeshHandle {
  positions: WebGLBuffer;
  normals: WebGLBuffer;
  colors: WebGLBuffer;
  indices: WebGLBuffer;
  count: number;
}

export function uploadMesh(gl: WebGLRenderingContext, mesh: Mesh): MeshHandle {
  return {
    positions: createBuffer(gl, mesh.positions),
    normals: createBuffer(gl, mesh.normals),
    colors: createBuffer(gl, mesh.colors),
    indices: createIndexBuffer(gl, mesh.indices),
    count: mesh.indices.length,
  };
}

export interface LineHandle {
  positions: WebGLBuffer;
  colors: WebGLBuffer;
  count: number;
}

/** Uploads line-segment pairs. A single colour is expanded across all vertices. */
export function uploadLines(
  gl: WebGLRenderingContext,
  positions: Float32Array,
  colors: Float32Array | [number, number, number],
): LineHandle {
  const vertexCount = positions.length / 3;
  const colorData = Array.isArray(colors)
    ? new Float32Array(vertexCount * 3).map((_, i) => colors[i % 3])
    : colors;
  return {
    positions: createBuffer(gl, positions),
    colors: createBuffer(gl, colorData),
    count: vertexCount,
  };
}

/**
 * Replaces a line set's per-vertex colours in place.
 *
 * Needed because the axes carry real per-vertex colour rather than a uniform
 * tint, so a theme change used to mean rebuilding the whole scene — which threw
 * away a GL context and recompiled every shader on each toggle.
 */
export function updateLineColors(
  gl: WebGLRenderingContext,
  handle: LineHandle,
  colors: Float32Array,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, handle.colors);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

export interface SceneKit {
  lit: Program;
  flat: Program;
  drawMesh: (
    handle: MeshHandle,
    model: Mat4,
    viewProjection: Mat4,
    normalMat: Float32Array,
    opacity?: number,
    ambient?: number,
  ) => void;
  drawLines: (
    handle: LineHandle,
    model: Mat4,
    viewProjection: Mat4,
    opacity?: number,
    tint?: readonly [number, number, number],
  ) => void;
  dispose: () => void;
}

const WHITE: [number, number, number] = [1, 1, 1];

export function createSceneKit(gl: WebGLRenderingContext): SceneKit {
  const lit = createProgram(gl, LIT_VERTEX, LIT_FRAGMENT);
  const flat = createProgram(gl, FLAT_VERTEX, FLAT_FRAGMENT);

  return {
    lit,
    flat,
    drawMesh(handle, model, viewProjection, normalMat, opacity = 1, ambient = 0.35) {
      gl.useProgram(lit.program);
      bindAttribute(gl, handle.positions, lit.attrib('aPosition'), 3);
      bindAttribute(gl, handle.normals, lit.attrib('aNormal'), 3);
      bindAttribute(gl, handle.colors, lit.attrib('aColor'), 3);
      gl.uniformMatrix4fv(lit.uniform('uModel'), false, model);
      gl.uniformMatrix4fv(lit.uniform('uViewProjection'), false, viewProjection);
      gl.uniformMatrix3fv(lit.uniform('uNormalMatrix'), false, normalMat);
      gl.uniform1f(lit.uniform('uOpacity'), opacity);
      gl.uniform1f(lit.uniform('uAmbient'), ambient);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, handle.indices);
      gl.drawElements(gl.TRIANGLES, handle.count, gl.UNSIGNED_SHORT, 0);
    },
    drawLines(handle, model, viewProjection, opacity = 1, tint = WHITE) {
      gl.useProgram(flat.program);
      bindAttribute(gl, handle.positions, flat.attrib('aPosition'), 3);
      bindAttribute(gl, handle.colors, flat.attrib('aColor'), 3);
      gl.uniformMatrix4fv(flat.uniform('uModel'), false, model);
      gl.uniformMatrix4fv(flat.uniform('uViewProjection'), false, viewProjection);
      gl.uniform1f(flat.uniform('uOpacity'), opacity);
      gl.uniform3fv(flat.uniform('uTint'), [tint[0], tint[1], tint[2]]);
      gl.drawArrays(gl.LINES, 0, handle.count);
    },
    dispose() {
      lit.dispose();
      flat.dispose();
    },
  };
}

/** Standard per-frame setup: viewport, clear, depth, and alpha blend. */
export function beginFrame(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  palette: CanvasPalette,
): void {
  gl.viewport(0, 0, width, height);
  gl.clearColor(palette.clear[0], palette.clear[1], palette.clear[2], 1);
  gl.clearDepth(1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/**
 * A line set whose vertices change every frame — used for geometry that is
 * derived from the controls, such as a camera frustum.
 */
export interface DynamicLineHandle extends LineHandle {
  setPositions: (positions: Float32Array) => void;
}

export function createDynamicLines(
  gl: WebGLRenderingContext,
  vertexCount: number,
  color: [number, number, number] = [1, 1, 1],
): DynamicLineHandle {
  const positions = gl.createBuffer();
  const colors = gl.createBuffer();
  if (!positions || !colors) throw new Error('could not create line buffers');

  gl.bindBuffer(gl.ARRAY_BUFFER, positions);
  gl.bufferData(gl.ARRAY_BUFFER, vertexCount * 3 * 4, gl.DYNAMIC_DRAW);

  const colorData = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) colorData.set(color, i * 3);
  gl.bindBuffer(gl.ARRAY_BUFFER, colors);
  gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);

  return {
    positions,
    colors,
    count: vertexCount,
    setPositions(data) {
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    },
  };
}
