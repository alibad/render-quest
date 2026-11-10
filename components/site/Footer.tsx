import { HqSunset } from '@/components/hq-path/hq-path';
import { RqFamilyFooter } from '@/components/hq-path/RqFamilyFooter';
import { ASK_URL, REPORT_URL } from '@/lib/site';

/**
 * The foot of every route except the home page, which closes with the same
 * sunset and family footer itself.
 *
 * Since the Human Quest Path rollout (8 Nov 2026) the closing is the family's:
 * the sunset, then the family footer, which keeps everything the old footer
 * carried (every route, Discussions, GitHub, the MIT / CC BY 4.0 licence line
 * and "Nothing here is pre-rendered"). The two ways to reach a person stay
 * first, word for word.
 */
export function Footer() {
  return (
    <div className="rq-site-foot">
      {/* This site has no accounts, no comments and no analytics, so the routes
          named here are the only ones a reader has. Two links rather than one
          because reporting a defect and admitting you got lost are different
          acts with different costs. There is deliberately no email: the owner
          has not published one. */}
      <div className="mx-auto max-w-6xl px-5 pt-10">
        <p className="text-sm leading-relaxed text-fg-muted">
          Found a mistake here — bad arithmetic, a figure that will not run?{' '}
          <a
            href={REPORT_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Open an issue
          </a>
          . Stuck on a lab, or want to say which explanation did not land?{' '}
          <a
            href={ASK_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="link-accent"
          >
            Ask in Discussions
          </a>
          . Both reach me, and both are public.
        </p>
      </div>
      <HqSunset />
      <RqFamilyFooter />
    </div>
  );
}
