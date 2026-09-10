/**
 * The other door into the site.
 *
 * Ten labs in order is the sequence this was BUILT in. It is not the sequence
 * anyone arrives in. Nobody wakes up wanting lesson four; they arrive with the
 * bug open in another tab and a sentence in their head — "my lighting goes
 * wrong when I scale the object", "my two surfaces flicker where they touch",
 * "my textures look like static in the distance". This file is that sentence,
 * thirty times over, each one paired with the belief that produced it and a
 * link that reproduces it.
 *
 * The last part is what separates this from a list of common WebGL problems.
 * The `state` on each row is not a description of the bug: it is the bug,
 * encoded in the URL grammar `lib/url-state.ts` already defines, so following
 * the link puts the failure on the reader's own screen with the lab's own
 * arithmetic printed beside it.
 *
 * WHAT THIS FILE DOES NOT CONTAIN
 *
 * No lab title, no lab number, no lab takeaway. Those live in `lib/labs.ts` and
 * are read from there at render time. A row names a lab by slug, a section by
 * the id of a `<ProseHeading>` in that lab's essay, and a figure by the id of a
 * `<Figure>` in the same file — three ids this module cannot see, all three
 * checked in test/symptoms.test.ts against the sources that own them. The
 * control keys are checked the same way, and by the real codec: the test
 * decodes each link's query with the target's actual defaults and asserts what
 * comes back is exactly what the row declared. A key the lab does not read, a
 * boolean written as `true` instead of `1`, or a value that happens to equal
 * the default all produce the same silent failure otherwise — a link that opens
 * the lab at its defaults under a promise that it would not.
 */

import { getLab, type Lab } from './labs';
import { stateHref, type StateValue } from './url-state';

export interface Symptom {
  /** Stable, permanent: it is this row's anchor, so somebody may have linked to it. */
  id: string;
  /** As the reader would say it out loud, not as a textbook would title it. */
  symptom: string;
  /** The prediction that produced the symptom. Written in the reader's voice. */
  belief: string;
  /** The prediction that survives contact with the hardware. One sentence, no hedging. */
  correction: string;
  /** A slug in LABS. */
  lab: string;
  /** A `<ProseHeading id>` in that lab's essay — where the argument is made. */
  section: string;
  /**
   * A `<Figure id>` in that lab's essay. When set, `state` is that figure's own
   * controls and the link lands on the figure; when unset, `state` is the
   * instrument at the foot of the page and the link lands on it.
   */
  figure?: string;
  /**
   * The controls to set, in the target's own key names. Never empty: a row
   * whose link changes nothing is a row that describes a bug instead of causing
   * one, which is the thing this page exists not to be.
   */
  state: Record<string, StateValue>;
}

/**
 * Not grouped by lab, and not in lab order.
 *
 * Grouping by lab would rebuild the curriculum on the page whose whole purpose
 * is to sidestep it — a reader who knew which lab their bug belonged to would
 * not be here. The order below is by how self-evidently a symptom names itself:
 * the ones somebody would type into a search box first are at the top, and the
 * ones that need the reader to already suspect where the problem is are lower.
 * It is a judgement, not a measurement, and it is the only thing on this page
 * that is.
 */
