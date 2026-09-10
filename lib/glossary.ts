import { stateHref, type StateValue } from '@/lib/url-state';

/**
 * The vocabulary the labs use, defined once.
 *
 * Every entry is a term this site actually says somewhere — a glossary of words
 * nobody uses is just a dictionary. Where a lab demonstrates the idea, `lab`
 * points at it, because the fastest definition of "perspective divide" is a
 * slider that performs one.
 *
 * `lab` alone did not keep that promise: it landed the reader on the lab at its
 * defaults, where nothing is performing anything, and left them to work out
 * which of nine controls to move. `demo` carries the configuration instead —
 * the figure, the control values, and the sentence saying what to look at — and
 * `demoHref` turns it into the address that restores it. Nothing here is a
 * typed-out URL: a renamed control or a deleted figure fails test/glossary.test.ts
 * rather than becoming a link that silently opens the defaults, which is the
 * failure this whole field exists to remove.
 */

export interface Demo {
  /**
   * The figure whose controls these are, and the fragment the link lands on.
   * Omitted for the instrument at the foot of the essay, which owns the
   * unprefixed query keys and answers to `#instrument`.
   */
  figure?: string;
  /**
   * Control values, named exactly as the lab or the figure names them. Only
   * values that differ from the default belong here: `useLabState` writes the
   * address bar from the difference, so a key already at its default is dropped
   * on arrival and the link would be quietly describing less than it says.
   */
  state: Record<string, StateValue>;
  /**
   * One sentence on what to look at once it lands — the job the lab presets'
   * `note` already does. Without it the reader arrives at controls that have
   * been moved for reasons they cannot see, which is worse than arriving at the
   * defaults.
   */
  look: string;
}

