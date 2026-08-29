/**
 * A procedurally generated test texture, and the WebGL plumbing to sample it.
 *
 * Generated rather than shipped as an image for the same reason nothing else on
 * this site is a stock asset: you can read exactly what is in it. It is also
 * built to make sampling *visible* — fine detail that aliases under
 * minification, hard edges that reveal the difference between nearest and
 * linear, and an asymmetric marker so a mirrored repeat cannot be mistaken for
 * an ordinary one.
 */

export const TEXTURE_SIZE = 256;

function setPixel(
  data: Uint8Array,
  size: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
) {
  const i = (y * size + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
}

export function testTexture(size = TEXTURE_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const cell = size / 8;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const checker = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      let r = checker ? 232 : 44;
      let g = checker ? 236 : 50;
      let b = checker ? 242 : 60;

      // Fine one-pixel lines every 8 texels. Far too small to survive
      // minification without mipmaps — which is exactly the point.
      if (x % 8 === 0 || y % 8 === 0) {
        r = checker ? 150 : 96;
        g = checker ? 160 : 104;
        b = checker ? 176 : 120;
      }

      // A cyan border, so wrap modes are legible at the seams.
      const edge = 3;
      if (x < edge || y < edge || x >= size - edge || y >= size - edge) {
        r = 60;
        g = 170;
        b = 220;
      }

      setPixel(data, size, x, y, r, g, b);
    }
  }

  // An asymmetric amber corner marker: an L that points. Without it, a mirrored
  // repeat and a plain repeat look identical and the lab teaches nothing.
  const arm = Math.floor(size * 0.28);
  const thickness = Math.floor(size * 0.055);
  for (let y = 0; y < arm; y++) {
    for (let x = 0; x < thickness; x++) {
      setPixel(data, size, x + thickness, y + thickness, 255, 176, 64);
    }
  }
  for (let x = 0; x < arm; x++) {
    for (let y = 0; y < thickness; y++) {
      setPixel(data, size, x + thickness, y + thickness, 255, 176, 64);
    }
  }

  return data;
}

export type WrapMode = 'repeat' | 'clamp' | 'mirror';
export type MinFilter =
  | 'nearest'
  | 'linear'
  | 'nearest-mip-nearest'
  | 'linear-mip-nearest'
  | 'linear-mip-linear';
export type MagFilter = 'nearest' | 'linear';

export const WRAP_ENUM: Record<WrapMode, number> = {
  repeat: 0x2901, // GL_REPEAT
  clamp: 0x812f, // GL_CLAMP_TO_EDGE
  mirror: 0x8370, // GL_MIRRORED_REPEAT
};

export const MIN_FILTER_ENUM: Record<MinFilter, number> = {
  nearest: 0x2600, // GL_NEAREST
  linear: 0x2601, // GL_LINEAR
  'nearest-mip-nearest': 0x2700, // GL_NEAREST_MIPMAP_NEAREST
  'linear-mip-nearest': 0x2701, // GL_LINEAR_MIPMAP_NEAREST
  'linear-mip-linear': 0x2703, // GL_LINEAR_MIPMAP_LINEAR — trilinear
};

export const MAG_FILTER_ENUM: Record<MagFilter, number> = {
  nearest: 0x2600,
  linear: 0x2601,
};

/** True for the filters that actually read the mip chain. */
export const USES_MIPMAPS: Record<MinFilter, boolean> = {
  nearest: false,
  linear: false,
  'nearest-mip-nearest': true,
  'linear-mip-nearest': true,
  'linear-mip-linear': true,
};

export function createTestTexture(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('could not create texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    testTexture(),
  );
  // The texture is power-of-two, which is what lets WebGL 1 build a mip chain
  // and use anything other than CLAMP_TO_EDGE at all.
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}
