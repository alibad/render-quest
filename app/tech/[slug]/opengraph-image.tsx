import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { getTechnology } from '@/lib/technologies';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Render Quest — technology guide';

/*
 * There used to be a `generateImageMetadata` here returning one entry per
 * technology. That is for a route that serves SEVERAL images, not one image per
 * dynamic segment — so every technology page emitted all four cards, and the
 * first `og:image` a scraper met on /tech/webgpu was the one named `webgl`.
 * `generateStaticParams` on the page already produces one route per slug, and
 * `Image()` resolves the card from `params.slug`, so one default image is both
 * correct and what the page actually needs.
 */

export default function Image({ params }: { params: { slug: string } }) {
  const tech = getTechnology(params.slug);
  return renderOgImage({
    eyebrow: tech?.kind ?? 'Technology',
    title: tech?.name ?? 'Technologies',
    subtitle: tech?.tagline ?? '',
  });
}
