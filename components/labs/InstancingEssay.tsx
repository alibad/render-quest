'use client';

import { Segmented, Slider } from '@/components/lab/Controls';
import { Figure } from '@/components/lab/Figure';
import { Prose, ProseHeading } from '@/components/lab/Prose';
import { Term } from '@/components/lab/Term';
import { useFigureState } from '@/components/lab/useFigureState';

/**
 * The written half of lab 7.
 *
 * The figures here are SVG and HTML rather than canvases, which is a deliberate
 * departure from lab 1. This lab owns its own WebGPU adapter and device; asking
 * for three or four more of them on one page to illustrate an essay would cost
 * more than the illustrations are worth, and on a machine without WebGPU every
 * one of them would render a failure card in the middle of a paragraph. What is
 * being taught here is structural — the shape of a command list, the layout of
 * a uniform buffer, where a timer starts and stops — and a diagram shows that
 * better than another spinning field of cubes would.
 *
 * Every number below is read from InstancingLab.tsx: 36 vertices and 12
 * triangles per cube, 10,000 cubes, a 32-byte instance stride, and a per-object
 * uniform slot sized to `device.limits.minUniformBufferOffsetAlignment`.
 */

/** One recorded command in the pass, drawn as a chip. */
function Cmd({
  x,
  y,
  label,
  tone = 'plain',
  opacity = 1,
}: {
  x: number;
  y: number;
  label: string;
  tone?: 'plain' | 'bind' | 'draw';
  opacity?: number;
}) {
  const box =
    tone === 'bind'
      ? 'fill-amber/15 stroke-amber/60'
      : tone === 'draw'
        ? 'fill-accent/15 stroke-accent/60'
        : 'fill-fg-faint/10 stroke-fg-faint/35';
  const ink =
    tone === 'bind' ? 'fill-amber' : tone === 'draw' ? 'fill-accent' : 'fill-fg-muted';
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={170} height={22} rx={4} className={box} strokeWidth={1} />
      <text x={x + 9} y={y + 15.5} fontSize={11.5} className={`${ink} font-mono`}>
        {label}
      </text>
    </g>
  );
}

/** The two command lists, side by side, at their true relative lengths. */
function CommandListFigure() {
  const pitch = 27;
  const top = 24;
  const left = 6;
  const right = 206;
  return (
    <Figure
      id="command-lists"
      caption={
        <>
          The left column is the entire frame. The right column is the same
          frame with its last two entries repeated once per cube &mdash; a
          rebinding and a draw, ten thousand times, each pair pointing the GPU
          at a different object before asking for it.
        </>
      }
    >
      <svg
        viewBox="0 0 400 292"
        className="w-full overflow-hidden"
        role="img"
        aria-label="Two command lists: four commands for the instanced frame, twenty thousand and two for the per-object frame"
      >
        <text
          x={left}
          y={13}
          fontSize={9.5}
          letterSpacing="0.12em"
          className="fill-fg-faint font-mono"
        >
          ONE CALL
        </text>
        <text
          x={right}
          y={13}
          fontSize={9.5}
          letterSpacing="0.12em"
          className="fill-fg-faint font-mono"
        >
          ONE EACH
        </text>

        <Cmd x={left} y={top} label="setPipeline" />
        <Cmd x={left} y={top + pitch} label="setBindGroup(0, scene)" />
        <Cmd x={left} y={top + pitch * 2} label="setBindGroup(1, +0)" tone="bind" />
        <Cmd x={left} y={top + pitch * 3} label="draw(36, 10000)" tone="draw" />
        <text x={left} y={top + pitch * 4 + 18} fontSize={11} className="fill-fg-faint font-mono">
          and that is the frame
        </text>

        <Cmd x={right} y={top} label="setPipeline" />
        <Cmd x={right} y={top + pitch} label="setBindGroup(0, scene)" />
        <Cmd x={right} y={top + pitch * 2} label="setBindGroup(1, +0)" tone="bind" />
        <Cmd x={right} y={top + pitch * 3} label="draw(36, 1)" tone="draw" />
        <Cmd x={right} y={top + pitch * 4} label="setBindGroup(1, +256)" tone="bind" />
        <Cmd x={right} y={top + pitch * 5} label="draw(36, 1)" tone="draw" />
        <Cmd x={right} y={top + pitch * 6} label="setBindGroup(1, +512)" tone="bind" opacity={0.5} />
        <Cmd x={right} y={top + pitch * 7} label="draw(36, 1)" tone="draw" opacity={0.5} />
        <text x={right} y={top + pitch * 8 + 12} fontSize={11} className="fill-fg-faint font-mono">
          + 9,997 more pairs
        </text>

        <line x1={left} y1={272} x2={left + 170} y2={272} className="stroke-line" strokeWidth={1} />
        <line x1={right} y1={272} x2={right + 170} y2={272} className="stroke-line" strokeWidth={1} />
        <text x={left} y={286} fontSize={10.5} className="fill-fg font-mono">
          4 commands
        </text>
        <text x={right} y={286} fontSize={10.5} className="fill-amber font-mono">
          20,002 commands
        </text>
      </svg>
    </Figure>
  );
}

