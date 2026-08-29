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
        what: 'Serialise each lab’s controls into the URL, restore on load, and a copy-link button.',
        why: 'The most valuable thing here is a configuration that makes a point, and right now it cannot be handed to anyone. It is also the only distribution mechanism a site with no accounts and no newsletter has.',
        state: 'next',
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
        what: 'Load each lab in a headless browser and assert the canvas is not blank and the GL error queue is empty.',
        why: 'The maths is thoroughly tested and the rendering is not tested at all. Two real regressions this week were caught by looking at screenshots.',
        state: 'next',
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
        what: 'Draw the same object ten thousand times and watch where the time goes.',
        why: 'Why the number of draw calls matters more than the number of triangles is the single most useful performance idea, and nothing here teaches it.',
        state: 'next',
      },
      {
        title: 'Colour and gamma',
        what: 'A lab on linear versus sRGB, and an encode step in the shared lit shader.',
        why: 'This one is a correction, not an addition: the shading lab currently demonstrates a specular falloff in the wrong colour space. Its cost grows with every lab added.',
        state: 'next',
      },
      {
        title: 'Depth, blending and transparency',
        what: 'Z-fighting made reproducible with a near-plane slider, and why sorting transparent geometry is unavoidable.',
        why: 'The two things every real renderer gets wrong first, and both are pure direct manipulation.',
        state: 'later',
      },
      {
        title: 'A shader you write yourself',
        what: 'An editable fragment shader with compile errors shown under the editor.',
        why: 'Every lab so far hands you sliders. At some point the reader should be handed the keyboard.',
        state: 'later',
      },
    ],
  },
  {
    name: 'Reach',
    goal: 'The work is findable, and the comparison that nobody else offers is the front door.',
    items: [
      {
        title: 'A second reference scene across all four technologies',
        what: 'A lit, depth-tested, spinning cube alongside the plasma — same geometry, four implementations.',
        why: 'The plasma is a fullscreen effect and exercises almost no plumbing. A scene with a model matrix and a depth buffer is where the four technologies genuinely diverge.',
        state: 'later',
      },
      {
        title: 'Give the chooser its own address',
        what: 'Move the technology chooser to its own route with its own metadata and social card.',
        why: '“Which should I use” is a question people search for. A settled, reasoned answer is more linkable than a category page.',
        state: 'later',
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
