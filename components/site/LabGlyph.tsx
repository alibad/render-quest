/**
 * A small diagram per lab — each one depicts the thing the lab actually
 * teaches, so the cards read as a contents page rather than decoration.
 *
 * SVG rather than four more WebGL contexts: crisp at any size, theme-aware
 * through currentColor, and free.
 */

const BOX = 'h-full w-full';

export function LabGlyph({ slug }: { slug: string }) {
  switch (slug) {
    case 'transform':
      return <TransformGlyph />;
    case 'projection':
      return <ProjectionGlyph />;
    case 'pipeline':
      return <PipelineGlyph />;
    case 'shading':
      return <ShadingGlyph />;
    default:
      return null;
  }
}

/** A 4x4 grid of cells with the translation column picked out. */
function TransformGlyph() {
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const isTranslation = col === 3 && row < 3;
      const isDiagonal = row === col;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={8 + col * 13}
          y={6 + row * 11}
          width="9"
          height="7"
          rx="1.5"
          className={
            isTranslation
              ? 'fill-amber'
              : isDiagonal
                ? 'fill-accent'
                : 'fill-fg-faint/30'
          }
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      {cells}
    </svg>
  );
}

/** The frustum in profile, with near and far planes marked. */
function ProjectionGlyph() {
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <path
        d="M20 18 L58 6 L58 50 L20 38 Z"
        className="fill-accent/15 stroke-accent"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 28 L58 6 M8 28 L58 50"
        className="stroke-fg-faint/50"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M20 18 L20 38"
        className="stroke-fg"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="28" r="3" className="fill-accent" />
    </svg>
  );
}

/** Five stages, the shape changing as the vertex moves down the chain. */
function PipelineGlyph() {
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <path
        d="M6 34 L16 30 L16 20 L6 24 Z"
        className="fill-fg-faint/25 stroke-fg-faint"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M23 37 L35 31 L35 17 L23 21 Z"
        className="fill-fg-faint/25 stroke-fg-faint"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M42 40 L54 34 L54 14 L42 18 Z"
        className="fill-accent/20 stroke-accent"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect
        x="58"
        y="18"
        width="6"
        height="18"
        rx="1"
        className="fill-accent/30 stroke-accent"
        strokeWidth="1.2"
      />
      <path
        d="M18 27 L21 27 M37 27 L40 27 M55.5 27 L57 27"
        className="stroke-fg-faint/60"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A lit sphere: terminator, highlight, and the incoming ray. */
function ShadingGlyph() {
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <defs>
        <radialGradient id="rq-lit" cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.95" />
          <stop offset="55%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0.06" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="30" r="17" fill="url(#rq-lit)" />
      <circle
        cx="32"
        cy="30"
        r="17"
        fill="none"
        className="stroke-line-strong"
        strokeWidth="1.2"
      />
      <circle cx="25.5" cy="23" r="3.6" className="fill-fg" opacity="0.9" />
      <path
        d="M60 6 L42 17"
        className="stroke-amber"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="61" cy="5" r="2.6" className="fill-amber" />
    </svg>
  );
}
