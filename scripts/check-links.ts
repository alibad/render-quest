/**
 * Verifies every curated link still resolves. Run with `npm run check:links`.
 *
 * Kept out of `npm run build` on purpose: a deploy should not fail because
 * somebody else's server is having a bad afternoon. Run it before shipping
 * changes to the reading list.
 *
 * Two rules, both learned from this list:
 *
 *  - Retry anything that broke below HTTP before believing it. One refused
 *    connection is weather; three in a row is a diagnosis. A checker that
 *    cries wolf gets ignored, and that is how a real death goes unnoticed.
 *  - Say how a link failed, not just that it did. A 404 is a page that moved
 *    and wants an editor. A TCP timeout is a host that is down and wants
 *    nothing from anyone here. Reporting both as `TypeError` is what made
 *    them indistinguishable.
 */
import { ALL_RESOURCES } from '../lib/resources.ts';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Per attempt, not per link. */
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 3;
const BACKOFF_MS = [1_000, 3_000];

/**
 * How long a hand-verified `botBlockedVerified` stamp stays worth anything.
 * The date is on the field so the exemption is falsifiable; without a shelf
 * life nothing ever falsifies it, and a page that 403s because it moved reads
 * exactly like a page that 403s because Cloudflare is being Cloudflare — for
 * ever. An expired stamp is not a failure, because re-verifying needs a human
 * with a browser. It is a separate line in the report asking for one.
 */
const STAMP_WINDOW_DAYS = 90;

const DAY_MS = 86_400_000;

type Outcome =
  | 'ok'
  | 'bot-blocked'
  | 'stale-stamp'
  | 'client-error'
  | 'server-error'
  | 'dns'
  | 'timeout'
  | 'tls'
  | 'refused'
  | 'network';

/** Outcomes worth trying again: nothing about them is settled. */
const RETRYABLE = new Set<Outcome>([
  'server-error',
  'dns',
  'timeout',
  'tls',
  'refused',
  'network',
]);

/** Outcomes that make the run exit 1. */
const FAILING = new Set<Outcome>([
  'client-error',
  'server-error',
  'dns',
  'timeout',
  'tls',
  'refused',
  'network',
]);

const TAG: Record<Outcome, string> = {
  ok: 'ok',
  'bot-blocked': 'BOT',
  'stale-stamp': 'STAMP',
  'client-error': 'GONE',
  'server-error': 'SERVER',
  dns: 'DNS',
  timeout: 'TIMEOUT',
  tls: 'TLS',
  refused: 'REFUSED',
  network: 'NETWORK',
};

/** What each failure mode means for whoever reads the report. */
const MEANING: Record<string, string> = {
  'client-error':
    'the page is gone or moved — someone has to choose a new destination',
  'server-error':
    'the server answered, badly. Their problem, not the link’s; check again next week',
  dns: 'the name does not resolve — the site may have been retired',
  timeout:
    'the name resolves but nothing accepts a connection — a host outage or a block on this network, not a URL that moved',
  tls: 'the certificate handshake failed — expired or misconfigured at their end',
  refused: 'the host refused the connection — nothing is listening there',
  network: 'the connection broke below HTTP',
};

interface Attempt {
  outcome: Outcome;
  /** The status code, or the most specific error code Node gave us. */
  detail: string;
}

interface Result extends Attempt {
  url: string;
  title: string;
  attempts: number;
  /** Age in days of the `botBlockedVerified` stamp, when there is one. */
  stampAge?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An unreadable date is not a verification. */
function stampAgeDays(stamp: string): number {
  const at = Date.parse(stamp);
  if (Number.isNaN(at)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - at) / DAY_MS);
}

/**
 * Node puts the interesting part of a fetch failure several `cause` levels
 * down: the top of the chain is always `TypeError: fetch failed`.
 */
function causeChain(error: unknown): string[] {
  const found: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 8; depth += 1) {
    const node = current as { name?: string; code?: string; cause?: unknown };
    if (typeof node.code === 'string') found.push(node.code);
    if (typeof node.name === 'string') found.push(node.name);
    current = node.cause;
  }
  return found;
}

function detailOf(codes: string[]): string {
  const code = codes.find((c) => /^[A-Z][A-Z0-9_]{3,}$/.test(c));
  if (code) return code;
  const named = codes.find(
    (c) => c.endsWith('Error') && c !== 'TypeError' && c !== 'Error',
  );
  return named ?? codes[0] ?? 'failed';
}

