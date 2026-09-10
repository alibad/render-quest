/**
 * The lab registry. `status` is load-bearing: the site renders planned labs as
 * plainly unfinished rather than as links, so nothing on the page promises a
 * page that is not there.
 *
 * All ten labs are 'live', and the last one that was not left this file in
 * 0f77054 (2026-08-29) — so the site itself has not rendered a 'building' lab
 * since, and the four layouts that branch on it would otherwise be discovered
 * broken by the eleventh lab rather than by a test. test/content.test.ts keeps
 * them honest by pushing a synthetic 'building' lab and rendering /labs,
 * /about and /roadmap against it; it pops the lab again afterwards.
 */

/** Which GPU API a lab is built on. Labs teach concepts; this is the vehicle. */
export type LabTechnology = 'webgl' | 'webgpu';

export interface Lab {
  slug: string;
  /** Position in the intended sequence. Sorted on, not just documented. */
  order: number;
  /** The lab whose ideas this one assumes. Verified acyclic in test/content.test.ts. */
  prereq?: string;
  title: string;
  /** The API this particular lab runs on, and why it had to be that one. */
  technology: LabTechnology;
  /** Set when the lab genuinely cannot be built on the other API. */
  technologyReason?: string;
  /** One line, shown on cards. */
  blurb: string;
  /** What you actually come away understanding. */
  takeaway: string;
  /**
   * The takeaway restated as something now true, shown at the foot of the lab.
   *
   * Every lab opened by promising a takeaway and then never returned to it, so
   * the page ended with the instrument and the reader closed the tab with no
   * evidence that anything had happened. This is that evidence, and it is
   * phrased as a capability — what you can now predict, read or say — rather
   * than as a topic that was covered.
   */
  receipt: string;
  /**
   * One sentence naming what this lab did NOT teach, and why.
   *
   * The harder of the two and the more valuable. A reader who has just watched
   * one claim demonstrated will generalise it past the evidence unless
   * something tells them where the evidence stops, and no competing resource
   * says so. Rules for writing one: name a real neighbouring subject rather
   * than the takeaway in the negative; say why it is absent, which is usually
   * that it is a different pass, a different stage or a different kind of work
   * rather than one more control; and where the site does cover it somewhere
   * else, say where.
   */
  boundary: string;
  concepts: string[];
  status: 'live' | 'building';
}

