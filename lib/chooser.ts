/**
 * A small scoring model behind the "what should I use" tool.
 *
 * Deliberately transparent rather than clever: every point it awards is shown
 * back to the reader as a sentence. A recommendation you cannot interrogate is
 * just an opinion with extra steps.
 */

import type { Technology } from './technologies';

export type Goal = 'learn' | 'scene' | 'effect' | 'compute' | 'game';
export type Reach = 'everyone' | 'modern';
export type Control = 'raw' | 'productive';

export interface Answers {
  goal: Goal;
  reach: Reach;
  control: Control;
}

export const QUESTIONS = [
  {
    id: 'goal' as const,
    prompt: 'What are you making?',
    options: [
      { id: 'learn' as const, label: 'Learning the fundamentals' },
      { id: 'scene' as const, label: 'A 3D scene or product viewer' },
      { id: 'effect' as const, label: 'A shader or full-screen effect' },
      { id: 'compute' as const, label: 'A simulation or compute workload' },
      { id: 'game' as const, label: 'A game' },
    ],
  },
  {
    id: 'reach' as const,
    prompt: 'Who has to be able to run it?',
    options: [
      { id: 'everyone' as const, label: 'Everyone, including old devices' },
      { id: 'modern' as const, label: 'Current browsers are fine' },
    ],
  },
  {
    id: 'control' as const,
    prompt: 'How much do you want to write yourself?',
    options: [
      { id: 'raw' as const, label: 'I want to see the pipeline' },
      { id: 'productive' as const, label: 'I want to ship, not plumb' },
    ],
  },
];

type ScoreTable = Record<string, Partial<Record<string, number>>>;

/** Points per answer, plus the sentence that justifies them. */
const SCORES: Record<string, ScoreTable> = {
  webgl: {
    goal: { learn: 3, scene: 0, effect: 2, compute: -99, game: 1 },
    reach: { everyone: 3, modern: 0 },
    control: { raw: 3, productive: -2 },
  },
  webgpu: {
    goal: { learn: 1, scene: 1, effect: 2, compute: 5, game: 2 },
    reach: { everyone: -3, modern: 2 },
    control: { raw: 3, productive: -1 },
  },
  three: {
    // -6 for compute is not a taste penalty, it is the hard rule reaching one
    // level up: Three.js draws through WebGL, which has no compute stage. Six
    // points is exactly the largest bonus preference can award (reach 2 +
    // control 4), so no combination of preferences can make it the answer for
    // a compute workload — which is what the footer of the tool promises.
    goal: { learn: -2, scene: 5, effect: 1, compute: -6, game: 3 },
    reach: { everyone: 2, modern: 1 },
    control: { raw: -3, productive: 4 },
  },
  vgpu: {
    goal: { learn: -1, scene: -1, effect: 4, compute: 3, game: 0 },
    reach: { everyone: -3, modern: 2 },
    control: { raw: 1, productive: 2 },
  },
};

const REASONS: Record<string, Record<string, string>> = {
  webgl: {
    'goal:learn': 'nothing hides the pipeline from you',
    'goal:effect': 'a fragment shader needs almost no scaffolding',
    'goal:compute': 'it has no compute stage at all',
    'goal:game': 'a great many shipped games run on it',
    'reach:everyone': 'it runs on effectively every device in use',
    'control:raw': 'there is no layer between you and the API',
    'control:productive': 'you would be hand-rolling everything a library gives you',
  },
  webgpu: {
    'goal:learn': 'it names the stages that WebGL leaves implicit',
    'goal:scene': 'there is headroom for a heavy scene, once you have built the renderer',
    'goal:effect': 'a full-screen pass is short once the pipeline exists',
    'goal:compute': 'compute shaders and storage buffers are the whole point',
    'goal:game': 'far lower CPU cost per draw call',
    'reach:everyone': 'older devices and browsers simply do not have it',
    'reach:modern': 'availability is good in current browsers',
    'control:raw': 'the pipeline is explicit and validated up front',
    'control:productive': 'there is more setup here than in anything else on this page',
  },
  three: {
    'goal:scene': 'meshes, materials, lights and loaders are already solved',
    'goal:game': 'the largest ecosystem of controls, loaders and examples',
    'goal:learn': 'it is very good at hiding what you are trying to learn',
    'goal:effect': 'a shader material drops raw GLSL into a scene',
    'goal:compute': 'it draws through WebGL, where there is no compute stage',
    'reach:modern': 'nothing it needs is new, so that constraint costs you nothing',
    'control:productive': 'you describe a scene rather than a pipeline',
    'control:raw': 'it abstracts away the parts you said you wanted to see',
    'reach:everyone': 'it targets WebGL, so it inherits that reach',
  },
  vgpu: {
    'goal:learn': 'it folds away the plumbing you are trying to see',
    'goal:scene': 'there is no scene graph, no loaders and no controls',
    'goal:effect': 'a full-screen effect is a handful of lines',
    'goal:compute': 'typed WGSL modules and a headless runtime for CI',
    'reach:everyone': 'WebGPU only — there is no fallback path',
    'reach:modern': 'it needs WebGPU, which current browsers have',
    'control:raw': 'the descriptors are typed rather than hidden',
    'control:productive': 'it removes the descriptor boilerplate, not the concepts',
  },
};

export interface Verdict {
  slug: string;
  score: number;
  /**
   * Sentences for the points that count in this technology's favour, in the
   * order the questions were asked.
   */
  because: string[];
  /**
   * Sentences for the points counted against it. Kept apart from `because`
   * rather than dropped: a tool that shows its working has to show the working
   * that went the other way too. Printing them together is worse than printing
   * neither — "Because it is very good at hiding what you are trying to learn"
   * argues against the very thing it is recommending.
   */
  despite: string[];
  /** True when the answers make this technology impossible, not merely worse. */
  impossible: boolean;
}

/**
 * The two tables, readable from outside.
 *
 * Exported so a test can walk the whole answer space and assert the promise the
 * tool makes about itself — that every point it awards is shown back as a
 * sentence, on the right side of the ledger.
 */
export function SCORE_FOR(slug: string, question: string, answer: string): number {
  return SCORES[slug]?.[question]?.[answer] ?? 0;
}

export function REASON_FOR(slug: string, key: string): string | undefined {
  return REASONS[slug]?.[key];
}

export function rank(answers: Answers, technologies: Technology[]): Verdict[] {
  return technologies
    .map((tech) => {
      const table = SCORES[tech.slug] ?? {};
      let score = 0;
      const because: string[] = [];
      const despite: string[] = [];
      let impossible = false;

      for (const [question, answer] of Object.entries(answers)) {
        const points = table[question]?.[answer] ?? 0;
        if (points <= -99) {
          impossible = true;
          score -= 99;
        } else {
          score += points;
        }
        const reason = REASONS[tech.slug]?.[`${question}:${answer}`];
        if (!reason || points === 0) continue;
        (points > 0 ? because : despite).push(reason);
      }

      return { slug: tech.slug, score, because, despite, impossible };
    })
    .sort((a, b) => b.score - a.score);
}

export const DEFAULT_ANSWERS: Answers = {
  goal: 'learn',
  reach: 'everyone',
  control: 'raw',
};
