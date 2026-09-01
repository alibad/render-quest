'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ControlGroup, Presets, Slider, type Preset } from '@/components/lab/Controls';
import { CopyLink } from '@/components/lab/CopyLink';
import { LabLayout } from '@/components/lab/LabLayout';
import { LabSource } from '@/components/lab/LabSource';
import { useLabState } from '@/components/lab/useLabState';
import { useTheme } from '@/components/site/ThemeProvider';

/**
 * The lab that hands over the keyboard.
 *
 * Every other lab here gives you sliders onto someone else's shader. This one
 * compiles what you type, on every keystroke, and puts the driver's own error
 * text under the editor with the line it objected to — because the thing that
 * actually stops people writing shaders is not the maths, it is that a mistake
 * produces a black rectangle and no explanation.
 */

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Prepended to whatever the reader writes, so the uniforms are always there. */
const PREAMBLE = `precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uKnob;
`;

const STARTER = `void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float d = length(p) - 0.55 - sin(uTime) * 0.08 * uKnob;
  vec3 col = mix(
    vec3(0.16, 0.72, 1.0),
    vec3(1.0, 0.68, 0.25),
    smoothstep(-0.02, 0.02, d)
  );

  gl_FragColor = vec4(col, 1.0);
}`;

const PRESETS_SOURCE: Record<string, string> = {
  circle: STARTER,
  plasma: `void main() {
  vec3 col = 0.5 + 0.5 * cos(
    uTime + vUv.xyx * (2.0 + uKnob * 6.0) + vec3(0.0, 2.0, 4.0)
  );
  gl_FragColor = vec4(col, 1.0);
}`,
  rings: `void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / uResolution.y;

  float r = length(p);
  float rings = sin(r * (14.0 + uKnob * 30.0) - uTime * 2.0);
  float edge = smoothstep(0.0, 0.06, abs(rings));

  vec3 col = mix(vec3(1.0, 0.72, 0.3), vec3(0.05, 0.08, 0.13), edge);
  gl_FragColor = vec4(col, 1.0);
}`,
  broken: `void main() {
  // Deliberately wrong: vec3 assigned to a vec4, and a missing semicolon.
  vec4 col = vec3(1.0, 0.5, 0.2)
  gl_FragColor = col;
}`,
};

interface ShaderControls {
  preset: string;
  knob: number;
}

const DEFAULTS: ShaderControls = { preset: 'circle', knob: 1 };

const PRESETS: Preset<ShaderControls>[] = [
  {
    label: 'A circle',
    note: 'Signed distance to a circle, thresholded. Change the 0.55 and watch the radius follow; change smoothstep to step and watch the edge turn to jagged pixels.',
    values: { preset: 'circle' },
  },
  {
    label: 'Cosine plasma',
    note: 'The same three-cosine palette the technology pages render. Four lines, no geometry, no vertex buffer — the whole picture is a function of the pixel coordinate.',
    values: { preset: 'plasma' },
  },
  {
    label: 'Rings',
    note: 'A sine of the radius makes concentric rings; subtracting time makes them travel. The knob controls frequency — turn it up until the rings alias into moiré, which is the texture lab’s lesson arriving from the other direction.',
    values: { preset: 'rings' },
  },
  {
    label: 'Break it on purpose',
    note: 'Two real errors: a vec3 assigned to a vec4, and a missing semicolon. The driver’s own message appears under the editor, with the line. This is what the other labs protect you from, and what you will actually spend your time reading.',
    values: { preset: 'broken' },
  },
];

const SOURCE = [
  {
    label: 'The preamble, prepended to what you write',
    language: 'glsl' as const,
    source: PREAMBLE.trim(),
    note: 'This is why vUv and uTime exist without you declaring them, and why the driver reports a line number a few higher than the one you are looking at — the panel above renumbers it back.',
  },
  {
    label: 'The vertex shader, which never changes',
    language: 'glsl' as const,
    source: VERTEX.trim(),
    note: 'One oversized triangle covering the viewport, handing the fragment stage a 0..1 coordinate. Full-screen shader work almost never needs more geometry than this.',
  },
];

interface CompileState {
  error: string | null;
  line: number | null;
}