export interface Term {
  term: string;
  /** Short enough to read in a hover, complete enough to be worth reading. */
  definition: string;
  /** Slug of a lab that shows it, if one does. */
  lab?: string;
  /** A state of that lab which performs the term, rather than the lab at rest. */
  demo?: Demo;
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
    demo: {
      figure: 'view-to-clip',
      state: { t: 1 },
      look:
        'The blend parked at the clip-space end: w has stopped being 1 and reads 3.714, which is exactly how far in front of the camera the vertex was.',
    },
    see: ['NDC', 'Perspective divide', 'Homogeneous coordinates'],
  },
  {
    term: 'Depth buffer',
    definition:
      'A per-pixel record of how far away the nearest thing drawn so far is, so a fragment behind it can be discarded. Also called the z-buffer. It is why opaque geometry can be drawn in any order and still occlude correctly — and, because it only ever answers "what is nearest", why translucent geometry cannot.',
    lab: 'depth',
    demo: {
      figure: 'depth-write',
      state: { depthWrite: false },
      look:
        'With writing off the two panes behind come back. They had been failing the depth test and being discarded — the buffer doing exactly its job, on the one kind of geometry it cannot help.',
    },
    see: ['Z-fighting', 'Depth precision', 'Alpha blending', 'Fragment'],
  },
  {
    term: 'Z-fighting',
    definition:
      'Two surfaces close enough together that the depth buffer cannot tell which is in front, so the winner changes per pixel and per frame — a shimmering, tearing seam. Almost always fixed by moving the near plane out rather than by moving the geometry.',
    lab: 'depth',
    demo: {
      state: { near: 0.02, separation: 0.002, distance: 80 },
      look:
        'The readout predicts the failure before you look: the smallest resolvable gap reads 1.91e-2 against a separation of 0.002, and the red panel cuts up through the blue in slivers.',
    },
    see: ['Depth precision', 'Depth buffer', 'Near and far planes'],
  },
  {
    term: 'Depth precision',
    definition:
      'How finely the depth buffer can distinguish distances. It is distributed hyperbolically rather than evenly: most of the range is spent close to the camera, so the near plane governs precision far away and the far plane barely matters at all.',
    lab: 'depth',
    demo: {
      state: { near: 0.05, far: 1000, separation: 0.002, distance: 80 },
      look:
        'Drag the far plane anywhere between 10 and 1000 and the prediction stays at 7.6e-3. Take the near plane from 0.05 to 0.5 instead and it drops by a factor of ten.',
    },
    see: ['Z-fighting', 'Near and far planes', 'Perspective divide'],
  },
  {
    term: 'Alpha blending',
    definition:
      'Combining a fragment with what is already in the framebuffer, weighted by its alpha. It is not commutative — red over green is not green over red — which is why translucent geometry has to be sorted back to front, on the CPU, every frame.',
    lab: 'depth',
    demo: {
      figure: 'sort-order',
      state: { sorted: true },
      look:
        'Sorted, the overlap reads red over green over blue, which is where the panes actually are. Unsorted it read the other way round — the same three panes, combined in a different order, are a different picture.',
    },
    see: ['Draw order', 'Depth buffer', 'Fragment'],
  },
  {
    term: 'Draw order',
    definition:
      'The sequence draws are submitted in. Irrelevant for opaque geometry, because the depth buffer sorts it for you; decisive for translucent geometry, because blending depends on what was underneath at the time.',
    lab: 'depth',
    demo: {
      state: { scene: 'blend', depthWrite: true, sorted: false, opacity: 0.55, azimuth: 2.5 },
      look:
        'Three translucent panes submitted in array order with depth writing on: whichever is drawn first stamps the buffer, so panes disappear according to when they were asked for rather than where they stand.',
    },
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
    demo: {
      figure: 'field-of-view',
      state: { fov: 100 },
      look:
        'The pyramid opens sideways and the near and far planes stay exactly where they were. The two boxes at 12.8 and 15.8 stay out at every angle — they are outside on depth, not on angle.',
    },
    see: ['Near and far planes', 'Projection matrix', 'Clip space'],
  },
  {
    term: 'GLSL',
    definition:
      'The OpenGL Shading Language, used by WebGL. C-like, with first-class vector and matrix types. Its WebGPU counterpart is WGSL.',
    lab: 'shader',
    see: ['WGSL', 'Shader'],
  },
  {
    term: 'Gouraud shading',
    definition:
      'Lighting computed once per vertex, with the resulting colour interpolated across the triangle. Cheap, and it loses any highlight smaller than a triangle — which is most of them.',
    lab: 'shading',
    demo: {
      state: { model: 'gouraud', specular: 1.2, shininess: 120 },
      look:
        'The highlight is about the size of a triangle, so the three corner values it is built from flatten its sides; drag the sphere round and watch it pulse as it crosses the mesh.',
    },
    see: ['Phong shading', 'Flat shading', 'Varying'],
  },
  {
    term: 'Flat shading',
    definition:
      'One normal per triangle, so each face is a single constant colour. You are seeing the mesh rather than the surface it approximates, which is sometimes exactly what you want.',
    lab: 'shading',
    demo: {
      figure: 'shading-models',
      state: { model: 'flat' },
      look:
        'One normal per triangle: the sphere becomes the polygons it was always made of, and each face is a single constant colour.',
    },
    see: ['Normal', 'Gouraud shading'],
  },
  {
    term: 'Homogeneous coordinates',
    definition:
      'Adding a fourth component, w, to a 3D point so that translation becomes a matrix multiply like everything else. Points carry w = 1; directions carry w = 0, which is why translating a direction correctly does nothing.',
    lab: 'transform',
    demo: {
      figure: 'translate',
      state: { tx: 3 },
      look:
        'One number in the matrix moved and it is in the last column — the column that only reaches the vertex at all because the vertex carries a fourth component of 1.',
    },
    see: ['Perspective divide', 'Clip space'],
  },
  {
    term: 'Model matrix',
    definition:
      'Places an object in the world: its translation, rotation and scale combined. The only matrix in the chain you usually author by hand.',
    lab: 'transform',
    demo: {
      figure: 'memory-layout',
      state: { t: 1 },
      look:
        'A 55° turn and a 2.2 move, in one matrix: exactly five of the sixteen floats have left the identity, and the eleven around them are still grey.',
    },
    see: ['View matrix', 'Projection matrix', 'Model space'],
  },
  {
    term: 'Basis vectors',
    definition:
      'The three vectors a transform sends the x, y and z axes to. They are literally the first three columns of the matrix, which is why colouring those columns and colouring the axes on screen shows the same thing twice.',
    lab: 'transform',
    demo: {
      figure: 'scale-axes',
      state: { sy: 2.5 },
      look:
        'The green arm is two and a half times the length of the other two, and the matrix’s middle column reads 0, 2.5, 0. The arm and the column are the same three numbers.',
    },
    see: ['Model matrix', 'Homogeneous coordinates', 'Vertex'],
  },
  {
    term: 'Composition order',
    definition:
      'The order matrices are multiplied in, which is not commutative and reads right to left: in T · R · S the scale reaches the vertex first. Swap two and the object goes somewhere else entirely.',
    lab: 'transform',
    demo: {
      figure: 'order-matters',
      state: { t: 1 },
      look:
        'The same rotation and the same translation on both sides, composed the two ways round: at the end of the slider the two cubes stand 2.03 units apart.',
    },
    see: ['Model matrix', 'Basis vectors'],
  },
  {
    term: 'Model space',
    definition:
      'The coordinate system a mesh was authored in, centred on its own origin. Nothing has happened to it yet.',
    lab: 'pipeline',
    demo: {
      figure: 'model-to-world',
      state: { t: 0 },
      look:
        'Wound back to where the vertex starts — 0.5, 0.5, 0.5, the three numbers in the buffer — with no matrix applied and no ground grid, because there is no ground yet.',
    },
    see: ['World space', 'Model matrix'],
  },
  {
    term: 'NDC',
    definition:
      'Normalised device coordinates: what you get after dividing clip space by w. A cube from −1 to 1 on every axis. Everything outside it is discarded, and everything inside it is about to become pixels.',
    lab: 'pipeline',
    demo: {
      state: { stage: 4, showGrid: false },
      look:
        'Stage five of six. Everything left is inside the cube from −1 to 1, and the tracked corner sits at 0.498, 0.505, 0.879 — the row above it in the table is what those numbers were before the divide.',
    },
    see: ['Clip space', 'Perspective divide', 'Viewport'],
  },
  {
    term: 'Near and far planes',
    definition:
      'The front and back of the frustum. They are a hard clip, not a fade — geometry crossing them is cut. Putting near too close crushes depth precision, which is where z-fighting comes from.',
    lab: 'projection',
    demo: {
      state: { near: 3, far: 6 },
      look:
        'A three-unit slab. The near plane cuts the closest box open where it crosses it, and the four boxes past 6 are dropped outright rather than fading out.',
    },
    see: ['Frustum', 'Depth buffer'],
  },
  {
    term: 'Normal',
    definition:
      'A unit vector perpendicular to a surface at a point, describing which way it faces. Lighting is almost entirely a question of the angle between the normal and the light.',
    lab: 'shading',
    demo: {
      figure: 'stretched-normals',
      state: { stretch: 1 },
      look:
        'At a stretch of exactly 1 the green hairs stand perpendicular to the surface everywhere. Move the slider either way and they stop being normals — they are being carried along by the model matrix like ordinary geometry.',
    },
    see: ['Normal matrix', 'Flat shading'],
  },
  {
    term: 'Normal matrix',
    definition:
      'The inverse-transpose of the model matrix, used to transform normals. A normal describes an orientation, not a position, so scaling one axis must tilt it rather than squash it. Under uniform scale it reduces to the model matrix, which is why getting this wrong stays invisible for so long.',
    lab: 'shading',
    demo: {
      figure: 'inverse-transpose',
      state: { correctNormals: true },
      look:
        'The middle entry of the matrix beside the sphere goes from 0.40 to 2.50 — the inverse-transpose of a 0.4 squash — and the highlight drops by more than a third of the sphere’s height.',
    },
    see: ['Normal', 'Model matrix'],
  },
  {
    term: 'Orthographic projection',
    definition:
      'A projection whose view volume is a box rather than a pyramid. w stays 1, so no perspective divide happens and distance never changes size. Right for CAD and isometric games, wrong for anything meant to look photographed.',
    lab: 'projection',
    demo: {
      state: { mode: 'orthographic' },
      look:
        'The volume is a box rather than a pyramid, and the boxes stop changing size with distance: w never leaves 1, so there is nothing for a divide to do.',
    },
    see: ['Perspective projection', 'Projection matrix'],
  },
  {
    term: 'Perspective divide',
    definition:
      'Dividing x, y and z by w, performed by the GPU between the vertex shader and rasterisation. This single division is what makes distant things small — the projection matrix only arranges for w to carry the depth.',
    lab: 'pipeline',
    demo: {
      figure: 'clip-to-ndc',
      state: { t: 1 },
      look:
        'The two rows of the readout are the whole of it: 1.850 ÷ 3.714 = 0.498, and the pyramid has become a cube.',
    },
    see: ['Clip space', 'NDC', 'Homogeneous coordinates'],
  },
  {
    term: 'Perspective projection',
    definition:
      'A projection whose view volume is a frustum. Its defining feature is a −1 in the bottom row, which copies −z into w so the divide can shrink things with distance.',
    lab: 'projection',
    demo: {
      state: { fov: 90 },
      look:
        'At 90° the near face of a box is enormous and its far face small, though in the model they are the same size. That is the −1 in the bottom row, copying depth into w.',
    },
    see: ['Orthographic projection', 'Frustum', 'Perspective divide'],
  },
  {
    term: 'Phong shading',
    definition:
      'Interpolating the normal across a triangle and computing lighting per fragment. More expensive than Gouraud and it puts highlights where they belong. Not to be confused with the Phong reflection model, which is the equation rather than where you evaluate it.',
    lab: 'shading',
    demo: {
      figure: 'shading-models',
      state: { model: 'phong' },
      look:
        'The same shininess of 120, evaluated per fragment rather than per vertex: the highlight is round again, and stays round wherever it sits on the mesh.',
    },
    see: ['Gouraud shading', 'Specular highlight', 'Fragment'],
  },
  {
    term: 'Projection matrix',
    definition:
      'Turns view space into clip space, deciding the shape of the visible volume — field of view, aspect ratio, near and far. It does not itself divide anything.',
    lab: 'projection',
    demo: {
      figure: 'perspective-divide',
      state: { mode: 'orthographic' },
      look:
        'Watch the matrix beside the picture rather than the picture: the bottom row has gone from 0 0 −1 0 to 0 0 0 1, and the small box now lands at 0.600 of the big one’s height instead of nearly twice it.',
    },
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
    lab: 'shader',
    demo: {
      figure: 'once-per-pixel',
      state: { across: 4 },
      look:
        'Four cells across, eight calls in the grid, and nothing circular left. The canvas below runs that same program 1,327,104 times, and no one of those runs knows about any other.',
    },
    see: ['GLSL', 'WGSL', 'Fragment'],
  },
  {
    term: 'Specular highlight',
    definition:
      'The bright spot where a surface reflects the light source towards the eye. Its tightness is controlled by a shininess exponent; its presence is most of what makes a material look wet, polished or metallic.',
    lab: 'shading',
    demo: {
      figure: 'highlight-width',
      state: { shininess: 160 },
      look:
        'One exponent, from 40 to 160: the wash over the whole lit hemisphere collapses into a small bright disc. The light has not moved and neither have you.',
    },
    see: ['Phong shading', 'Normal'],
  },
  {
    term: 'Texel',
    definition:
      'One pixel of a texture, as opposed to one pixel of the screen. The whole business of texture filtering is deciding what to do when those two do not line up.',
    lab: 'textures',
    demo: {
      state: { repeat: 1, elevation: 0.9, minFilter: 'linear', magFilter: 'nearest' },
      look:
        'One tile from almost overhead, so a single texel is several pixels across. Under nearest the foreground is visibly built of blocks, and one block is one texel of a 256-texel image rather than one pixel of the screen.',
    },
    see: ['Texture', 'Mipmap', 'Filtering'],
  },
  {
    term: 'Texture',
    definition:
      'An image sampled by a shader. Usually colour, but just as often a normal map, a height field, a mask, or an arbitrary lookup table — to the GPU it is only structured memory you can interpolate.',
    lab: 'textures',
    demo: {
      state: { repeat: 1, elevation: 0.5 },
      look:
        'One copy of the image across the whole plane, from high enough to read it: a checker, the one-texel grey grid that aliases so badly further out, a cyan border and an asymmetric amber marker. Everything else in this lab is a decision about how to sample it.',
    },
    see: ['Texel', 'UV coordinates', 'Filtering'],
  },
  {
    term: 'UV coordinates',
    definition:
      'The 2D coordinates that say where on a texture a vertex samples from, conventionally 0 to 1 across the image. Called u and v so as not to collide with x, y and z.',
    lab: 'textures',
    demo: {
      figure: 'tile-count',
      state: { repeat: 16 },
      look:
        'The plane has not changed and neither have its vertices. Their texture coordinates are being multiplied by sixteen before the sampler sees them, and that is the whole of the tiling.',
    },
    see: ['Texture', 'Wrap mode', 'Attribute'],
  },
  {
    term: 'Wrap mode',
    definition:
      'What the sampler does with a UV outside 0…1. Repeat tiles it, clamp smears the edge texel outward, mirror flips alternate tiles so the seams line up.',
    lab: 'textures',
    demo: {
      state: { wrapS: 'clamp', wrapT: 'clamp', repeat: 1, offset: 0.45 },
      look:
        'The tile has slid off one side and everything it vacated is filled by the last row of texels it left behind — the cyan border, stretched to the horizon. That stripe is clamp-to-edge.',
    },
    see: ['UV coordinates', 'Texture'],
  },
  {
    term: 'Mipmap',
    definition:
      'The same texture pre-shrunk by half repeatedly, so there is always a level where one texel is about one pixel. Costs a third more memory and removes an entire class of artefact.',
    lab: 'textures',
    demo: {
      figure: 'mip-handover',
      state: { minFilter: 'linear-mip-linear' },
      look:
        'The hard horizontal boundary partway down the plane was one mip level handing over to the next. Blending the two levels either side of it leaves no boundary to find.',
    },
    see: ['Aliasing', 'Filtering', 'Texel'],
  },
  {
    term: 'Filtering',
    definition:
      'How the sampler combines texels. Nearest takes one; bilinear blends four; trilinear blends bilinear results from two mip levels. Minification and magnification are set separately because they are different problems.',
    lab: 'textures',
    demo: {
      figure: 'magnification-filter',
      state: { magFilter: 'linear' },
      look:
        'In the foreground a checker boundary that was a hard edge becomes a ramp about a texel wide. The far end of the plane is identical either way — it is minified up there, and this control has no vote.',
    },
    see: ['Mipmap', 'Texel', 'Aliasing'],
  },
  {
    term: 'Aliasing',
    definition:
      'What happens when a signal is sampled too sparsely to represent it — jagged edges, and the crawling shimmer on a detailed texture seen at a distance. Mipmaps and anti-aliasing are two different answers to it.',
    lab: 'textures',
    demo: {
      state: { minFilter: 'nearest', magFilter: 'nearest', repeat: 16 },
      look:
        'Nothing here is moving and the far half of the plane has still broken into rings and speckle: hundreds of texels land in one pixel, and nearest hands back whichever one the pixel centre happened to hit.',
    },
    see: ['Mipmap', 'Filtering', 'Rasterisation'],
  },
  {
    term: 'Compute shader',
    definition:
      'A shader that is not part of the drawing pipeline. It has no vertices and no fragments — just a grid of invocations reading and writing buffers. WebGL has no such stage at all.',
    lab: 'compute',
    demo: {
      state: { count: 120000 },
      look:
        'A hundred and twenty thousand particles, every one of them stepped by a single dispatch each frame. There are no vertices and no fragments in that pass — only a grid of invocations over a buffer.',
    },
    see: ['Workgroup', 'Storage buffer', 'Shader'],
  },
  {
    term: 'Storage buffer',
    definition:
      'GPU memory a shader can write to as well as read, unlike a uniform. It is what lets simulation state live on the GPU across frames instead of being shipped back and forth.',
    lab: 'compute',
    demo: {
      state: { running: false, pointSize: 0.007, brightness: 0.4 },
      look:
        'The simulation has stopped and the picture is still there. The positions live on the GPU, and the draw goes on reading the same buffer the compute pass was writing.',
    },
    see: ['Compute shader', 'Uniform', 'Workgroup'],
  },
  {
    term: 'Workgroup',
    definition:
      'The unit a compute dispatch is divided into — a small block of invocations that run together and can share memory. You choose the size; 64 is a common default because it maps well to the hardware.',
    lab: 'compute',
    demo: {
      state: { count: 100000 },
      look:
        'The readout under the instrument does the division: 100,000 particles is 1,563 workgroups of 64, which is 100,032 invocations — the last 32 load an index past the count and return.',
    },
    see: ['Compute shader', 'Storage buffer'],
  },
  {
    term: 'Instancing',
    definition:
      'Drawing the same geometry many times in one call, with per-instance data supplying what differs. The saving is not in triangles but in draw calls, which is usually where the CPU time actually goes.',
    lab: 'instancing',
    demo: {
      state: { count: 10000 },
      look:
        'Ten thousand cubes and 120,000 triangles in one draw call. Note the CPU figure beside the canvas before you touch the mode switch.',
    },
    see: ['Draw call', 'Instance index', 'Batching'],
  },
  {
    term: 'Draw call',
    definition:
      'One instruction from the CPU telling the GPU to render something. Each one costs CPU time to validate and submit whether it draws two triangles or two million, which is why a scene can be limited by how many times you asked rather than by how much you asked for.',
    lab: 'instancing',
    demo: {
      state: { count: 10000, mode: 'per-object' },
      look:
        'The same ten thousand cubes, the same 120,000 triangles and the same shader, asked for one at a time. Only the number of times the CPU asked has changed, and the CPU figure changed with it.',
    },
    see: ['Instancing', 'CPU-bound', 'Batching'],
  },
  {
    term: 'Instance index',
    definition:
      'The counter a vertex shader reads to know which copy it is drawing — `gl_InstanceID` in GLSL, `@builtin(instance_index)` in WGSL. It is what turns one set of vertices into a field of objects, by indexing per-instance data with it.',
    lab: 'instancing',
    demo: {
      figure: 'which-term-counts',
      state: { mode: 'per-object' },
      look:
        'The accent column that was counting 0, 1, 2, 3 is stuck at zero and the amber one counts instead: the CPU is doing the indexing now, and buying a draw call each time round.',
    },
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
    demo: {
      state: { count: 1000, mode: 'per-object', scale: 1.6 },
      look:
        'A thousand draw calls for 12,000 triangles, which no GPU would notice. Take the count up and the frame time follows the calls; the triangles have nothing to do with it.',
    },
    see: ['Draw call', 'Instancing'],
  },
  {
    term: 'Uniform',
    definition:
      'A value that is the same for every vertex and fragment in a draw call — a matrix, a light direction, the current time. Set from JavaScript, read-only inside the shader.',
    lab: 'shader',
    demo: {
      figure: 'knob-sweep',
      state: { knob: 2 },
      look:
        'One number, read identically by every pixel in the draw: at uKnob 2 the radius sweeps from 0.39 to 0.71, and the readout beside it shows the 0.08 × uKnob that got it there.',
    },
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
    demo: {
      figure: 'world-to-view',
      state: { t: 1 },
      look:
        'The world moved, not the camera: 1.226, 0.800, −0.793 becomes 1.226, 0.777, −3.714, and the origin is now the eye.',
    },
    see: ['View space', 'Model matrix', 'Projection matrix'],
  },
  {
    term: 'View space',
    definition:
      'Coordinates relative to the camera, after the view matrix. The camera is at the origin here, by construction.',
    lab: 'pipeline',
    demo: {
      state: { stage: 2 },
      look:
        'Stage three of six. The camera is at the origin by construction, and the tracked corner’s z of −3.714 is how far in front of it the vertex sits.',
    },
    see: ['View matrix', 'World space'],
  },
  {
    term: 'Viewport',
    definition:
      'The rectangle of pixels being drawn into, and the final transform from NDC to pixel coordinates. Note that y flips: NDC counts up, pixel rows count down.',
    lab: 'pipeline',
    demo: {
      figure: 'ndc-to-screen',
      state: { t: 1 },
      look:
        '0.505 of the way up the NDC cube arrives as 148.5 pixels down a 600-pixel window: the y flip, in one number.',
    },
    see: ['NDC', 'Rasterisation'],
  },
  {
    term: 'WGSL',
    definition:
      'The WebGPU Shading Language. Rust-flavoured rather than C-flavoured, strongly typed, with explicit binding annotations. Same job as GLSL, different spelling.',
    lab: 'compute',
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
    demo: {
      state: { ambient: 0, specular: 0, diffuse: 1.1 },
      look:
        'Specular and ambient at zero, so all the brightness left is the cosine of the angle between the normal and the light, and the terminator is where that cosine reaches nothing.',
    },
    see: ['Normal', 'Specular highlight', 'Linear colour'],
  },
  {
    term: 'Compile error',
    definition:
      'A shader that the driver refused. The message names a line and a reason, and is the single most useful thing on screen when a shader goes wrong — but only if something is showing it to you, which is why a failed shader usually presents as an unexplained black surface instead.',
    lab: 'shader',
    demo: {
      state: { preset: 'broken' },
      look:
        'A vec3 assigned to a vec4, and a missing semicolon. The driver’s own message appears under the editor with the line number, renumbered back past the preamble you cannot see.',
    },
    see: ['Shader', 'GLSL', 'Fragment shader'],
  },
  {
    term: 'Fragment shader',
    definition:
      'The program run once per pixel a triangle covers, whose job is to return a colour. With a full-screen quad and no geometry to speak of, it becomes a pure function from pixel coordinate to colour — which is how most shader art is made.',
    lab: 'shader',
    demo: {
      state: { preset: 'plasma' },
      look:
        'Four lines and no geometry worth the name: every pixel’s colour is a function of its own coordinate and the clock, and there is nothing else in the program.',
    },
    see: ['Shader', 'Fragment', 'GLSL', 'Compile error'],
  },
  {
    term: 'sRGB',
    definition:
      'The colour space almost every image, screen and colour picker uses. It is deliberately non-linear — more of its range is spent on dark tones, because eyes are more sensitive there — which means the numbers in it are not proportional to light.',
    lab: 'colour',
    demo: {
      figure: 'divider',
      state: { split: 1 },
      look:
        'The whole sphere is on the uncorrected branch now — lit by multiplying sRGB numbers. The midtones are darker and the terminator arrives as an edge, because those numbers are not proportional to light.',
    },
    see: ['Linear colour', 'Gamma', 'Gamma correction'],
  },
  {
    term: 'Linear colour',
    definition:
      'Colour whose numbers are proportional to actual light, so doubling the number doubles the brightness. The only space in which adding two lights together, or multiplying by a Lambert term, means what the arithmetic says it means.',
    lab: 'colour',
    demo: {
      state: { intensity: 2.6, ambient: 0.02, showStrip: false },
      look:
        'Turn the light up and the uncorrected half blows out to flat white while the corrected half still has shape in its highlight. Doubling a number only doubles light in the space where light adds.',
    },
    see: ['sRGB', 'Gamma correction', 'Lambert'],
  },
  {
    term: 'Gamma',
    definition:
      'The exponent relating an encoded colour value to the light it stands for — about 2.2 for sRGB. Raising a value to that power decodes it to light; the reciprocal encodes it back.',
    lab: 'colour',
    demo: {
      figure: 'grey-test',
      state: { gamma: 3 },
      look:
        'At an exponent of 3 the number 0.5 is 12.5% of the light, and the patch that really is half the light climbs to 0.794. Those two readings are the whole of what the exponent means.',
    },
    see: ['sRGB', 'Linear colour'],
  },
  {
    term: 'Gamma correction',
    definition:
      'Decoding colours to linear before lighting them and encoding the result back for display. Skipping it does not throw an error or look obviously broken — it darkens midtones and hardens the terminator, which reads as a lighting choice, which is why it ships.',
    lab: 'colour',
    demo: {
      figure: 'only-difference',
      state: { gamma: 1 },
      look:
        'The divider disappears. At an exponent of 1 the two branches compute the same expression, so nothing else about them could ever have been what the seam was measuring.',
    },
    see: ['Gamma', 'Linear colour', 'sRGB'],
  },
  {
    term: 'World space',
    definition:
      'The shared coordinate system the scene lives in, after each object’s model matrix has placed it. The only space where "next to" means what you think it means.',
    lab: 'pipeline',
    demo: {
      figure: 'model-to-world',
      state: { t: 1 },
      look:
        'The model matrix has landed: the corner that was 0.5, 0.5, 0.5 in its own coordinates reads 1.226, 0.800, −0.793 in the world’s, and the floor is under it.',
    },
    see: ['Model space', 'View space', 'Model matrix'],
  },
];

