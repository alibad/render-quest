import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { getLab } from '@/lib/labs';

const lab = getLab('compute');

export const alt = lab ? `${lab.title} — Render Quest` : 'Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Interactive lab · WebGPU',
    title: lab?.title ?? 'Render Quest',
    subtitle: lab?.takeaway ?? '',
  });
}
