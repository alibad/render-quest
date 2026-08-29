/**
 * The lab registry. `status` is load-bearing: the site renders planned labs as
 * plainly unfinished rather than as links, so nothing on the page promises a
 * page that is not there.
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
    concepts: ['instancing', 'draw calls', 'instance_index', 'CPU cost'],
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

export const LAB_TECHNOLOGIES: { id: LabTechnology; label: string }[] = [
  { id: 'webgl', label: 'WebGL' },
  { id: 'webgpu', label: 'WebGPU' },
];

export function getLab(slug: string): Lab | undefined {
  return LABS.find((lab) => lab.slug === slug);
}
