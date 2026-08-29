'use client';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { createBuffer, createProgram } from '@/lib/gl/program';

/**
 * The reference scene, in raw WebGL. Deliberately the whole thing — this is the
 * code the page is asking you to compare, so it should be the code that runs.
 */
const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

varying vec2 vUv;
uniform float uTime;

void main() {
  vec3 colour = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(colour, 1.0);
}
`;

const createPlasma: SceneFactory<Record<string, never>> = (gl) => {
  const program = createProgram(gl, VERTEX, FRAGMENT);
  // One oversized triangle covers the viewport with no diagonal seam.
  const quad = createBuffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
  const position = program.attrib('aPosition');

  return {
    draw({ width, height, time }) {
      gl.viewport(0, 0, width, height);
      gl.useProgram(program.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(program.uniform('uTime'), time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      program.dispose();
      gl.deleteBuffer(quad);
    },
  };
};

const NO_PARAMS = {};

export function PlasmaWebGL() {
  return (
    <GLCanvas
      create={createPlasma}
      params={NO_PARAMS}
      aspect={16 / 7}
      label="An animated cosine-palette plasma rendered with WebGL"
    />
  );
}
