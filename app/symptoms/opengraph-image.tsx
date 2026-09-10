import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { SYMPTOMS } from '@/lib/symptoms';

export const alt = 'Symptoms — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'Symptoms',
    subtitle:
      `${SYMPTOMS.length} things graphics code does wrong, in the words people use when it ` +
      'happens — each linked to a lab that reproduces it.',
  });
}
