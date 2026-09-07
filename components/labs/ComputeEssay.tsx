import { Figure } from '@/components/lab/Figure';
import { Prose, ProseHeading } from '@/components/lab/Prose';

/**
 * The written half of lab 6.
 *
 * No hooks and no canvas, so this stays a server component: the figures are
 * inline SVG rather than live renders. That is a deliberate departure from the
 * exemplar in lab 1. ComputeLab owns its own WebGPU adapter and device, and
 * standing up three or four more of them to illustrate the prose would cost
 * more than the pictures are worth — and on a machine without WebGPU every one
 * of them would print a failure card in the middle of a paragraph. What this
 * lab actually needs explaining is a structure: which memory each stage can
 * reach, and what crosses the bus. A diagram says that better than a canvas.
 *
 * Every number below is read out of ComputeLab.tsx. WORKGROUP_SIZE is 64,
 * MAX_PARTICLES is 120,000, a Particle is four floats, the uniform block is 48
 * bytes, and the counts in figure 3 are ceil(100000 / 64) worked through.
 */

/** A labelled node in a dataflow diagram. */
function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone = 'muted',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  tone?: 'muted' | 'accent' | 'amber';
}) {
  const shell =
    tone === 'accent'
      ? 'fill-accent/10 stroke-accent'
      : tone === 'amber'
        ? 'fill-amber/10 stroke-amber'
        : 'fill-fg-faint/5 stroke-line-strong';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="4" className={shell} strokeWidth="1.2" />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 4}
        textAnchor="middle"
        fontSize="11.5"
        className="fill-fg font-mono"
      >
        {title}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          fontSize="10.5"
          className="fill-fg-faint"
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

/** The WebGL workaround, drawn: state smuggled through two float textures. */
function PingPongFigure() {
  const head = 'url(#cq-pp-head)';
  return (
    <Figure
      caption={
        <>
          Four objects and a swap, where the stage below needs one buffer. The
          positions are encoded as texels, stepped by a shader whose real job is
          colouring pixels, and read back as vertex attributes — none of which is
          part of the problem being solved.
        </>
      }
    >
      <svg
        viewBox="0 0 640 210"
        className="block h-auto w-full overflow-hidden"
        role="img"
        aria-label="A diagram of the WebGL particle workaround: texture A feeds a fragment shader that writes texture B, the two textures swap each frame, and texture B is sampled as vertex data"
      >
        <defs>
          <marker
            id="cq-pp-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-fg-faint" />
          </marker>
        </defs>

        <text x="12" y="22" fontSize="10.5" className="fill-fg-faint font-mono">
          WEBGL, WITHOUT A COMPUTE STAGE
        </text>

        <Node x={12} y={48} w={124} h={56} title="texture A" sub="positions as texels" />
        <Node
          x={176}
          y={48}
          w={124}
          h={56}
          title="fragment shader"
          sub="one texel per particle"
          tone="amber"
        />
        <Node x={340} y={48} w={124} h={56} title="texture B" sub="the stepped state" />
        <Node x={504} y={48} w={124} h={56} title="vertex fetch" sub="sampled back in" />

        <g className="stroke-fg-faint" strokeWidth="1.2" fill="none">
          <path d="M136 76 L172 76" markerEnd={head} />
          <path d="M300 76 L336 76" markerEnd={head} />
          <path d="M464 76 L500 76" markerEnd={head} />
          <path
            d="M402 104 L402 150 L74 150 L74 108"
            markerEnd={head}
            strokeDasharray="4 4"
          />
        </g>
        <text x="238" y="168" textAnchor="middle" fontSize="10.5" className="fill-fg-faint">
          the two textures swap roles every frame
        </text>
      </svg>
    </Figure>
  );
}

