/**
 * A flat search index over everything on the site.
 *
 * Built at module load from the same registries the pages render from, so it
 * cannot drift: a lab, technology, glossary term or resource that exists is
 * findable, and one that does not exist cannot be.
 *
 * The essays are the exception, and the reason is a bundling one. This index is
 * consumed by a client component, so whatever it holds has to survive into the
 * browser as data — and a `node:fs` read cannot. Next gives the client bundle
 * no `fs` fallback (build/webpack-config.js supplies `process` and nothing
 * else), so the import fails the build outright. The 52 essay sections are
 * therefore extracted by `extractEssaySections` below and written into the
 * GENERATED block as a literal, rather than read at request time.
 *
 * That literal is the one thing here that CAN drift, so `extractEssaySections`
 * is exported: a test reads the ten essay files, runs it, and asserts the
 * literal still matches. Without that assertion a stale literal is silent —
 * search would simply stop mentioning a section that had been rewritten.
 *
 * SearchDialog imports this module lazily. The generated block is 67 KB of the
 * 80 KB file, and a reader who never opens search should not carry it.
 */

import { GLOSSARY, termId } from './glossary';
import { LIVE_LABS } from './labs';
import { ALL_RESOURCES } from './resources';
import { TECHNOLOGIES } from './technologies';

export type SearchKind = 'lab' | 'technology' | 'term' | 'resource' | 'page' | 'section';

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  description: string;
  href: string;
  /** Lower-cased haystack, precomputed so filtering stays cheap while typing. */
  haystack: string;
  /** Set for links that leave the site. */
  external?: boolean;
  /** Which page this lives inside, when the title alone does not say. */
  context?: string;
}

const PAGES: { title: string; description: string; href: string }[] = [
  {
    title: 'Labs',
    description: 'Every interactive lab, one idea each.',
    href: '/labs',
  },
  {
    title: 'Technologies',
    description: 'WebGL, WebGPU, Three.js and vgpu compared on one scene.',
    href: '/tech',
  },
  {
    title: 'Symptoms',
    description:
      'What you are seeing, what it usually means, and the lab that reproduces it.',
    href: '/symptoms',
  },
  {
    title: 'Roadmap',
    description:
      'Everything that shipped and why, and the proposals that were turned down.',
    href: '/roadmap',
  },
  {
    title: 'Changelog',
    description: 'What changed on the site and when, newest first, with an Atom feed.',
    href: '/changelog',
  },
  {
    title: 'Privacy',
    description: 'No accounts, no analytics, no cookies. Nothing to collect.',
    href: '/privacy',
  },
  {
    title: 'Which should you use?',
    description:
      'Three questions, a reasoned recommendation, and what the other three would have cost.',
    href: '/tech/choose',
  },
  {
    title: 'Learn',
    description: 'A curated reading path through graphics and game development.',
    href: '/learn',
  },
  {
    title: 'Glossary',
    description: 'The vocabulary, defined in plain language.',
    href: '/glossary',
  },
  { title: 'About', description: 'Why this site exists and how it is built.', href: '/about' },
];

/* ------------------------------------------------------------------------- *
 * Essay sections
 * ------------------------------------------------------------------------- */

export interface EssaySection {
  /** The lab whose page the section is on. */
  slug: string;
  /** The `id` on the rendered `<h2>`, so the result links at the paragraph. */
  id: string;
  heading: string;
  /** Every `<p>` in the section, flattened to words. */
  text: string;
}

/** `[slug, id, heading, text]`. A tuple rather than an object: 52 sections of
 *  four keys each cost 1.1 KB of repeated field names in the bundle. */
export type PackedSection = [slug: string, id: string, heading: string, text: string];

const HEADING = /<ProseHeading id="([^"]+)">([\s\S]*?)<\/ProseHeading>/g;
const PARAGRAPH = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g;

/**
 * The named entities the essays actually use, counted with
 * `grep -o '&[a-z]*;' components/labs/*Essay.tsx | sort | uniq -c`. An entity
 * left undecoded would be indexed as the literal string `&rsquo;`, so a search
 * for a word with an apostrophe in it would silently miss.
 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  deg: '°',
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  middot: '·',
  minus: '−',
  nbsp: ' ',
  ndash: '–',
  plusmn: '±',
  rarr: '→',
  rdquo: '”',
  rsquo: '’',
  times: '×',
};

/** JSX to the words a reader sees. */
function plainText(jsx: string): string {
  return (
    jsx
      // `{' '}` is a deliberate space at a line break, not an expression.
      .replace(/\{\s*'\s*'\s*\}|\{\s*"\s*"\s*\}/g, ' ')
      .replace(/\{[^{}]*\}/g, '')
      // Tags go, the words inside <code>, <em>, <strong> and <a> stay.
      .replace(/<[^>]+>/g, '')
      .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name] ?? whole)
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Pull the linkable sections out of one `components/labs/*Essay.tsx`.
 *
 * A section runs from its own `<ProseHeading>` to the next one, so a figure
 * sitting between two paragraphs is skipped and its caption is not indexed —
 * captions live in the figure components at the top of the file, above the
 * essay body, and belong to no section. Deliberate: an entry has to be able to
 * name the anchor it links to.
 *
 * Pure on purpose. It takes the source as a string rather than a path, so the
 * client bundle carries no filesystem call and a test can hand it the real
 * files.
 */
export function extractEssaySections(source: string, slug: string): EssaySection[] {
  const headings = [...source.matchAll(HEADING)];
  return headings.map((heading, index) => {
    const from = (heading.index ?? 0) + heading[0].length;
    const next = headings[index + 1];
    const to = next ? next.index ?? source.length : source.length;
    const text = [...source.slice(from, to).matchAll(PARAGRAPH)]
      .map((paragraph) => plainText(paragraph[1]))
      .filter(Boolean)
      .join(' ');
    return { slug, id: heading[1], heading: plainText(heading[2]), text };
  });
}

/*
 * Regenerate: for every `app/labs/<slug>/page.tsx`, resolve the
 * `@/components/labs/*Essay` it imports — the page is the wiring, so a lab
 * without an essay contributes nothing and cannot be forgotten either way —
 * read that file and run `extractEssaySections(source, slug)`. Emit one
 * `[slug, id, heading, text]` tuple per section, slugs in directory order.
 */
