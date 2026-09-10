'use client';

import { useId, useState, type ReactNode } from 'react';

/**
 * One question, at the paragraph making the claim, where every wrong answer has
 * a reason.
 *
 * Every lab asks the reader to do two things — read, and drag — and there is no
 * point on any of the ten pages where they find out whether what they just read
 * stuck. That matters here more than it would elsewhere, because these ideas
 * feel obvious while being read and turn out not to be. That a matrix chain
 * reads right to left. That depth precision is set by the near plane and the
 * far plane barely matters. That 0.5 is about a fifth of the light. A reader
 * finishes the paragraph agreeing with it and has no way to discover that they
 * have agreed with a version of it that is subtly wrong — which is the version
 * they will carry into their own code.
 *
 * ---------------------------------------------------------------------------
 * THE COPY RULES — read these before writing a check
 * ---------------------------------------------------------------------------
 *
 * THE WRONG ANSWERS ARE THE CONTENT. A check whose distractors are filler
 * teaches nothing and is worse than no check, because it costs the reader a
 * stop. Everything below follows from that one sentence.
 *
 * 1. WRITE THE DISTRACTORS FIRST.
 *
 *    A wrong option is worth writing only if somebody would actually choose it.
 *    Start from the misconception — the plausible, half-right belief a reader
 *    could hold after reading the paragraph — and write the option as the thing
 *    that belief would make them do. If you cannot name who thinks this and
 *    why, the option is filler; cut it and write three options instead of four.
 *
 * 2. EVERY RESPONSE SAYS WHAT THE READER WAS THINKING, THEN WHERE IT BREAKS.
 *
 *    Not "this is incorrect". A response has to be worth reading by someone who
 *    did not choose that option. Two or three sentences: the mechanism the
 *    reader had in mind, and the specific place it fails.
 *
 *      "The far plane is nearly free. Depth is distributed hyperbolically, so
 *       almost the whole buffer is spent in the first few units; pulling the
 *       far plane in by 600 buys back a sliver of precision that was never the
 *       problem."
 *
 * 3. NOTHING IS CONGRATULATED, NOTHING IS SCOLDED.
 *
 *    The response to the correct option adds something the reader did not have;
 *    it does not tell them they did well. The response to a wrong option
 *    explains the misconception; it does not open "Not quite" or "Careful".
 *    There is no "Well done", no "Exactly!", no exclamation mark anywhere. The
 *    correct option's response opens by saying so plainly — "This is the one."
 *    — and then teaches:
 *
 *      "This is the one. Precision at 200 units is governed by the near plane,
 *       which is why the fix for a problem far away is a number describing
 *       something close."
 *
 * 4. A WRONG RESPONSE MUST LEAVE THE READER KNOWING WHAT IS TRUE.
 *
 *    A reader who picks wrong sees one response — theirs. They should not have
 *    to go hunting for the option marked correct to learn the answer. So every
 *    wrong response names the real mechanism on its way past, rather than only
 *    ruling its own option out. This is not optional: for a screen reader the
 *    response is what gets announced, and the mark on the correct button is
 *    several tab stops away.
 *
 * 5. "IT WORKS AND IT IS STILL WRONG" IS A REAL OPTION, AND A GOOD ONE.
 *
 *    Some distractors fix the symptom. Say so, and say what it costs — "It
 *    works, and it is the wrong fix. You have changed the model to suit the
 *    camera, and the next scene will fight again." A reader who has done this
 *    in their own code learns more from that than from being told they are
 *    wrong about something they have never tried.
 *
 * 6. POINT AT THE INSTRUMENT WHEN THE INSTRUMENT SETTLES IT.
 *
 *    "The instrument below prints the smallest resolvable gap — move the far
 *    plane and watch it barely move." A check that ends in something the reader
 *    can go and verify is worth more than one that ends in an assertion. Link a
 *    figure by its permalink when there is one that shows it.
 *
 * 7. HOUSE VOICE, AS EVERYWHERE. Plain, concrete, unhedged. British spellings.
 *    No marketing adjectives. Typographic apostrophes are `&rsquo;`.
 *
 * ---------------------------------------------------------------------------
 * THE API — what an essay writes
 * ---------------------------------------------------------------------------
 *
 * The check lives in the essay file, inside `<Prose>`, immediately after the
 * paragraph making the claim — not in a registry. A check that drifts away from
 * its paragraph is the thing that goes stale: the paragraph gets rewritten and
 * the question two files away goes on asking about the old version.
 *
 *   <Check
 *     question={<>Your scene is 200 units deep and the distant walls are
 *       z-fighting. Which change fixes it?</>}
 *     options={[
 *       {
 *         option: <>Pull the far plane in from 1000 to 400.</>,
 *         response: <>The far plane is nearly free. Depth is distributed
 *           hyperbolically, so almost the whole buffer is spent in the first few
 *           units; pulling the far plane in by 600 buys back a sliver of
 *           precision that was never the problem.</>,
 *       },
 *       {
 *         option: <>Push the near plane out from 0.01 to 0.5.</>,
 *         correct: true,
 *         response: <>This is the one. Precision at 200 units is governed by the
 *           near plane, which is why the fix for a problem far away is a number
 *           describing something close.</>,
 *       },
 *     ]}
 *   />
 *
 * - `question`, `option` and `response` are all `ReactNode` rather than
 *   `string`, for two reasons. A string prop cannot carry `&rsquo;` — the
 *   entity would render literally — and the house rule is that no essay file
 *   contains a raw typographic apostrophe, so a string option could not hold an
 *   apostrophe at all. And responses want `<code>` for the identifiers and
 *   numbers they name, the same as any other sentence in the essay.
 * - Exactly one option carries `correct: true`. `test/content.test.ts` fails the
 *   build on two, on none, and on an empty response.
 * - Three or four options. Three good ones beat four with a passenger — see
 *   rule 1.
 * - The check has no id and no URL state, deliberately. A figure has an address
 *   because it has a state worth sending someone; an answer is not a state, and
 *   putting one in the address bar would be the first way this feature learned
 *   to remember something.
 * - Words inside a check do not count towards the lab's reading time.
 *   `lib/essay-outline.ts` strips every `{…}` expression container, and the
 *   options array is one, so a check costs the reader a stop in the same way a
 *   figure does and is measured the same way: not at all.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS MUST NEVER GROW
 * ---------------------------------------------------------------------------
 *
 * NOTHING IS RECORDED. No score, no streak, no counter, no "3 of 4", no
 * progress bar, no badge. Nothing is written to `localStorage`, nothing is
 * written to a cookie, and nothing leaves the browser — so /privacy's "There is
 * nothing to collect" stays literally true with no edit. `test/render.smoke.ts`
 * snapshots `localStorage` on a lab route, answers a check, and asserts that no
 * key appeared; that test exists because remembering an answer is the obvious,
 * friendly-sounding change that would quietly falsify the privacy page.
 *
 * NOTHING IS LOCKED. Any option can be chosen again, in any order. There is no
 * reveal-once and no retry gate, which is why the only state here is which
 * option was last chosen.
 *
 * NOTHING COUNTS THE LABS. A lab with no checks renders nothing, and no page
 * anywhere reports how many labs have them. `lib/roadmap.ts` declined a guided
 * tour on the grounds that a format whose marginal cost is prose will be
 * half-finished for a year; the same applies here and sets the shape.
 */
