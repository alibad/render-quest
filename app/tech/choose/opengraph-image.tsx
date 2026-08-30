import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'Which graphics technology should you use? — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'Which should you use?',
    subtitle:
      'WebGL, WebGPU, Three.js or vgpu — answer three questions and see the reasoning, not just the verdict.',
  });
}
