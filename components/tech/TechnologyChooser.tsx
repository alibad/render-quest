'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  DEFAULT_ANSWERS,
  QUESTIONS,
  rank,
  type Answers,
} from '@/lib/chooser';
import { TECHNOLOGIES, getTechnology } from '@/lib/technologies';

export function TechnologyChooser() {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const verdicts = useMemo(() => rank(answers, TECHNOLOGIES), [answers]);
  const [best, ...rest] = verdicts;
  const bestTech = getTechnology(best.slug);

  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* Questions */}
        <div className="space-y-6">
          {QUESTIONS.map((question) => (
            <fieldset key={question.id}>
              <legend className="eyebrow mb-2.5">{question.prompt}</legend>
              <div className="space-y-1">
                {question.options.map((option) => {
                  const active =
                    answers[question.id] === (option.id as never);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: option.id,
                        }))
                      }
                      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-accent/15 text-accent'
                          : 'text-fg-muted hover:bg-ink-600 hover:text-fg'
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          active ? 'bg-accent' : 'bg-line-strong'
                        }`}
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* Verdict */}
        <div>
          <p className="eyebrow mb-3">Start with</p>
          {bestTech ? (
            <Link
              href={`/tech/${bestTech.slug}`}
              className="block rounded-lg border border-accent/40 bg-accent/10 p-5 transition-colors hover:bg-accent/15"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight text-fg">
                  {bestTech.name}
                </h3>
                <span className="font-mono text-2xs uppercase tracking-wider text-accent">
                  Read the guide →
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {bestTech.tagline}
              </p>
              {best.because.length > 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                  <span className="text-fg">Because</span>{' '}
                  {best.because.join(', and ')}.
                </p>
              ) : null}
            </Link>
          ) : null}

          <p className="eyebrow mb-2 mt-6">The others, for these answers</p>
          <ul className="space-y-2">
            {rest.map((verdict) => {
              const tech = getTechnology(verdict.slug);
              if (!tech) return null;
              return (
                <li key={verdict.slug}>
                  <Link
                    href={`/tech/${tech.slug}`}
                    className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-md px-2.5 py-2 transition-colors hover:bg-ink-600"
                  >
                    <span
                      className={`text-sm font-medium ${
                        verdict.impossible ? 'text-fg-faint line-through' : 'text-fg'
                      }`}
                    >
                      {tech.name}
                    </span>
                    {verdict.impossible ? (
                      <span className="rounded border border-red/40 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-red">
                        Cannot
                      </span>
                    ) : null}
                    <span className="text-xs leading-relaxed text-fg-faint">
                      {verdict.because.length > 0
                        ? verdict.because[0]
                        : 'no strong reason either way here'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="border-t border-line px-6 py-4 text-2xs leading-relaxed text-fg-faint sm:px-8">
        This is a rule of thumb, not a verdict — the scoring is a few dozen lines you
        can read in{' '}
        <code className="text-fg-muted">lib/chooser.ts</code>. The one hard rule is
        compute: WebGL has no compute stage, so no amount of preference makes it an
        option there.
      </p>
    </div>
  );
}
