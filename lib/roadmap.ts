/**
 * What to build next, and what not to.
 *
 * Published rather than kept in a notes file, for the same reason the labs
 * label demos that are not running: a roadmap you cannot see is a promise
 * nobody can hold you to. Items move to 'done' only once they are deployed.
 *
 * This was assembled from a five-dimension audit of the codebase, sequenced,
 * and then attacked by two critics — one on execution risk, one on whether it
 * serves a reader. Both disagreed with the original ordering, and both were
 * right: the plan below is the corrected one.
 */

export type ItemState = 'done' | 'next' | 'later';

export interface RoadmapItem {
  title: string;
  what: string;
  /** Why it earns its place, in one sentence. */
  why: string;
  state: ItemState;
}

export interface RoadmapPhase {
  name: string;
  goal: string;
  items: RoadmapItem[];
}

export const ROADMAP_THESIS =
  'Render Quest had six good explorables and no curriculum around them — a gallery rather than a course. The ordering below fixes the reader’s first thirty seconds before it adds anything new, closes the gap between what the site asserts and what it verifies, and only then builds the missing rungs. Polish and reach come last, because their value depends on everything above being true first.';

export const ROADMAP: RoadmapPhase[] = [
  {
    name: 'Make the first thirty seconds work',
    goal:
      'A stranger arriving on any lab can tell what to touch, what it taught them, and where to go next — on a phone as well as a laptop.',
    items: [
      {
        title: 'A usable layout on a phone',
        what: 'Canvas first, then the controls that drive it, then the readout. And stop the canvas swallowing the page scroll.',
        why: 'The product’s single promise is that the matrix, the geometry and the pixels move together — and on a phone the slider sat two screens below the render, on a page that refused to scroll.',
        state: 'done',
      },
      {
        title: 'Named presets in every lab',
        what: 'Three or four saved states per lab, each with a sentence on what to look at once it lands.',
        why: 'Some labs open with sixteen controls and no indication which one is worth moving. A preset is the cheap version of a guided tour, and needs no tour framework.',
        state: 'done',
      },
      {
        title: 'A stated order, and an end to every lab',
        what: 'Numbered labs with declared prerequisites, and a footer carrying the vocabulary, the previous and next lab, and a way to report confusion.',
        why: 'Six labs were six unconnected pages. The content already existed — 46 glossary terms named a lab that no lab page rendered.',
        state: 'done',
      },
      {
        title: 'Show the code that draws each lab',
        what: 'A collapsible panel per lab with the exact shader sources the page compiles.',
        why: 'A reader could finish a lab having never seen a line of the code, on a site whose thesis is that the plumbing is the subject.',
        state: 'done',
      },
      {
        title: 'A link that carries the state',
        what: 'Each lab’s controls serialise into the address bar and restore from it, with a copy button that appears once something has been moved. Only what differs from the defaults is written, and out-of-range values from a link are rejected rather than handed to a uniform.',
        why: 'The most valuable thing here is a configuration that makes a point, and it could not be handed to anyone. It is also the only distribution mechanism a site with no accounts and no newsletter has.',
        state: 'done',
      },
    ],
  },
  {
    name: 'Verify what is asserted',
    goal:
      'Nothing on the site can claim something the build has not checked — including that its shaders compile.',
    items: [
      {
        title: 'Check shaders in the test suite',
        what: 'Assert that every uniform and attribute name the TypeScript asks for exists in the shader source it is compiled against.',
        why: 'Every shader here is a template literal, several assembled by concatenation. A renamed uniform passes the type check, passes both test suites, passes the build, and shows the reader an error card.',
        state: 'done',
      },
      {
        title: 'Run the tests somewhere other than a deploy',
        what: 'A GitHub Actions workflow running the suites on push, and the link checker weekly.',
        why: 'The tests only ever ran because Vercel executes the build, so a branch was first checked by deploying it.',
        state: 'done',
      },
      {
        title: 'A rendering smoke test',
        what: 'Every lab loaded in a real browser, checked for console errors, for its own failure card, and for whether the canvas actually drew anything — measured by reading the canvas rather than screenshotting it.',
        why: 'The maths was thoroughly tested and the rendering was not tested at all. Two real regressions were caught only by looking at screenshots. The first version of this test passed while every lab was blank, which is the best argument for it existing.',
        state: 'done',
      },
    ],
  },
  {
    name: 'The missing rungs',
    goal:
      'The curriculum covers what a working graphics developer actually meets, not only what is elegant to explain.',
    items: [
      {
        title: 'Draw calls & instancing',
        what: 'Draw the same object ten thousand times and watch where the time goes. Both modes render the identical picture from the identical buffer through the identical shader; only the number of times the CPU asks changes, and the measured cost changes with it.',
        why: 'Why the number of draw calls matters more than the number of triangles is the single most useful performance idea, and nothing here taught it. Built — and it moved the CPU figure by more than ten times while the triangle count never budged.',
        state: 'done',
      },
      {
        title: 'Colour and gamma',
        what: 'A slider splits one lit sphere down the middle and lights the two halves in different colour spaces — same geometry, same light, same Lambert term. Plus the encode step the shared lit shader was missing.',
        why: 'This one was a correction, not an addition: every shader here multiplied sRGB-encoded numbers and wrote them straight out, so the shading lab demonstrated a specular falloff in the wrong space. Fixed in the shared shader and in both of the shading lab’s stages — for Gouraud the encode has to happen after interpolation, or it is a second bug on top of the first.',
        state: 'done',
      },
      {
        title: 'Depth, blending and transparency',
        what: 'Z-fighting made reproducible from the frustum, with the arithmetic printed beside it so the picture can be predicted before it breaks — and a transparency scene where depth writing and sorting can each be turned off to see what each one was for.',
        why: 'The two things every real renderer gets wrong first, and both are pure direct manipulation. The first build of it never actually fought, because the camera moved with the panels — measuring caught that, looking at it did not.',
        state: 'done',
      },
      {
        title: 'A shader you write yourself',
        what: 'An editable fragment shader that recompiles on every keystroke, with the driver’s own error text and the line it objected to shown underneath — renumbered past the preamble, so it points where you would actually look.',
        why: 'Every other lab hands you sliders onto someone else’s shader. What actually stops people writing their own is not the maths, it is that a mistake produces a black rectangle and no explanation.',
        state: 'done',
      },
    ],
  },
  {
    name: 'Reach',
    goal: 'The work is findable, and the comparison that nobody else offers is the front door.',
    items: [
      {
        title: 'A second reference scene across all four technologies',
        what: 'A lit, depth-tested, spinning cube alongside the plasma — same geometry, four implementations, running in WebGL and WebGPU. Both line counts are in the comparison table, and the cube column is the more honest of the two.',
        why: 'The plasma is a fullscreen effect and exercises almost no plumbing. A scene with three vertex attributes, an index buffer, a matrix chain, a normal transform and depth state is where the four genuinely diverge — WebGL sets each piece with a sticky global, WebGPU freezes the lot into a pipeline and hands you the depth texture.',
        state: 'done',
      },
      {
        title: 'Give the chooser its own address',
        what: 'The chooser lives at /tech/choose with its own title, description and social card, and is embedded back into /tech rather than the other way round.',
        why: '“Which should I use” is a question people search for. A settled, reasoned answer is more linkable than a category page that happens to contain one.',
        state: 'done',
      },
    ],
  },
];

