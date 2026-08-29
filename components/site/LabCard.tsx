import Link from 'next/link';

import { LabGlyph } from '@/components/site/LabGlyph';
import type { Lab } from '@/lib/labs';

export function LabCard({ lab, children }: { lab: Lab; children?: React.ReactNode }) {
  const live = lab.status === 'live';

  const body = (
    <>
      {children}
      {/*
        The diagram gets a plate of its own rather than sitting loose in the
        corner at icon size. On a contents page the picture is what you scan,
        so it is the first and largest thing in the card; the number and the
        API badge ride in the corners of it.
      */}
      <div className="relative mb-4 h-28 overflow-hidden rounded-lg border border-line/70 bg-ink-800/70">
        {/* The same blueprint grid the body uses, so the plate reads as a
            drawing surface instead of an empty box. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--grid-line) / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--grid-line) / 0.07) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.06]">
          <div className="aspect-[68/56] h-[86%]">
            <LabGlyph slug={lab.slug} />
          </div>
        </div>
        <span className="absolute left-2.5 top-2 font-mono text-2xs text-fg-faint">
          {String(lab.order).padStart(2, '0')}
        </span>
        <span
          className={`absolute right-2.5 top-2 rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${
            lab.technology === 'webgpu'
              ? 'border-amber/35 bg-amber/10 text-amber'
              : 'border-line-strong bg-ink-800/80 text-fg-faint'
          }`}
        >
          {lab.technology === 'webgpu' ? 'WebGPU' : 'WebGL'}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight text-fg">
          {lab.title}
        </h3>
        {live ? (
          <span className="mt-0.5 shrink-0 font-mono text-2xs uppercase tracking-wider text-accent">
            Open →
          </span>
        ) : (
          <span className="mt-0.5 shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-fg-faint">
            Building
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{lab.blurb}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {lab.concepts.map((concept) => (
          <li
            key={concept}
            className="rounded border border-line/80 px-1.5 py-0.5 font-mono text-2xs text-fg-faint"
          >
            {concept}
          </li>
        ))}
      </ul>
    </>
  );

  if (!live) {
    return <div className="panel group p-5 opacity-55">{body}</div>;
  }

  return (
    <Link
      href={`/labs/${lab.slug}`}
      className="panel group block p-5 transition-colors hover:border-line-strong hover:bg-ink-600/60"
    >
      {body}
    </Link>
  );
}
