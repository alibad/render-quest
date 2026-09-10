import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * The home-screen icon.
 *
 * Same three shapes as app/icon.svg — eye, near plane, far plane — at the same
 * proportions, scaled by 180/32. Satori renders this, and Satori's CSS subset
 * does not include SVG paths, so the mark is rebuilt from absolutely positioned
 * divs, exactly as lib/og-template.tsx rebuilds it for the social card.
 *
 * No rounded corners here on purpose: iOS applies its own mask, and a corner
 * radius baked into the image shows up as a dark seam inside it.
 */
const SCALE = size.width / 32;
const unit = (n: number) => n * SCALE;

/** A round-capped stroke, expressed as the rectangle it actually covers. */
function plane({
  x,
  y1,
  y2,
  width,
  colour,
}: {
  x: number;
  y1: number;
  y2: number;
  width: number;
  colour: string;
}) {
  const w = unit(width);
  return {
    position: 'absolute' as const,
    left: unit(x) - w / 2,
    top: unit(y1) - w / 2,
    width: w,
    height: unit(y2 - y1) + w,
    borderRadius: w / 2,
    background: colour,
  };
}

export default function AppleIcon() {
  const eye = unit(2.5) * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#08090b',
        }}
      >
        {/* far plane */}
        <div style={plane({ x: 25.4, y1: 6, y2: 26, width: 3, colour: '#5cc8ff' })} />
        {/* near plane: where the image actually forms */}
        <div style={plane({ x: 14, y1: 10.6, y2: 21.4, width: 3.2, colour: '#e8ebf0' })} />
        {/* the eye */}
        <div
          style={{
            position: 'absolute',
            left: unit(6) - eye / 2,
            top: unit(16) - eye / 2,
            width: eye,
            height: eye,
            borderRadius: eye,
            background: '#5cc8ff',
          }}
        />
      </div>
    ),
    size,
  );
}