// --- BEGIN GENERATED: essay sections ---
const ESSAY_SECTIONS: PackedSection[] = [
  ["colour", "encoding", "The number 0.5 is about a fifth of the light", "sRGB spends its 256 codes unevenly, on purpose. Your eye resolves far finer differences in the dark than in the light, so an encoding that spaced its codes evenly across the light would waste most of them at the bright end and band visibly in the shadows. sRGB stores roughly the 1/2.2 power of the light instead, which bunches the codes up where the eye is sensitive. It is a good encoding, and it is not a quantity you can do arithmetic with. The strip along the bottom of the figure is the shortest proof of that. Its left third is alternating rows of black and white — half the pixels emitting nothing and half emitting everything, so half the light. Its middle third is the number 0.5 written straight into the framebuffer. Its right third is half the light, encoded. Step back from the screen until the rows blur into one tone, then compare the three. At gamma 2.2, half the light is the number 0.730, which is code 186 of 255. About three quarters of the available codes are spent below the halfway point of the light. That is the whole reason the encoding exists and the whole reason it is a trap: the midpoint of the numbers and the midpoint of the light are nowhere near each other, so a routine that averages two colours, or halves one, is not doing what its name says. The blurring has to happen in your eye, which sums light. Zoom the page out, or screenshot it and resize the file, and whatever resamples the image will almost certainly average those rows as numbers instead: a black row and a white row become 0.5, the dither collapses onto the middle patch, and the figure appears to prove the opposite of what it shows. Gamma-incorrect image scaling is the same bug as gamma-incorrect lighting, met in a different room. The lab raises to a plain power of gamma rather than using sRGB’s actual piecewise transfer function, which has a short linear segment near black. The two agree closely away from the darkest few codes, and nothing here turns on the difference — the exponent is left on a slider precisely so it stops looking like a constant to memorise."],
  ["colour", "multiply", "Every multiply in the shader is on the wrong quantity", "A diffuse shader has one instruction in it: take the surface’s base colour and multiply it by how much light lands there. The lab’s fragment shader computes that amount once, as uAmbient + uIntensity * max(dot(N, L), 0.0), and both halves of the sphere use the same number from the same normal. What differs is which colour it multiplies. The left half multiplies uBaseColor directly. The right half raises uBaseColor to the power of gamma first, multiplies there, and raises the result back by 1.0 / gamma on the way out. Call that amount of light k, and the base colour c. The left half writes c · k. The right half writes (c^γ · k)^(1/γ), and because a power distributes over a product that is exactly c · k^(1/γ). The colour comes back untouched by the round trip; the entire difference between the two halves is k against k raised to 1/γ. With the lab’s defaults the two are stark. The base colour’s red channel is 0.82, ambient is 0.05, intensity is 1. Where the surface turns away from the light, k is 0.05: the left half writes 0.041 and the right half writes 0.210, five times as much. At the point facing the light squarely, k is 1.05 and they write 0.861 and 0.838 — within three per cent of each other. The error is negligible in the highlight and enormous in the shadow, which is why the uncorrected sphere reads as a high-contrast lighting choice rather than as a broken one."],
  ["colour", "intensity", "Turn the light up and the error changes sign", "Gamma is greater than one, so 1/γ is less than one, and raising a positive number to a power below one pulls it towards 1. Below k = 1 that means k^(1/γ) is larger than k and the corrected half is the brighter of the two. Above k = 1 the inequality reverses. At k = 1 exactly, both halves compute c and the divider has nothing to show. k is ambient + intensity × lambert, so the two halves agree wherever lambert equals (1 − ambient) / intensity. At the default ambient of 0.05 and intensity of 1 that is lambert 0.95, a small cap sitting on the highlight. Raise the intensity and the cap opens out into a ring that sweeps across the sphere. This is why the mistake outlives code review. It is not a constant offset that somebody would flag as too dark; it is the wrong curve applied on the wrong side of the encoding, so it crushes the shadows and blows the highlights at once, and both of those are things a person can deliberately want. Doubling uIntensity only means doubling the light in the space where light adds, and the left half is not in it."],
  ["colour", "control", "Set gamma to 1 and the two halves become the same shader", "The claim so far is that the encoding is the only difference between the halves, and that is worth testing rather than believing. toLinear(c, 1.0) is pow(c, 1.0), which is c; so is toSrgb(c, 1.0). At gamma 1 the corrected branch decodes with an identity, multiplies, and encodes with an identity — it is the uncorrected branch with three more instructions in it. In a real renderer nobody writes those powers by hand at each multiply. A texture authored in sRGB is decoded once, when it is sampled, which is what an sRGB texture format is for and what the sampler hardware does at no cost. Lighting, blending and accumulation all happen in linear space after that. The encode happens once, at the very end, when everything has been added up. Which textures get that decode is a decision, not a default. A base colour map and an emissive map were authored by someone looking at a screen, so they hold encoded colour and have to be decoded. A normal map holds vectors, and a roughness, metalness or occlusion map holds a coefficient; none of those are colours, none of them went through an encoder, and raising them to the power 2.2 bends the numbers into nonsense — a normal-map texel of 0.5, which stands for a component of zero, comes back as 0.218 and stands for −0.56 instead. Marking a whole texture set sRGB because most of it looks like an image is a second version of the same mistake, running in the opposite direction. Encoding before the end costs you a second bug on top of the first. Encode before you interpolate and the interpolation is wrong too, which is exactly what Gouraud shading would do — so in Light & Normals the vertex stage returns linear light, the varying carries linear light, and the fragment stage raises it by 1/2.2 at the last possible moment. That lab, and every other one on this site, was written the wrong way round first; this is the lab that corrected them."],
  ["colour", "instrument", "Now move all of it at once", "Below is the instrument, carrying every control the figures above were pinning down: the divider, the exponent, the intensity and ambient terms of the light, a toggle that corrects both halves so the divider disappears, the grey test, and a camera you can drag. The readout keeps the two numbers the whole lab rests on — what the number 0.5 is worth in light, and what half the light is worth as a number — recomputed at whatever gamma you have left the slider on."],
  ["compute", "stage", "The GPU has a stage that draws nothing", "The entry point carries the attribute @compute @workgroup_size(64) and takes one argument, @builtin(global_invocation_id). That argument is an index, and it is the only input: there is no vertex to place and no pixel to colour. Invocation i loads particles[i], works out a force towards the attractor, advances a velocity and a position, and writes the particle back. The force is a softened inverse square with a tangential term added — (dir + tangent * swirl) * attraction / (dist * dist + 0.08) — where the tangent is what turns a collapse into an orbit and the + 0.08 is what stops the pull going to infinity when a particle crosses the centre. WebGL has no such stage. Not a slow one, not a restricted one — the concept is absent from the API. The way this was done for a decade is to put the state where a fragment shader can write: encode positions into a floating-point texture, draw a full-screen quad so that one fragment lands on each texel, step the simulation there, and write into a second texture bound to a framebuffer. The two textures swap roles every frame, because a shader cannot read the texture it is writing to. The result is then sampled again by a vertex shader to get the positions back as geometry. The workaround also decides where a result is allowed to go. A fragment shader writes to the pixel it was rasterised at and nowhere else, so every algorithm has to be phrased as a gather: each output asks which inputs it needs. A compute invocation writes wherever it likes in the buffer. This lab does not use that freedom — each invocation writes back to the slot it read from — but it is the freedom a sort, a spatial hash or a collision grid is built on, and it is why the stage exists at all rather than as a faster way of doing what the fragment stage already did."],
  ["compute", "storage", "The particles live in memory the GPU owns", "A Particle here is four floats — pos: vec2f and vel: vec2f — so sixteen bytes. The buffer holding them is created once, at the largest size the lab will ever need: 120,000 particles, 1,920,000 bytes. The count slider allocates nothing. It changes how much of that allocation is stepped and how much of it is drawn. Two declarations point at the one buffer. var<storage, read_write> particles is what the compute stage sees; var<storage, read> readParticles is what the vertex stage sees. Same memory, two access modes, and the read-only one is not a courtesy: WebGPU does not permit a writable storage buffer in the vertex stage at all, so that binding has to be declared read-only-storage. A uniform buffer cannot stand in for either of them — uniforms are read-only to the shader and sized for a handful of values, which is exactly the job the lab’s other binding does. Because the buffer outlives the frame, it also outlives what is on screen. Particles beyond the count are neither stepped nor drawn, and they keep whatever values they last held. Drag the particle slider up in the instrument below and they rejoin from wherever they were left; on a freshly seeded field that is a ring appearing at the outer edge, because the seed walks outward as the index rises. Nothing was recomputed to bring them back. They were in memory the whole time. The one moment per-particle data crosses from the CPU is Reseed, which uploads the whole 1.92-megabyte seed array in a single write. It happens when you press a button, not sixty times a second."],
  ["compute", "dispatch", "A dispatch counts workgroups, not particles", "The call that starts the compute pass is dispatchWorkgroups(Math.ceil(count / 64)). It does not take a number of particles. It takes a number of workgroups, and the workgroup size — 64 here — is fixed in the shader at compile time, so the two have to be reconciled by rounding up. A hundred thousand particles divided by sixty-four is 1,562.5, which becomes 1,563 workgroups and 100,032 invocations: thirty-two more than there are particles. The first line of the shader body is if (i >= u32(params.count)) &#123; return; &#125;. Every compute entry point written against a count that is not a multiple of the workgroup size has that line, or has a bug — here the extra thirty-two would step particles that are not being drawn, and at the top of the slider, where 120,000 divides by 64 exactly, none of them return at all. Sixty-four is a choice, and this shader gives no algorithmic reason for it. The invocations of a workgroup are scheduled together and can share a var<workgroup> block of fast memory; nothing here talks to a neighbour, so the size is picked to sit well on the hardware rather than to fit the problem. The number of workgroups, by contrast, is a runtime argument with room to spare: no WebGPU implementation may report a limit below 65,535 per dimension, so a single dispatch of 64-wide groups covers four million particles. The largest dispatch this lab ever issues is 1,875."],
  ["compute", "readback", "The vertex stage reads the buffer the compute pass wrote", "The render pipeline declares no vertex buffers at all, and the vertex shader takes no attributes — its only input is @builtin(vertex_index). The draw call is draw(count * 6), which at a hundred thousand particles is 600,000 vertices and 200,000 triangles, not one of which is stored anywhere. vertex_index / 6u selects the particle out of the storage buffer and vertex_index % 6u selects a corner from a six-element array of offsets: two triangles making a square. The offset is scaled by the size control, and its x is divided by the canvas aspect so the sprite stays square on a wide canvas rather than stretching with it. The square becomes a disc in the fragment shader, which carries the corner offset through as a uv and runs if (r > 1.0) &#123; discard; &#125; — the four corners are rasterised and thrown away. The colour is the particle’s speed mapped between a cool blue and a warm orange, which is the only reason the structure of the field is legible at all: velocity is otherwise invisible in a still frame. Count what left the CPU while that happened. Forty-eight bytes: eleven floats — the attractor’s two coordinates, the six control values, the frame’s timestep, the canvas aspect and a flag for the theme — padded to a multiple of sixteen, because a uniform block has to be. One compute pass, one render pass, one dispatch, one draw. Move the particle slider from 5,000 to 100,000 and that list is unchanged; a single number inside the block is different. The GPU does twenty times the work and the CPU never notices, which is what it means to say the data lives on the GPU. That is a claim about the CPU, not about the GPU, and it generalises past particles. The next lab takes the same measurement from the other direction — Draw Calls & Instancing draws one mesh ten thousand times and shows the cost sitting in the number of calls rather than the number of triangles."],
  ["compute", "instrument", "Now run all of it at once", "Below is the whole thing: six sliders, a running toggle and a reseed button, with a readout that turns the particle count into workgroups and invocations as you drag it. Move the pointer over the canvas to take hold of the attractor; leave the canvas and it goes back to drifting on its own. The presets are the fastest way in — one of them switches the swirl off so the field collapses into a single dot, which is worth seeing once, because it is the tangential term rather than the pull that makes the shape. If the browser has no WebGPU, the canvas will say so and stop. There is no fallback, and that is the honest position: the other labs here run on WebGL because their mathematics does not care which API draws it. This one is a stage WebGL does not have."],
  ["depth", "near", "The near plane spends the buffer", "Perspective does not store distance. After the divide, the value written for a surface d units away is f(d − n) / (d(f − n)) — hyperbolic in d, not linear. Half of the buffer’s entire range is gone by the time that expression reaches 0.5, which happens at d = 2nf/(f + n). With a near plane of 0.02 and a far plane of 200, half of every value the buffer can hold is spent between 0.02 and 0.04 units in front of the camera. Everything from there to the far plane shares the rest. The two panels below are two thousandths of a unit apart, eighty units away. Whether the buffer can tell them apart is arithmetic rather than luck, and the readout does it: a 24-bit buffer resolves about z²(f − n) / (n·f·2²⁴) at distance z. Move the near plane and watch the prediction and the picture change together. Nothing about the geometry changed. The panels are the same size, the same distance away, the same two thousandths apart; two entries of the projection matrix changed and the failure went with them. Pushing the near plane from 0.02 out to 1 buys a factor of fifty — 1.9 × 10&#8315;&sup2; down to 3.8 × 10&#8315;&#8308; — because the resolvable gap is inversely proportional to n and to almost nothing else. Distance is the other half of it, and it is quadratic. Those same panels in that same frustum need 1.2 × 10&#8315;&sup3; of separation to be safe at twenty units, 4.8 × 10&#8315;&sup3; at forty and 1.9 × 10&#8315;&sup2; at eighty. Doubling how far away something is quadruples the gap you have to leave inside it, which is why coplanar decals — a poster on a wall, a tyre mark on a road — sit still under the camera and shimmer at the end of the street."],
  ["depth", "far", "The far plane is the control that does nothing", "Write the prediction as z²/(n·2²⁴) × (1 − n/f) and the far plane’s entire contribution is that second factor. With a near plane of 0.05, dragging f from 10 to 1000 moves it from 0.995 to 0.99995. It is nevertheless the first control most people reach for, and close to the least effective one on offer. It is also the one with a hard floor: in the instrument below the far slider goes down to 10, and taking it under the panels’ own eighty units does not dim them or fade them out — they disappear. Near and far are a clip rather than a falloff, which is what Projection & the Frustum is about. The flicker deserves a moment on its own. Below the threshold, which of two surfaces wins a given pixel is settled by rounding, and rounding changes when the camera moves. That is why z-fighting in a real scene is not a fixed pattern sitting on a wall; it is a shimmer that follows you around the room."],
  ["depth", "transparency", "The buffer answers what is nearest; transparency asks what is behind", "Switch scenes. Three translucent panes, three units apart, drawn with premultiplied over: the fragment shader emits vec4(colour * opacity, opacity) and the blend function is ONE, ONE_MINUS_SRC_ALPHA. Read that literally and it says the result is this pane’s contribution plus whatever was already in the framebuffer, faded by how opaque this pane is. It requires that what is behind the pane has already been drawn. The depth buffer’s whole job is to stop what is behind from being drawn. The two requirements are in direct opposition, and the switch that decides between them is depth writing. Depth testing stays on the entire time: translucent geometry still has to be hidden by the opaque geometry in front of it. Only the write comes off. A pane that tests but does not write is still occluded by anything nearer that has already claimed the pixel, and hides nothing drawn after it — which is what you wanted, and also why there is now nothing left to put the three of them in order."],
  ["depth", "sorting", "Sorting is the half you have to do yourself", "Over is not commutative. Red over green is a different colour from green over red, so the panes have to arrive back to front, and no piece of render state arranges that. The lab sorts them on the CPU, every frame, from where the camera is at that moment. That the sort is per camera is not a detail. From the viewpoint the lab opens at, the camera sits at about z = +14.7 and the array order — red, green, blue — is already back to front; all four combinations of the two switches render the same pixels there, and both bugs stay invisible until you drag the panes round. Come at them from the other side and the identical array is front to back, and both failures appear at once. That also answers the optimisation everyone proposes. The order cannot be computed once and stored with the model, because it is not a property of the model. It changes when the camera moves, so it is redone every frame, on the CPU, for as long as the scene contains anything translucent. That is the real cost of transparency, and it is paid in draw-call ordering rather than in shading. One thing worth checking in the instrument, once you have dragged the panes round: sort them correctly and then turn depth writing back on, and the pixels do not change. In back-to-front order every pane is nearer than everything already in the buffer, so nothing is ever rejected. Depth writing only bites when the order is already wrong — another way of saying that the sort is the load-bearing half."],
  ["depth", "instrument", "Both failures, with every control", "Below is the instrument the figures were cut from. The segmented control picks which failure you are looking at. Z-fighting gets the frustum — near, far, distance, and the separation between the panels — with the prediction computed live beside the picture. Transparency gets the two switches and an opacity slider. The presets are the quickest way in: three of them are the frustum arguments above, already dialled in. One case the arithmetic above does not cover. Take the separation to exactly zero and the panels stop fighting rather than start: identical geometry produces identical depth, the test is LEQUAL, and the panel drawn second passes and wins every pixel cleanly. It is the one setting where a smaller gap is more stable than a larger one, and the readout calls it out rather than predicting a fight."],
  ["instancing", "loop", "The two modes differ by a loop", "Inside the render pass, the instanced mode records four commands. Set the pipeline. Bind the scene — the camera matrix and the storage buffer holding every cube’s position, tint and scale. Point the per-object binding at object zero. Then draw thirty-six vertices, ten thousand times over, in one call. The per-object mode records the first two and turns the last two into a loop: point the binding at object i, draw thirty-six vertices once, go round again. Nothing else moves — the same shader module, the same pipeline object, the same instance buffer, the same back-face culling and the same depth test. Both lists hand the GPU the same work: 360,000 vertex shader invocations and 120,000 triangles, shaded by the same twelve lines of WGSL. What differs is how long the CPU spent writing the list down. The geometry is deliberately negligible, and that is what makes the measurement mean anything. No vertex buffer is bound at all: each cube is thirty-six vertices assembled inside the shader from @builtin(vertex_index) — six faces of six vertices, two triangles apiece — and the per-cube data is a 32-byte record of position, phase, tint and scale, read out of one storage buffer that is bound once a frame in both modes. Nothing on the GPU side is heavy enough to hide what the CPU is doing."],
  ["instancing", "counting", "The counting moves from one side of an addition to the other", "The vertex shader reads its per-cube data on a single line: let inst = instances[instanceIndex + objectRef.index];. Both terms exist in both modes, and exactly one of them is ever non-zero. instanceIndex is @builtin(instance_index), which the hardware supplies: ask for ten thousand instances and it counts from zero to 9,999 on its own, with the CPU no longer involved once the call is made. objectRef.index is a four-byte integer in a uniform buffer, which the CPU supplies by rebinding. So instancing is not a fast path bolted onto the side of the API. It is the loop counter moved from the CPU’s side of the boundary to the GPU’s, and the boundary is the expensive part."],
  ["instancing", "rebinding", "The cost is the rebinding, not the draw", "Look again at what the loop does per cube. It issues two commands, not one, and the draw is the cheaper of them. The per-object binding carries a single unsigned integer — which cube this call is about. Rather than write that integer into a buffer ten thousand times a frame, the lab writes all ten thousand of them once at start-up and selects one with a dynamic offset: setBindGroup(1, objectBind, [i * align]). That third argument is a byte offset, and it has to be a multiple of the alignment the device reports through device.limits.minUniformBufferOffsetAlignment. Most report 256, which is the WebGPU default, so a four-byte number occupies a 256-byte slot. The per-object path is therefore already the cheapest per-object change that can be expressed. No new pipeline, no new vertex buffer, no upload, no texture — one integer, selected by arithmetic on an offset. And it still costs, because every setBindGroup has to be checked and written into the command buffer: is the offset inside the buffer, is it aligned, does the binding fit. Every draw has to be checked and written too. Do that twenty thousand times and the list becomes the work. On the machine this was written on, ten thousand cubes encode in 0.10 ms as one call and 1.38 ms as ten thousand — about fourteen times, which works out at roughly 130 nanoseconds per cube for a rebind and a draw. Your figure will be different; browsers, drivers and processors all disagree, and the number in the readout is measured on your hardware rather than stored here. Because the per-object step has been made as small as it can be, that ratio is a floor rather than a ceiling. A real renderer changes a material bind group between objects, frequently a vertex buffer, and sometimes the pipeline itself — a switch this lab never once asks for."],
  ["instancing", "ratio", "Read the ratio, not the millisecond", "The CPU figure is bracketed narrowly and deliberately. The timer starts before the command encoder is created and stops immediately after queue.submit, so it covers building the render pass, recording every command in it, and handing the finished buffer to the driver. It contains no GPU work at all: submit posts a list and returns without waiting for anything to be drawn. This is why the frame rate can sit perfectly still while the CPU figure moves fourteenfold, and the honest thing is to expect that rather than hide it. Ten thousand cubes is a small scene on a current machine, those milliseconds are coming out of a budget nothing else here is competing for, and the frame-rate readout is a smoothed average of requestAnimationFrame deltas that are clamped at fifty milliseconds — so it cannot report below twenty even when the truth is worse. Both readings are exponential averages weighted a tenth towards the newest frame, which is why they slide to a new value over a few dozen frames instead of jumping when you switch modes. None of this transfers to a WebGL reading, which is why the lab refuses to fall back to one when WebGPU is missing. The two APIs do not charge the same price for a draw call; running the comparison on WebGL would answer a different question and print the answer under this question’s label. The number that never moves is the triangle count: 120,000 in both modes, and the readout says so while the millisecond figure changes by an order of magnitude. That is the thing to carry out of here. A scene’s cost is not read off its polygon budget — Compute & Particles puts its entire particle field on screen with one draw and no instance count at all, multiplying the vertex count instead. Batching, merged materials, texture atlases and instanced foliage all exist to shorten the list, not to shrink the geometry."],
  ["instancing", "instrument", "Now move all of it at once", "Below is the instrument with every control exposed: the count from one cube to ten thousand, the mode, the size and spin of the cubes, and whether they animate. Size and spin are two floats in an eighty-byte uniform buffer written once a frame — they change the picture and cannot change the encoding cost, and they are there so the field stays readable while you move the count. Raising the count grows the spiral outward rather than reshuffling it, so the arrangement you were looking at stays where it was. Drag the canvas to orbit. Start with the presets. The first two set up the comparison this essay has been describing and ask you to change exactly one thing between them; the third finds the count at which a thousand separate calls is already a measurable slice of a frame."],
  ["pipeline", "handover", "Each matrix hands the vertex to the next", "Three matrices do the work, and each exists to take coordinates in the space the previous one produced and hand back coordinates in the next. Only the first is usually yours to write. The model matrix here is a 28° turn about y followed by a move to (0.55, 0.30, −1.00), and it is the only step in the chain most programs author by hand; that matrix on its own is The Model Matrix. What follows it is the camera, and the camera is not in the scene. A view matrix is the inverse of where the camera is standing. The hardware has no notion of a camera at all, only of geometry, so “put the eye at (0, 0.9, 3) looking at (0, 0, −0.8)” is implemented by moving everything else the other way. Watch the x column across those two rows: 1.23 in world space, 1.23 in view space. This camera stands on the plane x = 0 and its right-hand axis is the world’s x axis, so that coordinate passes through untouched. Through all three rows so far, w is still 1. Both matrices are a rotation and a translation; distances and angles survive them, and the cube is still a cube of side 1 that happens to be somewhere else."],
  ["pipeline", "clip", "w stops being 1 at clip space", "The projection matrix is the first one that is not a rigid move, and the entry responsible is m[11], which is −1. It is the only entry anywhere in the chain that makes w depend on the vertex at all, and what it puts there is the negated view-space z: the vertex’s distance in front of the eye. The vertex leaves view space at (1.23, 0.78, −3.71, 1.00) and arrives in clip space at (1.85, 1.88, 3.27, 3.71). Read the last number of that row against the third number of the row above it. w is 3.71; view z was −3.71. Nothing has divided anything. The projection has only arranged for a later step to be possible, and parked the number that step will need where it cannot be lost. This is also, as the name says, where clipping happens — against each vertex’s own w rather than against the ±1 cube, which does not exist yet. Two of this cube’s eight corners fail that test, coming out a little past the far plane at 4.5. The lab transforms geometry and does not clip it, so it draws them anyway — a real rasteriser would have cut those triangles here, before the divide, not after."],
  ["pipeline", "divide", "No matrix performs the divide", "Between clip space and NDC there is a step that no matrix in the chain performs. The hardware does it, once per vertex, after your vertex shader has returned. A matrix applies the same linear map to every vertex it touches. Division by a number that differs from vertex to vertex is not that, and the difference is the entire reason distant things come out small. The fourth coordinate exists so that the projection can compute the divisor without performing the division: the matrix parks it in w, and the division happens later, at one fixed point in the pipeline, for everything at once. That deferral is why gl_Position is a vec4: what a vertex shader writes is in clip space, and nothing it can write ever sees the result of the divide. In the readout, the w column goes blank at the NDC row, because once the division has happened there is nothing left to carry. Under an orthographic projection m[11] is zero, so the step runs with nothing left to do — the difference between a volume that converges and one that does not, which is Projection & the Frustum."],
  ["pipeline", "screen", "The viewport transform is the least mysterious step", "The last step is two lines of arithmetic, and the lab performs precisely these: x = ((ndc.x + 1) / 2) * width y = ((1 − ndc.y) / 2) * height The + 1 and the halving map −1…1 onto 0…1; the multiplication scales that to the viewport. The only part worth committing to memory is the subtraction in the second line. NDC counts upwards from the bottom and a window counts downwards from the top, so y is flipped, and when a coordinate you computed lands mirrored vertically on screen, this is the line that did it. Our vertex sits at NDC (0.50, 0.50) and lands on pixel (719, 149): three-quarters of the way across, and a quarter of the way down rather than a quarter of the way up. The z and w columns of that row are blank. Depth has not been discarded — it goes to the depth buffer, and what happens to it there is Depth & Transparency."],
  ["pipeline", "instrument", "Now step through all six", "Everything above is one handover at a time. Below is the whole chain: six stages to walk with Back and Next, the vertex’s coordinates in all six spaces at once so you can read any row against any other, a ground grid you can switch off once it stops meaning anything, and a scene you can orbit — worth doing in clip space, where one viewpoint is not enough to see that the shape is still a pyramid. The four presets each jump to a stage and say what to look at once you are there."],
  ["projection", "frustum", "The frustum is an object, not a setting", "The wireframe in the outside view is not a drawing of the field of view. It is built the other way round: take the eight corners of the clip cube, the points (±1, ±1, ±1), and push them backwards through the inverse of the projection and view matrices. Wherever those eight corners land is the region that survives, so the wireframe cannot disagree with the clipping — it is the clipping, drawn. Move the slider and watch the shape rather than the boxes. The four faint lines converging outside the near rectangle are the eye rays, and where they meet is the camera. A frustum is a pyramid with its tip cut off, and the tip is cut off at exactly the near plane; the rays show you the apex the volume would have had. In perspective they lie along the frustum’s own side edges, because those edges pass through the eye. Field of view sets the angle of that pyramid and nothing else. Widening it fits more of the world into the same rectangle of pixels, which is the same statement as everything in the picture getting smaller. Narrowing it crops, and it crops the near boxes first: an object close to the camera covers a much wider angle than the same object further off, so the near ones are the first to fall outside a narrow cone. The angle the slider sets is the vertical one. The horizontal opening is that same angle stretched by the aspect ratio, held at 16:10 throughout this lab because the shape of the picture is not the thing under study. In the projection matrix printed further down the page it is the difference between the first entry, 1.340, and the second, 2.145 — one number, divided by 1.6 in x."],
  ["projection", "clipping", "Near and far are a test, not a fade", "The clip test has no falloff in it and no distance term. A point in clip space is kept when each of x, y and z lies between −w and +w: six comparisons and a boolean. The outside view runs those same six comparisons on the CPU, once per box, which is why a box the camera is about to lose goes dim in the world panel before it vanishes from the picture. Near is the plane people set to 0.01 without thinking, and it is the most expensive number in the projection. Depth is not spread evenly across the volume: at the default near of 1.5 and far of 11, half of the depth buffer’s range is used up by 2.6 units out, and dropping near to 0.1 pulls that halfway mark in to 0.2. What the rest of the scene is left to share, and what happens to two surfaces sharing too little of it, is Depth & Transparency — where the fix is this plane and not anything in the model. The far plane is the cheap one by comparison; it is already doing work you can see, since two of the six boxes are missing from the picture before you touch anything. They stand 12.8 and 15.8 units out, and far is 11. The lab will not let near reach far — the handler pushes whichever plane you are not dragging half a unit out of the way — because at near === far the projection divides by zero and the scene goes with it. Near cannot be zero either, for a quieter reason: at near = 0 every depth in the scene maps to the same value, and the depth buffer stops being able to tell anything from anything."],
  ["projection", "divide", "w carries the distance, and the hardware divides by it", "Open the vertex shader in the source panel at the foot of the lab. It ends with gl_Position = uViewProjection * uModel * vec4(aPosition, 1.0) and there is no division in it anywhere. What comes out is clip space — four numbers, w among them, and the perspective not yet applied. The bottom row of the perspective matrix reads 0 0 −1 0. Dot that row with (x, y, z, 1) and it computes −z: w comes out as the distance the point stands in front of the camera, measured along the camera’s forward axis. Then, between the vertex shader and the rasteriser, the hardware divides x, y and z by w. Dividing by the distance is the whole of perspective. The rest of the matrix is framing. Nothing in the upper three rows could have done that, and no matrix anywhere in the chain performs the division. The matrix’s whole contribution is to have the right number waiting in w when the hardware arrives. Where that step sits between the others — clip space, the divide, normalised device coordinates, then the viewport transform that turns ±1 into pixels — is walked a vertex at a time in Coordinate Spaces."],
  ["projection", "orthographic", "Orthographic deletes the distance", "The orthographic matrix keeps the identity’s bottom row, 0 0 0 1, so w comes out as 1 for every vertex and the divide divides by one. Nothing shrinks with distance because nothing consults the distance. The volume changes shape to match: with nothing converging, the near rectangle and the far rectangle are the same size, and what is left is not a frustum at all but a box. Losing the divide costs the picture its depth cue and buys back a guarantee: parallel edges stay parallel, and a measurement taken on screen means the same thing wherever on screen it is taken. That is worth more than realism to a CAD drawing, to an isometric game that wants a tile at the back of the board to match a tile at the front, and to a shadow map for a directional light, which has no position for anything to converge on. For a camera it looks wrong, and the reason it looks wrong sits in the bottom row."],
  ["projection", "instrument", "Now move all of it at once", "Each figure above moved one control. Below, the camera has all of them live — both modes, the angle or the height, both planes, and the frustum drawn or hidden — with the projection matrix printed beside it to three decimals. Drag the top canvas to orbit: the picture underneath does not change while you do, because orbiting moves the viewpoint you are watching from and not the camera being studied. Each preset lands on a state worth looking at, and says what to look at once it does."],
  ["shader", "function", "The whole picture is one function, run once per pixel", "A fragment shader is a function. Its inputs are a coordinate and a few values you supply; its output is four floats written to gl_FragColor — red, green, blue and alpha. It runs once for every pixel that gets drawn, and each run knows nothing about any other: it cannot read a neighbour’s colour and has no way to loop over the image. Everything it produces comes from the coordinate it was handed. The starter is that comparison and little else. length(p) - 0.55 is negative inside the circle and positive outside, and smoothstep(-0.02, 0.02, d) turns the sign into a 0 or a 1 with a ramp four hundredths of a unit wide — the entire antialiasing of that edge. Swap it for step and the edge becomes a staircase of pixels. The independence buys the speed: calls that cannot see each other may run in any order, so the hardware runs thousands at once. The canvas below is 768 CSS pixels across in a full-width window and the lab clamps the device-pixel ratio at two, so on a retina screen it is 1536 by 864 device pixels — 1,327,104 invocations of your function per frame, close to eighty million a second. You never write that loop; writing its body is the whole job."],
  ["shader", "triangle", "There is no geometry — three vertices, and none of them are the picture", "A fragment shader has to be run over something, and in every earlier lab that something was a model — vertices, a buffer, a matrix, a camera. Here the vertex buffer holds six floats. The corners are (-1, -1), (3, -1) and (-1, 3) — one triangle, twice the width and twice the height of the screen, drawn by a single gl.drawArrays(gl.TRIANGLES, 0, 3). A quad would do the same job with two triangles and a seam through the middle of the picture, and the 2×2 pixel blocks that seam crosses get shaded for both of them. One oversized triangle has no interior edge: one primitive, three vertices, twenty-four bytes of buffer. It is the standard shape of full-screen work — post-processing, tone mapping, a blur — where the geometry is a formality. The vertex shader is six lines and never changes. It writes gl_Position straight from the attribute, because the attribute is already in clip space: no model matrix, no view, no projection. Nothing from The Model Matrix applies here, because there is no model to place. Its other statement is vUv = aPosition * 0.5 + 0.5, which turns those −1…1 corners into the 0…1 the fragment stage reads."],
  ["shader", "uniforms", "Uniforms are the arguments, and every invocation is handed the same ones", "Four names are declared above your code and exist whether you use them or not. vUv is a varying: interpolated across the triangle and different in every invocation, the only input that changes from pixel to pixel. uTime, uResolution and uKnob are uniforms — one value each, set before the draw call and identical in all 1,327,104 invocations that follow. Which things vary and which do not is most of the vocabulary. uResolution is the canvas in device pixels rather than CSS pixels, and it matters the moment you care about shape. A distance measured in vUv is stretched, because the canvas is wider than it is tall; p.x *= uResolution.x / uResolution.y undoes that, and without the line the disc arrives as an ellipse 1.78 times as wide as it is high. uKnob is a float between 0 and 2 wired to nothing in particular: multiply something by it and you have a slider onto whatever number you were about to hard-code. The rings preset spends it on ring frequency, 14.0 + uKnob * 30.0. At the top of its range the bright part of each ring is about seven tenths of a pixel wide on this canvas — narrower than the thing sampling it — so what you see is not rings but the noise of sampling them too rarely, which is Textures & Sampling arriving from the other side. uTime is seconds since the canvas started, and animation is nothing more than a term in an expression. No state carries from one frame to the next, because there is nowhere to put it: a fragment shader cannot remember. When you need it to — a particle whose position now depends on where it was last frame — you need a buffer and a different kind of shader, which is Compute & Particles."],
  ["shader", "errors", "The compiler tells you what is wrong, once something shows you", "Break it and see; the fourth preset breaks it for you, with a vec3 assigned to a vec4 and a missing semicolon. Three things then happen that would not happen in an ordinary project. The last program that linked stays bound, so your picture survives the typo. The driver’s log is printed verbatim. And the line number is put back where you can use it. The wording comes from your graphics driver and differs between machines, which is worth knowing before you paste a message into a search engine. The shapes do not differ. Nearly everything you will hit is one of three things: a missing semicolon, which the compiler cannot notice until it has read the next statement, so it names the line after the one you must change; a type that will not convert, because GLSL will not turn a vec3 into a vec4 for you; and a name that does not exist, usually a swizzle with a letter that is not in the vector. The messages will also name things you did not write. This is GLSL ES 1.00, the dialect WebGL 1 speaks: attribute, varying, and a colour assigned to gl_FragColor. WebGL 2 spells the same ideas as in, out and an output you declare; the WebGPU labs are in WGSL. The ideas carry across, the keywords do not."],
  ["shader", "instrument", "Now type into it", "The instrument below holds nothing still: four presets, the knob, the compiler’s output, and a text area that rebuilds the program on the next frame after every keystroke. It answers every question at once, which is why it cannot isolate a single one. Start by changing a number. The 0.55 is the radius; make it 0.2 and the disc shrinks, make it 2.0 and it swallows the frame. Then delete a semicolon on purpose, so that the first time the panel turns red it is because you meant it to. Switching preset replaces what is in the editor, so copy anything you want to keep first; the share link carries the preset and the knob but not your source. The shader is thirteen lines, the compiler answers within a frame, and a wrong guess costs you the time it takes to read one sentence. That loop — type, look, read the error, type again — is what writing shaders consists of, and it is why the ones you find in the wild are usually short."],
  ["shading", "lambert", "Diffuse brightness is a cosine", "The diffuse term is one line of the shader: float lambert = max(dot(N, L), 0.0);. Both vectors are unit length, so their dot product is the cosine of the angle between them. A patch of surface facing the light square on gets 1. Tipped sixty degrees away it gets exactly a half. Past ninety degrees the cosine turns negative, which would have the light subtracting brightness from a surface it cannot reach; the max is what stops that, and it is why the far side of the sphere is unlit rather than negatively lit. That black is what the ambient term exists to prevent. It is a constant — uAmbient defaults to 0.12 in the instrument below — added to the cosine before the base colour multiplies through, so the shadowed side comes out a dark version of the material rather than a grey one. It is not a model of anything. Light arriving off the floor and the walls is real, and a single constant is what stands in for it here — which is why raising it washes out the difference between the lit and unlit sides until the sphere stops reading as round. The light is a direction and not a place: uLightDir is normalised once and used unchanged at every point on the surface, so there is no distance to the lamp and no falloff — a sun rather than a bulb, and the sphere would receive the same light a mile away. What the cosine scales is an amount of light rather than a number to be written down: the shader decodes the base colour, multiplies there, and encodes the result on the way out, which is why halving the light does not halve the number that reaches the framebuffer. That round trip is the subject of Colour & Gamma."],
  ["shading", "specular", "The highlight belongs to the eye", "Nothing in the diffuse term mentions where you are standing. Orbit the camera in the instrument below and the diffuse shading does not move at all; it is painted onto the surface. The specular term is the opposite kind of thing, and it is two lines: vec3 H = normalize(L + V); and then pow(max(dot(N, H), 0.0), uShininess). H is the halfway vector, the direction sitting exactly between the light and the eye. It is the normal a mirror would need in order to send this light into this eye, so the surface is brightest where its own normal matches H and falls off as it departs from it. Move the camera and H moves, and the highlight slides across the surface after it. The older formulation reflects L about N and compares the result against V; Blinn’s halfway vector costs less and the lab uses it. The exponent is a width control. At a shininess of 32 the term has already halved by the time the normal is twelve degrees away from the halfway vector; at 120 it takes six degrees to lose the same half. The term is added as vec3(uSpecular * spec) — white, outside the multiplication by the base colour — so the highlight carries the colour of the light rather than of the surface. That is right for plastic and wrong for gold. It is also gated on the diffuse term, lambert > 0.0, so a face turned away from the light cannot glint at a camera it happens to be facing."],
  ["shading", "models", "The three models differ only in where the equation runs", "Flat, Gouraud and Phong are not three lighting equations. They are one equation, and what differs is the stage of the pipeline it runs in and what the stage before it hands over. Gouraud runs the lighting in the vertex shader and passes the resulting colour along as a varying, so the hardware interpolates a colour across each triangle. The smooth sphere here carries 2,665 vertices, so the lighting runs 2,665 times a frame however large the sphere is on screen. Phong interpolates the normal instead and runs the lighting in the fragment shader, once per fragment the sphere covers — a cost that grows with the size of the sphere on screen and ignores the mesh entirely. Flat is not a third program in this lab. It is the per-fragment shader handed a different mesh: flatShaded() rebuilds the sphere so that all three corners of every triangle carry the same face normal, and interpolating three identical normals returns that normal. The faceted mesh is deliberately coarser as well — 952 triangles against the smooth one’s 4,992 — because facets too small to see teach nothing. The exponent in that figure is 120, which puts the half-brightness point of the highlight about six degrees from its centre while the sphere’s triangles are around five degrees across. A mesh this dense does not lose the highlight — some vertex nearly always lands close enough to catch it — but a straight line between three samples cannot reconstruct a cosine raised to the 120th, and what it draws instead has flat sides. Sweep the light in the instrument below with Gouraud selected and the peak of the highlight pulses as the bright spot is dragged from one vertex to the next: full strength when a vertex happens to sit under it, dimmer whenever it falls between three. This is a trade rather than a mistake. Gouraud moves the work from a stage with millions of invocations to one with thousands, and on a surface with no tight highlight it is indistinguishable from Phong at a fraction of the cost. Both models encode in the fragment stage: the Gouraud vertex shader passes linear light through the varying and the fragment shader raises it to 1/2.2 there, because interpolating encoded values would mix the samples in the wrong space and add a second error to the one being demonstrated."],
  ["shading", "normals", "A normal is not a position", "The stretch slider does something that looks harmless: it builds scaling(1, stretch, 1) — a scale on the y axis and nothing more — and multiplies the vertex positions by it. Positions come out where they belong. Push the normals through the same matrix and the lighting stops describing the surface it is lighting. A normal is not a little arrow attached to the surface. It is the direction perpendicular to the surface, and perpendicularity is a relationship that a non-uniform scale does not preserve. Flatten a sphere and its surface becomes shallower, so the normals must tilt further towards vertical; scaling them the way the geometry was scaled tilts them the opposite way. The transform that preserves the relationship is the inverse-transpose of the model matrix. For a diagonal matrix that is short enough to check by eye. The inverse of diag(1, s, 1) is diag(1, 1/s, 1), and a diagonal matrix is its own transpose, so the normal’s y component is divided by the scale where the position’s was multiplied by it. Draw the sphere at 0.4 of its height and the correct normal matrix carries 2.5. The wrong picture is not noise. Feeding the normals through diag(1, 0.4, 1) gives exactly the normal field of a sphere stretched to two and a half times its height, because 0.4 is what the inverse-transpose of that stretch produces. The flattened sphere is therefore lit correctly — as the tall ellipsoid it is not. That is the signature of this bug in a real scene: nothing looks broken, and the object is confidently lit as something it is not. Two facts explain why it survives so long in codebases. Under a uniform scale the inverse-transpose is the model matrix divided by the scale squared, and normalize() in the shader deletes that factor, so both matrices produce identical shading. For a pure rotation the inverse is the transpose, so the inverse-transpose is the rotation itself. The mistake is invisible through every rotation and every uniform scale in the project, and shows up on the day somebody squashes one axis of one model — which is the bug The Model Matrix said was waiting here."],
  ["shading", "instrument", "Now move all of it at once", "Every figure above holds everything still but one control. Below is the instrument with nothing held back: the three models, a light you can move around the sphere, the four constants of the equation, the stretch and the toggle that breaks it. The equation is printed beside the canvas with your own values in it, and the 3×3 underneath is whichever matrix the normals are going through. The presets are the shortest way in: one of them is this lab’s bug, already switched on."],
  ["textures", "footprint", "A pixel covers a different number of texels everywhere you look", "The shader knows none of this. It builds a UV from the vertex position — vUv = aPosition * uRepeat + uOffset — and reads the texture at it, and that is the whole of the texturing code. What varies across the image is not the coordinate but its rate of change: how far the UV moves when you step one pixel to the right. The hardware measures that by differencing the value between neighbouring pixels, and every decision below is made from the result. The fine grey lines in this texture are one texel wide and repeat every eight; they are there to fail first. A pattern with a period of eight texels needs a sample at least every four to survive, so the moment a pixel covers more than that the lines cannot be represented at all — and a sampler with no mip chain answers anyway, with whichever single texel it happened to land on. The rings and bands in the distance are that: the texel grid beating against the pixel grid. Move the camera and the answer changes every frame; that is the shimmer, and the rest of this page is about removing it."],
  ["textures", "magnification", "Magnification and minification are two different failures", "You set two filters, and at any given pixel exactly one of them runs. The hardware compares the footprint against a single texel: smaller, and the texture is being magnified; larger, and it is being minified. You do not get to make that call per pixel, and you would not want to — as the figure above shows, it changes down the length of one triangle. Nearest magnification is not a lower setting. It is the correct one whenever the texels are the artwork rather than samples of something continuous: pixel art, a glyph atlas at integer scale, a lookup table you are indexing rather than sampling. It is wrong for a photograph, where the texels stand in for a surface that had no squares in it. There are only two values here because OpenGL offers only two. When one texel covers many pixels there is no smaller version of the image that would help; mipmaps are only ever an answer to minification."],
  ["textures", "mipmaps", "A mipmap is the average taken in advance", "The far end of the plane needs the average of a few hundred texels per pixel, and reading a few hundred texels per pixel is not something a GPU will do at frame rate. So the averages are computed once, ahead of time, at every scale that might be wanted: the image at 256, then 128, 64, 32 and down to a single texel — nine levels for this texture, built by the one generateMipmap call that runs when the lab starts. A pixel whose footprint spans sixteen texels then reads level 4, on which every texel is already the average of a sixteen-by-sixteen block. That costs memory, and the amount is fixed: each level is a quarter of the one above, so the chain adds exactly a third. 256 KiB of texture becomes 341. It is also, on almost any real scene, faster. A minifying sampler reading level 0 lands on texels scattered across the whole image and misses the texture cache on nearly every pixel; reading a level scaled to the footprint means neighbouring pixels read neighbouring texels. Mipmapping usually buys speed with the memory rather than spending both. The chain is built here whichever filter you pick, which is why the readout below says 1 used rather than 1 when you turn mipmapping off — the memory has already gone. One thing it gets wrong. generateMipmap averages the bytes as they are stored, and for a colour texture those bytes are sRGB-encoded, which means they are not proportional to light. The light and dark squares of this checker are 232 and 44 in the red channel; averaged as stored they give 138, where averaging the light they stand for and re-encoding gives 173. Every level of the chain is therefore a little too dark. That is a small instance of the mistake Colour & Gamma is built around. The five minification settings are not a scale from worse to better. Three of them name two independent decisions — how to filter inside a level, and how to move between levels. Trilinear is both halves set to linear: bilinear in each of the two levels bracketing the footprint, then blended between them, at eight texel reads to nearest’s one. It is the usual default because the artefact it removes is the one you cannot stop noticing once you have seen it. OpenGL has a sixth combination this lab leaves out, NEAREST_MIPMAP_LINEAR, and it is the value every texture starts with. That is worth knowing for one reason: the default minification filter reads the mip chain, so a texture uploaded without one and never configured samples as black."],
  ["textures", "angle", "A shallow angle stretches the footprint", "Everything above assumed the footprint is roughly square. It is square only when you are looking straight down at the surface. Tilt towards the horizon and it stretches along the viewing direction, until one pixel can cover ten texels across the plane and several hundred into it. The level has to be chosen from one number. Choose it for the short axis of the footprint and the long axis aliases; choose it for the long axis, which is what the hardware does, and the short axis is blurred by exactly the footprint’s aspect ratio. A road surface at a grazing angle is the standard case, and it looks like mud. Anisotropic filtering is the way out — several samples spread along the long axis, each taken from a finer level and averaged, up to sixteen taps for a sixteen-to-one footprint. In WebGL 1 it is an extension, EXT_texture_filter_anisotropic, and this lab does not enable it. What you are looking at is isotropic filtering doing the best it can."],
  ["textures", "wrap", "Wrap decides what is outside 0 to 1", "The UVs here are not confined to 0 to 1 and were never going to be. They come straight from the vertex position, so at six tiles across, u runs from −3 to 3 and v from −12.9 to 0.2. The sampler needs an answer for all of it. Wrap is that answer, set separately per axis: S across the width of the plane, T along its length, running away from you. CLAMP_TO_EDGE is what you have been watching: outside the range, take the nearest edge texel and keep taking it. It is the right behaviour for an image meant to be used once — a photograph on a billboard, a gradient ramp — and it is why the cyan border smears instead of the picture starting over. REPEAT discards the whole-number part, so u = 3.4 and u = 0.4 read the same texel and the tile begins again. MIRRORED_REPEAT flips alternate tiles, so every seam meets its own reflection: the way to tile an image whose left edge does not match its right, at no extra cost. This texture’s borders match already — the same cyan on all four sides — so what you can actually see change when you switch to mirror is the amber L pointing the other way in every second tile. Repeat, mirrored repeat and the mip chain all need a power-of-two texture in WebGL 1. This one is 256 square for that reason. A 257-pixel image gets clamping, no mipmaps, and no explanation."],
  ["textures", "instrument", "Now move all of it at once", "Below is the whole sampler, every setting of it live at once: both filters, both wrap axes, the tile count, the coordinate offset, and a camera you can drag. Drag it. Every figure on this page is a still frame, and aliasing is mostly a motion artefact — standing still it is moiré, and the moment the camera moves the whole distance starts to boil. Set minification to Near, push the tile count up, orbit slowly, and then switch to Tri without touching anything else. The presets set states worth looking at and say what to look for once they land."],
  ["transform", "translation", "Translation lives in the last column", "Start with the simplest instruction there is: put it over there. Drag the slider and watch the readout rather than the cube. Three of the sixteen numbers do anything at all, and they sit in the rightmost column. This is the reason 3D graphics uses a four-by-four matrix for a three-dimensional world: a 3×3 matrix can rotate, scale, shear and reflect, but it has nowhere to put a displacement. Every 3×3 transform leaves the origin exactly where it found it, because multiplying a column of zeros can only ever give zeros back. The fourth column is bought with a fourth coordinate. Positions are carried as (x, y, z, 1), and it is that trailing 1 that lets the last column contribute — it multiplies by one and is added in. Directions are carried as (x, y, z, 0) instead, which is not a technicality but the whole trick: a direction has no position, so the zero deletes the translation and a normal or a light vector is rotated without being dragged across the scene with the object."],
  ["transform", "rotation", "The other nine numbers are the object’s axes", "Turn the cube and the last column stays exactly where it was. Rotation happens entirely inside the upper-left 3×3. The three coloured arms are not a decoration drawn to look like axes. They are the first three columns of the matrix, plotted as arrows. The first column is where the object’s own x axis has ended up in the world; the second is its y; the third is its z. Read the readout and the picture together for a moment — the numbers in column one are the coordinates of the red arm. Once you have seen that, a model matrix stops being a grid of numbers and becomes a sentence with four clauses: here is where your x points, here is your y, here is your z, and here is where you are. Everything else in this lab follows from that reading."],
  ["transform", "memory", "In memory the matrix is those four columns, end to end", "A Mat4 here is a Float32Array of sixteen, stored column-major: an entry’s index is column * 4 + row. Four columns of four, so they land as blocks: m[0]–m[3] is the first column, m[4]–m[7] the second, m[8]–m[11] the third, m[12]–m[15] the last. Set that beside the reading the arrows gave you and the layout is no longer an arbitrary convention — the array is the object’s x axis, then its y axis, then its z axis, then where it stands. The builders in lib/math/mat4.ts are typed out in that order too. translation(x, y, z) is the identity with x, y, z, 1 on its last line, which is why the arguments land at indices 12, 13 and 14. rotationY puts its cosine at m[0] and m[10], the sine at m[8] and the negated sine at m[2], and never touches m[4]–m[7]: the y column is the axis it turns about, so the y column is the one thing it leaves alone. Nothing rearranges those floats on the way to the GPU. The upload is gl.uniformMatrix4fv(location, false, m), and that false is a transpose flag: the array already sits in the order OpenGL wants, so it goes across as it is. In WebGL 1, which every canvas on this page runs on, the flag is not even a choice: passing true is an error. The one place the order does get rearranged is the readout you have been watching all along. toRows() walks the array with a stride of four, so the top row it prints is m[0], m[4], m[8], m[12] — one entry taken from each column. That is whiteboard notation, and it is the transpose of the buffer. Read the sixteen floats four at a time as though they were rows instead, and the 2.20 you drove into m[12] comes out at the start of the bottom row rather than the top of the last column. Both pictures describe the same buffer. Only one of them is the buffer. The blocking buys something practical as well: a column is contiguous, so asking where an object is means reading three adjacent floats — m[12], m[13], m[14] — not gathering three that sit four apart."],
  ["transform", "scale", "Scale stretches the axes, and can invert them", "If the columns are the axes, scaling has an obvious meaning: make one of them longer. A uniform scale multiplies all three columns equally and is harmless. A non-uniform one is where trouble starts, and lab 4 is largely about the consequence: stretch an object along one axis and its surface normals, if you transform them with this same matrix, stop being perpendicular to the surface. They need the inverse-transpose instead. That bug is waiting in Light & Normals with a preset that turns it on. A negative scale is worth a second of your attention because it is the one transform here that changes the winding of the triangles — the order their corners appear in on screen. Backface culling decides what to throw away using exactly that, so a mirrored object rendered without thinking about it comes out with its faces inside out."],
  ["transform", "order", "Order is the whole difficulty", "Matrix multiplication is not commutative, which is a dry way of saying that turning something and then moving it does not put it where moving it and then turning it would. This is the single most common source of confusion in a transform chain, and it is much easier to see than to argue about. Both sides are made of the same two matrices. What differs is which one the vertex meets first — and the vertex meets them right to left. In T · R · v the rotation is adjacent to the vector, so it happens first, in the object’s own frame, and the translation is applied afterwards to the already-turned result. Reverse them and the translation has moved the object away from the origin before the rotation arrives, so the rotation sweeps it through an arc instead of spinning it in place. The convention people are taught — scale, then rotate, then translate — is this observation with the usual answer already chosen. Written as a product it reads T · R · S, backwards from the order it happens in. That is not a quirk of notation to memorise around; it is what right-to-left evaluation means, and once the chain is read that way it stops being something to get wrong."],
  ["transform", "instrument", "Now move all of it at once", "Everything above is one control at a time. Below is the whole matrix with nothing held back: nine numbers of rotation and scale, three of position, the composition order, and the factors it multiplies out from. The presets are worth starting with — each one sets the controls to something that makes a point, and says what to look at."],
];
// --- END GENERATED ---

