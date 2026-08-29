/**
 * A curated path through graphics and game development.
 *
 * Every entry is something worth someone's evenings — not a link dump. Each one
 * carries a `why`, because "here are 40 links" is how people bounce off a
 * subject, and "start here, then this" is how they get through it.
 *
 * Links are checked by `npm run check:links`.
 */

export type ResourceKind =
  | 'interactive'
  | 'course'
  | 'book'
  | 'video'
  | 'reference'
  | 'tool';

export type Level = 'start here' | 'core' | 'deep';

export interface Resource {
  title: string;
  author: string;
  url: string;
  kind: ResourceKind;
  level: Level;
  free: boolean;
  why: string;
  /**
   * Set when the host blocks automated requests (Cloudflare and friends), with
   * the date the URL was last opened in a real browser. The link checker
   * reports these separately instead of crying wolf on every run.
   */
  botBlockedVerified?: string;
}

export interface Stage {
  id: string;
  title: string;
  summary: string;
  resources: Resource[];
}

export interface Track {
  id: 'graphics' | 'games';
  title: string;
  tagline: string;
  intro: string;
  stages: Stage[];
}

export const TRACKS: Track[] = [
  {
    id: 'graphics',
    title: 'Graphics',
    tagline: 'From "what is a matrix" to writing a renderer.',
    intro:
      'The labs on this site cover the spine of this path — transforms, projection, the pipeline, light. This is where to go for the parts a browser tab cannot hold: the proofs, the depth, and the people who explain it best.',
    stages: [
      {
        id: 'intuition',
        title: 'Build the intuition',
        summary:
          'Before any API. Graphics is linear algebra you can see, so start with the people who make it visible.',
        resources: [
          {
            title: 'Essence of Linear Algebra',
            author: '3Blue1Brown',
            url: 'https://www.3blue1brown.com/topics/linear-algebra',
            kind: 'video',
            level: 'start here',
            free: true,
            why: 'Fifteen short films that turn matrices from a table of numbers into a motion. If one thing on this page changes how you see the subject, it is this.',
          },
          {
            title: 'Immersive Linear Algebra',
            author: 'Ström, Åström & Akenine-Möller',
            url: 'https://immersivemath.com/ila/',
            kind: 'interactive',
            level: 'start here',
            free: true,
            why: 'A linear algebra book where every figure is draggable. The same idea as this site, applied to the maths underneath it.',
          },
          {
            title: 'Explanations',
            author: 'Bartosz Ciechanowski',
            url: 'https://ciechanow.ski/',
            kind: 'interactive',
            level: 'core',
            free: true,
            why: 'The high-water mark for interactive explanation on the web. Read the ones on lights, cameras and curves, then read the rest anyway.',
          },
          {
            title: 'Math for Game Developers',
            author: 'Freya Holmér',
            url: 'https://www.youtube.com/@acegikmo',
            kind: 'video',
            level: 'core',
            free: true,
            why: 'Splines, quaternions and the geometry you actually reach for, taught with unusual care about why the standard explanation confuses people.',
          },
        ],
      },
      {
        id: 'pipeline',
        title: 'Learn the pipeline',
        summary:
          'What the GPU does with your vertices, and the API you use to tell it.',
        resources: [
          {
            title: 'WebGL Fundamentals',
            author: 'Gregg Tavares',
            url: 'https://webglfundamentals.org/',
            kind: 'course',
            level: 'start here',
            free: true,
            why: 'The best WebGL introduction there is, and refreshingly willing to say which of the conventions you have been taught are arbitrary.',
          },
          {
            title: 'WebGL2 Fundamentals',
            author: 'Gregg Tavares',
            url: 'https://webgl2fundamentals.org/',
            kind: 'course',
            level: 'core',
            free: true,
            why: 'The sequel, for when you want instancing, transform feedback and the things WebGL1 makes painful.',
          },
          {
            title: 'LearnOpenGL',
            author: 'Joey de Vries',
            url: 'https://learnopengl.com/',
            kind: 'course',
            level: 'core',
            free: true,
            why: 'The canonical modern OpenGL course. Chapter for chapter it is still the clearest tour of the whole pipeline, and it translates directly to WebGL.',
          },
          {
            title: 'WebGL tutorial',
            author: 'MDN',
            url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'The reference you will keep open in a second tab. Accurate about what each call actually requires.',
          },
          {
            title: 'Scratchapixel',
            author: 'Scratchapixel',
            url: 'https://www.scratchapixel.com/',
            kind: 'course',
            level: 'deep',
            free: true,
            why: 'Derives rasterisation and ray tracing from first principles, with the algebra written out. Where to go when you want the proof, not the recipe.',
          },
        ],
      },
      {
        id: 'shaders',
        title: 'Write shaders',
        summary:
          'The part where you stop arranging other people’s pixels and start computing your own.',
        resources: [
          {
            title: 'The Book of Shaders',
            author: 'Patricio Gonzalez Vivo & Jen Lowe',
            url: 'https://thebookofshaders.com/',
            kind: 'interactive',
            level: 'start here',
            free: true,
            why: 'Fragment shaders taught as a craft, with an editable canvas on every page. Unfinished for years and still the best starting point.',
          },
          {
            title: 'Shadertoy',
            author: 'Inigo Quilez & Pol Jeremias',
            url: 'https://www.shadertoy.com/',
            kind: 'tool',
            level: 'core',
            free: true,
            botBlockedVerified: '2026-08-29',
            why: 'Thousands of shaders you can read and edit live. The fastest way to see how far a single fragment function can be pushed.',
          },
          {
            title: 'Articles',
            author: 'Inigo Quilez',
            url: 'https://iquilezles.org/articles/',
            kind: 'reference',
            level: 'deep',
            free: true,
            why: 'Signed distance functions, raymarching, noise and analytic tricks, from the person who worked most of them out.',
          },
        ],
      },
      {
        id: 'light',
        title: 'Get light right',
        summary:
          'Shading models, materials, and the physics they are approximating.',
        resources: [
          {
            title: 'Ray Tracing in One Weekend',
            author: 'Peter Shirley and contributors',
            url: 'https://raytracing.github.io/',
            kind: 'book',
            level: 'start here',
            free: true,
            why: 'You will have written a working ray tracer by Sunday evening. Nothing else teaches the light transport ideas so quickly.',
          },
          {
            title: 'Physically Based Rendering',
            author: 'Pharr, Jakob & Humphreys',
            url: 'https://www.pbr-book.org/',
            kind: 'book',
            level: 'deep',
            free: true,
            why: 'The field’s standard reference, free online, and a literate program you can read end to end. Also an Academy Award winner, which is rare for a textbook.',
          },
          {
            title: 'Filament: Physically Based Rendering',
            author: 'Google',
            url: 'https://google.github.io/filament/Filament.html',
            kind: 'reference',
            level: 'deep',
            free: true,
            why: 'The clearest write-up of a real-time PBR implementation, with every approximation and its cost stated plainly.',
          },
          {
            title: 'Real-Time Rendering resources',
            author: 'Akenine-Möller, Haines & Hoffman',
            url: 'https://www.realtimerendering.com/',
            kind: 'reference',
            level: 'deep',
            free: true,
            botBlockedVerified: '2026-08-29',
            why: 'The companion site to the field’s reference book: a maintained index of papers, courses and links for nearly every real-time topic.',
          },
        ],
      },
      {
        id: 'modern',
        title: 'Move to modern GPU',
        summary:
          'WebGPU is where the web is going. The concepts carry over; the API is stricter and far more capable.',
        resources: [
          {
            title: 'WebGPU Fundamentals',
            author: 'Gregg Tavares',
            url: 'https://webgpufundamentals.org/',
            kind: 'course',
            level: 'start here',
            free: true,
            why: 'The same clarity as the WebGL series, aimed at the API that replaces it. Start here rather than at the spec.',
          },
          {
            title: 'WebGPU API',
            author: 'MDN',
            url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'Reference for the API surface, including the bits the tutorials skip over.',
          },
          {
            title: 'vgpu',
            author: 'Vercel Labs',
            url: 'https://vgpu.sh/',
            kind: 'tool',
            level: 'core',
            free: true,
            why: 'A small WebGPU library with typed WGSL imports that runs the same code in the browser, in Node, and in tests. Good once you know what it is abstracting.',
          },
          {
            title: 'Three.js',
            author: 'Ricardo Cabello and contributors',
            url: 'https://threejs.org/docs/',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'When you want a scene rather than a pipeline. Worth learning after the fundamentals, so you know what it is doing for you.',
          },
          {
            title: 'Three.js Journey',
            author: 'Bruno Simon',
            url: 'https://threejs-journey.com/',
            kind: 'course',
            level: 'core',
            free: false,
            why: 'The most thorough Three.js course available, and unusually strong on shaders. Paid, and generally judged worth it.',
          },
        ],
      },
    ],
  },
  {
    id: 'games',
    title: 'Games',
    tagline: 'From a rendered triangle to something people can play.',
    intro:
      'Rendering is one system in a game and rarely the one that sinks a project. This path covers the rest: the loop, the architecture, the feel, and the unglamorous business of finishing.',
    stages: [
      {
        id: 'foundations',
        title: 'Foundations',
        summary:
          'How a game is put together, independent of any engine or language.',
        resources: [
          {
            title: 'Game Programming Patterns',
            author: 'Robert Nystrom',
            url: 'https://gameprogrammingpatterns.com/',
            kind: 'book',
            level: 'start here',
            free: true,
            why: 'Free online and the single best explanation of why game code is shaped the way it is. Read the game loop and component chapters before you write an engine.',
          },
          {
            title: 'The Nature of Code',
            author: 'Daniel Shiffman',
            url: 'https://natureofcode.com/',
            kind: 'book',
            level: 'start here',
            free: true,
            why: 'Forces, particles, flocking and physics, taught so approachably you forget you are learning simulation. Free to read online.',
          },
          {
            title: 'Red Blob Games',
            author: 'Amit Patel',
            url: 'https://www.redblobgames.com/',
            kind: 'interactive',
            level: 'core',
            free: true,
            why: 'Pathfinding, hex grids and procedural generation, each with diagrams you can drag. The A* guide is the one everyone links.',
          },
          {
            title: 'Handmade Hero',
            author: 'Casey Muratori',
            url: 'https://handmadehero.org/',
            kind: 'video',
            level: 'deep',
            free: true,
            why: 'A complete game and engine written from scratch on camera, with no libraries. Enormous, and unmatched if you want to see every layer.',
          },
        ],
      },
      {
        id: 'engines',
        title: 'Pick an engine',
        summary:
          'Or decide, deliberately, not to. Each of these is a reasonable place to spend a year.',
        resources: [
          {
            title: 'Godot documentation',
            author: 'Godot Engine',
            url: 'https://docs.godotengine.org/en/stable/',
            kind: 'reference',
            level: 'start here',
            free: true,
            why: 'Open source, small download, genuinely good docs, and the fastest path from nothing to a running 2D or 3D game.',
          },
          {
            title: 'Unity Learn',
            author: 'Unity',
            url: 'https://learn.unity.com/',
            kind: 'course',
            level: 'core',
            free: true,
            why: 'The largest ecosystem and the most jobs. Start with the official pathways rather than the ocean of outdated tutorials.',
          },
          {
            title: 'Unreal Engine documentation',
            author: 'Epic Games',
            url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'Where to go for high-end rendering out of the box. Heavier to learn, and the source is available to read.',
          },
          {
            title: 'Bevy',
            author: 'Bevy contributors',
            url: 'https://bevyengine.org/learn/',
            kind: 'reference',
            level: 'deep',
            free: true,
            why: 'A Rust engine built around ECS, with a rendering stack worth reading. Good if you want to understand an engine rather than only drive one.',
          },
          {
            title: 'Catlike Coding',
            author: 'Jasper Flick',
            url: 'https://catlikecoding.com/unity/tutorials/',
            kind: 'course',
            level: 'deep',
            free: true,
            why: 'Long-form Unity tutorials that explain the maths and the rendering rather than just the clicks. The mesh and shader series are exceptional.',
          },
        ],
      },
      {
        id: 'systems',
        title: 'The hard systems',
        summary:
          'Physics, networking and AI: where projects usually run aground.',
        resources: [
          {
            title: 'Gaffer On Games',
            author: 'Glenn Fiedler',
            url: 'https://gafferongames.com/',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'The reference on game networking and physics integration. If you are building anything multiplayer, read the networked physics series first.',
          },
          {
            title: 'Box2D documentation',
            author: 'Erin Catto',
            url: 'https://box2d.org/documentation/',
            kind: 'reference',
            level: 'core',
            free: true,
            why: 'The 2D physics engine most others learned from, documented by its author. The solver discussion is worth reading even for 3D.',
          },
          {
            title: 'Game AI Pro',
            author: 'Steve Rabin (ed.)',
            url: 'https://www.gameaipro.com/',
            kind: 'book',
            level: 'deep',
            free: true,
            why: 'Free chapters from shipped games on behaviour trees, steering and planning. Practice rather than academic AI.',
          },
        ],
      },
      {
        id: 'ship',
        title: 'Make it good, then ship it',
        summary:
          'Design, feel, and the part where you actually put it in front of people.',
        resources: [
          {
            title: "Game Maker's Toolkit",
            author: 'Mark Brown',
            url: 'https://www.youtube.com/@GMTK',
            kind: 'video',
            level: 'start here',
            free: true,
            why: 'Design criticism that will change how you look at every game you play. Also runs the largest game jam in the world.',
          },
          {
            title: 'Coding Adventures',
            author: 'Sebastian Lague',
            url: 'https://www.youtube.com/@SebastianLague',
            kind: 'video',
            level: 'core',
            free: true,
            why: 'Ray marching, erosion, boids and marching cubes, built on camera. The best argument that graphics work is play.',
          },
          {
            title: 'Game jams',
            author: 'itch.io',
            url: 'https://itch.io/jams',
            kind: 'tool',
            level: 'core',
            free: true,
            why: 'Build something in 48 hours. Finishing one bad game teaches more than half-finishing five ambitious ones, and there is a jam starting most weeks.',
          },
          {
            title: 'itch.io',
            author: 'itch.io',
            url: 'https://itch.io/',
            kind: 'tool',
            level: 'core',
            free: true,
            why: 'Where to publish it. No gatekeeping, a real audience for odd small games, and it takes about ten minutes.',
          },
        ],
      },
    ],
  },
];

export const ALL_RESOURCES: Resource[] = TRACKS.flatMap((track) =>
  track.stages.flatMap((stage) => stage.resources),
);

export const KIND_LABEL: Record<ResourceKind, string> = {
  interactive: 'Interactive',
  course: 'Course',
  book: 'Book',
  video: 'Video',
  reference: 'Reference',
  tool: 'Tool',
};