export const LABS: Lab[] = [
  {
    slug: 'transform',
    order: 1,
    technology: 'webgl',
    title: 'The Model Matrix',
    blurb:
      'Move, turn and stretch an object by dragging the numbers that do it, and watch the matrix fill in as you go.',
    takeaway:
      'Why a matrix chain reads right to left, and why the columns are the object’s own axes.',
    receipt:
      'You can now read a model matrix without multiplying it out — which column is the position, which three are the object’s own axes — and say why turning a cube and then moving it leaves it somewhere else entirely from moving it and then turning it.',
    boundary:
      'This did not teach you what happens when one object hangs off another. Every matrix here starts at the world origin, so the compounding chain a scene graph keeps — each object’s matrix multiplied by its parent’s before it ever reaches a shader — never appears; that is among the things a library does on your behalf, and the Three.js entry under /tech is where this site says so.',
    concepts: ['translate', 'rotate', 'scale', 'composition order', 'basis vectors'],
    status: 'live',
  },
  {
    slug: 'projection',
    order: 2,
    prereq: 'transform',
    technology: 'webgl',
    title: 'Projection & the Frustum',
    blurb:
      'See the camera’s frustum as an object in the world, and the picture it produces, side by side.',
    takeaway:
      'What the perspective divide actually does, and why near and far are a hard clip rather than a fade.',
    receipt:
      'You can now say what a projection matrix contributes and what it leaves to the hardware — it parks the distance in w, and the divide happens later — and predict which boxes leave the picture first when the field of view narrows.',
    boundary:
      'This did not teach you the view matrix. The camera here is already standing at the origin looking down its own −z before the projection is reached, so aiming a camera, and the fact that doing so means moving the world the other way instead, is one handover earlier: the world-to-view step in Coordinate Spaces.',
    concepts: ['perspective', 'orthographic', 'near / far', 'clip space', 'field of view'],
    status: 'live',
  },
  {
    slug: 'pipeline',
    order: 3,
    prereq: 'projection',
    technology: 'webgl',
    title: 'Coordinate Spaces',
    blurb:
      'Follow one vertex from model space to the pixel it lands on, one stage at a time.',
    takeaway:
      'Where each matrix in the chain hands over to the next, and what the GPU does between them.',
    receipt:
      'You can now name which of the six spaces a coordinate is in from the shape of the numbers alone — w still 1, w carrying the distance, ±1 on every axis, pixels counting down from the top — and say what put it there.',
    boundary:
      'This did not teach you rasterisation. The lab follows one vertex to the pixel it lands on and stops; filling the triangle between three such pixels, and interpolating every varying across it with the perspective accounted for, is fixed-function work with no matrix in it and nothing a reader could move.',
    concepts: ['model space', 'view space', 'clip space', 'NDC', 'viewport'],
    status: 'live',
  },
  {
    slug: 'shading',
    order: 4,
    prereq: 'transform',
    technology: 'webgl',
    title: 'Light & Normals',
    blurb:
      'Move a light around a surface and watch the shading model respond, term by term.',
    takeaway:
      'Why normals need the inverse-transpose, and what separates flat, Gouraud and Phong.',
    receipt:
      'You can now say why a highlight follows you around the sphere while the diffuse shading stays painted on, and recognise the flattened-sphere signature of normals sent through the model matrix rather than its inverse-transpose.',
    boundary:
      'This did not teach you shadows. Nothing on this site casts one, because a shadow is a second render pass rather than a lighting term.',
    concepts: ['normals', 'lambert', 'specular', 'inverse-transpose'],
    status: 'live',
  },
  {
    slug: 'textures',
    order: 5,
    prereq: 'pipeline',
    technology: 'webgl',
    title: 'Textures & Sampling',
    blurb:
      'Wrap, filter and mip a texture, and see what each sampler setting actually costs you.',
    takeaway:
      'Why a texture looks wrong at a distance, and what mipmapping is really trading away.',
    receipt:
      'You can now tell magnification from minification by looking at the picture, choose a filter for a reason rather than out of habit, and say what a mip chain costs in memory and usually gives back in cache.',
    boundary:
      'This did not teach you where UV coordinates come from. The plane here builds its own out of the vertex position, which no real asset does — unwrapping a mesh, the seams that costs and the atlas the pieces are packed into are decided in a modelling tool long before a sampler sees them, and nothing on this site has one.',
    concepts: ['UV coordinates', 'filtering', 'mipmaps', 'wrap modes'],
    status: 'live',
  },
  {
    slug: 'compute',
    order: 6,
    prereq: 'pipeline',
    technology: 'webgpu',
    technologyReason:
      'WebGL has no compute shaders. This lab cannot be built on it — not slowly, not with a workaround. It is the clearest case for choosing WebGPU.',
    title: 'Compute & Particles',
    blurb:
      'A hundred thousand particles moved entirely by the GPU, with no per-particle work on the CPU at all.',
    takeaway:
      'What a compute shader is for, and the kind of problem that leaves WebGL behind entirely.',
    receipt:
      'You can now say what a compute shader is handed — an index and a buffer, with no vertex to place and no pixel to colour — and work out from a particle count how many workgroups a dispatch needs and why the shader still has to check the count itself.',
    boundary:
      'This did not teach you what happens when invocations have to talk to one another. Every particle here reads and writes its own slot and nobody else’s, so workgroup memory, barriers and atomics never come up — and they are where compute actually gets hard, in a sort or a collision grid rather than in a field of independent particles.',
    concepts: ['compute shader', 'storage buffers', 'workgroups', 'WGSL', 'instancing'],
    status: 'live',
  },
  {
    slug: 'instancing',
    order: 7,
    prereq: 'compute',
    technology: 'webgpu',
    technologyReason:
      'The lesson is CPU cost per draw call, which is precisely where WebGPU differs most from WebGL.',
    title: 'Draw Calls & Instancing',
    blurb:
      'Draw the same object ten thousand times and watch where the time actually goes.',
    takeaway:
      'Why the number of draw calls matters more than the number of triangles.',
    receipt:
      'You can now explain why one call and ten thousand produce the identical picture at very different cost, and read the ratio between the two modes rather than trusting a millisecond figure measured on somebody else’s machine.',
    boundary:
      'This did not teach you what the GPU does with the list once it has been handed over. The clock here stops the moment the command buffer is submitted, before anything is drawn, so overdraw, shading cost and memory bandwidth sit entirely outside the measurement — a scene can be slow for all three while its call count is one this lab would call healthy.',
    concepts: ['instancing', 'draw calls', 'instance_index', 'CPU cost'],
    status: 'live',
  },
  {
    slug: 'colour',
    order: 8,
    prereq: 'shading',
    technology: 'webgl',
    title: 'Colour & Gamma',
    blurb:
      'Split one lit sphere down the middle and light the two halves in different colour spaces.',
    takeaway:
      'Why lighting maths done on sRGB numbers is wrong, and why the mistake looks like a style rather than a bug.',
    receipt:
      'You can now say why the number 0.5 is about a fifth of the light, and read crushed shadows sitting beside highlights that agree as the mark of a shader multiplying on the wrong side of the encoding.',
    boundary:
      'This did not teach you colour spaces, only the transfer function that encodes one. The primaries and the white point never change anywhere on this site, and a value that comes out above 1 has nowhere to go but the clamp into an eight-bit framebuffer — deciding what should happen to it instead is a tone map, and a pipeline with no high dynamic range in it has no use for one.',
    concepts: ['sRGB', 'linear light', 'gamma', 'encode / decode'],
    status: 'live',
  },
  {
    slug: 'depth',
    order: 9,
    prereq: 'projection',
    technology: 'webgl',
    title: 'Depth & Transparency',
    blurb:
      'Make z-fighting happen on purpose, then fix it from the frustum — and find out why transparency needs sorting.',
    takeaway:
      'That depth precision is set by the near plane rather than the model, and that the depth buffer cannot answer the question transparency asks.',
    receipt:
      'You can now work out from the near plane and the distance whether two surfaces will fight before you look at them, and say why the ordering of translucent geometry is the half that no piece of render state will do for you.',
    boundary:
      'This did not teach you the ways out of sorting. Order-independent blending, a prepass and a reversed floating-point buffer are each a real answer to a failure on this page, and each one is a change to the pass structure or to the format the numbers are stored in rather than to a value a slider can reach.',
    concepts: ['depth buffer', 'z-fighting', 'blending', 'draw order'],
    status: 'live',
  },
  {
    slug: 'shader',
    order: 10,
    prereq: 'colour',
    technology: 'webgl',
    title: 'Write a Shader',
    blurb:
      'An editable fragment shader that recompiles as you type, with the driver’s own errors underneath.',
    takeaway:
      'That a shader is a function from a pixel coordinate to a colour, and that the errors are readable once something shows them to you.',
    receipt:
      'You can now write a fragment shader as a function from a coordinate to a colour, and read a driver’s complaint as a line number and one of three familiar shapes rather than as a wall.',
    boundary:
      'This did not teach you what a shader costs. Nothing on this page measures anything, so an expression a hundred times more expensive than the one it replaced looks exactly the same while you type it — Draw Calls & Instancing is the only lab here that reports a measurement, and what it measures is the CPU.',
    concepts: ['fragment shader', 'GLSL', 'compile errors', 'uniforms'],
    status: 'live',
  },
];