export const ESSAY_SECTION_COUNT = ESSAY_SECTIONS.length;

/* ------------------------------------------------------------------------- */

/**
 * Lower-case, and treat a hyphen as a space.
 *
 * The essays write `inverse-transpose`, `z-fighting`, `column-major`. A reader
 * types them with a space, and a raw `includes` then finds nothing — which is
 * the exact miss issue #29 opens with. Softening both sides fixes it in one
 * line. The substitution is character-for-character so an index into the
 * softened string is still an index into the original, which is what lets
 * `excerpt` cut the snippet out of the text a reader will actually see.
 */
function soften(text: string): string {
  return text.toLowerCase().replace(/[-\u2013\u2014_/]/g, ' ');
}

function entry(
  kind: SearchKind,
  title: string,
  description: string,
  href: string,
  extra = '',
  external = false,
): SearchEntry {
  return {
    kind,
    title,
    description,
    href,
    external,
    haystack: soften(`${title} ${description} ${extra}`),
  };
}

function sectionEntry([slug, id, heading, text]: PackedSection): SearchEntry {
  const lab = LIVE_LABS.find((candidate) => candidate.slug === slug);
  const context = lab?.title ?? slug;
  return {
    kind: 'section',
    title: heading,
    description: text,
    context,
    href: `/labs/${slug}#${id}`,
    haystack: soften(`${heading} ${context} ${text}`),
  };
}

