/**
 * Tells the IndexNow engines that this site's pages exist. Run with
 * `npx tsx scripts/submit-indexnow.ts` to see what would be sent, and
 * `npx tsx scripts/submit-indexnow.ts --submit` to actually send it.
 *
 * Why this exists: on 2026-09-10 a `site:` search for this domain returned one
 * result, and it was the title of a landing page deleted on 28 August. Ten
 * labs, four technology guides and a glossary were not in the index at all.
 * Google's side of that needs the owner's account (see
 * todo/2026-09-10-search-index.md); IndexNow does not — Bing, Yandex, Seznam
 * and Naver take a POST from anyone who can prove they control the host, and
 * the proof is a key file served from that host.
 *
 * It does not send anything unless asked. Submitting a URL list to somebody
 * else's crawler is an act taken on the owner's behalf, so the default run
 * prints the payload and stops. Nothing here needs a login or a secret: the key
 * is public by design — it is served at the site root, and anyone can read it.
 *
 * Re-running it changes nothing that a first run did not already change. The
 * payload is a function of the deployed sitemap alone, no local state is kept
 * between runs, and the endpoint treats a repeat submission of the same list as
 * the same fact stated twice. So this is safe to run after every deploy.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SITE_URL } from '../lib/site.ts';

/**
 * The one endpoint, rather than one call per engine: it forwards a submission
 * to every participating engine, so a new participant needs no change here.
 */
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Next serves `public/` at the site root — verified against the existing
 * `public/logo.svg`, which answers 200 at `/logo.svg` on the live site — so the
 * key file lands one path segment below the root. It is named for what it is
 * rather than named after the key itself, which is the protocol's other option;
 * that costs one extra field in the payload (`keyLocation`) and buys a file
 * whose purpose is legible to the next person who opens `public/`.
 */
const KEY_FILE = 'indexnow-key.txt';
const KEY_PATH = path.join(process.cwd(), 'public', KEY_FILE);
const KEY_URL = `${SITE_URL}/${KEY_FILE}`;

const TIMEOUT_MS = 20_000;

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

async function get(url: string): Promise<{ status: number; body: string }> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'cache-control': 'no-cache' },
  });
  return { status: response.status, body: await response.text() };
}

/**
 * The key as it exists on disk, checked for shape before it is used.
 *
 * The protocol allows 8 to 128 characters of `[a-zA-Z0-9-]`. A key that fails
 * that is rejected by the endpoint with a 403 that says only "Forbidden", which
 * is a poor place to discover that a text editor added a newline.
 */
function localKey(): string {
  let raw: string;
  try {
    raw = readFileSync(KEY_PATH, 'utf8');
  } catch {
    fail(`no key file at ${KEY_PATH}. Generate one and write it there, then deploy.`);
  }
  const key = raw.trim();
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    fail(`${KEY_PATH} does not hold a valid key: expected 8-128 of [a-zA-Z0-9-], found ${JSON.stringify(raw)}`);
  }
  if (raw !== key) {
    console.warn(`  note: ${KEY_FILE} has whitespace around the key; serve the key alone.`);
  }
  return key;
}

/**
 * Every URL the deployed sitemap lists.
 *
 * Read from the live sitemap rather than from `app/sitemap.ts`, on purpose.
 * IndexNow is a claim that a URL is fetchable now, and the local file describes
 * the next deploy, not the current one. If a lab has been added but not shipped,
 * submitting it asks a crawler to fetch a 404 — and the engines count that
 * against the host.
 */
async function deployedUrls(): Promise<string[]> {
  const { status, body } = await get(`${SITE_URL}/sitemap.xml`);
  if (status !== 200) fail(`the deployed sitemap answered ${status}; nothing to submit.`);

  const urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (urls.length === 0) fail('the deployed sitemap parsed to zero URLs; the format must have changed.');

  const host = new URL(SITE_URL).host;
  const foreign = urls.filter((url) => new URL(url).host !== host);
  if (foreign.length > 0) {
    // A submission containing a URL from another host is rejected wholesale, so
    // this is worth catching before the request rather than reading it back as
    // a 422 about a list of twenty-three.
    fail(`the sitemap lists URLs on another host, which cannot be submitted: ${foreign.join(', ')}`);
  }

  return [...new Set(urls)].sort();
}

/** The key file has to be live and byte-identical, or the whole payload is refused. */
async function assertKeyIsServed(key: string): Promise<void> {
  const { status, body } = await get(KEY_URL);
  if (status !== 200) {
    fail(`${KEY_URL} answered ${status}. Deploy the key file before submitting; until it is live every submission is a 403.`);
  }
  if (body.trim() !== key) {
    fail(`${KEY_URL} serves ${JSON.stringify(body.trim())} but public/${KEY_FILE} holds ${JSON.stringify(key)}.`);
  }
}

async function main(): Promise<void> {
  const submit = process.argv.includes('--submit');
  const key = localKey();
  const urls = await deployedUrls();

  console.log(`\n  key        ${key}`);
  console.log(`  keyLocation ${KEY_URL}`);
  console.log(`  urls        ${urls.length}\n`);
  for (const url of urls) console.log(`    ${url}`);

  if (!submit) {
    console.log('\n  Dry run — nothing was sent. Re-run with --submit to submit this list.\n');
    return;
  }

  await assertKeyIsServed(key);

  const payload = {
    host: new URL(SITE_URL).host,
    key,
    keyLocation: KEY_URL,
    urlList: urls,
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await response.text()).trim();

  console.log(`\n  POST ${ENDPOINT} -> ${response.status} ${response.statusText}`);
  if (body) console.log(`  ${body}`);

  // 200 is accepted, 202 is accepted with the key still being validated. Both
  // mean the list arrived; everything else means it did not, and a caller in a
  // deploy script needs to know which without reading the output.
  if (response.status !== 200 && response.status !== 202) {
    fail(`submission refused with ${response.status}. Nothing was queued.`);
  }
  console.log(`  Submitted ${urls.length} URLs.\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
