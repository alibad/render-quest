import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'WebGL, WebGPU, Three.js and vgpu compared';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Technologies',
    title: 'The same scene, four ways.',
    subtitle:
      'WebGL, WebGPU, Three.js and vgpu rendering one identical thing — so the only difference you are comparing is the code.',
  });
}
