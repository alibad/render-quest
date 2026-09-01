import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'About — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'About',
    subtitle: 'Why it exists, how the labs are built, and how its claims about itself are checked.',
  });
}