/** One buffer, two bindings, and nothing going back the other way. */
function StorageFigure() {
  const head = 'url(#cq-flow-head)';
  const cells = [];
  for (let i = 0; i < 20; i++) {
    cells.push(
      <rect
        key={i}
        x={128 + i * 19.5}
        y={118}
        width="15"
        height="38"
        rx="1.5"
        className={i === 0 ? 'fill-amber/60' : 'fill-accent/35'}
      />,
    );
  }
  return (
    <Figure
      caption={
        <>
          The particles never move. One allocation is bound twice — writable to
          the compute stage, read-only to the vertex stage — and the only thing
          the CPU puts on the bus is a 48-byte block of uniforms. There is no
          arrow back.
        </>
      }
    >
      <svg
        viewBox="0 0 640 296"
        className="block h-auto w-full overflow-hidden"
        role="img"
        aria-label="A diagram of the compute lab's dataflow: the CPU writes a 48-byte uniform block, the compute stage reads and writes the particle storage buffer, the vertex stage reads the same buffer, and nothing is read back to the CPU"
      >
        <defs>
          <marker
            id="cq-flow-head"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" className="fill-fg-faint" />
          </marker>
        </defs>

        <Node x={8} y={14} w={132} h={52} title="CPU" sub="48 bytes / frame" />
        <Node
          x={196}
          y={14}
          w={300}
          h={52}
          title="@compute @workgroup_size(64)"
          sub="one invocation per particle"
          tone="accent"
        />

        {/* The storage buffer itself: one allocation, sized at the maximum. */}
        <rect
          x="120"
          y="108"
          width="400"
          height="58"
          rx="5"
          className="fill-fg-faint/5 stroke-accent"
          strokeWidth="1.2"
        />
        {cells}
        <text x="540" y="133" fontSize="11.5" className="fill-fg font-mono">
          …
        </text>
        {/* Both lines stop short of x=346, where the arrows run. */}
        <text x="120" y="184" fontSize="10.5" className="fill-fg-faint font-mono">
          array&lt;Particle&gt; — 16 bytes a cell
        </text>
        <text x="120" y="200" fontSize="10.5" className="fill-fg-faint font-mono">
          1,920,000 bytes in all
        </text>

        <Node
          x={196}
          y={216}
          w={300}
          h={52}
          title="@vertex fn vs"
          sub="vertex_index / 6 picks the particle"
          tone="accent"
        />
        <Node x={548} y={216} w={84} h={52} title="screen" />

        <g className="stroke-fg-faint" strokeWidth="1.2" fill="none">
          <path d="M140 40 L192 40" markerEnd={head} />
          <path d="M346 66 L346 104" markerEnd={head} />
          <path d="M346 170 L346 212" markerEnd={head} />
          <path d="M496 242 L544 242" markerEnd={head} />
          {/* The return trip that does not happen. */}
          <path d="M120 137 L74 137 L74 70" strokeDasharray="4 4" className="stroke-fg-faint/40" />
        </g>
        <g className="fill-fg-faint" fontSize="10.5">
          <text x="356" y="90">read_write</text>
          <text x="356" y="206">read</text>
        </g>
        <g className="stroke-red" strokeWidth="1.6" strokeLinecap="round">
          <path d="M68 98 L80 110 M80 98 L68 110" />
        </g>
        <text x="88" y="107" fontSize="10.5" className="fill-fg-faint">
          never read back
        </text>
      </svg>
    </Figure>
  );
}

/** The dispatch, rounded up, and the invocations that fall off the end. */
function DispatchFigure() {
  const groups = [];
  for (let i = 0; i < 15; i++) {
    groups.push(
      <rect
        key={i}
        x={16 + i * 34}
        y={40}
        width="30"
        height="22"
        rx="2.5"
        className="fill-accent/30 stroke-accent/60"
        strokeWidth="1"
      />,
    );
  }

  const lanes = [];
  for (let i = 0; i < 64; i++) {
    lanes.push(
      <rect
        key={i}
        x={120 + i * 7.5}
        y={126}
        width="5.5"
        height="26"
        rx="1"
        className={i < 32 ? 'fill-accent/70' : 'fill-fg-faint/15 stroke-fg-faint/40'}
        strokeWidth={i < 32 ? undefined : 0.8}
      />,
    );
  }

  return (
    <Figure
      caption={
        <>
          A hundred thousand particles is 1,563 workgroups, and 1,563 workgroups
          is 100,032 invocations. The thirty-two on the right load an index past
          the count and return on the first line of the shader; the readout under
          the instrument counts both numbers, so the gap is visible as you drag.
        </>
      }
    >
      <svg
        viewBox="0 0 640 196"
        className="block h-auto w-full overflow-hidden"
        role="img"
        aria-label="A diagram of a dispatch of 1,563 workgroups, with the final workgroup expanded to show 32 invocations that have a particle and 32 that return immediately"
      >
        <text x="16" y="26" fontSize="10.5" className="fill-fg-faint font-mono">
          DISPATCH — 1,563 WORKGROUPS OF 64
        </text>
        {groups}
        <text x="534" y="56" fontSize="12" className="fill-fg-faint font-mono">
          …
        </text>
        <rect
          x="566"
          y="40"
          width="30"
          height="22"
          rx="2.5"
          className="fill-amber/25 stroke-amber"
          strokeWidth="1.1"
        />
        <path
          d="M581 64 L581 86 L360 86 L360 120"
          className="stroke-amber/60"
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="4 4"
        />
        {lanes}
        <path
          d="M120 160 L358 160 M362 160 L600 160"
          className="stroke-fg-faint/40"
          strokeWidth="1"
        />
        <text x="120" y="176" fontSize="10.5" className="fill-fg-faint">
          32 invocations with a particle
        </text>
        <text x="600" y="176" textAnchor="end" fontSize="10.5" className="fill-fg-faint">
          32 that return at the guard
        </text>
      </svg>
    </Figure>
  );
}