export const GLOSSARY_SORTED = [...GLOSSARY].sort((a, b) =>
  a.term.localeCompare(b.term),
);

/** URL-safe anchor for a term. */
export const termId = (term: string) =>
  term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * The query string a demo restores, in the grammar the labs already read.
 *
 * The instrument owns the unprefixed keys; a figure's are namespaced with its
 * own id, so `?translate.tx=3` reaches the translate figure and nothing else.
 * Booleans go out as `1` and `0` because that is the only spelling
 * `decodeState` accepts — `?showGrid=false` is dropped in silence, and the
 * reader gets the grid they came to see turned off.
 *
 * Sorted, so the same demo always produces the same address.
 */
function demoQuery(demo: Demo): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(demo.state).sort()) {
    const value = demo.state[key];
    params.set(
      demo.figure ? `${demo.figure}.${key}` : key,
      typeof value === 'boolean' ? (value ? '1' : '0') : String(value),
    );
  }
  return params.toString();
}

/**
 * The address that opens this term's lab already showing it.
 *
 * The fragment is not decoration. A figure's demo has to scroll to that figure,
 * and an instrument's has to scroll past the essay to the instrument — every
 * lab essay carries a `<ProseHeading id="instrument">` for it. Without one the
 * reader lands at the top of a page whose controls have moved somewhere far
 * below the fold.
 */
export function demoHref(entry: Term): string | undefined {
  if (!entry.lab || !entry.demo) return undefined;
  const fragment = entry.demo.figure ?? 'instrument';
  return `${stateHref(`/labs/${entry.lab}`, demoQuery(entry.demo))}#${fragment}`;
}

/** Terms whose lab link opens a state rather than the lab at rest. */
export const DEMONSTRATED = GLOSSARY.filter((entry) => entry.demo && entry.lab);