export const SEARCH_INDEX: SearchEntry[] = [
  ...LIVE_LABS.map((lab) =>
    entry(
      'lab',
      lab.title,
      lab.blurb,
      `/labs/${lab.slug}`,
      `${lab.concepts.join(' ')} ${lab.takeaway} ${lab.technology}`,
    ),
  ),
  ...TECHNOLOGIES.map((tech) =>
    entry('technology', tech.name, tech.tagline, `/tech/${tech.slug}`, tech.kind),
  ),
  ...GLOSSARY.map((term) =>
    entry(
      'term',
      term.term,
      term.definition,
      `/glossary#${termId(term.term)}`,
      (term.see ?? []).join(' '),
    ),
  ),
  ...ALL_RESOURCES.map((resource) =>
    entry('resource', resource.title, resource.why, resource.url, `${resource.author} ${resource.kind}`, true),
  ),
  ...PAGES.map((page) => entry('page', page.title, page.description, page.href)),
  ...ESSAY_SECTIONS.map(sectionEntry),
];

export const KIND_LABEL: Record<SearchKind, string> = {
  lab: 'Lab',
  technology: 'Technology',
  term: 'Glossary',
  resource: 'Resource',
  page: 'Page',
  section: 'Essay',
};

/**
 * The words around the match, so a result reads as the sentence it came from.
 *
 * A section's description is its whole prose — 1.4 KB on average, and the match
 * that earned the result is as likely to be in the last paragraph as the first.
 * Showing the opening line instead would land every essay hit on the same
 * uninformative sentence.
 */