/** Which term of `instanceIndex + objectRef.index` is doing the counting. */
function AdditionFigure() {
  // Opens instanced because that is the mode the two paragraphs above it have
  // just described, and because the instanced rows are the ones that show the
  // claim: instance_index counts 0,1,2,3 down the accent column while
  // objectRef.index sits at zero. A shared link is user input reaching a
  // string compare, so the guard is the same one InstancingLab gives `mode`.
  const [state, setState] = useFigureState(
    'which-term-counts',
    { mode: 'instanced' as 'instanced' | 'per-object' },
    { mode: (value) => value === 'instanced' || value === 'per-object' },
  );
  const instanced = state.mode === 'instanced';
  const rows = [0, 1, 2, 3];

  return (
    <Figure
      id="which-term-counts"
      control={
        <Segmented<'instanced' | 'per-object'>
          label="How the four cubes are asked for"
          value={state.mode}
          options={[
            { value: 'instanced', label: 'One call' },
            { value: 'per-object', label: 'One each' },
          ]}
          onChange={(mode) => setState({ mode })}
        />
      }
      caption={
        <>
          The same four cubes read out of the same four slots of the same
          buffer. On one setting the GPU counts, inside a single call; on the
          other the CPU counts, and buys a call each time round the loop.
        </>
      }
    >
      <div className="p-1">
        <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-2xs uppercase tracking-wider">
          <span className="text-accent">instance_index</span>
          <span className="text-amber">objectRef.index</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          {rows.map((i) => (
            <div key={i} className="flex items-baseline gap-3">
              <span className="w-14 shrink-0 text-2xs uppercase tracking-wider text-fg-faint">
                {instanced ? (i === 0 ? 'call 1' : '') : `call ${i + 1}`}
              </span>
              <span className="text-fg-muted">
                instances[<span className="text-accent">{instanced ? i : 0}</span> +{' '}
                <span className="text-amber">{instanced ? 0 : i}</span>]
              </span>
              <span className="text-fg-faint">&rarr;</span>
              <span className="text-fg">cube {i}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-line pt-2.5 font-mono text-2xs uppercase tracking-wider text-fg-faint">
          {instanced ? '1 draw call for all four' : '4 draw calls, one per cube'}
        </div>
      </div>
    </Figure>
  );
}

/** Four bytes in a 256-byte slot, and the offset that selects one. */
function AlignmentFigure() {
  // Opened at slot 0 this figure contradicted its own caption. The caption says
  // the slider "picks one of them with arithmetic", and the readout at zero is
  // `0 x 256 = 0 bytes` — no arithmetic visible, and the highlighted slot is the
  // first one, which reads as nothing selected rather than as a selection. Slot
  // 3 of 0-9 shows a real offset (768 bytes), keeps the highlight clear of both
  // ends of the strip, and leaves the slider obvious room in both directions.
  // The guard exists because ?dynamic-offset.index=99 would highlight no slot
  // and print an offset past the end of a buffer that only has ten slots drawn.
  const [state, setState] = useFigureState(
    'dynamic-offset',
    { index: 3 },
    { index: (value) => Number.isInteger(value) && value >= 0 && value <= 9 },
  );
  const index = state.index;
  const slotWidth = 34;
  const slotPitch = 38;
  const payload = (388 * 4) / 256;

  return (
    <Figure
      id="dynamic-offset"
      control={
        <Slider
          label="which object"
          value={index}
          min={0}
          max={9}
          step={1}
          precision={0}
          onChange={(value) => setState({ index: Math.round(value) })}
        />
      }
      readout={
        <div className="font-mono text-xs leading-relaxed">
          <div className="eyebrow mb-1.5">Dynamic offset</div>
          <div className="tabular text-fg">{index} &times; 256</div>
          <div className="tabular text-accent">= {(index * 256).toLocaleString()} bytes</div>
          <div className="mt-2 text-2xs text-fg-faint">4 bytes used</div>
        </div>
      }
      caption={
        <>
          The top bar is one slot drawn to scale: four bytes of object index and
          two hundred and fifty-two bytes that exist only so the next offset is
          a legal one. Ten thousand slots is a 2.56 MB buffer carrying 40 KB of
          numbers, and the slider picks one of them with arithmetic rather than
          a write.
        </>
      }
    >
      <svg
        viewBox="0 0 400 140"
        className="w-full overflow-hidden"
        role="img"
        aria-label="One 256-byte uniform slot drawn to scale, and the first ten slots of the object buffer"
      >
        <text x={6} y={11} fontSize={9.5} letterSpacing="0.12em" className="fill-fg-faint font-mono">
          ONE SLOT, TO SCALE
        </text>
        <rect
          x={6}
          y={19}
          width={388}
          height={26}
          rx={3}
          className="fill-fg-faint/10 stroke-fg-faint/30"
          strokeWidth={1}
        />
        <rect x={6} y={19} width={payload} height={26} className="fill-accent" />
        <text x={20} y={36} fontSize={11} className="fill-fg-faint font-mono">
          252 bytes of padding
        </text>
        <line x1={6 + payload / 2} y1={45} x2={6 + payload / 2} y2={54} className="stroke-accent" strokeWidth={1} />
        <text x={6} y={67} fontSize={10.5} className="fill-accent font-mono">
          4 bytes: which cube this call is about
        </text>

        <text x={6} y={94} fontSize={9.5} letterSpacing="0.12em" className="fill-fg-faint font-mono">
          THE FIRST TEN SLOTS OF TEN THOUSAND
        </text>
        {Array.from({ length: 10 }, (_, i) => (
          <rect
            key={i}
            x={6 + i * slotPitch}
            y={102}
            width={slotWidth}
            height={22}
            rx={3}
            className={
              i === index
                ? 'fill-accent/35 stroke-accent'
                : 'fill-fg-faint/10 stroke-fg-faint/25'
            }
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <text
            key={i}
            x={6 + i * slotPitch + slotWidth / 2}
            y={137}
            fontSize={9.5}
            textAnchor="middle"
            className={i === index ? 'fill-accent font-mono' : 'fill-fg-faint font-mono'}
          >
            {i}
          </text>
        ))}
      </svg>
    </Figure>
  );
}

/** Where the CPU timer starts and stops, against a 60 Hz frame. */
function BracketFigure() {
  return (
    <Figure
      id="timer-bracket"
      caption={
        <>
          1.38 ms is about a twelfth of a frame at 60 Hz, and the measurement
          stops at <code>submit</code>. The drawing itself happens on the
          GPU&rsquo;s own timeline, after the list has been handed over and the
          CPU has moved on.
        </>
      }
    >
      <svg
        viewBox="0 0 400 138"
        className="w-full overflow-hidden"
        role="img"
        aria-label="A 60 Hz frame with the encoding cost marked, and GPU work outside the measured bracket"
      >
        <text x={6} y={11} fontSize={9.5} letterSpacing="0.12em" className="fill-fg-faint font-mono">
          CPU &mdash; ONE FRAME AT 60 HZ
        </text>
        <text
          x={394}
          y={11}
          fontSize={9.5}
          textAnchor="end"
          letterSpacing="0.12em"
          className="fill-fg-faint font-mono"
        >
          16.7 MS
        </text>
        <rect
          x={6}
          y={19}
          width={388}
          height={26}
          rx={3}
          className="fill-fg-faint/10 stroke-fg-faint/30"
          strokeWidth={1}
        />
        <rect
          x={6}
          y={19}
          width={32}
          height={26}
          rx={3}
          className="fill-accent/35 stroke-accent"
          strokeWidth={1}
        />
        <text x={48} y={36} fontSize={11} className="fill-fg-faint font-mono">
          everything else the frame has time for
        </text>
        <path d="M6 51 L6 57 L38 57 L38 51" className="stroke-accent" strokeWidth={1.2} fill="none" />
        <text x={6} y={72} fontSize={10.5} className="fill-accent font-mono">
          1.38 ms of encoding at 10,000 calls
        </text>

        <text x={6} y={116} fontSize={9.5} letterSpacing="0.12em" className="fill-fg-faint font-mono">
          GPU
        </text>
        <rect
          x={44}
          y={100}
          width={252}
          height={24}
          rx={3}
          className="fill-fg-faint/10 stroke-fg-faint/30"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text x={54} y={116} fontSize={11} className="fill-fg-faint font-mono">
          drawing &mdash; never inside the bracket
        </text>
      </svg>
    </Figure>
  );
}

export function InstancingEssay() {
  return (
    <Prose>
      <p>
        Ten thousand cubes, a hundred and twenty thousand triangles, one shader
        module and one pipeline. You can have that picture for one{' '}
        <Term name="Draw call">draw call</Term> or for ten thousand, and it is
        the same picture either way &mdash; the same vertices, out of the same
        buffer, lit by the same code, pixel for pixel. The readout under the
        canvas measures what the second option costs.
      </p>
      <p>
        This lab is about the price of asking. Not the price of drawing, which
        is identical on both sides, but the price of the CPU turning to the GPU
        and saying: this, now.
      </p>

      <ProseHeading id="loop">The two modes differ by a loop</ProseHeading>
      <p>
        Inside the render pass, the instanced mode records four commands. Set
        the pipeline. Bind the scene &mdash; the camera matrix and the{' '}
        <Term name="Storage buffer">storage buffer</Term> holding every
        cube&rsquo;s position, tint and scale. Point the per-object binding at
        object zero. Then draw thirty-six vertices, ten thousand times over, in
        one call.
      </p>
      <p>
        The per-object mode records the first two and turns the last two into a
        loop: point the binding at object <code>i</code>, draw thirty-six
        vertices once, go round again. Nothing else moves &mdash; the same
        shader module, the same pipeline object, the same instance buffer, the
        same back-face culling and the same depth test.
      </p>

      <CommandListFigure />

      <p>
        Both lists hand the GPU the same work: 360,000 vertex shader
        invocations and 120,000 triangles, shaded by the same twelve lines of{' '}
        <Term name="WGSL">WGSL</Term>. What differs is how long the CPU spent
        writing the list down.
      </p>
      <p>
        The geometry is deliberately negligible, and that is what makes the
        measurement mean anything. No vertex buffer is bound at all: each cube
        is thirty-six vertices assembled inside the shader from{' '}
        <code>@builtin(vertex_index)</code> &mdash; six faces of six vertices,
        two triangles apiece &mdash; and the per-cube data is a 32-byte record
        of position, phase, tint and scale, read out of one storage buffer that
        is bound once a frame in both modes. Nothing on the GPU side is heavy
        enough to hide what the CPU is doing.
      </p>

      <ProseHeading id="counting">
        The counting moves from one side of an addition to the other
      </ProseHeading>
      <p>
        The vertex shader reads its per-cube data on a single line:{' '}
        <code>let inst = instances[instanceIndex + objectRef.index];</code>.
        Both terms exist in both modes, and exactly one of them is ever
        non-zero.
      </p>
      <p>
        <code>instanceIndex</code> is{' '}
        <Term name="Instance index">
          <code>@builtin(instance_index)</code>
        </Term>
        , which the hardware supplies: ask for ten thousand instances and it
        counts from zero to 9,999 on its own, with the CPU no longer involved
        once the call is made. <code>objectRef.index</code> is a four-byte
        integer in a uniform buffer, which the CPU supplies by rebinding.
      </p>

      <AdditionFigure />

      <p>
        So <Term name="Instancing">instancing</Term> is not a fast path bolted
        onto the side of the API. It is the loop counter moved from the
        CPU&rsquo;s side of the boundary to the GPU&rsquo;s, and the boundary is
        the expensive part.
      </p>

      <ProseHeading id="rebinding">The cost is the rebinding, not the draw</ProseHeading>
      <p>
        Look again at what the loop does per cube. It issues two commands, not
        one, and the draw is the cheaper of them.
      </p>
      <p>
        The per-object binding carries a single unsigned integer &mdash; which
        cube this call is about. Rather than write that integer into a buffer
        ten thousand times a frame, the lab writes all ten thousand of them once
        at start-up and selects one with a dynamic offset:{' '}
        <code>setBindGroup(1, objectBind, [i * align])</code>. That third
        argument is a byte offset, and it has to be a multiple of the alignment
        the device reports through{' '}
        <code>device.limits.minUniformBufferOffsetAlignment</code>. Most report
        256, which is the WebGPU default, so a four-byte number occupies a
        256-byte slot.
      </p>

      <AlignmentFigure />

      <p>
        The per-object path is therefore already the cheapest per-object change
        that can be expressed. No new pipeline, no new vertex buffer, no upload,
        no texture &mdash; one integer, selected by arithmetic on an offset. And
        it still costs, because every <code>setBindGroup</code> has to be
        checked and written into the command buffer: is the offset inside the
        buffer, is it aligned, does the binding fit. Every <code>draw</code> has
        to be checked and written too. Do that twenty thousand times and the
        list becomes the work.
      </p>
      <p>
        On the machine this was written on, ten thousand cubes encode in 0.10 ms
        as one call and 1.38 ms as ten thousand &mdash; about fourteen times,
        which works out at roughly 130 nanoseconds per cube for a rebind and a
        draw. Your figure will be different; browsers, drivers and processors
        all disagree, and the number in the readout is measured on your hardware
        rather than stored here.
      </p>
      <p>
        Because the per-object step has been made as small as it can be, that
        ratio is a floor rather than a ceiling. A real renderer changes a
        material bind group between objects, frequently a vertex buffer, and
        sometimes the pipeline itself &mdash; a switch this lab never once asks
        for.
      </p>

      <ProseHeading id="ratio">Read the ratio, not the millisecond</ProseHeading>
      <p>
        The CPU figure is bracketed narrowly and deliberately. The timer starts
        before the command encoder is created and stops immediately after{' '}
        <code>queue.submit</code>, so it covers building the render pass,
        recording every command in it, and handing the finished buffer to the
        driver. It contains no GPU work at all: <code>submit</code> posts a list
        and returns without waiting for anything to be drawn.
      </p>

      <BracketFigure />

      <p>
        This is why the frame rate can sit perfectly still while the CPU figure
        moves fourteenfold, and the honest thing is to expect that rather than
        hide it. Ten thousand cubes is a small scene on a current machine, those
        milliseconds are coming out of a budget nothing else here is competing
        for, and the frame-rate readout is a smoothed average of{' '}
        <code>requestAnimationFrame</code> deltas that are clamped at fifty
        milliseconds &mdash; so it cannot report below twenty even when the
        truth is worse. Both readings are exponential averages weighted a tenth
        towards the newest frame, which is why they slide to a new value over a
        few dozen frames instead of jumping when you switch modes.
      </p>
      <p>
        None of this transfers to a WebGL reading, which is why the lab refuses
        to fall back to one when WebGPU is missing. The two APIs do not charge
        the same price for a draw call; running the comparison on WebGL would
        answer a different question and print the answer under this
        question&rsquo;s label.
      </p>
      <p>
        The number that never moves is the triangle count: 120,000 in both
        modes, and the readout says so while the millisecond figure changes by
        an order of magnitude. That is the thing to carry out of here. A
        scene&rsquo;s cost is not read off its polygon budget &mdash;{' '}
        <a href="/labs/compute#readback">Compute &amp; Particles</a> puts its entire
        particle field on screen with one <code>draw</code> and no instance
        count at all, multiplying the vertex count instead.{' '}
        <Term name="Batching">Batching</Term>, merged materials, texture atlases
        and instanced foliage all exist to shorten the list, not to shrink the
        geometry.
      </p>

      <ProseHeading id="instrument">Now move all of it at once</ProseHeading>
      <p>
        Below is the instrument with every control exposed: the count from one
        cube to ten thousand, the mode, the size and spin of the cubes, and
        whether they animate. Size and spin are two floats in an eighty-byte
        uniform buffer written once a frame &mdash; they change the picture and
        cannot change the encoding cost, and they are there so the field stays
        readable while you move the count. Raising the count grows the spiral
        outward rather than reshuffling it, so the arrangement you were looking
        at stays where it was. Drag the canvas to orbit.
      </p>
      <p>
        Start with the presets. The first two set up the comparison this essay
        has been describing and ask you to change exactly one thing between
        them; the third finds the count at which a thousand separate calls is
        already a measurable slice of a frame.
      </p>
    </Prose>
  );
}
