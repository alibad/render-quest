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
    goal: { learn: -2, scene: 5, effect: 1, compute: -3, game: 3 },
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
    'reach:everyone': 'it runs on effectively every device in use',
    'control:raw': 'there is no layer between you and the API',
    'control:productive': 'you would be hand-rolling everything a library gives you',
  },
  webgpu: {
    'goal:compute': 'compute shaders and storage buffers are the whole point',
    'goal:game': 'far lower CPU cost per draw call',
    'reach:everyone': 'older devices and browsers simply do not have it',
    'reach:modern': 'availability is good in current browsers',
    'control:raw': 'the pipeline is explicit and validated up front',
  },
  three: {
    'goal:scene': 'meshes, materials, lights and loaders are already solved',
    'goal:game': 'the largest ecosystem of controls, loaders and examples',
    'goal:learn': 'it is very good at hiding what you are trying to learn',
    'control:productive': 'you describe a scene rather than a pipeline',
    'control:raw': 'it abstracts away the parts you said you wanted to see',
    'reach:everyone': 'it targets WebGL, so it inherits that reach',
  },
  vgpu: {
    'goal:effect': 'a full-screen effect is a handful of lines',
    'goal:compute': 'typed WGSL modules and a headless runtime for CI',
    'reach:everyone': 'WebGPU only — there is no fallback path',
    'control:productive': 'it removes the descriptor boilerplate, not the concepts',
  },
};

export interface Verdict {
  slug: string;
  score: number;
  /** Sentences explaining the score, in the order the questions were asked. */
  because: string[];
  /** True when the answers make this technology impossible, not merely worse. */
  impossible: boolean;
}

export function rank(answers: Answers, technologies: Technology[]): Verdict[] {
  return technologies
    .map((tech) => {
      const table = SCORES[tech.slug] ?? {};
      let score = 0;
      const because: string[] = [];
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
        if (reason) because.push(reason);
      }

      return { slug: tech.slug, score, because, impossible };
    })
    .sort((a, b) => b.score - a.score);
}

export const DEFAULT_ANSWERS: Answers = {
  goal: 'learn',
  reach: 'everyone',
  control: 'raw',
};
