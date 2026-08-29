/**
 * The smallest honest WebGL helper: compile, link, and report failures
 * loudly. Nothing here hides the API — the labs still call `gl.*` directly.
 */

export class ShaderError extends Error {
  constructor(
    message: string,
    readonly stage: 'vertex' | 'fragment' | 'link',
  ) {
    super(message);
    this.name = 'ShaderError';
  }
}

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  stage: 'vertex' | 'fragment',
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new ShaderError(`could not create ${stage} shader`, stage);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown error';
    gl.deleteShader(shader);
    throw new ShaderError(log.trim(), stage);
  }
  return shader;
}

export interface Program {
  program: WebGLProgram;
  /** Attribute locations, resolved once at link time. */
  attrib: (name: string) => number;
  /** Uniform locations, memoised — `getUniformLocation` is not free. */
  uniform: (name: string) => WebGLUniformLocation | null;
  dispose: () => void;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
): Program {
  const vs = compile(gl, gl.VERTEX_SHADER, vertexSource, 'vertex');
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragmentSource, 'fragment');

  const program = gl.createProgram();
  if (!program) throw new ShaderError('could not create program', 'link');

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  // The shaders are owned by the program once linked; flagging them for
  // deletion here means they disappear with it.
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'unknown error';
    gl.deleteProgram(program);
    throw new ShaderError(log.trim(), 'link');
  }

  const attribs = new Map<string, number>();
  const uniforms = new Map<string, WebGLUniformLocation | null>();

  return {
    program,
    attrib(name) {
      let loc = attribs.get(name);
      if (loc === undefined) {
        loc = gl.getAttribLocation(program, name);
        attribs.set(name, loc);
      }
      return loc;
    },
    uniform(name) {
      if (!uniforms.has(name)) {
        uniforms.set(name, gl.getUniformLocation(program, name));
      }
      return uniforms.get(name) ?? null;
    },
    dispose() {
      gl.deleteProgram(program);
    },
  };
}

/** Uploads a Float32Array into a fresh STATIC_DRAW buffer. */
export function createBuffer(
  gl: WebGLRenderingContext,
  data: Float32Array,
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('could not create buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

export function createIndexBuffer(
  gl: WebGLRenderingContext,
  data: Uint16Array,
): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('could not create index buffer');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

/** Binds a buffer to an attribute slot in one call. */
export function bindAttribute(
  gl: WebGLRenderingContext,
  buffer: WebGLBuffer,
  location: number,
  size: number,
): void {
  if (location < 0) return; // attribute optimised out of the shader
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}