/** Six vertices per particle, and the disc cut out of the square. */
function QuadFigure() {
  const indices = [];
  for (let i = 0; i < 12; i++) {
    indices.push(
      <g key={i}>
        <rect
          x={20 + i * 22}
          y={66}
          width="19"
          height="24"
          rx="2"
          className={i < 6 ? 'fill-accent/25 stroke-accent/70' : 'fill-amber/20 stroke-amber/70'}
          strokeWidth="1"
        />
        <text
          x={20 + i * 22 + 9.5}
          y={82}
          textAnchor="middle"
          fontSize="10"
          className="fill-fg font-mono"
        >
          {i}
        </text>
      </g>,
    );
  }

  return (
    <Figure
      caption={
        <>
          Nothing on the left is stored anywhere. The vertex index is divided by
          six to find the particle and taken modulo six to pick a corner, and the
          square that comes out is turned into a disc by throwing away every
          fragment more than one unit from its centre.
        </>
      }
    >
      <svg
        viewBox="0 0 640 236"
        className="block h-auto w-full overflow-hidden"
        role="img"
        aria-label="A diagram of six vertex indices per particle forming a two-triangle square, with the inscribed disc kept and the four corners discarded"
      >
        <text x="20" y="40" fontSize="10.5" className="fill-fg-faint font-mono">
          DRAW(COUNT × 6) — NO VERTEX BUFFER IS BOUND
        </text>
        {indices}
        <path
          d="M20 98 L20 106 L149 106 L149 98"
          className="stroke-accent/60"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M152 98 L152 106 L281 106 L281 98"
          className="stroke-amber/60"
          strokeWidth="1"
          fill="none"
        />
        <text x="84" y="122" textAnchor="middle" fontSize="10.5" className="fill-fg-faint">
          particle 0
        </text>
        <text x="216" y="122" textAnchor="middle" fontSize="10.5" className="fill-fg-faint">
          particle 1
        </text>
        <text x="20" y="152" fontSize="10.5" className="fill-fg-faint font-mono">
          vertex_index / 6u → which particle
        </text>
        <text x="20" y="170" fontSize="10.5" className="fill-fg-faint font-mono">
          vertex_index % 6u → which corner
        </text>

        {/* The quad. Clip space counts y upward, so (-1,-1) is bottom left. */}
        <rect
          x="410"
          y="50"
          width="140"
          height="140"
          className="fill-fg-faint/5 stroke-fg-faint/50"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path d="M410 50 L550 190" className="stroke-fg-faint/50" strokeWidth="1" fill="none" />
        <circle cx="480" cy="120" r="70" className="fill-accent/25 stroke-accent" strokeWidth="1.2" />
        <text x="450" y="152" textAnchor="middle" fontSize="10.5" className="fill-fg-faint font-mono">
          0,1,2
        </text>
        <text x="506" y="96" textAnchor="middle" fontSize="10.5" className="fill-fg-faint font-mono">
          3,4,5
        </text>
        <text x="480" y="212" textAnchor="middle" fontSize="10.5" className="fill-fg-faint">
          corners discarded, disc kept
        </text>
      </svg>
    </Figure>
  );
}

