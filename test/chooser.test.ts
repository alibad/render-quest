/**
 * The technology chooser's reasoning.
 *
 * The tool's whole claim is that every point it awards is shown back to the
 * reader as a sentence. Two ways that quietly stopped being true, both found by
 * driving the live page rather than by reading the code:
 *
 *   - a penalty was printed after the word "Because", so the card recommended
 *     Three.js *because* "it is very good at hiding what you are trying to
 *     learn" — the reason not to pick it;
 *   - Three.js scored -3 for a compute workload with no sentence attached, so
 *     the penalty was invisible, and preference outweighed it: the card picked
 *     a WebGL-backed library directly above WebGL struck out as unable to
 *     compute at all.
 *
 * These checks are over the whole answer space — twenty combinations — because
 * both defects were in three of them.
 */

import assert from 'node:assert/strict';

import {
  QUESTIONS,
  rank,
  SCORE_FOR,
  REASON_FOR,
  type Answers,
} from '../lib/chooser.ts';
import { TECHNOLOGIES } from '../lib/technologies.ts';

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  NOT OK  ${name}`);
    throw error;
  }
}

console.log('technology chooser');

const [goals, reaches, controls] = QUESTIONS.map((q) => q.options.map((o) => o.id));
const COMBINATIONS: Answers[] = [];
for (const goal of goals)
  for (const reach of reaches)
    for (const control of controls)
      COMBINATIONS.push({ goal, reach, control } as Answers);

check('the answer space is the twenty combinations the questions allow', () => {
  assert.equal(COMBINATIONS.length, 20);
});

check('every point awarded has a sentence, and every sentence has a point', () => {
  const missing: string[] = [];
  const unearned: string[] = [];
  for (const tech of TECHNOLOGIES) {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        const key = `${question.id}:${option.id}`;
        const points = SCORE_FOR(tech.slug, question.id, option.id);
        const reason = REASON_FOR(tech.slug, key);
        if (points !== 0 && !reason) missing.push(`${tech.slug} ${key} (${points})`);
        if (points === 0 && reason) unearned.push(`${tech.slug} ${key}`);
      }
    }
  }
  assert.deepEqual(missing, [], `scored but silent: ${missing.join(', ')}`);
  assert.deepEqual(unearned, [], `sentence with no points: ${unearned.join(', ')}`);
});

check('"Because" never carries a reason the model scored against the pick', () => {
  for (const answers of COMBINATIONS) {
    for (const verdict of rank(answers, TECHNOLOGIES)) {
      for (const [question, answer] of Object.entries(answers)) {
        const points = SCORE_FOR(verdict.slug, question, answer);
        const reason = REASON_FOR(verdict.slug, `${question}:${answer}`);
        if (!reason) continue;
        const where = `${verdict.slug} for ${JSON.stringify(answers)}`;
        if (points > 0) {
          assert.ok(verdict.because.includes(reason), `${where}: favourable reason missing`);
          assert.ok(!verdict.despite.includes(reason), `${where}: favourable reason in despite`);
        } else if (points < 0) {
          assert.ok(verdict.despite.includes(reason), `${where}: penalty missing`);
          assert.ok(
            !verdict.because.includes(reason),
            `${where}: "Because ${reason}" argues against the pick`,
          );
        }
      }
    }
  }
});

check('the pick always says something, favourable or not', () => {
  for (const answers of COMBINATIONS) {
    const [best] = rank(answers, TECHNOLOGIES);
    assert.ok(
      best.because.length + best.despite.length > 0,
      `silent recommendation for ${JSON.stringify(answers)}`,
    );
  }
});

check('nothing drawing through WebGL is ever the pick for a compute workload', () => {
  const throughWebgl = new Set(['webgl', 'three']);
  for (const answers of COMBINATIONS) {
    if (answers.goal !== 'compute') continue;
    const [best] = rank(answers, TECHNOLOGIES);
    assert.ok(
      !throughWebgl.has(best.slug),
      `${best.slug} recommended for compute (${JSON.stringify(answers)}) while WebGL is struck out as having no compute stage`,
    );
  }
});

check('WebGL is marked impossible exactly when the goal is compute', () => {
  for (const answers of COMBINATIONS) {
    const webgl = rank(answers, TECHNOLOGIES).find((v) => v.slug === 'webgl');
    assert.equal(webgl?.impossible, answers.goal === 'compute', JSON.stringify(answers));
  }
});

check('the compute penalty cannot be bought back with preference', () => {
  // The claim in lib/chooser.ts is that -6 is exactly the largest bonus
  // preference can award, so the number has to keep matching the table.
  let bonus = 0;
  for (const question of ['reach', 'control'] as const) {
    const best = Math.max(
      ...QUESTIONS.find((q) => q.id === question)!.options.map((o) =>
        SCORE_FOR('three', question, o.id),
      ),
    );
    bonus += Math.max(best, 0);
  }
  assert.ok(
    SCORE_FOR('three', 'goal', 'compute') + bonus <= 0,
    `preference can outrun the compute penalty: ${bonus} against ${SCORE_FOR('three', 'goal', 'compute')}`,
  );
});

check('every combination ranks all four technologies, best first', () => {
  for (const answers of COMBINATIONS) {
    const verdicts = rank(answers, TECHNOLOGIES);
    assert.equal(verdicts.length, TECHNOLOGIES.length, JSON.stringify(answers));
    for (let i = 1; i < verdicts.length; i += 1) {
      assert.ok(verdicts[i - 1].score >= verdicts[i].score, JSON.stringify(answers));
    }
  }
});

console.log(`\n${passed} chooser checks passed`);
