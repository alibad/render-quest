import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import { ALL_RESOURCES } from '@/lib/resources';

export const alt = 'A curated path through graphics and game development';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: `${ALL_RESOURCES.length} curated resources`,
    title: 'Everything worth reading, in the order worth reading it.',
    subtitle:
      'Graphics and game development, arranged in stages so each one makes the next easier. Every link checked.',
  });
}
