'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  KIND_LABEL,
  TRACKS,
  type Level,
  type Resource,
  type ResourceKind,
  type Track,
} from '@/lib/resources';

const PROGRESS_KEY = 'rq-progress';

const KIND_CLASS: Record<ResourceKind, string> = {
  interactive: 'text-accent border-accent/35 bg-accent/10',
  course: 'text-axis-y border-axis-y/35 bg-axis-y/10',
  book: 'text-amber border-amber/35 bg-amber/10',
  video: 'text-axis-x border-axis-x/35 bg-axis-x/10',
  reference: 'text-fg-muted border-line-strong bg-ink-600',
  tool: 'text-axis-z border-axis-z/35 bg-axis-z/10',
};

/** Start here reads as an invitation; go deep reads as a warning. */
const LEVEL_CLASS: Record<Level, string> = {
  'start here': 'border-accent/35 bg-accent/10 text-accent',
  core: 'border-line-strong text-fg-muted',
  deep: 'border-line text-fg-faint',
};

const LEVEL_LABEL: Record<Level, string> = {
  'start here': 'Start here',
  core: 'Core',
  deep: 'Go deep',
};

type KindFilter = ResourceKind | 'all';

export function LearnExplorer() {
  const [trackId, setTrackId] = useState<Track['id']>('graphics');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const [freeOnly, setFreeOnly] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Progress lives only in this browser. Read after mount so the server and
  // the first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      // Storage unavailable — the page works, it just will not remember.
    }
    setLoaded(true);
  }, []);

  const toggleDone = (url: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      try {
        window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Not persisting is survivable.
      }
      return next;
    });
  };

  const track = TRACKS.find((t) => t.id === trackId) ?? TRACKS[0];

  const matches = (resource: Resource) => {
    if (freeOnly && !resource.free) return false;
    if (kind !== 'all' && resource.kind !== kind) return false;
    if (!query.trim()) return true;
    const haystack =
      `${resource.title} ${resource.author} ${resource.why}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  };

  const stages = track.stages
    .map((stage) => ({ ...stage, resources: stage.resources.filter(matches) }))
    .filter((stage) => stage.resources.length > 0);

  const trackTotal = track.stages.reduce((n, s) => n + s.resources.length, 0);
  const trackDone = track.stages.reduce(
    (n, s) => n + s.resources.filter((r) => done.has(r.url)).length,
    0,
  );
  const visible = stages.reduce((n, s) => n + s.resources.length, 0);
  const filtering = query.trim() !== '' || kind !== 'all' || freeOnly;

  return (
    <div>
      {/* Track switch + progress */}
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div
          role="tablist"
          aria-label="Learning track"
          className="flex gap-1 rounded-lg border border-line bg-ink-800 p-1"
        >
          {TRACKS.map((t) => {
            const active = t.id === trackId;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTrackId(t.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.35)]'
                    : 'text-fg-faint hover:bg-ink-600 hover:text-fg-muted'
                }`}
              >
                {t.title}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <ProgressRing done={trackDone} total={trackTotal} pending={!loaded} />
          <div className="text-xs leading-tight">
            <p className="font-medium text-fg">
              {loaded ? `${trackDone} of ${trackTotal} marked done` : `${trackTotal} resources`}
            </p>
            <p className="text-fg-faint">
              Progress is stored in this browser only.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-prose text-sm leading-relaxed text-fg-muted">
        {track.intro}
      </p>

      {/* Filters */}
      <div className="mt-7 flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <span className="sr-only">Search resources</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-line bg-ink-800 px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-accent/50 focus:outline-none"
          />
        </label>

        <FilterChip active={kind === 'all'} onClick={() => setKind('all')}>
          All
        </FilterChip>
        {(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => (
          <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
            {KIND_LABEL[k]}
          </FilterChip>
        ))}
        <FilterChip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
          Free only
        </FilterChip>

        {filtering ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setKind('all');
              setFreeOnly(false);
            }}
            className="font-mono text-2xs uppercase tracking-wider text-fg-faint transition-colors hover:text-accent"
          >
            Clear
          </button>
        ) : null}
      </div>

      {filtering ? (
        <p className="mt-3 font-mono text-2xs uppercase tracking-wider text-fg-faint">
          {visible} of {trackTotal} shown
        </p>
      ) : null}

      {/* Stages */}
      {stages.length === 0 ? (
        <p className="mt-16 text-center text-sm text-fg-faint">
          Nothing matches that. Try clearing the filters.
        </p>
      ) : (
        <ol className="mt-10 space-y-14">
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xs text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-fg">
                  {stage.title}
                </h2>
              </div>
              <p className="mt-1.5 max-w-prose pl-8 text-sm leading-relaxed text-fg-muted">
                {stage.summary}
              </p>

              {/*
                A stage with an odd number of resources ends on a half-empty row,
                which on a reading list looks like a card that failed to load. The
                last one widens to close it — stages here run to three and five, so
                this is the common case rather than an edge one.
              */}
              <div className="mt-5 grid gap-3 pl-0 sm:pl-8 lg:grid-cols-2">
                {stage.resources.map((resource, index) => (
                  <ResourceCard
                    key={resource.url}
                    resource={resource}
                    done={done.has(resource.url)}
                    onToggle={() => toggleDone(resource.url)}
                    wide={
                      stage.resources.length % 2 === 1 &&
                      index === stage.resources.length - 1
                    }
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ResourceCard({
  resource,
  done,
  onToggle,
  wide = false,
}: {
  resource: Resource;
  done: boolean;
  onToggle: () => void;
  /** Set on the last card of an odd-length stage, to close the row. */
  wide?: boolean;
}) {
  return (
    <article
      className={`panel group relative flex flex-col p-4 transition-all ${
        wide ? 'lg:col-span-2' : ''
      } ${done ? 'opacity-55' : 'hover:border-line-strong hover:bg-ink-600/50'}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${
            KIND_CLASS[resource.kind]
          }`}
        >
          {KIND_LABEL[resource.kind]}
        </span>
        {/*
          All three levels, not just one. `level` was set on every one of the 37
          resources and rendered on the ten marked "start here" — so two thirds
          of the list carried a grading the reader was never shown, and a stage
          with no starting point looked the same as one with three.
        */}
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${LEVEL_CLASS[resource.level]}`}
        >
          {LEVEL_LABEL[resource.level]}
        </span>
        {!resource.free ? (
          <span className="rounded border border-amber/35 bg-amber/10 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider text-amber">
            Paid
          </span>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          aria-label={done ? `Mark ${resource.title} as not done` : `Mark ${resource.title} as done`}
          // relative + z-10 keeps this above the card-wide link overlay below;
          // without it the title's ::after swallows every click on the toggle.
          className={`relative z-10 ml-auto grid h-5 w-5 place-items-center rounded border transition-colors ${
            done
              ? 'border-accent/50 bg-accent/20 text-accent'
              : 'border-line text-transparent hover:border-line-strong hover:text-fg-faint'
          }`}
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
            <path
              d="M3.5 8.5 6.5 11.5 12.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <h3 className="mt-3 text-sm font-semibold tracking-tight text-fg">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer noopener"
          className="after:absolute after:inset-0 hover:text-accent"
        >
          {resource.title}
        </a>
      </h3>
      <p className="mt-0.5 text-2xs text-fg-faint">{resource.author}</p>
      <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">{resource.why}</p>
    </article>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
        active
          ? 'border-accent/40 bg-accent/15 text-accent'
          : 'border-line text-fg-faint hover:border-line-strong hover:text-fg-muted'
      }`}
    >
      {children}
    </button>
  );
}

function ProgressRing({
  done,
  total,
  pending,
}: {
  done: number;
  total: number;
  pending: boolean;
}) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 || pending ? 0 : done / total;

  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" aria-hidden>
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="rgb(var(--line))"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}
