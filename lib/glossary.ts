/**
 * The vocabulary the labs use, defined once.
 *
 * Every entry is a term this site actually says somewhere — a glossary of words
 * nobody uses is just a dictionary. Where a lab demonstrates the idea, `lab`
 * points at it, because the fastest definition of "perspective divide" is a
 * slider that performs one.
 */

export interface Term {
  term: string;
  /** Short enough to read in a hover, complete enough to be worth reading. */
  definition: string;
  /** Slug of a lab that shows it, if one does. */
  lab?: string;
  /** Other terms in this glossary worth reading next. */
  see?: string[];
}

export const GLOSSARY: Term[] = [
  {
    term: 'Attribute',
    definition:
      'Per-vertex input to a vertex shader — position, normal, colour, texture coordinate. Each vertex gets its own value, read from a buffer you describe the layout of.',
    see: ['Uniform', 'Varying', 'Vertex'],
  },
  {
    term: 'Backface culling',
    definition:
      'Discarding triangles that face away from the camera before they are rasterised, decided by winding order. Roughly halves the work on a closed shape, and makes a model with inconsistent winding look full of holes.',
    see: ['Winding order', 'Rasterisation'],
  },
  {
    term: 'Clip space',
    definition:
      'Where vertices land after the projection matrix and before the perspective divide. Coordinates are homogeneous — a point survives clipping when each of x, y and z lies within ±w. Still a pyramid at this point, not a cube.',
    lab: 'pipeline',
    see: ['NDC', 'Perspective divide', 'Homogeneous coordinates'],
  },
  {
    term: 'Depth buffer',
    definition:
      'A per-pixel record of how far away the nearest thing drawn so far is, so a fragment behind it can be discarded. Also called the z-buffer. It is why opaque geometry can be drawn in any order and still occlude correctly — and, because it only ever answers "what is nearest", why translucent geometry cannot.',
    lab: 'depth',
    see: ['Z-fighting', 'Depth precision', 'Alpha blending', 'Fragment'],
  },
  {
    term: 'Z-fighting',
    definition:
      'Two surfaces close enough together that the depth buffer cannot tell which is in front, so the winner changes per pixel and per frame — a shimmering, tearing seam. Almost always fixed by moving the near plane out rather than by moving the geometry.',
    lab: 'depth',
    see: ['Depth precision', 'Depth buffer', 'Near and far planes'],
  },
  {
    term: 'Depth precision',
    definition:
      'How finely the depth buffer can distinguish distances. It is distributed hyperbolically rather than evenly: most of the range is spent close to the camera, so the near plane governs precision far away and the far plane barely matters at all.',
    lab: 'depth',
    see: ['Z-fighting', 'Near and far planes', 'Perspective divide'],
  },
  {
    term: 'Alpha blending',
    definition:
      'Combining a fragment with what is already in the framebuffer, weighted by its alpha. It is not commutative — red over green is not green over red — which is why translucent geometry has to be sorted back to front, on the CPU, every frame.',
    lab: 'depth',
    see: ['Draw order', 'Depth buffer', 'Fragment'],
  },
  {
    term: 'Draw order',
    definition:
      'The sequence draws are submitted in. Irrelevant for opaque geometry, because the depth buffer sorts it for you; decisive for translucent geometry, because blending depends on what was underneath at the time.',
    lab: 'depth',
    see: ['Alpha blending', 'Depth buffer', 'Draw call'],
  },
  {
    term: 'Fragment',
    definition:
      'A candidate pixel produced by rasterising a triangle — it has a position, interpolated attributes and a depth, but has not yet won its place in the framebuffer. A fragment shader runs once per fragment.',
    see: ['Rasterisation', 'Shader', 'Depth buffer'],
  },
  {
    term: 'Frustum',
    definition:
      'The truncated pyramid of space a perspective camera can see, bounded by the near and far planes. Not a thing you build: it is the canonical clip cube pulled back through the inverse of the projection matrix.',
    lab: 'projection',
    see: ['Near and far planes', 'Projection matrix', 'Clip space'],
  },
  {
    term: 'GLSL',
    definition:
      'The OpenGL Shading Language, used by WebGL. C-like, with first-class vector and matrix types. Its WebGPU counterpart is WGSL.',
    see: ['WGSL', 'Shader'],
  },
  {
    term: 'Gouraud shading',
    definition:
      'Lighting computed once per vertex, with the resulting colour interpolated across the triangle. Cheap, and it loses any highlight smaller than a triangle — which is most of them.',
    lab: 'shading',
    see: ['Phong shading', 'Flat shading', 'Varying'],
  },
  {
    term: 'Flat shading',
    definition:
      'One normal per triangle, so each face is a single constant colour. You are seeing the mesh rather than the surface it approximates, which is sometimes exactly what you want.',
    lab: 'shading',
    see: ['Normal', 'Gouraud shading'],
  },
  {
    term: 'Homogeneous coordinates',
    definition:
      'Adding a fourth component, w, to a 3D point so that translation becomes a matrix multiply like everything else. Points carry w = 1; directions carry w = 0, which is why translating a direction correctly does nothing.',
    lab: 'transform',
    see: ['Perspective divide', 'Clip space'],
  },
  {
    term: 'Model matrix',
    definition:
      'Places an object in the world: its translation, rotation and scale combined. The only matrix in the chain you usually author by hand.',
    lab: 'transform',
    see: ['View matrix', 'Projection matrix', 'Model space'],
  },
  {
    term: 'Basis vectors',
    definition:
      'The three vectors a transform sends the x, y and z axes to. They are literally the first three columns of the matrix, which is why colouring those columns and colouring the axes on screen shows the same thing twice.',
    lab: 'transform',
    see: ['Model matrix', 'Homogeneous coordinates', 'Vertex'],
  },
  {
    term: 'Composition order',
    definition:
      'The order matrices are multiplied in, which is not commutative and reads right to left: in T · R · S the scale reaches the vertex first. Swap two and the object goes somewhere else entirely.',
    lab: 'transform',
    see: ['Model matrix', 'Basis vectors'],
  },
  {
    term: 'Model space',
    definition:
      'The coordinate system a mesh was authored in, centred on its own origin. Nothing has happened to it yet.',
    lab: 'pipeline',
    see: ['World space', 'Model matrix'],
  },
  {
    term: 'NDC',
    definition:
      'Normalised device coordinates: what you get after dividing clip space by w. A cube from −1 to 1 on every axis. Everything outside it is discarded, and everything inside it is about to become pixels.',
    lab: 'pipeline',
    see: ['Clip space', 'Perspective divide', 'Viewport'],
  },
  {
    term: 'Near and far planes',
    definition:
      'The front and back of the frustum. They are a hard clip, not a fade — geometry crossing them is cut. Putting near too close crushes depth precision, which is where z-fighting comes from.',
    lab: 'projection',
    see: ['Frustum', 'Depth buffer'],
  },
  {
    term: 'Normal',
    definition:
      'A unit vector perpendicular to a surface at a point, describing which way it faces. Lighting is almost entirely a question of the angle between the normal and the light.',
    lab: 'shading',
    see: ['Normal matrix', 'Flat shading'],
  },
  {
    term: 'Normal matrix',
    definition:
      'The inverse-transpose of the model matrix, used to transform normals. A normal describes an orientation, not a position, so scaling one axis must tilt it rather than squash it. Under uniform scale it reduces to the model matrix, which is why getting this wrong stays invisible for so long.',
    lab: 'shading',
    see: ['Normal', 'Model matrix'],
  },
  {
    term: 'Orthographic projection',
    definition:
      'A projection whose view volume is a box rather than a pyramid. w stays 1, so no perspective divide happens and distance never changes size. Right for CAD and isometric games, wrong for anything meant to look photographed.',
    lab: 'projection',
    see: ['Perspective projection', 'Projection matrix'],
  },
  {
    term: 'Perspective divide',
    definition:
      'Dividing x, y and z by w, performed by the GPU between the vertex shader and rasterisation. This single division is what makes distant things small — the projection matrix only arranges for w to carry the depth.',
    lab: 'pipeline',
    see: ['Clip space', 'NDC', 'Homogeneous coordinates'],
  },
  {
    term: 'Perspective projection',
    definition:
      'A projection whose view volume is a frustum. Its defining feature is a −1 in the bottom row, which copies −z into w so the divide can shrink things with distance.',
    lab: 'projection',
    see: ['Orthographic projection', 'Frustum', 'Perspective divide'],
  },
  {
    term: 'Phong shading',
    definition:
      'Interpolating the normal across a triangle and computing lighting per fragment. More expensive than Gouraud and it puts highlights where they belong. Not to be confused with the Phong reflection model, which is the equation rather than where you evaluate it.',
    lab: 'shading',
    see: ['Gouraud shading', 'Specular highlight', 'Fragment'],
  },
  {
    term: 'Projection matrix',
    definition:
      'Turns view space into clip space, deciding the shape of the visible volume — field of view, aspect ratio, near and far. It does not itself divide anything.',
    lab: 'projection',
    see: ['Perspective projection', 'Clip space', 'View matrix'],
  },
  {
    term: 'Rasterisation',
    definition:
      'Working out which pixels a triangle covers, and interpolating the vertex outputs across them. The step between geometry and fragments, and the reason GPUs are shaped the way they are.',
    see: ['Fragment', 'Varying'],
  },
  {
    term: 'Shader',
    definition:
      'A small program that runs on the GPU, once per vertex or once per fragment, in parallel across thousands of them. Vertex shaders decide where things are; fragment shaders decide what colour they are.',
    see: ['GLSL', 'WGSL', 'Fragment'],
  },
  {
    term: 'Specular highlight',
    definition:
      'The bright spot where a surface reflects the light source towards the eye. Its tightness is controlled by a shininess exponent; its presence is most of what makes a material look wet, polished or metallic.',
    lab: 'shading',
    see: ['Phong shading', 'Normal'],
  },
  {
    term: 'Texel',
    definition:
      'One pixel of a texture, as opposed to one pixel of the screen. The whole business of texture filtering is deciding what to do when those two do not line up.',
    lab: 'textures',
    see: ['Texture', 'Mipmap', 'Filtering'],
  },
  {
    term: 'Texture',
    definition:
      'An image sampled by a shader. Usually colour, but just as often a normal map, a height field, a mask, or an arbitrary lookup table — to the GPU it is only structured memory you can interpolate.',
    lab: 'textures',
    see: ['Texel', 'UV coordinates', 'Filtering'],
  },
  {
    term: 'UV coordinates',
    definition:
      'The 2D coordinates that say where on a texture a vertex samples from, conventionally 0 to 1 across the image. Called u and v so as not to collide with x, y and z.',
    lab: 'textures',
    see: ['Texture', 'Wrap mode', 'Attribute'],
  },
  {
    term: 'Wrap mode',
    definition:
      'What the sampler does with a UV outside 0…1. Repeat tiles it, clamp smears the edge texel outward, mirror flips alternate tiles so the seams line up.',
    lab: 'textures',
    see: ['UV coordinates', 'Texture'],
  },
  {
    term: 'Mipmap',
    definition:
      'The same texture pre-shrunk by half repeatedly, so there is always a level where one texel is about one pixel. Costs a third more memory and removes an entire class of artefact.',
    lab: 'textures',
    see: ['Aliasing', 'Filtering', 'Texel'],
  },
  {
    term: 'Filtering',
    definition:
      'How the sampler combines texels. Nearest takes one; bilinear blends four; trilinear blends bilinear results from two mip levels. Minification and magnification are set separately because they are different problems.',
    lab: 'textures',
    see: ['Mipmap', 'Texel', 'Aliasing'],
  },
  {
    term: 'Aliasing',
    definition:
      'What happens when a signal is sampled too sparsely to represent it — jagged edges, and the crawling shimmer on a detailed texture seen at a distance. Mipmaps and anti-aliasing are two different answers to it.',
    lab: 'textures',
    see: ['Mipmap', 'Filtering', 'Rasterisation'],
  },
  {
    term: 'Compute shader',
    definition:
      'A shader that is not part of the drawing pipeline. It has no vertices and no fragments — just a grid of invocations reading and writing buffers. WebGL has no such stage at all.',
    lab: 'compute',
    see: ['Workgroup', 'Storage buffer', 'Shader'],
  },
  {
    term: 'Storage buffer',
    definition:
      'GPU memory a shader can write to as well as read, unlike a uniform. It is what lets simulation state live on the GPU across frames instead of being shipped back and forth.',
    lab: 'compute',
    see: ['Compute shader', 'Uniform', 'Workgroup'],
  },
  {
    term: 'Workgroup',
    definition:
      'The unit a compute dispatch is divided into — a small block of invocations that run together and can share memory. You choose the size; 64 is a common default because it maps well to the hardware.',
    lab: 'compute',
    see: ['Compute shader', 'Storage buffer'],
  },
  {
    term: 'Instancing',
    definition:
      'Drawing the same geometry many times in one call, with per-instance data supplying what differs. The saving is not in triangles but in draw calls, which is usually where the CPU time actually goes.',
    lab: 'instancing',
    see: ['Draw call', 'Instance index', 'Batching'],
  },
  {
    term: 'Draw call',
    definition:
      'One instruction from the CPU telling the GPU to render something. Each one costs CPU time to validate and submit whether it draws two triangles or two million, which is why a scene can be limited by how many times you asked rather than by how much you asked for.',
    lab: 'instancing',
    see: ['Instancing', 'CPU-bound', 'Batching'],
  },
  {
    term: 'Instance index',
    definition:
      'The counter a vertex shader reads to know which copy it is drawing — `gl_InstanceID` in GLSL, `@builtin(instance_index)` in WGSL. It is what turns one set of vertices into a field of objects, by indexing per-instance data with it.',
    lab: 'instancing',
    see: ['Instancing', 'Storage buffer', 'Vertex'],
  },
  {
    term: 'Batching',
    definition:
      'Merging things that would have been separate draw calls into one — same material, same buffer, submitted together. Instancing is the case where the merged objects are identical; batching more generally is why engines fight so hard to keep materials uniform.',
    lab: 'instancing',
    see: ['Draw call', 'Instancing'],
  },
  {
    term: 'CPU-bound',
    definition:
      'When the frame time is set by how fast the CPU can prepare and submit work rather than by how fast the GPU can execute it. The tell is that reducing triangles changes nothing while reducing draw calls changes everything.',
    lab: 'instancing',
    see: ['Draw call', 'Instancing'],
  },
  {
    term: 'Uniform',
    definition:
      'A value that is the same for every vertex and fragment in a draw call — a matrix, a light direction, the current time. Set from JavaScript, read-only inside the shader.',
    see: ['Attribute', 'Shader'],
  },
  {
    term: 'Varying',
    definition:
      'A value passed from the vertex shader to the fragment shader, interpolated across the triangle on the way. The mechanism behind Gouraud shading, texture coordinates and smooth colour.',
    see: ['Attribute', 'Rasterisation', 'Gouraud shading'],
  },
  {
    term: 'Vertex',
    definition:
      'A point of geometry with attributes attached. Not quite the same as a corner: two faces meeting at one corner need two vertices if their normals differ.',
    see: ['Attribute', 'Flat shading'],
  },
  {
    term: 'View matrix',
    definition:
      'Moves the world so the camera sits at the origin looking down −Z. There is no camera object on a GPU; there is only this inverse.',
    lab: 'pipeline',
    see: ['View space', 'Model matrix', 'Projection matrix'],
  },
  {
    term: 'View space',
    definition:
      'Coordinates relative to the camera, after the view matrix. The camera is at the origin here, by construction.',
    lab: 'pipeline',
    see: ['View matrix', 'World space'],
  },
  {
    term: 'Viewport',
    definition:
      'The rectangle of pixels being drawn into, and the final transform from NDC to pixel coordinates. Note that y flips: NDC counts up, pixel rows count down.',
    lab: 'pipeline',
    see: ['NDC', 'Rasterisation'],
  },
  {
    term: 'WGSL',
    definition:
      'The WebGPU Shading Language. Rust-flavoured rather than C-flavoured, strongly typed, with explicit binding annotations. Same job as GLSL, different spelling.',
    see: ['GLSL', 'Shader'],
  },
  {
    term: 'Winding order',
    definition:
      'Whether a triangle’s vertices are listed clockwise or counter-clockwise on screen, which is how the GPU decides which side is the front. Get it inconsistent and backface culling eats half your model.',
    see: ['Backface culling', 'Vertex'],
  },
  {
    term: 'Lambert',
    definition:
      'The diffuse term: brightness proportional to how squarely a surface faces the light, and nothing else. It is the cosine of the angle between the normal and the light direction, clamped at zero so surfaces turned away are unlit rather than negatively lit.',
    lab: 'shading',
    see: ['Normal', 'Specular highlight', 'Linear colour'],
  },
  {
    term: 'Compile error',
    definition:
      'A shader that the driver refused. The message names a line and a reason, and is the single most useful thing on screen when a shader goes wrong — but only if something is showing it to you, which is why a failed shader usually presents as an unexplained black surface instead.',
    lab: 'shader',
    see: ['Shader', 'GLSL', 'Fragment shader'],
  },
  {
    term: 'Fragment shader',
    definition:
      'The program run once per pixel a triangle covers, whose job is to return a colour. With a full-screen quad and no geometry to speak of, it becomes a pure function from pixel coordinate to colour — which is how most shader art is made.',
    lab: 'shader',
    see: ['Shader', 'Fragment', 'GLSL', 'Compile error'],
  },
  {
    term: 'sRGB',
    definition:
      'The colour space almost every image, screen and colour picker uses. It is deliberately non-linear — more of its range is spent on dark tones, because eyes are more sensitive there — which means the numbers in it are not proportional to light.',
    lab: 'colour',
    see: ['Linear colour', 'Gamma', 'Gamma correction'],
  },
  {
    term: 'Linear colour',
    definition:
      'Colour whose numbers are proportional to actual light, so doubling the number doubles the brightness. The only space in which adding two lights together, or multiplying by a Lambert term, means what the arithmetic says it means.',
    lab: 'colour',
    see: ['sRGB', 'Gamma correction', 'Lambert'],
  },
  {
    term: 'Gamma',
    definition:
      'The exponent relating an encoded colour value to the light it stands for — about 2.2 for sRGB. Raising a value to that power decodes it to light; the reciprocal encodes it back.',
    lab: 'colour',
    see: ['sRGB', 'Linear colour'],
  },
  {
    term: 'Gamma correction',
    definition:
      'Decoding colours to linear before lighting them and encoding the result back for display. Skipping it does not throw an error or look obviously broken — it darkens midtones and hardens the terminator, which reads as a lighting choice, which is why it ships.',
    lab: 'colour',
    see: ['Gamma', 'Linear colour', 'sRGB'],
  },
  {
    term: 'World space',
    definition:
      'The shared coordinate system the scene lives in, after each object’s model matrix has placed it. The only space where "next to" means what you think it means.',
    lab: 'pipeline',
    see: ['Model space', 'View space', 'Model matrix'],
  },
];

export const GLOSSARY_SORTED = [...GLOSSARY].sort((a, b) =>
  a.term.localeCompare(b.term),
);

/** URL-safe anchor for a term. */
export const termId = (term: string) =>
  term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
