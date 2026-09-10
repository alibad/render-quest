import { renderOgImage, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og-template';
import {
  CODE_ONLY,
  REFERENCE_SCENES,
  RUNS_HERE,
  SHARED_SCENE,
  TECHNOLOGIES,
  inWords,
  nameList,
} from '@/lib/technologies';

/**
 * The card called the comparison one scene in four technologies, and its
 * subtitle had every one of them drawing it. There are two reference scenes and
 * only two of the four draw anything, so both halves come from the registry now
 * — including the alt text, which describes the card to a reader who cannot see
 * it and so has to agree with what the card says.
 */
const SCENES = `the same ${inWords(REFERENCE_SCENES.length)} reference scenes`;

export const alt = `${nameList(TECHNOLOGIES)} compared on ${SCENES}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: 'Technologies',
    title: `${SHARED_SCENE.title}.`,
    subtitle:
      `${SCENES[0].toUpperCase()}${SCENES.slice(1)} on every page — ` +
      `${nameList(RUNS_HERE)} rendering them here, ${nameList(CODE_ONLY)} printing the ` +
      'code that would and saying so.',
  });
}