export const SYMPTOMS: Symptom[] = [
  {
    id: 'flicker-where-surfaces-touch',
    symptom: 'Two flat surfaces flicker and tear into each other where they touch.',
    belief: 'The two surfaces are too close together. I need to push them apart.',
    correction:
      'Depth precision is spent by the near plane, not by the model. At near = 0.02 the smallest gap the buffer can resolve 80 units out is 1.9e-2, and the panels are 0.002 apart. Pull near out to 1 and that gap shrinks fiftyfold, with nothing in the scene touched.',
    lab: 'depth',
    section: 'near',
    state: { near: 0.02, separation: 0.002, distance: 80 },
  },
  {
    id: 'washed-out-after-colour-space-fix',
    symptom: 'I switched to a linear workflow and everything went washed-out and grey.',
    belief: 'sRGB and linear are two spellings of the same numbers, so the conversion is cosmetic.',
    correction:
      'The number 0.5 in an sRGB image is about a fifth of the light. Treating it as half is the whole error, and it moves every midtone in the frame.',
    lab: 'colour',
    section: 'encoding',
    figure: 'grey-test',
    state: { gamma: 1 },
  },
  {
    id: 'lighting-wrong-after-scale',
    symptom: 'My lighting goes wrong the moment I scale the object.',
    belief: 'A normal is a direction, so the model matrix moves it the way it moves the vertices.',
    correction:
      'An uneven scale tilts normals off the surface they belong to. They transform by the inverse-transpose of the upper-left 3x3, which is a different matrix from the one the positions use.',
    lab: 'shading',
    section: 'normals',
    state: { stretch: 0.4, correctNormals: false, showNormals: true },
  },
  {
    id: 'texture-static-in-the-distance',
    symptom: 'My texture turns into shimmering static in the distance.',
    belief: 'The texture is too low-resolution. A bigger one will settle it down.',
    correction:
      'Out there one pixel covers dozens of texels. Point-sampling picks whichever one the pixel centre landed in, so the answer changes every time the camera moves a fraction of a pixel — a bigger texture makes it worse.',
    lab: 'textures',
    section: 'footprint',
    state: { minFilter: 'nearest', repeat: 16 },
  },
  {
    id: 'low-triangle-count-slow-frame',
    symptom: 'My frame rate collapses and my triangle count is tiny.',
    belief: 'The GPU is the bottleneck. I need fewer triangles.',
    correction:
      'Ten thousand cubes are 120,000 triangles whether you draw them in one call or ten thousand. The cost that moved is on the CPU, and it counts calls.',
    lab: 'instancing',
    section: 'loop',
    state: { count: 10000, mode: 'per-object' },
  },
  {
    id: 'object-orbits-the-origin',
    symptom: 'My object orbits the origin instead of spinning where it stands.',
    belief: 'I rotate and then translate, in the order I wrote the two lines.',
    correction:
      'A matrix chain reads right to left, so the last one written is the first one applied. T·R turns the object where it stands; R·T moves it first and then swings the whole thing round the origin.',
    lab: 'transform',
    section: 'order',
    figure: 'order-matters',
    state: { t: 1 },
  },
  {
    id: 'transparent-panes-vanish',
    symptom: 'My transparent panes disappear when I look at them from a different angle.',
    belief: 'Transparency is a blend mode. Switch it on and the hardware handles the rest.',
    correction:
      'With depth writing on, whichever pane draws first stamps the depth buffer and everything behind it is discarded before it can blend. The panes vanish by array order, not by where they are.',
    lab: 'depth',
    section: 'transparency',
    state: { scene: 'blend', depthWrite: true, sorted: false, opacity: 0.55, azimuth: 2.5 },
  },
  {
    id: 'objects-pop-out-near-the-camera',
    symptom: 'Things vanish outright when the camera gets close, instead of fading.',
    belief: 'Near and far are a visibility range, like fog.',
    correction:
      'They are a clip test. A triangle crossing the near plane is sliced flat where it crosses, and one entirely inside it is simply gone — there is no partial credit at either end.',
    lab: 'projection',
    section: 'clipping',
    figure: 'near-plane',
    state: { near: 5.2 },
  },
  {
    id: 'black-screen-no-error',
    symptom: 'My shader gives me a black screen and no error anywhere.',
    belief: 'It compiled, so the problem must be in my geometry or my uniforms.',
    correction:
      'The driver does report it, with a message and a line number. Nothing in WebGL shows it to you unless you ask for the info log, so a compile failure and a working shader that draws black look identical.',
    lab: 'shader',
    section: 'errors',
    state: { preset: 'broken' },
  },
  {
    id: 'far-plane-did-not-help',
    symptom: 'I pulled the far plane in and the z-fighting is still there.',
    belief: 'The depth range is too big. Shrinking it from the far end will buy precision back.',
    correction:
      'Drag the far plane from 400 to 1000 and the smallest resolvable gap moves by 0.008 per cent. It is the control everyone reaches for first and very close to the least effective one available.',
    lab: 'depth',
    section: 'far',
    figure: 'far-plane',
    state: { far: 1000 },
  },
  {
    id: 'specular-highlight-too-big',
    symptom: 'My specular highlight covers half the object and the whole thing looks like plastic.',
    belief: 'The highlight is too strong. I should turn the specular colour down.',
    correction:
      'Strength and size are two different numbers. Brightness is the specular term; size is the exponent, and at a shininess of 4 the highlight spreads across the entire sphere however dim you make it.',
    lab: 'shading',
    section: 'specular',
    figure: 'highlight-width',
    state: { shininess: 4 },
  },
  {
    id: 'texture-blurry-up-close',
    symptom: 'My texture is a smear of blurry squares when the camera is right up against it.',
    belief: 'Linear filtering is the better setting, so it should be on everywhere.',
    correction:
      'Magnification and minification are two different failures. Up close one texel covers many pixels, and linear filtering spends that whole span fading between four texels — nearest keeps the edge instead.',
    lab: 'textures',
    section: 'magnification',
    figure: 'magnification-filter',
    state: { magFilter: 'linear' },
  },
  {
    id: 'visible-mipmap-band',
    symptom: 'There is a visible band across my ground where the texture suddenly changes sharpness.',
    belief: 'Something is wrong with how my mipmaps were generated.',
    correction:
      'That is the handover between two mip levels, and it is exactly where a mip chain shows its seams. Blending across the boundary is what the second “linear” in trilinear buys.',
    lab: 'textures',
    section: 'mipmaps',
    figure: 'mip-handover',
    state: { minFilter: 'linear-mip-nearest' },
  },
  {
    id: 'ground-blurry-at-grazing-angle',
    symptom: 'My ground texture goes soft as soon as I look along it rather than down at it.',
    belief: 'Mipmapping is over-eager and I should bias the level selection.',
    correction:
      'At a shallow angle the pixel footprint is long and thin. One mip level has to cover both axes, so it is chosen for the long one and the short one is blurred far more than it needed to be. That gap is what anisotropic filtering buys back.',
    lab: 'textures',
    section: 'angle',
    figure: 'grazing-angle',
    state: { degrees: 4 },
  },
  {
    id: 'texture-edge-smear',
    symptom: 'The edge of my texture is smeared into long streaks across the surface.',
    belief: 'My UVs are broken outside 0 to 1.',
    correction:
      'The UVs are fine; the wrap mode decides what is out there. Under clamp every coordinate past the edge returns the edge texel, stretched to wherever the coordinate asked.',
    lab: 'textures',
    section: 'wrap',
    figure: 'clamp-smear',
    state: { offset: 1 },
  },
  {
    id: 'faceted-shading',
    symptom: 'My smooth mesh renders as flat facets, or the highlight jumps between vertices.',
    belief: 'The normals in my mesh are wrong.',
    correction:
      'They may be fine. Flat, Gouraud and Phong differ only in where the lighting equation runs — per face, per vertex, per pixel — and a highlight smaller than a triangle exists only in the last one.',
    lab: 'shading',
    section: 'models',
    figure: 'shading-models',
    state: { model: 'flat' },
  },
  {
    id: 'hard-terminator',
    symptom: 'Half my object is pure black and the line between lit and unlit is razor sharp.',
    belief: 'The light is not reaching round far enough.',
    correction:
      'Diffuse is a clamped cosine. It reaches zero at ninety degrees and stays there, so the line is the terminator and with no ambient there is nothing underneath it.',
    lab: 'shading',
    section: 'lambert',
    figure: 'diffuse-cosine',
    state: { lightAzimuth: 2.4 },
  },
  {
    id: 'bright-light-clips-to-white',
    symptom: 'Turning the light up blows my highlights to flat white with no shape left in them.',
    belief: 'Doubling the light value doubles the light.',
    correction:
      'Not on encoded numbers. In the wrong space the error changes sign with intensity: too dark at the low end, clipped to white at the high end, while the same scene done in linear light still has shape in the highlight.',
    lab: 'colour',
    section: 'intensity',
    figure: 'error-changes-sign',
    state: { intensity: 2.6 },
  },
  {
    id: 'muddy-midtones',
    symptom: 'My lighting is dark and muddy through the midtones and I cannot say why.',
    belief: 'Multiplying a texture colour by a light value is multiplying light.',
    correction:
      'Those numbers are sRGB-encoded, so the multiply lands on the encoding rather than on the light, and the error is largest exactly through the midtones where the encoding curve is steepest.',
    lab: 'colour',
    section: 'multiply',
    figure: 'divider',
    state: { split: 1 },
  },
  {
    id: 'edges-of-screen-stretched',
    symptom: 'Objects at the edge of my screen look stretched and wrong, like a fisheye lens.',
    belief: 'Field of view is a zoom control.',
    correction:
      'It is the width of the frustum. Widen it and the same object at the edge is projected across far more screen than the one in the centre — the stretch is the perspective divide doing precisely what it should.',
    lab: 'projection',
    section: 'divide',
    figure: 'field-of-view',
    state: { fov: 110 },
  },
  {
    id: 'nothing-gets-smaller-with-distance',
    symptom: 'Nothing in my scene gets smaller with distance. It looks like a blueprint.',
    belief: 'The projection matrix is what makes distant things small.',
    correction:
      'The matrix only loads the distance into w. The divide by w happens in hardware afterwards, and an orthographic matrix leaves w at 1, so there is nothing there to divide by.',
    lab: 'projection',
    section: 'orthographic',
    figure: 'perspective-divide',
    state: { mode: 'orthographic' },
  },
  {
    id: 'mirrored-mesh-inside-out',
    symptom: 'I mirrored my model and now it renders inside out, or disappears entirely.',
    belief: 'A negative scale is a scale like any other.',
    correction:
      'It is a reflection, and it is the one transform that changes which way a face points. Winding order flips with it, so back-face culling starts throwing away the front.',
    lab: 'transform',
    section: 'scale',
    figure: 'scale-axes',
    state: { sy: -1 },
  },
  {
    id: 'y-axis-upside-down',
    symptom: 'My picture is vertically flipped, or my mouse coordinates are.',
    belief: 'Screen space and clip space disagree about y for some historical reason.',
    correction:
      'They disagree because a window counts rows down from the top and the maths counts up from the bottom. The viewport transform is the one step that performs the flip, and it is the last one.',
    lab: 'pipeline',
    section: 'screen',
    figure: 'ndc-to-screen',
    state: { t: 1 },
  },
  {
    id: 'vertex-lands-somewhere-impossible',
    symptom: 'A vertex lands somewhere impossible and I cannot tell which matrix did it.',
    belief: 'The matrices are one lump. If the picture is wrong, one of them is wrong.',
    correction:
      'They hand over at named boundaries, and the numbers are readable at each one. Clip space is where w stops being 1 — before the divide, after the projection — which is the boundary most bugs sit on.',
    lab: 'pipeline',
    section: 'clip',
    figure: 'view-to-clip',
    state: { t: 1 },
  },
  {
    id: 'translation-in-the-wrong-place',
    symptom:
      'My translation is in the wrong three floats and I cannot tell if my matrices are row- or column-major.',
    belief: 'The layout in memory is the layout it is printed in.',
    correction:
      'Printed as a matrix the translation reads across the bottom row; in memory it is elements 12, 13 and 14, because the four columns are stored end to end. Same sixteen floats, two different pictures of them.',
    lab: 'transform',
    section: 'memory',
    figure: 'memory-layout',
    state: { t: 1 },
  },
  {
    id: 'still-wrong-after-depth-write-off',
    symptom: 'I turned depth writes off and my transparency is still wrong from some angles.',
    belief: 'Depth writing was the problem. That was the fix.',
    correction:
      'That was half of it. Blending is order-dependent, so the translucent surfaces still have to be drawn back to front — and which one is at the back changes every time the camera moves.',
    lab: 'depth',
    section: 'sorting',
    state: { scene: 'blend', sorted: false, opacity: 0.55, azimuth: 2.5 },
  },
  {
    id: 'per-object-uniforms-force-a-bind',
    symptom: 'Instancing did not help, because every object needs its own uniform data.',
    belief: 'Per-object data means a buffer and a bind per object.',
    correction:
      'It means one buffer, one bind group, and a byte offset that moves per draw. The offsets are 256-byte aligned, so the packing is coarser than the data — and it is still one bind.',
    lab: 'instancing',
    section: 'rebinding',
    figure: 'dynamic-offset',
    state: { index: 9 },
  },
  {
    id: 'cpu-cannot-keep-up-with-particles',
    symptom: 'Stepping a hundred thousand particles on the CPU costs more than drawing them.',
    belief: 'The simulation has to run on the CPU because that is where the loop is.',
    correction:
      'A compute shader is a stage that draws nothing and writes memory the GPU already owns. The particles never touch the CPU, which then issues one dispatch and one draw whatever the count is.',
    lab: 'compute',
    section: 'stage',
    state: { count: 100000, pointSize: 0.004, brightness: 0.22 },
  },
  {
    id: 'last-items-in-buffer-never-update',
    symptom: 'The last few items in my buffer never update, or I get garbage past the end of it.',
    belief: 'A dispatch of ceil(n / 64) workgroups runs n invocations.',
    correction:
      'It runs a multiple of 64. Ask for 100,001 particles and the dispatch is 1,563 workgroups covering 100,032 invocations — the 31 extra must return early, or they read and write past the end.',
    lab: 'compute',
    section: 'dispatch',
    state: { count: 100001 },
  },
  {
    id: 'uniform-is-the-same-for-every-pixel',
    symptom: 'I passed a value into my shader and every pixel got the same one.',
    belief: 'A uniform varies per pixel, the way the coordinate does.',
    correction:
      'It does not, which is what uniform means. Every invocation in the draw is handed the identical value; the coordinate is the only thing that differs, and everything per-pixel has to be computed from it.',
    lab: 'shader',
    section: 'uniforms',
    figure: 'knob-sweep',
    state: { knob: 0 },
  },
];

