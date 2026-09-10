# The search index still sells a product deleted on 28 August

`site:render-quest.com` returns one result. Its title is **"Render Quest -
Master WebGL with Interactive Tutorials"**, it points at the root, and it
describes the 2024 landing template — shadow mapping, post-processing, a course
that does not exist. Ten labs, four technology guides, a 61-term glossary and
the reading path are not in the index at all.

Nothing on this side is blocking a crawler. That was checked before anything was
changed, and every check passed. The index is simply stale, and until today the
site emitted nothing that would tell a crawler otherwise.

This file is two things: the baseline, so that in two weeks there is something
to compare against, and the runbook for the steps that need the owner's own
accounts and cannot be done from a working tree.

## The baseline, 2026-09-10

Every number below has the command that produced it. Re-run the same commands in
two weeks; that is the whole point of writing them down.

| What | Today | Command |
|---|---|---|
| Pages of this site in Google's index | **1** | a `site:render-quest.com` search in a signed-out browser |
| Title of that one result | `Render Quest - Master WebGL with Interactive Tutorials` | the same search |
| Labs in the index | **0** | the same search |
| Title the home page actually serves | `Render Quest — learn graphics by moving the numbers` | `curl -s https://www.render-quest.com/ \| grep -o '<title>[^<]*</title>'` |
| Home page status | **200** | `curl -sI https://www.render-quest.com/ \| head -1` |
| Apex to www | **308** | `curl -sI https://render-quest.com/ \| grep -i location` |
| robots.txt | `Allow: /`, names the sitemap | `curl -s https://www.render-quest.com/robots.txt` |
| URLs in the deployed sitemap | **23** (25 after this batch: /symptoms and /changelog are new) | `curl -s https://www.render-quest.com/sitemap.xml \| grep -c '<loc>'` |
| `<lastmod>` in the deployed sitemap | **0** | `curl -s https://www.render-quest.com/sitemap.xml \| grep -c '<lastmod>'` |
| Live labs / technology guides / glossary terms | **10 / 4 / 61** | `grep -c "^  {" lib/glossary.ts`, and the registries in `lib/labs.ts` and `lib/technologies.ts` |

The gap between rows two and four is the whole issue: the index is thirteen days
behind a page that has been serving the correct title since the rebuild.

## What changed in the repo today

**`app/sitemap.ts` now emits `<lastmod>`, derived from git.** Its absence was
the only concrete deficiency on our side — `<lastmod>` is the field a crawler
uses to decide what is worth re-fetching. Each route's date is the newest commit
touching the files that produce that route: its `page.tsx` and, transitively,
every `@/…` module it imports, minus the three that every route reaches
(`Header`, `Footer`, `lib/site.ts`), which are found by intersecting the
dependency sets rather than listed. A change to the footer should not move
twenty-three dates at once; that is the same noise as stamping them all with the
build time.

Today that yields 2026-09-10T10:42:19+03:00 for twenty-two of the twenty-three
URLs and 2026-09-10T06:36:50+03:00 for `/tech/choose`, which is honest rather
than uniform-by-accident: commit `c76dbf1` touched 52 files this morning, and
`/tech/choose` is one of the few routes it did not reach. Regenerate the list
with `npx tsx -e "import s from '@/app/sitemap'; console.log(s())"`.

**A shallow build clone gets no dates at all.** In `git clone --depth=10` of
this repo, `git log -1 -- lib/metadata.ts` answers 2026-09-07T10:23:48-07:00;
the file was last changed 2026-08-31T19:09:29-07:00. Seven days too recent, and
every file older than the boundary would get the same wrong date. So the sitemap
checks `git rev-parse --is-shallow-repository` first and, if the history is
shallow or git is missing, omits `lastModified` entirely and prints a warning
into the build log. **After the next deploy, run the `<lastmod>` count above.**
If it comes back 0, the build clone is shallow, the guard did its job, and the
fix is to give the build full history — not to stamp a date.

**`public/indexnow-key.txt` and `scripts/submit-indexnow.ts`.** IndexNow is the
one submission that needs no account: Bing, Yandex, Seznam and Naver accept a
POSTed URL list from anyone who serves a matching key file. The key is public by
design. The script reads the *deployed* sitemap rather than the local one — a
URL that has not shipped yet is a 404 the crawler counts against the host — and
it prints the payload and stops unless given `--submit`. **It has not been run
with `--submit`.** Submitting to a third party is the owner's call.

## Runbook: the parts that need the owner's accounts

Google Search Console and Bing Webmaster Tools both need a signed-in account, so
none of this can be done from a working tree. In order:

1. Open Google Search Console and add a property. Choose **Domain**, not URL
   prefix, and enter `render-quest.com` — a domain property covers the apex, the
   `www` host and both schemes at once, which matters here because the apex 308s
   to `www`.
2. Verify with the **DNS TXT record** method. Search Console will show a
   `google-site-verification=…` string; add it as a TXT record on
   `render-quest.com` at the registrar, then press Verify. It can take up to an
   hour to propagate. **Use DNS rather than the HTML tag:** the tag method puts a
   Google-issued string in the site's own `<head>`, and `app/privacy/page.tsx`
   states that the site "runs no analytics, advertising or fingerprinting
   scripts" and "makes no request to any third party either" — a claim the owner
   should not have to start qualifying in order to read a crawl report.
3. In the new property, open **Sitemaps** and submit `sitemap.xml`. Confirm it
   reports 25 discovered URLs; anything less means it read a cached copy.
4. Open **URL Inspection** and request indexing for the twelve pages that matter
   most, one at a time: the home page, the ten labs (`/labs/transform`,
   `projection`, `pipeline`, `shading`, `textures`, `compute`, `instancing`,
   `colour`, `depth`, `shader`) and `/tech/choose`. Search Console rations these
   requests per day and will say so when the quota is reached; the rest of the
   twenty-three come through the sitemap rather than by hand.
5. In Search Console, check **Pages** (Indexing) for the one stale URL. If the
   old landing page appears under a URL that no longer exists, leave it alone:
   `next.config.mjs` already redirects `/tutorials`, `/tutorials/:slug` and
   `/tutorials/getting-started-with-webgl` permanently, and a permanent redirect
   is how a crawler is told to move the index entry. Verified live:
   `curl -sI https://www.render-quest.com/tutorials` answers 308 to `/labs`, and
   `/tutorials/getting-started-with-webgl` answers 308 to `/labs/transform`.
6. Open Bing Webmaster Tools and add the same site. It offers **Import from
   Google Search Console**, which is the shortest path once step 2 is done;
   otherwise verify by DNS TXT there too, for the same reason. Submit
   `sitemap.xml`.
7. Deploy this branch, so that `https://www.render-quest.com/indexnow-key.txt`
   is live and serves the key. Then run `npx tsx scripts/submit-indexnow.ts` to
   read the payload, and `npx tsx scripts/submit-indexnow.ts --submit` to send
   it. The script refuses to submit until the key file answers 200 with a
   byte-identical key, because until then every submission is a 403. A 200 or
   202 back means the list arrived.

## The check, two weeks out — 2026-09-24

Re-run every command in the baseline table and write the new numbers under this
heading. Done looks like:

- the `site:` search returns more than one result, and the labs are among them;
- the indexed title of the home page reads "learn graphics by moving the
  numbers";
- `curl -s https://www.render-quest.com/sitemap.xml | grep -c '<lastmod>'`
  returns 25.

If the count of indexed pages has not moved at all by then, the thing to suspect
is not the sitemap but whether verification in step 2 ever completed — an
unverified property silently reports nothing.
