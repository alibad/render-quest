import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'Privacy — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'Privacy',
    subtitle: 'No accounts, no analytics, no cookies. There is nothing to collect.',
  });
}
