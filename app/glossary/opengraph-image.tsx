import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';

export const alt = 'Glossary — Render Quest';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Render Quest',
    title: 'Glossary',
    subtitle: 'The graphics vocabulary in plain language, each term linked to a lab that shows it.',
  });
}