/** Proposals considered and declined. Declining well is most of a roadmap. */
export const NOT_DOING: { title: string; why: string }[] = [
  {
    title: 'Accounts, analytics, or a newsletter',
    why: 'The privacy page says the site stores nothing and watches nobody, and that claim is worth more than the data would be. Feedback arrives through an issue link instead.',
  },
  {
    title: 'A chrome-free embed route for lecturers',
    why: 'Built on a guess about a user nobody has met, on a site with no way to learn whether it was ever used. A lab page in an iframe already mostly works; if someone asks, the ask is the specification.',
  },
  {
    title: 'A guided-tour framework',
    why: 'A format whose marginal cost is prose is a format that will be half-finished for a year. Presets deliver most of the value for none of the machinery.',
  },
  {
    title: 'Rewriting each lab in every technology',
    why: 'Four labs times four APIs is sixteen implementations of identical maths. The model matrix is the same matrix everywhere; duplicating it teaches nothing and quadruples the maintenance.',
  },
  {
    title: 'Converting the site to a pure static export',
    why: 'It would spend a day of work to make one sentence on the about page technically true. The sentence was corrected instead.',
  },
];

export const ROADMAP_COUNTS = {
  done: ROADMAP.flatMap((phase) => phase.items).filter((item) => item.state === 'done').length,
  next: ROADMAP.flatMap((phase) => phase.items).filter((item) => item.state === 'next').length,
  later: ROADMAP.flatMap((phase) => phase.items).filter((item) => item.state === 'later').length,
};
