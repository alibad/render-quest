'use client';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { useTheme } from '@/components/site/ThemeProvider';
import { bindAttribute, createBuffer, createIndexBuffer, createProgram } from '@/lib/gl/program';
import { cube } from '@/lib/gl/geometry';
import { lookAt, multiply, perspective, rotationX, rotationY } from '@/lib/math/mat4';

/**
 * The second reference scene, in raw WebGL.
 *
 * The plasma is a full-screen effect: no geometry, no camera, no depth buffer,
 * and therefore almost no plumbing to compare. A lit, spinning, depth-tested
 * cube is where the four technologies genuinely diverge — it needs vertex
 * buffers with more than one attribute, an index buffer, a matrix chain, a
 * normal transform and depth state, and each API charges a different price for
 * exactly that list.
 */

export const CUBE_VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;

uniform mat4 uModel;
uniform mat4 uViewProjection;

varying vec3 vNormal;
varying vec3 vColor;

void main() {
  // Rotation only, so the inverse-transpose is the rotation itself.
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0);
}
`;

export const CUBE_FRAGMENT = `
precision highp float;

varying vec3 vNormal;
varying vec3 vColor;

const float GAMMA = 2.2;

void main() {
  vec3 light = normalize(vec3(0.4, 0.8, 0.6));
  float lambert = max(dot(normalize(vNormal), light), 0.0);

  // Lit in linear, encoded for the display — see lab 8.
  vec3 base = pow(vColor, vec3(GAMMA));
  vec3 lit = base * (0.12 + 0.9 * lambert);
  gl_FragColor = vec4(pow(lit, vec3(1.0 / GAMMA)), 1.0);
}
`;

const createCube: SceneFactory<{ clear: [number, number, number] }> = (gl) => {
  const program = createProgram(gl, CUBE_VERTEX, CUBE_FRAGMENT);
  const mesh = cube();
  const positions = createBuffer(gl, mesh.positions);
  const normals = createBuffer(gl, mesh.normals);
  const colors = createBuffer(gl, mesh.colors);
  const indices = createIndexBuffer(gl, mesh.indices);

  return {
    draw({ width, height, time, params }) {
      gl.viewport(0, 0, width, height);
      gl.clearColor(params.clear[0], params.clear[1], params.clear[2], 1);
      gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const model = multiply(rotationY(time * 0.6), rotationX(time * 0.35));
      const viewProjection = multiply(
        perspective(Math.PI / 4, width / height, 0.1, 100),
        lookAt([0, 1.4, 4.2], [0, 0, 0], [0, 1, 0]),
      );

      gl.useProgram(program.program);
      bindAttribute(gl, positions, program.attrib('aPosition'), 3);
      bindAttribute(gl, normals, program.attrib('aNormal'), 3);
      bindAttribute(gl, colors, program.attrib('aColor'), 3);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);

      gl.uniformMatrix4fv(program.uniform('uModel'), false, model);
      gl.uniformMatrix4fv(program.uniform('uViewProjection'), false, viewProjection);
      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose() {
      program.dispose();
      gl.deleteBuffer(positions);
      gl.deleteBuffer(normals);
      gl.deleteBuffer(colors);
      gl.deleteBuffer(indices);
    },
  };
};

export function CubeWebGL() {
  const { palette } = useTheme();
  return (
    <GLCanvas
      create={createCube}
      params={{ clear: palette.clear }}
      aspect={16 / 9}
      label="A lit, depth-tested cube spinning, rendered with WebGL"
    />
  );
}