export interface CheckOption {
  /** The option, as the reader reads it. One sentence, an action or a claim. */
  option: ReactNode;
  /** Exactly one option in a check sets this. */
  correct?: boolean;
  /** Why someone would choose this, and where that thinking breaks. */
  response: ReactNode;
}

export function Check({
  question,
  options,
}: {
  question: ReactNode;
  options: CheckOption[];
}) {
  const questionId = useId();
  // The only state in the feature: which option was last chosen, and null
  // before any. Not "which have been chosen", because that is a record.
  const [chosen, setChosen] = useState<number | null>(null);
  const answered = chosen !== null;

  return (
    // role="group" rather than a bare <section>, following ControlGroup: a
    // named <section> is a landmark, and four landmarks called "which change
    // fixes it?" would be four entries in a screen reader's landmark list for
    // something that is a paragraph-sized aside, not a region of the page.
    <section
      role="group"
      aria-labelledby={questionId}
      className="!mt-8 !mb-8 w-full"
    >
      <div className="panel p-4">
        <div className="eyebrow mb-2">check</div>
        <p id={questionId} className="text-[0.9375rem] font-semibold leading-snug text-fg">
          {question}
        </p>
        {/* A list, with one tab stop per option. Not Segmented's radiogroup
            with its roving tabindex: there the options are settings of one
            control and arrowing between them is the point, whereas here each
            option is a separate thing to read, and collapsing four sentences
            into a single tab stop hides three of them from anyone who moves
            through a page by tabbing. */}
        <ul className="mt-4 grid gap-2">
          {options.map((entry, index) => {
            const picked = chosen === index;
            // Marked only once something has been chosen. Before that the
            // answer is on the page for anyone reading the DOM, which is a
            // strange thing to hand a reader who wanted to think first.
            const marked = answered && entry.correct === true;
            return (
              <li key={index}>
                <button
                  type="button"
                  aria-pressed={picked}
                  onClick={() => setChosen(index)}
                  className={`flex w-full items-baseline gap-3 rounded-lg border px-3 py-2.5 text-left text-sm leading-relaxed transition-colors ${
                    marked
                      ? 'border-accent/50 bg-accent/10 text-fg'
                      : picked
                        ? 'border-line-strong bg-ink-600 text-fg'
                        : 'border-line bg-ink-800/60 text-fg-muted hover:border-line-strong hover:text-fg'
                  }`}
                >
                  {/* min-w-0 and overflow-wrap: anywhere together. A flex item
                      refuses to shrink below its min-content width by default,
                      and only `anywhere` — not `break-word` — reduces that
                      width, so a long unbreakable identifier in an option would
                      otherwise widen the button, then the essay column, and
                      test/render.smoke.ts fails the build on sideways scroll at
                      375px. Same fix as Prose gives inline code. */}
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {entry.option}
                  </span>
                  {/* Real text, not a tick glyph or a colour. A reader who
                      chose wrong learns which option was right by hearing this
                      word; a coloured border alone tells them nothing, and
                      aria-hidden decoration would tell them less. It says
                      "correct", which is a fact about the option, rather than
                      anything about the reader. */}
                  {marked ? (
                    <span className="shrink-0 font-mono text-2xs uppercase tracking-wider text-accent">
                      correct
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        {/* The live region is rendered from first paint, empty, and the
            response is inserted INTO it. Mounting the region and its content in
            the same commit is the standard way to make a live region silent:
            assistive technology registers a region when it enters the
            accessibility tree and announces mutations after that, so a region
            that arrives already full has nothing to announce and the whole
            feature is mute to a screen reader. Hence a wrapper that always
            exists and carries no padding or border of its own — those are on
            the inner element, so the empty region takes no space.

            aria-atomic because the second answer replaces the text of the
            first: without it a reader can be read the changed fragment of a
            paragraph rather than the paragraph. */}
        <div aria-live="polite" aria-atomic="true">
          {answered ? (
            // The left rule is the same colour whichever option was chosen. A
            // response tinted by right or wrong is a verdict, and this feature
            // does not pass verdicts on readers — it explains mechanisms.
            <p className="mt-4 border-l-2 border-accent/40 bg-ink-800/60 py-2 pl-3 pr-2 text-sm leading-relaxed text-fg-muted [overflow-wrap:anywhere]">
              {options[chosen].response}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
