'use client';

import { GLCanvas, type SceneFactory } from '@/components/lab/GLCanvas';
import { cube, grid } from '@/lib/gl/geometry';
import { eyeRays, frustumCorners, frustumEdges } from '@/lib/gl/frustum';
import {
  beginFrame,
  createDynamicLines,
  createSceneKit,
  uploadLines,
  uploadMesh,
} from '@/lib/gl/scene';
import {
  degToRad,
  identity,
  lookAt,
  multiply,
  normalMatrix,
  perspective,
  rotationY,
  scaling,
  translation,
} from '@/lib/math/mat4';
import { orbitToCartesian } from '@/lib/math/vec3';
import { useTheme } from '@/components/site/ThemeProvider';
import type { CanvasPalette } from '@/lib/theme';

const SUBJECTS: { position: [number, number, number]; scale: number; spin: number }[] = [
  { position: [0, 0.68, -1], scale: 1.35, spin: 0.25 },
  { position: [-2.1, 0.5, -4], scale: 1.0, spin: -0.18 },
  { position: [2.3, 0.6, -5.4], scale: 1.2, spin: 0.14 },
  { position: [1.3, 0.38, 1.3], scale: 0.75, spin: -0.3 },
  { position: [-1.7, 0.43, 2.6], scale: 0.85, spin: 0.22 },
];

/** The camera whose frustum is on display. Fixed; only its lens breathes. */
const SUBJECT_EYE: [number, number, number] = [0, 1.9, 6.5];

/**
 * The landing scene. It is the projection lab with the controls taken away —
 * a real render, running live, rather than a picture of one.
 */
interface HeroParams {
  palette: CanvasPalette;
}

const createHero: SceneFactory<HeroParams> = (gl) => {
  const kit = createSceneKit(gl);
  const mesh = uploadMesh(gl, cube());
  const gridLines = uploadLines(gl, grid(14, 1), [1, 1, 1]);
  const frustumLines = createDynamicLines(gl, 24);
  const rayLines = createDynamicLines(gl, 8);
  const ident = identity();

  return {
    draw({ width, height, time, params }) {
      const { palette } = params;
      beginFrame(gl, width, height, palette);

      // A slow orbit that never quite repeats, and a lens that breathes.
      const azimuth = 0.6 + Math.sin(time * 0.055) * 0.42;
      const elevation = 0.34 + Math.sin(time * 0.037) * 0.07;
      const eye = orbitToCartesian(azimuth, elevation, 18);
      const view = lookAt([eye[0], eye[1] + 1.6, eye[2]], [0, 0, -1], [0, 1, 0]);
      const viewProjection = multiply(
        perspective(degToRad(38), width / height, 0.5, 120),
        view,
      );

      kit.drawLines(gridLines, ident, viewProjection, 0.8, palette.grid);

      for (const subject of SUBJECTS) {
        const model = multiply(
          multiply(
            translation(...subject.position),
            rotationY(time * subject.spin),
          ),
          scaling(subject.scale, subject.scale, subject.scale),
        );
        kit.drawMesh(mesh, model, viewProjection, normalMatrix(model), 1, palette.ambient);
      }

      const fov = degToRad(44 + Math.sin(time * 0.28) * 8);
      const corners = frustumCorners(
        perspective(fov, 16 / 10, 1.4, 8.5),
        lookAt(SUBJECT_EYE, [0, 0, -2], [0, 1, 0]),
      );
      frustumLines.setPositions(frustumEdges(corners));
      rayLines.setPositions(eyeRays(SUBJECT_EYE, corners));

      gl.disable(gl.DEPTH_TEST);
      kit.drawLines(rayLines, ident, viewProjection, 0.5, palette.accentDim);
      kit.drawLines(frustumLines, ident, viewProjection, 0.9, palette.accent);
      gl.enable(gl.DEPTH_TEST);
    },
    dispose() {
      kit.dispose();
    },
  };
};

export function HeroCanvas({ className }: { className?: string }) {
  const { palette } = useTheme();
  return (
    <GLCanvas
      create={createHero}
      params={{ palette }}
      aspect={16 / 10}
      className={className}
      label="A live WebGL scene: boxes on a grid with a camera frustum drawn around them, slowly orbiting"
    />
  );
}