export function ShaderLab() {
  const [controls, setControls, shareQuery] = useLabState(DEFAULTS, {
    preset: (value) => Object.prototype.hasOwnProperty.call(PRESETS_SOURCE, value),
    knob: (value) => value >= 0 && value <= 2,
  });
  const [source, setSource] = useState(PRESETS_SOURCE[DEFAULTS.preset]);
  const [compile, setCompile] = useState<CompileState>({ error: null, line: null });
  const [contextFailed, setContextFailed] = useState(false);
  const { palette } = useTheme();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const knobRef = useRef(controls.knob);
  knobRef.current = controls.knob;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  // Switching preset replaces the buffer; typing after that is the reader's.
  useEffect(() => {
    setSource(PRESETS_SOURCE[controls.preset] ?? STARTER);
  }, [controls.preset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      // Not a compile error, and it should not appear in a panel headed "what
      // the compiler said" — every other lab puts this over the canvas itself.
      setContextFailed(true);
      return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    let program: WebGLProgram | null = null;
    let compiledFrom = '';
    let frame = 0;
    let disposed = false;
    const start = performance.now();

    /** Compiles the reader's fragment source, keeping the last good program. */
    const build = (fragmentBody: string) => {
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, VERTEX);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, PREAMBLE + fragmentBody);
      gl.compileShader(fs);

      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(fs) ?? 'unknown compile error';
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        // GLSL errors read "ERROR: 0:12: ..." — 12 counts the preamble, which
        // the reader cannot see, so report the line they can actually find.
        const match = /ERROR:\s*\d+:(\d+)/.exec(log);
        const preambleLines = PREAMBLE.split('\n').length - 1;
        const line = match ? Math.max(1, Number(match[1]) - preambleLines) : null;
        return { ok: false as const, log: log.trim(), line };
      }

      const next = gl.createProgram()!;
      gl.attachShader(next, vs);
      gl.attachShader(next, fs);
      gl.linkProgram(next);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(next, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(next) ?? 'unknown link error';
        gl.deleteProgram(next);
        return { ok: false as const, log: log.trim(), line: null };
      }

      if (program) gl.deleteProgram(program);
      program = next;
      return { ok: true as const, log: null, line: null };
    };

    const loop = () => {
      if (disposed) return;

      if (sourceRef.current !== compiledFrom) {
        compiledFrom = sourceRef.current;
        const result = build(compiledFrom);
        // A failed compile keeps the last working picture on screen rather
        // than blanking it — you can see what you had while you fix it.
        setCompile(
          result.ok ? { error: null, line: null } : { error: result.log, line: result.line },
        );
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      const clear = paletteRef.current.clear;
      gl.clearColor(clear[0], clear[1], clear[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (program) {
        gl.useProgram(program);
        const position = gl.getAttribLocation(program, 'aPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), (performance.now() - start) / 1000);
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(program, 'uKnob'), knobRef.current);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (program) gl.deleteProgram(program);
      gl.deleteBuffer(quad);
    };
  }, []);

  const set = useCallback(
    <K extends keyof ShaderControls>(key: K, value: ShaderControls[K]) => {
      setControls((prev) => ({ ...prev, [key]: value }));
    },
    [setControls],
  );

  const lineCount = useMemo(() => source.split('\n').length, [source]);

  return (
    <LabLayout
      readoutTitle="What the compiler said"
      canvas={
        <div className="space-y-3">
          <div
            className="relative w-full overflow-hidden rounded-lg border border-line bg-ink-800"
            style={{ aspectRatio: '16 / 9' }}
          >
            <canvas
              ref={canvasRef}
              aria-label="The fragment shader you are editing, running"
              role="img"
              className="block h-full w-full"
            />
            {contextFailed ? (
              <div className="absolute inset-0 grid place-items-center bg-ink-800 p-8 text-center">
                <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
                  <span className="text-fg">
                    This browser could not create a WebGL context.
                  </span>{' '}
                  The editor below still works, but nothing will run in it.
                </p>
              </div>
            ) : null}
          </div>

          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="eyebrow">Your fragment shader</span>
              <span className="font-mono text-2xs text-fg-faint">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'} · recompiles as you type
              </span>
            </div>
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
              aria-label="Fragment shader source"
              rows={16}
              className="block w-full resize-y bg-transparent px-4 py-3 font-mono text-xs leading-relaxed text-fg outline-none"
            />
            <div className="border-t border-line bg-ink-800/60 px-4 py-2.5">
              <p className="font-mono text-2xs leading-relaxed text-fg-faint">
                Already declared for you: <span className="text-fg-muted">vUv</span>,{' '}
                <span className="text-fg-muted">uTime</span>,{' '}
                <span className="text-fg-muted">uResolution</span>,{' '}
                <span className="text-fg-muted">uKnob</span>
              </p>
            </div>
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Start here">
            <Presets
              presets={PRESETS}
              onApply={(values) => setControls((prev) => ({ ...prev, ...values }))}
            />
          </ControlGroup>

          <ControlGroup title="The knob">
            <Slider
              label="uKnob"
              value={controls.knob}
              min={0}
              max={2}
              onChange={(value) => set('knob', value)}
            />
            <p className="text-2xs leading-relaxed text-fg-faint">
              A spare uniform, wired to nothing in particular. Use it in the shader
              wherever you want something to be draggable.
            </p>
          </ControlGroup>

          <div className="border-t border-line pt-5">
            <CopyLink query={shareQuery} />
            <p className="mt-2 text-2xs leading-relaxed text-fg-faint">
              The link carries the preset and the knob, not your edits — shader
              source is far too long to put in a URL.
            </p>
          </div>
        </>
      }
      readout={
        compile.error ? (
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xs uppercase tracking-wider text-red">
                Will not compile
              </span>
              {compile.line !== null ? (
                <span className="font-mono text-2xs text-fg-faint">
                  line {compile.line} of your source
                </span>
              ) : null}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-red/30 bg-red/5 px-3 py-2.5 font-mono text-2xs leading-relaxed text-fg-muted">
              {compile.error}
            </pre>
          </div>
        ) : (
          <p className="font-mono text-2xs uppercase tracking-wider text-axis-y">
            Compiled — running above
          </p>
        )
      }
      readoutCaption={
        <>
          The canvas keeps the last shader that compiled, so a typo leaves your
          picture on screen instead of replacing it with black. That is a
          deliberate choice and not how a real toolchain behaves: in a normal
          project a fragment shader that fails to compile gives you a blank
          surface and a message in a console you were not looking at, which is
          most of why shaders feel harder than they are.
          <br />
          <br />
          The error text above is the graphics driver&rsquo;s own, not this
          site&rsquo;s. Line numbers are adjusted for the preamble you cannot
          see, so they point where you would actually look — the driver counts a
          few lines further down.
        </>
      }
      source={<LabSource samples={SOURCE} />}
    />
  );
}
