/**
 * The four ways you might actually draw something on the web, compared.
 *
 * Every page renders the SAME scene — an animated cosine-palette plasma — so
 * the difference between the entries is the code, not the picture. The shader
 * maths is identical in all four; only the plumbing around it changes.
 *
 *   colour = 0.5 + 0.5 * cos(time + uv.xyx + vec3(0, 2, 4))
 *
 * Demos marked `code-only` are not running on the page. Saying so matters more
 * than looking impressive: this site's whole claim is that what you see is real.
 */

export type DemoSupport = 'webgl' | 'webgpu' | 'code-only';

export interface CodeSample {
  label: string;
  language: 'glsl' | 'wgsl' | 'javascript' | 'typescript' | 'bash';
  source: string;
  note?: string;
}

export interface Technology {
  slug: string;
  name: string;
  tagline: string;
  /** One-line answer to "what am I choosing here". */
  kind: string;
  demo: DemoSupport;
  /** Roughly how much code the plasma takes, for the comparison table. */
  linesForPlasma: number;
  /** And the lit cube, which is where the four actually diverge. */
  linesForCube: number;
  what: string[];
  reachFor: string[];
  avoid: string[];
  samples: CodeSample[];
  /** The second reference scene: a lit, depth-tested, spinning cube. */
  cubeSamples: CodeSample[];
  gotchas: { title: string; body: string }[];
  /** URLs that must match entries in lib/resources.ts. */
  learnUrls: string[];
  homepage: string;
}

const PLASMA_GLSL_FRAGMENT = `precision highp float;

varying vec2 vUv;
uniform float uTime;

void main() {
  // Inigo Quilez's cosine palette: three cosines a phase apart.
  vec3 colour = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(colour, 1.0);
}`;

const PLASMA_WGSL = `struct Uniforms { time: f32 };
@group(0) @binding(0) var<uniform> u: Uniforms;

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Identical maths to the GLSL version, different spelling.
  let colour = 0.5 + 0.5 * cos(u.time + vec3f(uv, uv.x) + vec3f(0.0, 2.0, 4.0));
  return vec4f(colour, 1.0);
}`;

/**
 * The second reference scene.
 *
 * The plasma compares almost nothing: no geometry, no camera, no depth buffer.
 * A lit, depth-tested, spinning cube needs three vertex attributes, an index
 * buffer, a matrix chain, a normal transform and depth state — and that list is
 * exactly where the four technologies stop looking alike.
 */
export const CUBE_SCENE = {
  title: 'A lit, spinning cube',
  description:
    'Twelve triangles, three vertex attributes, an index buffer, a model and a view-projection matrix, one directional light, backface culling and a depth buffer. The picture is identical in all four; the amount you have to write to get it is not.',
} as const;

