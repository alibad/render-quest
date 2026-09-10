import { atomFeed, FEED_CONTENT_TYPE } from '@/lib/changelog';

/**
 * The Atom feed.
 *
 * `force-static` because every other route here is statically generated and a
 * feed is no different: it is built from a list in the repository, so a request
 * cannot change the answer. Without it a Route Handler is free to become
 * dynamic, and a feed rendered per request is a server the site does not need
 * and cannot claim to be without.
 *
 * The XML itself is built in `lib/changelog.ts` rather than here, so it can be
 * parsed and checked without standing up Next.
 */
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(atomFeed(), {
    headers: { 'content-type': FEED_CONTENT_TYPE },
  });
}