/** The lab a symptom belongs to. Throws rather than rendering a dead link. */
export function symptomLab(symptom: Symptom): Lab {
  const lab = getLab(symptom.lab);
  if (!lab) {
    throw new Error(`symptom "${symptom.id}": no lab "${symptom.lab}"`);
  }
  return lab;
}

/** Where the link lands: the figure if the row names one, the instrument otherwise. */
export function symptomAnchor(symptom: Symptom): string {
  return symptom.figure ?? 'instrument';
}

/**
 * The row's controls as a query string.
 *
 * The rules here are `lib/url-state.ts`'s rules, not a second set: keys sorted
 * so the same row always produces the same link, booleans as `1` and `0`
 * because that is the only form `decodeState` accepts, and the figure's id as a
 * prefix when the state belongs to a figure rather than to the instrument.
 * `encodeState` cannot be called directly — it needs the target's defaults, and
 * those live in client components this module must not import — so the codec is
 * made the arbiter in the test instead: every link built here is decoded with
 * the real defaults and asserted to come back as exactly the state declared.
 */
export function symptomQuery(symptom: Symptom): string {
  const prefix = symptom.figure ? `${symptom.figure}.` : '';
  const params = new URLSearchParams();
  for (const key of Object.keys(symptom.state).sort()) {
    const value = symptom.state[key];
    params.set(prefix + key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return params.toString();
}

/** The link that reproduces the symptom. */
export function symptomReproduceHref(symptom: Symptom): string {
  const lab = symptomLab(symptom);
  return `${stateHref(`/labs/${lab.slug}`, symptomQuery(symptom))}#${symptomAnchor(symptom)}`;
}

/** The link to the paragraph that makes the argument. */
export function symptomExplanationHref(symptom: Symptom): string {
  const lab = symptomLab(symptom);
  return `/labs/${lab.slug}#${symptom.section}`;
}

/** Labs with at least one symptom on the page, in lab order. */
export function symptomLabSlugs(): string[] {
  return [...new Set(SYMPTOMS.map((symptom) => symptom.lab))];
}
