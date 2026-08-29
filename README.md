# Render Quest

Interactive graphics labs. You drag the numbers and the matrix, the geometry and the
rendered pixels all change together.

Live at **[render-quest.com](https://www.render-quest.com)**.

## Why

A transform is not a table of sixteen numbers — it is a motion, and you cannot see a
motion on a static page. So each lab is a live WebGL canvas with the maths exposed
next to it, and the controls wired to the parts that matter.

## The labs

| Lab | What it shows |
| --- | --- |
| [`/labs/transform`](https://www.render-quest.com/labs/transform) | Translate, rotate and scale a cube; switch `T·R·S` for `S·R·T` and watch the composition order bite. The object's basis vectors are drawn *through* the model matrix, so the coloured columns in the readout are the coloured arms on screen. |
| [`/labs/projection`](https://www.render-quest.com/labs/projection) | A camera's frustum as an object in the world, above the picture that camera renders. Objects fade in the god view as they leave the frustum, using the same clip test the GPU runs. |

Two more are in progress: coordinate spaces, and light & normals.

## Running it

```bash
npm install
npm run dev
```

Requires Node ≥ 22.6 — the test runner uses native TypeScript type stripping, no
build step.

## Tests

```bash
npm test
```

32 numeric checks over the matrix core and frustum derivation: composition order,
the perspective divide, near/far mapping into NDC, `lookAt` orthonormality, inverse
round-trips, frustum corners, and the clipping test. `npm run build` runs them first,
so a deploy cannot ship broken maths.

## How it is built

Raw WebGL — no scene graph, no rendering framework. The plumbing a framework hides
(contexts, buffers, attribute pointers, the perspective divide) is the actual
subject, so none of it is hidden.

```
lib/math/     mat4 (column-major, GPU-ready) and vec3
lib/gl/       program compilation, geometry, shared scene kit, frustum derivation
components/lab/    GLCanvas render loop, controls, matrix readout, layout
components/labs/   one component per lab
test/         numeric checks, run by npm test and npm run build
```

Nothing on the site is a stock or pre-rendered image. The home page hero is the
projection lab with its controls removed, running live in your browser.