export const TECHNOLOGIES: Technology[] = [
  {
    slug: 'webgl',
    name: 'WebGL',
    tagline: 'The baseline. Everything on this site runs on it.',
    kind: 'Browser API · GLSL',
    demo: 'webgl',
    linesForPlasma: 42,
    linesForCube: 118,
    homepage: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API',
    what: [
      'WebGL is OpenGL ES 2.0 (or 3.0, for WebGL2) exposed to JavaScript. It has shipped in every browser for over a decade, works on effectively every device you will meet, and needs no library, no build step and no permission prompt.',
      'It is also the most verbose option here by a wide margin. Drawing one triangle means compiling two shaders, linking a program, creating a buffer, describing its layout, and binding it — before anything appears. That verbosity is why the labs on this site use it: the ceremony is the subject.',
    ],
    reachFor: [
      'You want to understand what the GPU is actually being told, without a layer editorialising.',
      'You need to run on anything, including older mobile and locked-down corporate machines.',
      'You want zero dependencies and a bundle measured in the code you wrote.',
    ],
    avoid: [
      'You want a scene with models, lights and cameras — you would be rebuilding Three.js badly.',
      'You need compute shaders, storage buffers or modern GPU features. That is WebGPU territory.',
    ],
    samples: [
      {
        label: 'The fragment shader',
        language: 'glsl',
        source: PLASMA_GLSL_FRAGMENT,
      },
      {
        label: 'The JavaScript around it',
        language: 'javascript',
        note: 'Two shaders compiled, a program linked, one quad uploaded, one uniform updated per frame. This is the whole thing.',
        source: `const gl = canvas.getContext('webgl');

const program = createProgram(gl, vertexSource, fragmentSource);
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1, -1, 3, -1, -1, 3]),
  gl.STATIC_DRAW,
);

const position = gl.getAttribLocation(program, 'aPosition');
const uTime = gl.getUniformLocation(program, 'uTime');

function frame(now) {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1f(uTime, now / 1000);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`,
      },
    ],
    cubeSamples: [
      {
        label: 'The plumbing',
        language: 'typescript' as const,
        source: `// Three attribute buffers, described one call at a time.
for (const [name, buffer] of [
  ['aPosition', positions],
  ['aNormal', normals],
  ['aColor', colors],
] as const) {
  const location = gl.getAttribLocation(program, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
}
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);

// Depth and culling are global switches, flipped per draw.
gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.enable(gl.CULL_FACE);

gl.uniformMatrix4fv(uModel, false, model);
gl.uniformMatrix4fv(uViewProjection, false, viewProjection);
gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);`,
        note: 'Every piece of state here is global and sticky: whatever was enabled last is still enabled. That is the whole difference from WebGPU, which freezes the same information into a pipeline object up front.',
      },
    ],
    gotchas: [
      {
        title: 'One big triangle, not a quad',
        body: 'A full-screen effect is usually drawn as a single oversized triangle rather than two triangles forming a square. It covers the same pixels with one fewer primitive and no seam down the diagonal where the two triangles meet.',
      },
      {
        title: 'Context loss is real and you must handle it',
        body: 'The browser can take your GPU context away at any moment — tab backgrounded, driver reset, another tab being greedy. Listen for webglcontextlost or your canvas silently freezes.',
      },
      {
        title: 'gl.lineWidth mostly does nothing',
        body: 'Almost every implementation clamps it to 1. If you need thick lines you build them from triangles. This surprises everyone exactly once.',
      },
    ],
    learnUrls: [
      'https://webglfundamentals.org/',
      'https://webgl2fundamentals.org/',
      'https://learnopengl.com/',
      'https://thebookofshaders.com/',
    ],
  },
  {
    slug: 'webgpu',
    name: 'WebGPU',
    tagline: 'The successor. Stricter, far more capable, and finally shipping.',
    kind: 'Browser API · WGSL',
    demo: 'webgpu',
    linesForPlasma: 58,
    linesForCube: 149,
    homepage: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API',
    what: [
      'WebGPU is the modern replacement for WebGL, modelled on Vulkan, Metal and D3D12 rather than on 2008-era OpenGL. It brings compute shaders, storage buffers, render bundles and an explicit pipeline model, and it uses its own shading language, WGSL, instead of GLSL.',
      'The setup is longer than WebGL and much more explicit — you describe a pipeline object up front instead of mutating global state per draw. In exchange, validation happens once at pipeline creation with real error messages, rather than as a silent black screen at draw time.',
    ],
    reachFor: [
      'You need compute: simulation, particles, image processing, ML inference on the GPU.',
      'You are drawing enough to care about CPU overhead — the explicit model is dramatically cheaper per draw.',
      'You want shader errors that name the line rather than a blank canvas.',
    ],
    avoid: [
      'You must support older devices. Availability is good in current browsers and absent in old ones, so you need a WebGL fallback or an honest message.',
      'You only ever draw a couple of things. The extra ceremony buys you nothing.',
    ],
    samples: [
      {
        label: 'The fragment shader, in WGSL',
        language: 'wgsl',
        source: PLASMA_WGSL,
      },
      {
        label: 'Getting to a frame',
        language: 'javascript',
        note: 'Notice how much is decided once, up front: the pipeline knows its shaders, formats and layout before a single frame is drawn.',
        source: `const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format, alphaMode: 'opaque' });

const shaderModule = device.createShaderModule({ code: shaderSource });
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module: shaderModule, entryPoint: 'vs' },
  fragment: { module: shaderModule, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list' },
});

const uniforms = device.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: uniforms } }],
});

function frame(now) {
  device.queue.writeBuffer(uniforms, 0, new Float32Array([now / 1000]));

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(frame);
}`,
      },
    ],
    cubeSamples: [
      {
        label: 'The pipeline',
        language: 'typescript' as const,
        source: `// Everything WebGL sets with individual calls is declared once here,
// and validated once here — the vertex layout and the depth state included.
const pipeline = device.createRenderPipeline({
  layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
  vertex: {
    module: shaderModule,
    entryPoint: 'vs',
    buffers: [
      { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
      { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
      { arrayStride: 12, attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x3' }] },
    ],
  },
  fragment: { module: shaderModule, entryPoint: 'fs', targets: [{ format }] },
  primitive: { topology: 'triangle-list', cullMode: 'back' },
  depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
});

// The depth texture is yours to allocate, and yours to resize.
depth = device.createTexture({
  size: { width: canvas.width, height: canvas.height },
  format: 'depth24plus',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});`,
        note: 'More lines than WebGL for one cube and fewer for a hundred: validation happens once at pipeline creation rather than on every state change, which is the trade this API is making.',
      },
    ],
    gotchas: [
      {
        title: 'Everything is async, and adapters can be null',
        body: 'requestAdapter() returns null on unsupported hardware rather than throwing. Check it, or you will read a property of null on exactly the machines you cannot reproduce on.',
      },
      {
        title: 'Uniform buffers are padded to 16 bytes',
        body: 'A single f32 uniform still needs a 16-byte buffer. WGSL struct layout follows strict alignment rules, and getting them wrong gives you plausible-looking garbage rather than an error.',
      },
      {
        title: 'It is not a drop-in for WebGL',
        body: 'Y in clip space, the depth range, and texture origin conventions all differ. Porting a WebGL renderer is a rewrite of the plumbing, not a search and replace.',
      },
    ],
    learnUrls: [
      'https://webgpufundamentals.org/',
      'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API',
    ],
  },
  {
    slug: 'three',
    name: 'Three.js',
    tagline: 'A scene, not a pipeline. The default answer for most 3D on the web.',
    kind: 'Library · scene graph',
    demo: 'code-only',
    linesForPlasma: 22,
    linesForCube: 31,
    homepage: 'https://threejs.org/',
    what: [
      'Three.js gives you the vocabulary you actually think in: scenes, meshes, materials, lights, cameras. It handles the buffer juggling, the matrix chain, the render loop and a great deal of cross-device sanity, and it has by far the largest ecosystem of loaders, controls and examples of anything here.',
      'It is the right default for most 3D on the web, and it is worth learning after the fundamentals rather than instead of them — otherwise the day something looks wrong you have no model of what it is doing on your behalf.',
    ],
    reachFor: [
      'You want a scene with models, materials, lights and orbit controls, this week.',
      'You need glTF loading, post-processing, shadows or text — all solved and maintained.',
      'You are working with others: it is the thing most people already know.',
    ],
    avoid: [
      'You are trying to learn what the GPU does. Three.js is very good at hiding exactly that.',
      'Bundle size is critical and you draw one simple thing. The full library dwarfs a hand-written effect.',
    ],
    samples: [
      {
        label: 'The whole plasma',
        language: 'javascript',
        note: 'The same GLSL as the WebGL page, with the plumbing replaced by three lines of object construction.',
        source: `import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ canvas });
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader,    // the same trivial pass-through
  fragmentShader,  // the same cosine palette
});

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

renderer.setAnimationLoop((now) => {
  material.uniforms.uTime.value = now / 1000;
  renderer.render(scene, camera);
});`,
      },
      {
        label: 'Install',
        language: 'bash',
        source: 'npm install three',
      },
    ],
    cubeSamples: [
      {
        label: 'The whole thing',
        language: 'javascript' as const,
        source: `import * as THREE from 'three';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.set(0, 1.4, 4.2);
camera.lookAt(0, 0, 0);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ vertexColors: true }),
);
scene.add(cube);

const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(0.4, 0.8, 0.6);
scene.add(key, new THREE.AmbientLight(0xffffff, 0.12));

renderer.setAnimationLoop((t) => {
  cube.rotation.y = t * 0.0006;
  cube.rotation.x = t * 0.00035;
  renderer.render(scene, camera);
});`,
        note: 'The depth buffer, the culling, the normal matrix, the vertex layout and the light rig are all still there — they are simply not yours to write. This is where the gap is widest: a quarter of the lines for a scene that takes real effort to get right by hand.',
      },
    ],
    gotchas: [
      {
        title: 'Dispose what you create',
        body: 'Geometries, materials and textures hold GPU memory that garbage collection will not reclaim. Long-lived apps that build scenes dynamically leak steadily until they crash the tab.',
      },
      {
        title: 'React Three Fiber is the React binding, not a fork',
        body: 'If you are in React, r3f expresses the same objects as components and is generally the nicer way in. Everything you learn about Three.js still applies underneath it.',
      },
      {
        title: 'setAnimationLoop, not requestAnimationFrame',
        body: 'It looks like a stylistic choice and is not: only setAnimationLoop works in WebXR sessions, and switching later is a nuisance.',
      },
    ],
    learnUrls: ['https://threejs.org/docs/', 'https://threejs-journey.com/'],
  },
  {
    slug: 'vgpu',
    name: 'vgpu',
    tagline: 'A small typed layer over WebGPU that also runs headless.',
    kind: 'Library · WebGPU + WGSL',
    demo: 'code-only',
    linesForPlasma: 12,
    linesForCube: 26,
    homepage: 'https://vgpu.sh/',
    what: [
      'vgpu is a minimal WebGPU library from Vercel Labs. Its distinguishing idea is that WGSL files behave like TypeScript modules — you import a shader, the loader resolves its import graph at build time, and reflection keeps the bindings correct. A complete full-screen effect comes to about 25 KB gzipped.',
      'The part that is genuinely unusual is the runtime story: the same code runs in the browser, in headless Node against a Dawn-backed adapter, and in a deterministic software mock. That means shaders can be compile-checked and snapshot-rendered in CI rather than eyeballed — which is the reason it is worth a look even if you do not adopt it.',
      'It sits at the opposite end of the scale from the labs on this site. vgpu deliberately removes the pipeline ceremony that the Coordinate Spaces and Projection labs exist to show you, so it is a good tool to reach for once you already know what it is folding away.',
    ],
    reachFor: [
      'You are writing WGSL seriously and want shaders to be modules with real imports rather than template strings.',
      'You want shader validation and rendered output checked in CI, not by looking at it.',
      'You want WebGPU without hand-writing pipeline and bind-group descriptors every time.',
    ],
    avoid: [
      'You need WebGL support. vgpu is WebGPU only — there is no fallback path.',
      'You are learning the pipeline. It hides precisely the plumbing you are trying to see.',
      'You want a scene graph with loaders and controls. That is a different tool.',
    ],
    samples: [
      {
        label: 'Install',
        language: 'bash',
        source: `npm install vgpu
npm install -D @webgpu/types`,
      },
      {
        label: 'A full-screen effect',
        language: 'typescript',
        note: 'Follows the shape of vgpu’s own getting-started guide. Compare it with the WebGPU page: same output, no pipeline or bind-group descriptors in sight.',
        source: `import { clock, effect, frameLoop, init, surface } from 'vgpu';
import plasma from './plasma.wgsl';

const gpu = await init();
const view = surface(gpu, canvas, { dpr: [1, 2] });
const plasmaEffect = effect(gpu, plasma);
const time = clock(gpu);

frameLoop(gpu, (frame) => {
  plasmaEffect.set({ time: time.time });
  frame.pass(view, plasmaEffect);
});`,
      },
      {
        label: 'The bit that is actually novel — rendering in a test',
        language: 'typescript',
        note: 'Headless Node, real pixels back. This is what makes shader output assertable in CI.',
        source: `import { draw, frame, init, target } from 'vgpu/node';
import triangle from './triangle.wgsl';

const gpu = await init();
const colour = target(gpu, { size: [256, 256], format: 'rgba8unorm' });

frame(gpu, (f) => f.pass(colour, draw(gpu, { shader: triangle })));

const pixels = await colour.read();
gpu.dispose();`,
      },
      {
        label: 'Wiring the WGSL loader into Next.js',
        language: 'typescript',
        note: 'Needed only if you want .wgsl files rather than strings. effect() accepts a plain string too.',
        source: `// next.config.ts
const nextConfig = {
  turbopack: {
    rules: {
      '*.wgsl': { loaders: ['@vgpu/wgsl/loader-webpack'], as: '*.js' },
    },
  },
};

export default nextConfig;`,
      },
    ],
    cubeSamples: [
      {
        label: 'The whole thing',
        language: 'typescript' as const,
        source: `import { renderer, mesh, box, camera, light } from 'vgpu';

const view = await renderer({ canvas });

const spinning = mesh(box(1), { material: 'lambert', vertexColors: true });
view.add(spinning);

view.add(light.directional([0.4, 0.8, 0.6], { intensity: 0.9 }));
view.add(light.ambient(0.12));

view.camera = camera.perspective({
  position: [0, 1.4, 4.2],
  target: [0, 0, 0],
  fov: 45,
});

view.frame((t) => {
  spinning.rotation = [t * 0.35, t * 0.6, 0];
});`,
        note: 'A typed layer over WebGPU, so the pipeline, the depth texture and the bind groups are inferred from this description. Shortest of the four — and the one that teaches you least about what the GPU is doing, which is exactly the trade.',
      },
    ],
    gotchas: [
      {
        title: 'A .wgsl import is an object, not a string',
        body: 'The default export is a ShaderSource ({ version, wgsl }). Hand it straight to effect(), which accepts either — do not reach into .wgsl yourself.',
      },
      {
        title: 'TypeScript needs to be told what .wgsl is',
        body: 'Without an ambient declaration, importing a shader fails to compile. Referencing @vgpu/wgsl/wgsl-types from a .d.ts is the one-line fix.',
      },
      {
        title: 'It inherits every WebGPU constraint',
        body: 'No WebGPU, no vgpu. The abstraction is over the ceremony, not over the availability.',
      },
    ],
    learnUrls: ['https://vgpu.sh/', 'https://webgpufundamentals.org/'],
  },
];

export function getTechnology(slug: string): Technology | undefined {
  return TECHNOLOGIES.find((tech) => tech.slug === slug);
}

/** The shader maths every page shares, quoted once for the index page. */
export const SHARED_SCENE = {
  title: 'The same scene, four ways',
  formula: 'colour = 0.5 + 0.5 · cos(time + uv.xyx + (0, 2, 4))',
  description:
    'Every page below renders one identical thing: a cosine-palette plasma, three cosines a phase apart. The maths never changes, so what you are comparing is purely the code you have to write around it.',
};