function classify(codes: string[]): Outcome {
  const has = (...needles: string[]) =>
    codes.some((code) => needles.some((needle) => code.includes(needle)));

  if (has('ENOTFOUND', 'EAI_AGAIN', 'NAME_NOT_RESOLVED')) return 'dns';
  if (has('CERT', 'TLS', 'SSL')) return 'tls';
  if (has('ECONNREFUSED')) return 'refused';
  if (
    has('TimeoutError', 'ETIMEDOUT', 'CONNECT_TIMEOUT', 'HEADERS_TIMEOUT',
      'BODY_TIMEOUT', 'AbortError')
  ) {
    return 'timeout';
  }
  return 'network';
}

function fromStatus(status: number, stampAge?: number): Attempt {
  const detail = String(status);
  if (status < 400) return { outcome: 'ok', detail };
  if (status === 403 && stampAge !== undefined) {
    return {
      outcome: stampAge > STAMP_WINDOW_DAYS ? 'stale-stamp' : 'bot-blocked',
      detail,
    };
  }
  if (status < 500) return { outcome: 'client-error', detail };
  return { outcome: 'server-error', detail };
}

async function attempt(url: string, stampAge?: number): Promise<Attempt> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return fromStatus(response.status, stampAge);
  } catch (error) {
    const codes = causeChain(error);
    return { outcome: classify(codes), detail: detailOf(codes) };
  }
}

async function check(
  url: string,
  title: string,
  botBlockedVerified?: string,
): Promise<Result> {
  const stampAge =
    botBlockedVerified === undefined
      ? undefined
      : stampAgeDays(botBlockedVerified);

  let last: Attempt = { outcome: 'network', detail: 'failed' };
  let tries = 0;
  for (let n = 0; n < ATTEMPTS; n += 1) {
    if (n > 0) await sleep(BACKOFF_MS[n - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1]);
    last = await attempt(url, stampAge);
    tries = n + 1;
    // A 404 is a 404 on the third try too. Only re-ask when the answer could
    // plausibly differ.
    if (!RETRYABLE.has(last.outcome)) break;
  }

  return { ...last, url, title, attempts: tries, stampAge };
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
  for (const r of results) {
    const retried = r.attempts > 1 ? `  (${r.attempts} attempts)` : '';
    console.log(
      `${TAG[r.outcome].padEnd(8)} ${r.detail.padEnd(24)} ${r.title}${retried}`,
    );
  }

  const failures = results.filter((r) => FAILING.has(r.outcome));
  const blocked = results.filter((r) => r.outcome === 'bot-blocked');
  const stale = results.filter((r) => r.outcome === 'stale-stamp');
  const flaky = results.filter((r) => !FAILING.has(r.outcome) && r.attempts > 1);

  console.log(
    `\n${results.length - failures.length}/${results.length} links reachable`,
  );
  if (blocked.length) {
    console.log(
      `${blocked.length} bot-blocked, hand-verified within ${STAMP_WINDOW_DAYS} days`,
    );
  }
  if (stale.length) {
    console.log(`${stale.length} bot-blocked on an expired verification`);
  }

  if (flaky.length) {
    console.log('\nRecovered on retry (one bad attempt each, not a dead link):');
    for (const f of flaky) {
      console.log(`  ${f.title} — reachable on attempt ${f.attempts}`);
    }
  }

  if (stale.length) {
    console.log(
      `\nNeeds re-verifying by hand — open each in a real browser, then move the` +
        ` botBlockedVerified date in lib/resources.ts forward:`,
    );
    for (const s of stale) {
      const age = Number.isFinite(s.stampAge)
        ? `stamp is ${s.stampAge} days old`
        : 'stamp is not a readable date';
      console.log(`  ${s.title} — ${s.url}  (403, ${age})`);
    }
  }

  if (failures.length) {
    console.log('\nNeeds attention:');
    const modes = [...new Set(failures.map((f) => f.outcome))];
    for (const mode of modes) {
      console.log(`\n  ${TAG[mode]} — ${MEANING[mode]}`);
      for (const f of failures.filter((r) => r.outcome === mode)) {
        console.log(
          `    ${f.title} — ${f.url}  (${f.detail} after ${f.attempts} attempts)`,
        );
      }
    }
    process.exitCode = 1;
  }
}

void main();
