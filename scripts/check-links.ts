/**
 * Verifies every curated link still resolves. Run with `npm run check:links`.
 *
 * Kept out of `npm run build` on purpose: a deploy should not fail because
 * somebody else's server is having a bad afternoon. Run it before shipping
 * changes to the reading list.
 */
import { ALL_RESOURCES } from '../lib/resources.ts';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

interface Result {
  url: string;
  title: string;
  status: number | string;
  ok: boolean;
  /** Known bot-blocker that was verified by hand; not a broken link. */
  blocked?: boolean;
}

async function check(
  url: string,
  title: string,
  botBlockedVerified?: string,
): Promise<Result> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(20000),
    });
    const blocked = response.status === 403 && Boolean(botBlockedVerified);
    return {
      url,
      title,
      status: response.status,
      ok: response.status < 400 || blocked,
      blocked,
    };
  } catch (error) {
    return {
      url,
      title,
      status: error instanceof Error ? error.name : 'failed',
      ok: false,
    };
  }
}

async function main() {
  const results: Result[] = [];
  // Sequential-ish batches: polite, and avoids tripping rate limits.
  for (let i = 0; i < ALL_RESOURCES.length; i += 6) {
    const batch = ALL_RESOURCES.slice(i, i + 6);
    results.push(...(await Promise.all(
        batch.map((r) => check(r.url, r.title, r.botBlockedVerified)),
      )));
  }
  report(results);
}

function report(results: Result[]) {
  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    const tag = r.blocked ? 'BOT ' : r.ok ? ' ok ' : 'FAIL';
    console.log(`${tag}  ${String(r.status).padEnd(7)} ${r.title}`);
  }

  const blocked = results.filter((r) => r.blocked).length;
  console.log(
    `\n${results.length - failures.length}/${results.length} links OK` +
      (blocked ? ` (${blocked} bot-blocked, verified by hand)` : ''),
  );
  if (failures.length) {
    console.log('\nNeeds attention:');
    for (const f of failures) console.log(`  ${f.status}  ${f.title} — ${f.url}`);
    process.exitCode = 1;
  }
}

void main();
