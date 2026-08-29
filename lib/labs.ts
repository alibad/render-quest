/**
 * The lab registry. `status` is load-bearing: the site renders planned labs as
 * plainly unfinished rather than as links, so nothing on the page promises a
 * page that is not there.
 */

export interface Lab {
  slug: string;
  title: string;
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
    title: 'Light & Normals',
    blurb:
      'Move a light around a surface and watch the shading model respond, term by term.',
    takeaway:
      'Why normals need the inverse-transpose, and what separates flat, Gouraud and Phong.',
    concepts: ['normals', 'lambert', 'specular', 'inverse-transpose'],
    status: 'live',
  },
];

export const LIVE_LABS = LABS.filter((lab) => lab.status === 'live');

export function getLab(slug: string): Lab | undefined {
  return LABS.find((lab) => lab.slug === slug);
}
