/**
 * A small diagram per lab — each one depicts the thing the lab actually
 * teaches, so the cards read as a contents page rather than decoration.
 *
 * SVG rather than seven more GL contexts: crisp at any size, theme-aware
 * through the palette tokens, and free.
 *
 * Keyed by slug in one record rather than a `switch` with a `default`. The
 * switch silently returned nothing for any slug it had not been taught, so
 * three labs shipped with a hole where the diagram goes. A record has a
 * countable set of keys, which `test/content.test.ts` compares against the
 * lab registry — a lab added without a glyph now fails the build.
 */

// React 19 removed the global `JSX` namespace: it lives on the `react`
// package now, so the type has to be imported like any other.
import type { JSX } from 'react';

const BOX = 'h-full w-full';

const GLYPHS: Record<string, () => JSX.Element> = {
  transform: TransformGlyph,
  projection: ProjectionGlyph,
  pipeline: PipelineGlyph,
  shading: ShadingGlyph,
  textures: TexturesGlyph,
  compute: ComputeGlyph,
  instancing: InstancingGlyph,
  colour: ColourGlyph,
  depth: DepthGlyph,
  shader: ShaderGlyph,
};

/** Every slug that has a diagram. Asserted against the lab registry in tests. */
export const GLYPH_SLUGS = Object.keys(GLYPHS);

export function LabGlyph({ slug }: { slug: string }) {
  const Glyph = GLYPHS[slug];
  return Glyph ? <Glyph /> : null;
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

/**
 * A checkerboard plane running to the horizon, with the mip chain that keeps
 * it from breaking up. The plane is the lab's own scene; the falloff toward
 * the far edge is exactly the artefact the lab is about.
 */
function TexturesGlyph() {
  // Rows bunch up toward the horizon, which is what makes the plane read as
  // going away rather than as a flat grid.
  const rowY = [48, 38.5, 31, 25.5, 21.5, 18.5, 16.2, 14.5];
  const NEAR_Y = 48;
  const SPAN = NEAR_Y - 14;
  const edges = (y: number) => {
    const t = (NEAR_Y - y) / SPAN;
    return { left: 2 + 24 * t, right: 66 - 24 * t };
  };

  const cells = [];
  const COLS = 8;
  for (let r = 0; r < rowY.length - 1; r++) {
    const y0 = rowY[r];
    const y1 = rowY[r + 1];
    const e0 = edges(y0);
    const e1 = edges(y1);
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 !== 0) continue;
      const a0 = e0.left + ((e0.right - e0.left) * c) / COLS;
      const b0 = e0.left + ((e0.right - e0.left) * (c + 1)) / COLS;
      const a1 = e1.left + ((e1.right - e1.left) * c) / COLS;
      const b1 = e1.left + ((e1.right - e1.left) * (c + 1)) / COLS;
      cells.push(
        <path
          key={`${r}-${c}`}
          d={`M${a0.toFixed(2)} ${y0} L${b0.toFixed(2)} ${y0} L${b1.toFixed(2)} ${y1} L${a1.toFixed(2)} ${y1} Z`}
          className="fill-fg"
          // Fading with distance stands in for the detail a mip level drops.
          opacity={(0.5 - r * 0.06).toFixed(2)}
        />,
      );
    }
  }

  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <path
        d="M2 48 L66 48 L42 14 L26 14 Z"
        className="fill-accent/10 stroke-accent/45"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      {cells}
      {/* The mip chain, each level half the last. */}
      <g className="fill-accent/25 stroke-accent" strokeWidth="1">
        <rect x="3" y="3" width="9" height="9" rx="1.2" />
        <rect x="15" y="6" width="6" height="6" rx="1" />
        <rect x="24" y="8.5" width="3.5" height="3.5" rx="0.8" />
      </g>
    </svg>
  );
}

/**
 * Particles on a vortex with the trails they sweep — the shape the lab settles
 * into once the swirl balances the pull inward.
 */
function ComputeGlyph() {
  const TURNS = 2.4;
  const COUNT = 40;
  const at = (t: number) => {
    const angle = t * TURNS * Math.PI * 2;
    const radius = 2.5 + t * t * 24;
    return [34 + Math.cos(angle) * radius * 1.2, 28 + Math.sin(angle) * radius * 0.8];
  };

  const dots = [];
  for (let i = 0; i < COUNT; i++) {
    const t = i / (COUNT - 1);
    const [x, y] = at(t);
    dots.push(
      <circle
        key={i}
        cx={x.toFixed(2)}
        cy={y.toFixed(2)}
        r={(0.85 + t * 1.6).toFixed(2)}
        className={t > 0.74 ? 'fill-amber' : 'fill-accent'}
        opacity={(0.4 + t * 0.55).toFixed(2)}
      />,
    );
  }

  // A sampled trail along the same curve, so the ring reads as motion.
  let trail = '';
  for (let i = 0; i <= 60; i++) {
    const [x, y] = at(i / 60);
    trail += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
  }

  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <path
        d={trail}
        className="stroke-accent/30"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      {dots}
    </svg>
  );
}

