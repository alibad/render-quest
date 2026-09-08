# Render Quest

Interactive graphics labs. You drag the numbers, and the matrix, the geometry and the
rendered pixels all change together.

Live at **[render-quest.com](https://www.render-quest.com)**.

## Why

A transform is not a table of sixteen numbers — it is a motion, and you cannot see a
motion on a static page. So each lab is an essay of 1,400–2,400 words with figures
embedded in it — a figure being one canvas, one control and a caption — and the full
instrument, every control at once, at the foot of the page.

The instruments came first and the writing came second, which was the wrong order: for
a while the arguments existed as preset labels with the sentences between them
unwritten. Nobody links to a button, a search engine cannot index a slider, and a
lecturer cannot assign a canvas.

## The labs

Ten, in sequence. Each one assumes the ideas of the one before it, and says so.

| # | Lab | API | What you come away with |
| --- | --- | --- | --- |
| 1 | [The Model Matrix](https://www.render-quest.com/labs/transform) | WebGL | Why a matrix chain reads right to left, and why the columns are the object's own axes. |
| 2 | [Projection & the Frustum](https://www.render-quest.com/labs/projection) | WebGL | What the perspective divide actually does, and why near and far are a hard clip rather than a fade. |
| 3 | [Coordinate Spaces](https://www.render-quest.com/labs/pipeline) | WebGL | Where each matrix in the chain hands over to the next, and what the GPU does between them. |
| 4 | [Light & Normals](https://www.render-quest.com/labs/shading) | WebGL | Why normals need the inverse-transpose, and what separates flat, Gouraud and Phong. |
| 5 | [Textures & Sampling](https://www.render-quest.com/labs/textures) | WebGL | Why a texture looks wrong at a distance, and what mipmapping is really trading away. |
| 6 | [Compute & Particles](https://www.render-quest.com/labs/compute) | WebGPU | What a compute shader is for, and the kind of problem that leaves WebGL behind entirely. |
| 7 | [Draw Calls & Instancing](https://www.render-quest.com/labs/instancing) | WebGPU | Why the number of draw calls matters more than the number of triangles. |
| 8 | [Colour & Gamma](https://www.render-quest.com/labs/colour) | WebGL | Why lighting maths done on sRGB numbers is wrong, and why the mistake looks like a style rather than a bug. |
| 9 | [Depth & Transparency](https://www.render-quest.com/labs/depth) | WebGL | That depth precision is set by the near plane rather than the model, and that the depth buffer cannot answer the question transparency asks. |
| 10 | [Write a Shader](https://www.render-quest.com/labs/shader) | WebGL | That a shader is a function from a pixel coordinate to a colour, and that the errors are readable once something shows them to you. |

Every lab has named presets, the real shader source it compiles, a live numeric
readout, and URL-shareable state — so a configuration that makes a point can be
handed to someone. Around 20,000 words across the ten.

Also on the site: four [technology guides](https://www.render-quest.com/tech)
rendering two identical reference scenes in WebGL, WebGPU, Three.js and vgpu; a
[chooser](https://www.render-quest.com/tech/choose) that answers "which should I
use"; a 61-term glossary; and a curated
[reading path](https://www.render-quest.com/learn) through other people's material.

## Running it

```bash
npm install
npm run dev
```

Node 24 (`.nvmrc`), matching what Vercel deploys with.

## Tests

```bash
npm test         # 69 checks, no browser — runs as part of npm run build
npm run test:render   # 101 checks in a real browser, CI only
```

`npm test` covers the matrix core and frustum derivation (composition order, the
perspective divide, near/far into NDC, `lookAt` orthonormality, inverse round-trips,
the clip test), the content registries, the URL codec, and the shaders as strings —
every uniform the TypeScript asks for must exist in the shader it is compiled
against, which nothing else here catches.

`npm run test:render` loads every route in Chromium and checks that each canvas
actually drew something, that no lab is showing its own failure card, that nothing
logged an error, that no page scrolls sideways at 375px, and that no grid ends on a
half-empty row. It reads the canvas in the page rather than screenshotting it —
headless Chromium does not composite WebGL into a capture, and the first version of
this test passed while every lab was blank.

## How it is built

Raw WebGL and WebGPU — no scene graph, no rendering framework. The plumbing a
framework hides (contexts, buffers, attribute pointers, the perspective divide, bind
group layouts) is the actual subject, so none of it is hidden.

```
lib/math/          mat4 (column-major, GPU-ready) and vec3
lib/gl/            program compilation, geometry, shared scene kit, frustum derivation
lib/labs.ts        the lab registry — order, prerequisites, which API and why
components/lab/    GLCanvas render loop, controls, matrix readout, layout, URL state
components/labs/   one component per lab
components/tech/   the reference scenes, in each technology
test/              the suites above
todo/              a dated changelog per working day
```

Nothing on the site is a stock or pre-rendered image. The home page hero is the
projection lab with its controls removed, running live in your browser.
