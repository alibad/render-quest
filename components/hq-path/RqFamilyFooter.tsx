'use client';

import Link from 'next/link';

import { AUTHOR, DISCUSSIONS_URL, REPO_URL } from '@/lib/site';

import { HQ_FAMILY, HQ_HUB, HQ_TERRITORIES, type HqTerritory } from './hq-path';

/**
 * The kit's family footer, with two changes this site needs.
 *
 * The family logos come from /hq-family on this origin rather than from the
 * hub, so the page still makes no request to any other host (see /privacy).
 * And the first column keeps everything the old footer carried: the site's
 * own routes, the licences, and the line about nothing being pre-rendered.
 */
const ROUTES = [
  { href: '/labs', label: 'Labs' },
  { href: '/tech', label: 'Tech' },
  { href: '/learn', label: 'Learn' },
  { href: '/glossary', label: 'Glossary' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/about', label: 'About' },
];

const localLogo = (file: string) => `/hq-family/${file.replace(/\.(svg|png)$/, '.png')}`;

export function RqFamilyFooter() {
  const territory: HqTerritory = 'tools';
  return (
    <footer className="hqp-foot rq-foot">
      <div className="hqp-foot-in">
        <div className="hqp-foot-top">
          <div>
            <p className="hqp-eyebrow">A Human Quest</p>
            <p className="hqp-display">Every quest needs a path.</p>
          </div>
          <div className="hqp-foot-logos">
            {HQ_FAMILY.map((quest) => (
              <a key={quest.name} href={quest.url} title={quest.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={localLogo(quest.logo)} alt={quest.name} width={30} height={30} />
              </a>
            ))}
            <span className="hqp-here rq-here" title="Render Quest (you are here)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Render Quest" width={30} height={30} />
            </span>
          </div>
        </div>
        <div className="hqp-foot-cols">
          <div>
            <b>Render Quest</b>
            <p>
              Render Quest is a Human Quest in {HQ_TERRITORIES[territory]}. Every lab runs
              live on your GPU. Nothing here is pre-rendered.
            </p>
            <div className="rq-foot-routes">
              {ROUTES.map((route) => (
                <Link key={route.href} href={route.href}>
                  {route.label}
                </Link>
              ))}
              <a href={DISCUSSIONS_URL} target="_blank" rel="noreferrer noopener">
                Discussions
              </a>
              <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
                GitHub
              </a>
            </div>
          </div>
          <div>
            <b>Quests</b>
            {(Object.keys(HQ_TERRITORIES) as HqTerritory[])
              .filter((t) => t !== 'pattern')
              .map((t) => (
                <a key={t} href={`${HQ_HUB}/#t-${t}`} data-hqp-t={t}>
                  <span className="hqp-dot" />
                  {HQ_TERRITORIES[t]}
                </a>
              ))}
          </div>
          <div>
            <b>AI patterns</b>
            {HQ_FAMILY.filter((q) => q.t === 'pattern').map((q) => (
              <a key={q.name} href={q.url}>
                {q.name}
              </a>
            ))}
          </div>
          <div>
            <b>Human Quest</b>
            <a href={HQ_HUB}>Home</a>
            <a href={`${HQ_HUB}/about`}>About</a>
            <a href={`${HQ_HUB}/#hello`}>Say hello</a>
          </div>
        </div>
        <p className="rq-licence">
          © 2026 {AUTHOR} — code under the{' '}
          <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer noopener">
            MIT licence
          </a>
          , prose under{' '}
          <a href={`${REPO_URL}/blob/main/LICENSE-CONTENT`} target="_blank" rel="noreferrer noopener">
            CC BY 4.0
          </a>
          .
        </p>
        <small>RENDER QUEST · A HUMAN QUEST · DOHA · 2026</small>
      </div>
    </footer>
  );
}
