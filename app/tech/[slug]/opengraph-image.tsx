import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { TECHNOLOGIES, getTechnology } from '@/lib/technologies';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Render Quest — technology guide';

/** One card per technology, generated at build time alongside the pages. */
export function generateImageMetadata() {
  return TECHNOLOGIES.map((tech) => ({
    id: tech.slug,
    size: OG_SIZE,
    alt: `${tech.name} — Render Quest`,
    contentType: OG_CONTENT_TYPE,
  }));
}

export default function Image({ params }: { params: { slug: string } }) {
  const tech = getTechnology(params.slug);
  return renderOgImage({
    eyebrow: tech?.kind ?? 'Technology',
    title: tech?.name ?? 'Technologies',
    subtitle: tech?.tagline ?? '',
  });
}
