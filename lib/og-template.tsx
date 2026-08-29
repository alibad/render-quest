import { ImageResponse } from 'next/og';

import { SITE_NAME } from './site';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Shared social card.
 *
 * Satori (which renders these) supports a subset of CSS — flexbox, absolute
 * positioning, solid backgrounds and gradients, but not CSS variables, clip
 * paths or transforms worth relying on. So the mark is rebuilt here from
 * rectangles and a circle rather than reusing the site's SVG: an eye, a near
 * plane and a far plane, the same three ideas at a coarser resolution.
 */
export function renderOgImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#08090b',
          padding: '68px 72px',
          position: 'relative',
        }}
      >
        {/* Accent rule down the left edge */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            background: '#5cc8ff',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              marginBottom: 44,
            }}
          >
            {/* The mark: eye, near plane, far plane */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  background: '#5cc8ff',
                }}
              />
              <div style={{ width: 9, height: 54, background: '#e8ebf0' }} />
              <div style={{ width: 7, height: 96, background: '#5cc8ff' }} />
            </div>
            <div
              style={{
                fontSize: 30,
                color: '#e8ebf0',
                letterSpacing: -0.5,
                fontWeight: 600,
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          <div
            style={{
              fontSize: 21,
              color: '#5cc8ff',
              letterSpacing: 4,
              textTransform: 'uppercase',
              marginBottom: 22,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 74,
              color: '#e8ebf0',
              lineHeight: 1.08,
              letterSpacing: -2.5,
              fontWeight: 600,
              maxWidth: 940,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 27,
            color: '#949dae',
            lineHeight: 1.4,
            maxWidth: 900,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
