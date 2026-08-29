import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { SITE_TAGLINE } from '@/lib/site';

export const alt = 'Render Quest — interactive graphics labs';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Interactive graphics labs',
    title: SITE_TAGLINE,
    subtitle:
      'Drag the numbers and watch the matrix, the geometry and the pixels change together. Real WebGL, live in your browser.',
  });
}
