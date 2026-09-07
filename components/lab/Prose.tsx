import type { ReactNode } from 'react';

/**
 * The written half of a lab.
 *
 * The labs were built as instruments and shipped with almost no writing — about
 * 190 words of connective prose each, against LearnOpenGL's several thousand on
 * a single chapter. The arguments were real and correctly ordered; they existed
 * as preset labels with the sentences between them unwritten. Nobody links to a
 * button, a search engine cannot index a slider, and a lecturer cannot assign a
 * canvas. This is where the sentences go.
 *
 * Inline code takes `overflow-wrap: anywhere` rather than `break-word`, because
 * only the former reduces an element's min-content width — and a single long
 * identifier (`device.limits.minUniformBufferOffsetAlignment`, 44 characters)
 * was otherwise wider than the column and pushed a phone into sideways scroll.
 *
 * Measure is capped near 68 characters because these paragraphs are meant to be
 * read, not skimmed between drags — and the column is left-aligned rather than
 * centred, so it starts on the same line as the lab's own title. Centred, the
 * essay began 234px to the right of the h1 above it and read as a different
 * page that had been pasted in.
 */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-prose space-y-5 text-[0.9375rem] leading-[1.75] text-fg-muted [&_li_a]:link-accent [&_p_a]:link-accent [&_code]:rounded [&_code]:bg-ink-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-fg [&_code]:[overflow-wrap:anywhere] [&_em]:not-italic [&_em]:text-fg [&_strong]:font-semibold [&_strong]:text-fg">
      {children}
    </div>
  );
}

/** A section break inside an essay, with the heading the reader can link to. */
export function ProseHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="!mt-14 scroll-mt-24 text-lg font-semibold tracking-tight text-fg"
    >
      <a href={`#${id}`} className="group no-underline">
        {children}
        <span className="ml-2 font-mono text-sm text-fg-faint opacity-0 transition-opacity group-hover:opacity-100">
          #
        </span>
      </a>
    </h2>
  );
}