export function excerpt(item: SearchEntry, query: string, span = 140): string {
  if (item.kind !== 'section') return item.description;

  const text = item.description;
  const soft = soften(text);
  const needle = soften(query.trim());
  // A two-word query that only matched term by term has no one position; the
  // first term is where the reader's eye is going anyway.
  const at = needle
    ? soft.indexOf(needle) >= 0
      ? soft.indexOf(needle)
      : soft.indexOf(needle.split(' ')[0])
    : -1;
  // The match can be in the heading or the lab title rather than the prose, so
  // there may be no position to centre on. Lead with the opening instead —
  // never the whole 1.9 KB section, which the row would only clamp away.
  if (at < 0) return text.length > span ? `${text.slice(0, span)}…` : text;

  let start = Math.max(0, at - Math.floor(span / 2));
  let end = Math.min(text.length, at + needle.length + Math.floor(span / 2));
  // Back off to word boundaries; a snippet that begins mid-word reads as a bug.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space > -1 && space < at) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > at + needle.length) end = space;
  }

  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/** Order results by where the match landed: title beats body, and a phrase
 *  found whole beats one found a word at a time. */
export function search(query: string, limit = 12): SearchEntry[] {
  const needle = soften(query.trim());
  if (!needle) return [];

  /*
   * Terms, for the query that is a phrase the site never wrote in that order.
   * "premultiplied alpha" is the depth essay's subject and the words are eight
   * apart in it, so a contiguous match finds nothing; requiring every term
   * somewhere finds the paragraph. Scored below a contiguous match, because
   * adjacency is evidence and this is not.
   */
  const terms = needle.split(' ').filter(Boolean);

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const item of SEARCH_INDEX) {
    const title = soften(item.title);
    let score = 0;
    if (title === needle) score = 100;
    else if (title.startsWith(needle)) score = 60;
    else if (title.includes(needle)) score = 40;
    else if (item.haystack.includes(needle)) score = 10;
    else if (terms.length > 1 && terms.every((term) => item.haystack.includes(term))) score = 5;
    else continue;

    // Nudge the site's own content above the outbound reading list.
    if (item.kind === 'lab' || item.kind === 'technology') score += 6;
    // A section is site content too, but it must never outrank the lab it is
    // part of: the lab entry is the same page with the whole essay under it.
    if (item.kind === 'section') score += 2;
    if (item.external) score -= 4;

    scored.push({ entry: item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  /*
   * Cap the essay's share of the page.
   *
   * A word the essays use throughout — "matrix" matches 18 sections, "shader"
   * 20 — would otherwise fill all twelve rows with paragraphs and push the
   * glossary definition and the lab itself off the end. Sections take at most a
   * third of the list while anything else is still waiting; once the other
   * kinds are exhausted the rest of the list is theirs.
   */
  const sectionBudget = Math.max(4, Math.floor(limit / 3));
  const results: SearchEntry[] = [];
  const overflow: SearchEntry[] = [];
  let sections = 0;
  for (const { entry: item } of scored) {
    if (results.length >= limit) break;
    if (item.kind === 'section' && sections >= sectionBudget) {
      overflow.push(item);
      continue;
    }
    if (item.kind === 'section') sections += 1;
    results.push(item);
  }
  for (const item of overflow) {
    if (results.length >= limit) break;
    results.push(item);
  }

  return results;
}
