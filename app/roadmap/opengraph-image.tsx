import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'Roadmap — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'Roadmap',
    subtitle: 'Everything that shipped and why — and the proposals that were turned down, with the reason.',
  });
}