/**
 * One mesh drawn many times: the lead instance solid, the rest sharing it.
 * Draw calls are the lesson, so the repeated copies are the whole picture.
 */
function InstancingGlyph() {
  const boxes = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) {
      const lead = row === 0 && col === 0;
      boxes.push(
        <rect
          key={`${row}-${col}`}
          x={7 + col * 11.5}
          y={8 + row * 12}
          width="8"
          height="8"
          rx="1.4"
          className={
            lead
              ? 'fill-accent/40 stroke-accent'
              : 'fill-fg-faint/20 stroke-fg-faint/60'
          }
          strokeWidth={lead ? 1.5 : 1}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      {boxes}
      {/* One buffer feeding all of them — the point of instancing. */}
      <path
        d="M11 40 L11 47 L58 47"
        className="stroke-accent/60"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

/**
 * A ramp split against itself: the encoded steps above, the light they actually
 * stand for below. The gap between the two rows is the lab.
 */
function ColourGlyph() {
  const STEPS = 9;
  const bars = [];
  for (let i = 0; i < STEPS; i++) {
    const value = i / (STEPS - 1);
    const light = Math.pow(value, 2.2);
    const x = 4 + i * 6.8;
    bars.push(
      <g key={i}>
        {/* Top: evenly spaced numbers, as a colour picker hands them to you. */}
        <rect
          x={x}
          y="8"
          width="5.6"
          height="17"
          rx="0.8"
          fill={`rgb(${Math.round(value * 255)}, ${Math.round(value * 255)}, ${Math.round(value * 255)})`}
          className="stroke-line-strong"
          strokeWidth="0.5"
        />
        {/* Bottom: the light each of those numbers is actually worth. */}
        <rect
          x={x}
          y="31"
          width="5.6"
          height="17"
          rx="0.8"
          fill={`rgb(${Math.round(light * 255)}, ${Math.round(light * 255)}, ${Math.round(light * 255)})`}
          className="stroke-line-strong"
          strokeWidth="0.5"
        />
      </g>,
    );
  }
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      {bars}
      <path
        d="M4 28 L64 28"
        className="stroke-accent"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

/**
 * Two panels tearing into each other in bands — z-fighting as it actually
 * appears, which is the thing people search for without knowing its name.
 */
function DepthGlyph() {
  const bands = [];
  for (let i = 0; i < 11; i++) {
    // Irregular widths, because a regular stripe reads as a pattern rather
    // than as a failure.
    const y = 14 + i * 2.6;
    const cut = 22 + ((i * 13) % 17);
    bands.push(
      <rect key={`a${i}`} x="10" y={y} width={cut} height="2.2" className="fill-axis-x" opacity="0.85" />,
    );
    bands.push(
      <rect key={`b${i}`} x={10 + cut} y={y} width={44 - cut} height="2.2" className="fill-axis-z" opacity="0.85" />,
    );
  }
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      {/* The two panels, seen almost edge on. */}
      <path d="M10 12 L54 12 L54 44 L10 44 Z" className="fill-none stroke-line-strong" strokeWidth="1" />
      {bands}
    </svg>
  );
}

/** A caret in a block of code, with the picture it compiles to beside it. */
function ShaderGlyph() {
  const lines = [26, 18, 30, 14, 22];
  return (
    <svg viewBox="0 0 68 56" className={BOX} aria-hidden>
      <g className="fill-fg-faint/45">
        {lines.map((width, i) => (
          <rect key={i} x="5" y={12 + i * 7} width={width} height="3" rx="1.5" />
        ))}
      </g>
      {/* The caret, on the line being typed. */}
      <rect x="21" y="32.5" width="1.6" height="4" className="fill-accent" />
      {/* What it compiles to. */}
      <circle cx="52" cy="28" r="12" className="fill-accent/25 stroke-accent" strokeWidth="1.3" />
      <circle cx="52" cy="28" r="5.5" className="fill-amber/70" />
    </svg>
  );
}
