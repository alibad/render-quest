import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { LIVE_LABS } from '@/lib/labs';

export const alt = 'Render Quest labs';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: `${LIVE_LABS.length} interactive labs`,
    title: 'One idea per lab, with the controls to it.',
    subtitle:
      'The model matrix, projection and the frustum, coordinate spaces, light and normals — each running live on real WebGL.',
  });
}
