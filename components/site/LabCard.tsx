import Link from 'next/link';

import { LabGlyph } from '@/components/site/LabGlyph';
import type { Lab } from '@/lib/labs';

export function LabCard({ lab, children }: { lab: Lab; children?: React.ReactNode }) {
  const live = lab.status === 'live';

  const body = (
    <>
      {children}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="font-mono text-2xs text-fg-faint">
            {String(lab.order).padStart(2, '0')}
          </span>
          <div className="h-12 w-16 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5">
            <LabGlyph slug={lab.slug} />
          </div>
        </div>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${
            lab.technology === 'webgpu'
              ? 'border-amber/35 bg-amber/10 text-amber'
              : 'border-line-strong text-fg-faint'
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
