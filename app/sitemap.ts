import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import type { MetadataRoute } from 'next';

import { LIVE_LABS } from '@/lib/labs';
import { SITE_URL } from '@/lib/site';
import { TECHNOLOGIES } from '@/lib/technologies';

/**
 * Built from the same data the pages render from, so a new lab or technology
 * cannot be added without appearing here.
 *
 * `<lastmod>` is derived, not stamped. On 2026-09-10 `site:render-quest.com`
 * returned a single result, titled for a landing page deleted on 28 August, and
 * every URL in this file went out with no modification date at all — the one
 * thing on our side of the wire that a crawler uses to decide what to re-fetch.
 * The dates below come from git, because git is the only place that knows when
 * a page actually changed. A `lastModified: new Date()` on all twenty-three
 * URLs would be easier and would be a lie a crawler learns to discount.
 *
 * This module uses `node:fs` and `node:child_process`, which is fine: a sitemap
 * is generated once at build time and every route here is statically rendered.
 */

const ROOT = process.cwd();

/** `@/components/labs/TransformEssay` -> the file on disk, or null. */
function resolveModule(spec: string): string | null {
  const base = join(ROOT, spec.replace(/^@\//, ''));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    base,
  ];
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
  return found ?? null;
}

/**
 * Every first-party module a page reaches, transitively.
 *
 * A lab route is its page, its essay and its lab component — and the shader
 * helpers those two share, which is why this follows the graph rather than
 * reading one directory. Editing the depth-buffer helper changes what the depth
 * lab shows; a date that ignored it would say the page had not changed.
 *
 * Only `@/…` specifiers are followed. Bumping `next` is not a change to any
 * page's content, and treating it as one would move all twenty-three dates at
 * once, which is the same noise as stamping them with the build time.
 */
function firstPartyDeps(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const match of readFileSync(entry, 'utf8').matchAll(/from\s+'(@\/[^']+)'/g)) {
    const resolved = resolveModule(match[1]);
    if (resolved) firstPartyDeps(resolved, seen);
  }
  return seen;
}

/**
 * The file Next would render for a URL path, resolved the way Next resolves it:
 * take the literal directory when there is one, otherwise the dynamic segment.
 * `/tech/webgl` lands on `app/tech/[slug]/page.tsx`, so all four technology
 * guides share a source set and therefore share a date — which is true of them,
 * as the four pages are one component reading four entries in lib/technologies.
 *
 * Throws rather than degrading. A route this cannot resolve would silently lose
 * its date and nobody would notice; a build that stops names the route.
 */
function pageFile(routePath: string): string {
  let dir = join(ROOT, 'app');
  for (const segment of routePath.split('/').filter(Boolean)) {
    const literal = join(dir, segment);
    if (existsSync(literal)) {
      dir = literal;
      continue;
    }
    const dynamic = readdirSync(dir).find((name) => name.startsWith('['));
    if (!dynamic) {
      throw new Error(`sitemap: no app directory for "${routePath}" at ${relative(ROOT, dir)}`);
    }
    dir = join(dir, dynamic);
  }
  const file = join(dir, 'page.tsx');
  if (!existsSync(file)) throw new Error(`sitemap: no page.tsx for "${routePath}"`);
  return file;
}

/**
 * A shallow clone dates files by its own boundary commit, not by the truth.
 * Measured on this repo: in `git clone --depth=10`, `git log -1 -- lib/metadata.ts`
 * answers 2026-09-07T10:23:48-07:00; the file was last touched
 * 2026-08-31T19:09:29-07:00. Seven days too recent, and every file the boundary
 * truncates gets that same wrong date — which is exactly the
 * every-URL-changed-today lie, arriving by accident instead of on purpose.
 *
 * So: when the history is shallow, or git is not there at all, no URL gets a
 * date. The warning is the point as much as the guard — it lands in the build
 * log, which is somewhere a person can see it, and the runbook in
 * todo/2026-09-10-search-index.md says to check the deployed sitemap for
 * `<lastmod>` after a deploy.
 */
const HISTORY_IS_USABLE = (() => {
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (shallow === 'true') {
      console.warn(
        'sitemap: the build has a shallow git clone, so <lastmod> is omitted rather than guessed. ' +
          'Fetch full history in the build to restore it.',
      );
      return false;
    }
    return true;
  } catch {
    console.warn('sitemap: git is unavailable, so <lastmod> is omitted rather than guessed.');
    return false;
  }
})();

function newestCommit(files: string[]): Date | undefined {
  if (!HISTORY_IS_USABLE) return undefined;
  const stamp = execFileSync(
    'git',
    ['log', '-1', '--format=%cI', '--', ...files.map((file) => relative(ROOT, file))],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();
  return stamp ? new Date(stamp) : undefined;
}

/**
 * Every route's own sources, keyed by URL path, and the chrome they all share.
 *
 * Header, Footer and lib/site.ts are reached by all twenty-three routes, so a
 * change to any of them would move every date to the same day and say nothing
 * about which page is worth re-fetching. They are found by intersecting the
 * dependency sets rather than listed here, so nothing has to remember to add
 * the next shared component. app/layout.tsx is excluded by the same logic for
 * free: no page imports it, so it appears in no route's graph.
 */
const SOURCES = (() => {
  const paths = [
    '',
    '/labs',
    '/tech',
    '/tech/choose',
    '/learn',
    '/glossary',
    '/symptoms',
    '/roadmap',
    '/changelog',
    '/about',
    '/privacy',
    ...LIVE_LABS.map((lab) => `/labs/${lab.slug}`),
    ...TECHNOLOGIES.map((tech) => `/tech/${tech.slug}`),
  ];

  // The tuple annotation is load-bearing: without it the array literal widens to
  // (string | Set<string>)[][] and the Map's value type stops being a Set.
  const graphs = new Map<string, Set<string>>(
    paths.map((routePath): [string, Set<string>] => [
      routePath,
      firstPartyDeps(pageFile(routePath)),
    ]),
  );

  const allGraphs = [...graphs.values()];
  const shared = new Set<string>(
    allGraphs.length
      ? [...allGraphs[0]].filter((file) => allGraphs.every((graph) => graph.has(file)))
      : [],
  );

  return new Map(
    [...graphs].map(([routePath, graph]) => {
      const own = [...graph].filter((file) => !shared.has(file));
      return [routePath, own.length ? own : [pageFile(routePath)]];
    }),
  );
})();

function lastModified(routePath: string): Date | undefined {
  const sources = SOURCES.get(routePath);
  return sources ? newestCommit(sources) : undefined;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/labs', priority: 0.9 },
    { path: '/tech', priority: 0.9 },
    { path: '/tech/choose', priority: 0.8 },
    { path: '/learn', priority: 0.9 },
    { path: '/glossary', priority: 0.7 },
    { path: '/symptoms', priority: 0.9 },
    { path: '/roadmap', priority: 0.5 },
    { path: '/changelog', priority: 0.5 },
    { path: '/about', priority: 0.5 },
    { path: '/privacy', priority: 0.2 },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${SITE_URL}${route.path}`,
      lastModified: lastModified(route.path),
      changeFrequency: 'monthly' as const,
      priority: route.priority,
    })),
    ...LIVE_LABS.map((lab) => ({
      url: `${SITE_URL}/labs/${lab.slug}`,
      lastModified: lastModified(`/labs/${lab.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...TECHNOLOGIES.map((tech) => ({
      url: `${SITE_URL}/tech/${tech.slug}`,
      lastModified: lastModified(`/tech/${tech.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