export function ComputeEssay() {
  return (
    <Prose>
      <p>
        A vertex shader answers a question about a vertex and a fragment shader
        answers a question about a pixel. Neither chooses when it runs: one is
        called because something is about to be rasterised, the other because
        something is about to be blended into a framebuffer, and the answer is
        consumed by the stage that comes next. A compute shader is the same
        hardware with all of that taken away. It runs as many times as you ask it
        to, and its output is whatever it left behind in memory.
      </p>
      <p>
        This lab runs one over a field of particles. Every position and velocity
        lives in a buffer the GPU owns; a compute pass steps all of them; the
        vertex stage then reads the same buffer back, six vertices at a time, and
        draws them. The CPU writes forty-eight bytes a frame and issues one dispatch
        and one draw, whether there are five thousand particles or a hundred
        thousand.
      </p>

      <ProseHeading id="stage">The GPU has a stage that draws nothing</ProseHeading>
      <p>
        The entry point carries the attribute{' '}
        <code>@compute @workgroup_size(64)</code> and takes one argument,{' '}
        <code>@builtin(global_invocation_id)</code>. That argument is an index,
        and it is the only input: there is no vertex to place and no pixel to
        colour. Invocation <code>i</code> loads{' '}
        <code>particles[i]</code>, works out a force towards the attractor,
        advances a velocity and a position, and writes the particle back. The
        force is a softened inverse square with a tangential term added —{' '}
        <code>(dir + tangent * swirl) * attraction / (dist * dist + 0.08)</code> —
        where the tangent is what turns a collapse into an orbit and the{' '}
        <code>+ 0.08</code> is what stops the pull going to infinity when a
        particle crosses the centre.
      </p>
      <p>
        WebGL has no such stage. Not a slow one, not a restricted one — the
        concept is absent from the API. The way this was done for a decade is to
        put the state where a fragment shader can write: encode positions
        into a floating-point texture, draw a full-screen quad so that one
        fragment lands on each texel, step the simulation there, and write into a
        second texture bound to a framebuffer. The two textures swap roles every
        frame, because a shader cannot read the texture it is writing to. The
        result is then sampled again by a vertex shader to get the positions back
        as geometry.
      </p>

      <PingPongFigure />

      <p>
        The workaround also decides where a result is allowed to go. A fragment
        shader writes to the pixel it was rasterised at and nowhere else, so
        every algorithm has to be phrased as a gather: each output asks which
        inputs it needs. A compute invocation writes wherever it likes in the
        buffer. This lab does not use that freedom — each invocation writes back
        to the slot it read from — but it is the freedom a sort, a spatial hash
        or a collision grid is built on, and it is why the stage exists at all
        rather than as a faster way of doing what the fragment stage already did.
      </p>

      <ProseHeading id="storage">The particles live in memory the GPU owns</ProseHeading>
      <p>
        A <code>Particle</code> here is four floats — <code>pos: vec2f</code> and{' '}
        <code>vel: vec2f</code> — so sixteen bytes. The buffer holding them is
        created once, at the largest size the lab will ever need: 120,000
        particles, 1,920,000 bytes. The count slider allocates nothing. It changes
        how much of that allocation is stepped and how much of it is drawn.
      </p>
      <p>
        Two declarations point at the one buffer.{' '}
        <code>var&lt;storage, read_write&gt; particles</code> is what the compute
        stage sees; <code>var&lt;storage, read&gt; readParticles</code> is what
        the vertex stage sees. Same memory, two access modes, and the read-only
        one is not a courtesy: WebGPU does not permit a writable storage buffer
        in the vertex stage at all, so that binding has to be declared{' '}
        <code>read-only-storage</code>. A uniform buffer cannot stand in for
        either of them — uniforms are
        read-only to the shader and sized for a handful of values, which is
        exactly the job the lab&rsquo;s other binding does.
      </p>

      <StorageFigure />

      <p>
        Because the buffer outlives the frame, it also outlives what is on
        screen. Particles beyond the count are neither stepped nor drawn, and
        they keep whatever values they last held. Drag the particle slider up in
        the instrument below and they rejoin from wherever they were left; on a
        freshly seeded field that is a ring appearing at the outer edge, because
        the seed walks outward as the index rises. Nothing was recomputed to
        bring them back. They were in memory the whole time.
      </p>
      <p>
        The one moment per-particle data crosses from the CPU is{' '}
        <em>Reseed</em>, which uploads the whole 1.92-megabyte seed array in a
        single write. It happens when you press a button, not sixty times a
        second.
      </p>

      <ProseHeading id="dispatch">A dispatch counts workgroups, not particles</ProseHeading>
      <p>
        The call that starts the compute pass is{' '}
        <code>dispatchWorkgroups(Math.ceil(count / 64))</code>. It does not take a
        number of particles. It takes a number of workgroups, and the workgroup
        size — 64 here — is fixed in the shader at compile time, so the two have
        to be reconciled by rounding up. A hundred thousand particles divided by
        sixty-four is 1,562.5, which becomes 1,563 workgroups and 100,032
        invocations: thirty-two more than there are particles.
      </p>
      <p>
        The first line of the shader body is <code>if (i &gt;= u32(params.count)) &#123; return; &#125;</code>.
        Every compute entry point written against a count that is not a multiple
        of the workgroup size has that line, or has a bug — here the extra
        thirty-two would step particles that are not being drawn, and at the top
        of the slider, where 120,000 divides by 64 exactly, none of them return
        at all.
      </p>

      <DispatchFigure />

      <p>
        Sixty-four is a choice, and this shader gives no algorithmic reason for
        it. The invocations of a workgroup are scheduled together and can share a{' '}
        <code>var&lt;workgroup&gt;</code> block of fast memory; nothing here talks
        to a neighbour, so the size is picked to sit well on the hardware rather
        than to fit the problem. The number of workgroups, by contrast, is a
        runtime argument with room to spare: no WebGPU implementation may report
        a limit below 65,535 per dimension, so a single dispatch of 64-wide
        groups covers four million particles. The largest dispatch this lab ever
        issues is 1,875.
      </p>

      <ProseHeading id="readback">The vertex stage reads the buffer the compute pass wrote</ProseHeading>
      <p>
        The render pipeline declares no vertex buffers at all, and the vertex
        shader takes no attributes — its only input is{' '}
        <code>@builtin(vertex_index)</code>. The draw call is{' '}
        <code>draw(count * 6)</code>, which at a hundred thousand particles is
        600,000 vertices and 200,000 triangles, not one of which is stored
        anywhere. <code>vertex_index / 6u</code> selects the particle out of the
        storage buffer and <code>vertex_index % 6u</code> selects a corner from a
        six-element array of offsets: two triangles making a square. The offset
        is scaled by the size control, and its x is divided by the canvas aspect
        so the sprite stays square on a wide canvas rather than stretching with
        it.
      </p>
      <p>
        The square becomes a disc in the fragment shader, which carries the
        corner offset through as a <code>uv</code> and runs{' '}
        <code>if (r &gt; 1.0) &#123; discard; &#125;</code> — the four corners are
        rasterised and thrown away. The colour is the particle&rsquo;s speed
        mapped between a cool blue and a warm orange, which is the only reason
        the structure of the field is legible at all: velocity is otherwise
        invisible in a still frame.
      </p>

      <QuadFigure />

      <p>
        Count what left the CPU while that happened. Forty-eight bytes: eleven
        floats — the attractor&rsquo;s two coordinates, the six control values,
        the frame&rsquo;s timestep, the canvas aspect and a flag for the theme —
        padded to a multiple of sixteen, because a uniform block has to be. One
        compute pass, one render pass, one dispatch, one draw. Move the particle
        slider from 5,000 to 100,000 and that list is unchanged; a single number
        inside the block is different. The GPU does twenty times the work and the
        CPU never notices, which is what it means to say the data lives on the
        GPU.
      </p>
      <p>
        That is a claim about the CPU, not about the GPU, and it generalises past
        particles. The next lab takes the same measurement from the other
        direction — <a href="/labs/instancing">Draw Calls &amp; Instancing</a>{' '}
        draws one mesh ten thousand times and shows the cost sitting in the
        number of calls rather than the number of triangles.
      </p>

      <ProseHeading id="instrument">Now run all of it at once</ProseHeading>
      <p>
        Below is the whole thing: six sliders, a running toggle and a reseed
        button, with a readout that turns the particle count into workgroups and
        invocations as you drag it. Move the pointer over the canvas to take hold
        of the attractor; leave the canvas and it goes back to drifting on its
        own. The presets are the fastest way in — one of them switches the swirl
        off so the field collapses into a single dot, which is worth seeing once,
        because it is the tangential term rather than the pull that makes the
        shape.
      </p>
      <p>
        If the browser has no WebGPU, the canvas will say so and stop. There is
        no fallback, and that is the honest position: the other labs here run on
        WebGL because their mathematics does not care which API draws it. This
        one is a stage WebGL does not have.
      </p>
    </Prose>
  );
}
