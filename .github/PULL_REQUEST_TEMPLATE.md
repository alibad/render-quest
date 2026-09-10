## What changed

<!-- One paragraph, written as impact rather than as a file list: what a reader of
     the site can now see, understand or do that they could not before. -->

Closes #

## Checks

- [ ] `npm test` passes.
- [ ] If a canvas changed: `npx next build && npm run test:render` passes, after
      `npx playwright install chromium`.
- [ ] No new runtime dependency, and no rendering framework or scene graph.
- [ ] No analytics, no cookies, no third-party request, no stock or pre-rendered
      image.
- [ ] Prose matches the voice of the file it sits in — concrete, unhedged, British
      spelling, `&rsquo;` in JSX.
- [ ] A changelog entry at `todo/YYYY-MM-DD.md`.

## Anything you are unsure about

<!-- Optional. A half-finished pull request with an honest note about the part you
     could not settle is more useful than a confident one that hides it. -->