const byOrder = (a: Lab, b: Lab) => a.order - b.order;

/** Every lab, in the intended sequence. */
export const ORDERED_LABS = [...LABS].sort(byOrder);

export const LIVE_LABS = ORDERED_LABS.filter((lab) => lab.status === 'live');

/** The live lab before and after this one, for the end-of-lab footer. */
export function labNeighbours(slug: string): { previous?: Lab; next?: Lab } {
  const index = LIVE_LABS.findIndex((lab) => lab.slug === slug);
  if (index === -1) return {};
  return {
    previous: index > 0 ? LIVE_LABS[index - 1] : undefined,
    next: index < LIVE_LABS.length - 1 ? LIVE_LABS[index + 1] : undefined,
  };
}

/**
 * A link into one section of a lab's essay.
 *
 * Cross-lab links are the one place on this site where a sentence promises a
 * specific argument in another lab: sixteen of them, one to three per essay.
 * Typed out by hand each one is two chances to be wrong — the slug and the
 * fragment — and both fail the same silent way, as a page that loads and then
 * sits at the top with the promised paragraph nowhere in sight.
 *
 * This checks the half it can see. The fragment is a `<ProseHeading id="…">`
 * in `components/labs/<Name>Essay.tsx`, which only `essayOutline` can read, and
 * that module uses `node:fs` — importing it here would drag the filesystem into
 * every client component that imports this registry. So the section id is
 * checked in test/links.test.ts instead, which can read both sides at once.
 */
export function labSectionHref(slug: string, sectionId: string): string {
  if (!getLab(slug)) {
    throw new Error(`labSectionHref("${slug}", "${sectionId}"): no such lab`);
  }
  return `/labs/${slug}#${sectionId}`;
}

export const LAB_TECHNOLOGIES: { id: LabTechnology; label: string }[] = [
  { id: 'webgl', label: 'WebGL' },
  { id: 'webgpu', label: 'WebGPU' },
];

export function getLab(slug: string): Lab | undefined {
  return LABS.find((lab) => lab.slug === slug);
}
