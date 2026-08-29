'use client';

import { useState } from 'react';

import type { CodeSample } from '@/lib/technologies';

const LANGUAGE_LABEL: Record<CodeSample['language'], string> = {
  glsl: 'GLSL',
  wgsl: 'WGSL',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  bash: 'Shell',
};

export function CodeBlock({ sample }: { sample: CodeSample }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sample.source);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context, permissions) — the code is still
      // selectable, so there is nothing to recover from.
    }
  };

  const lines = sample.source.split('\n').length;

  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-ink-800">
      <figcaption className="flex items-center gap-3 border-b border-line px-4 py-2">
        <span className="font-mono text-2xs uppercase tracking-wider text-fg-muted">
          {sample.label}
        </span>
        <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-fg-faint">
          {LANGUAGE_LABEL[sample.language]}
        </span>
        <span className="font-mono text-2xs text-fg-faint">{lines} lines</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded px-2 py-1 font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <div className="overflow-x-auto">
        <pre className="p-4 font-mono text-xs leading-relaxed text-fg-muted">
          <code>{sample.source}</code>
        </pre>
      </div>
      {sample.note ? (
        <p className="border-t border-line px-4 py-3 text-2xs leading-relaxed text-fg-faint">
          {sample.note}
        </p>
      ) : null}
    </figure>
  );
}
