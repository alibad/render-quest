# Contributing

Render Quest is ten lab essays with live WebGL and WebGPU figures, four technology
guides, a 61-term glossary and a reading path. Most of it is writing. The most
valuable thing you can send is a sentence that is wrong, with the sentence that is
right beside it.

Everything below is what a newcomer cannot guess from the file tree. If something
here turns out to be false, that is a bug in this file and worth an issue of its own.

- Live site: <https://www.render-quest.com>
- Good first issues: <https://github.com/alibad/render-quest/labels/good%20first%20issue>
- Questions and half-formed ideas: [Discussions](https://github.com/alibad/render-quest/discussions)
- Conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)

## What this project will not accept

This is an opinionated repository. Knowing the constraints before you write code is
worth an afternoon.

- **No rendering framework.** The labs are raw WebGL and WebGPU on purpose. The
  plumbing a framework hides — contexts, buffers, attribute pointers, the perspective
  divide, bind group layouts — is the actual subject of the site, so none of it is
  hidden. A pull request that introduces Three.js, regl, Babylon, a scene graph or a
  maths library will be declined, however much shorter it makes the code. `lib/math/`
  and `lib/gl/` exist for exactly that reason. Three.js does appear on the site, because
  one of the four technology guides is about it — as source listings in
  `lib/technologies.ts`, which is why `three` is in no dependency list here.
- **No new runtime dependency without a conversation first.** `package.json` has three:
  `next`, `react`, `react-dom`. Open an issue before adding a fourth.
- **No analytics, no cookies, no third-party requests.** `/privacy` says the site
  stores nothing and watches nobody, and `/roadmap` declines accounts, analytics and a
  newsletter with a reason. `app/` and `components/` contain no `<img>`, no `<iframe>`,
  no external `src` and no `fetch()`; the fonts are downloaded at build time by
  `next/font` and served from this origin. A change that adds an outbound request
  breaks a promise the site makes on a page of its own.
- **No image that is not a live canvas or generated SVG.** Nothing on the site is stock
  art or a pre-rendered picture — the home page hero is the projection lab with its
  controls removed, running in your browser. The social cards are generated per route
  from `lib/og-template.tsx`.
- **The five proposals on the [not doing list](https://www.render-quest.com/roadmap)**
  have each been considered and declined in writing. Read the reasons before proposing
  one of them again; a reason that is wrong is a fine thing to argue with, but argue
  with it rather than around it.

## The dev loop

Node 24 (`.nvmrc`, `engines.node`, and the version CI and Vercel run).

```bash
npm install
npm run dev            # http://localhost:3000
```

Four scripts, and they are not interchangeable:

```bash
npm test               # the suites named in package.json, no browser
npm run test:render    # every route in a real Chromium
npm run check:links    # every curated outbound link
npm run lint
```

`npm test` covers the matrix core and frustum derivation, the content registries, every
uniform the TypeScript asks for against the shader it is compiled with, the URL codec
and the technology chooser. It needs no browser, which is why `npm run build` is
`npm run test && next build` and Vercel therefore runs it on every deploy. Keep it
browserless: a suite that needs a browser goes in `test/render.smoke.ts` instead.

`npm run test:render` needs a browser and a build:

```bash
npx playwright install chromium
npx next build
npm run test:render    # spawns next start on :3111, or set SMOKE_BASE_URL
```

It loads every route, checks that each canvas actually drew something, that no lab is
showing its own failure card, that nothing logged an error, that no page scrolls
sideways at 375px and that no grid ends on a half-empty row. It reads the canvas in the
page rather than screenshotting it. Screenshotting was wrong twice over under the flags
this test runs with: the WebGL content did not appear in the capture at all, and the
site's blueprint-grid background showed through the transparent canvas and measured as
detail. The first version of this test passed while every lab was blank. WebGPU runs
under software rendering here and reports unsupported rather than drawing; the test
allows for that explicitly.

`npm run check:links` is deliberately outside the build. A deploy should not fail
because somebody else's server is having a bad afternoon, so it runs weekly on a
schedule instead (`.github/workflows/links.yml`). Run it by hand after changing
`lib/resources.ts`.

CI (`.github/workflows/ci.yml`) runs the lint, the tests and the build on every pull
request, and the rendering smoke test in a second job with a browser installed. The
link check is not part of either.

## Adding a lab is seven files

Six of the seven are enforced by `npm test`, so an incomplete lab fails the build
rather than shipping half-drawn.

1. `lib/labs.ts` — the registry entry: slug, order, prerequisite, technology, title,
   blurb, takeaway, concepts. Declare it in sequence order; a check asserts that,
   because the array was once declared with lab 6 before lab 5 and the contents page of
   a numbered site rendered them that way.
2. `components/labs/<Name>Lab.tsx` — the instrument. It must include `<Presets`, must
   include `<LabSource`, must let the camera be dragged and moved from the keyboard if
   it has one, and must hold the camera in the same state the URL encodes rather than
   in a ref.
3. `components/labs/<Name>Essay.tsx` — the written half. Every figure drives the lab's
   own `createScene` with the lab's own params, so a figure cannot drift away from the
   instrument at the foot of the page. This is the one file no test demands.
4. `app/labs/<slug>/page.tsx` — metadata built through `pageMetadata()`. Setting it by
   hand inherits the root layout's `openGraph` block, url included, and the page shares
   as the home page.
5. `app/labs/<slug>/opengraph-image.tsx` — its own social card.
6. A `GLYPHS` entry in `components/site/LabGlyph.tsx`, keyed by slug. Without one the
   lab's card renders an empty plate.
7. At least one term in `lib/glossary.ts` with `lab: '<slug>'`, or the lab's vocabulary
   panel is empty.

## The prose voice

Read a neighbouring `components/labs/*Essay.tsx` before writing a paragraph. The
register is consistent and it is not the register most documentation is written in.

- **Concrete over general.** Claims carry the number that makes them checkable: "half
  the light is the number 0.730, which is code 186 of 255", not "noticeably darker".
  If you cannot name the quantity, the sentence is not finished.
- **Unhedged, and honest about what is wrong.** The site says a shader on this very
  site once had the bug the lab is about, and says which. No "arguably", no "it is
  important to note", no marketing adjectives, no exclamation marks.
- **Explain the consequence, not the mechanism alone.** Every lab exists because
  something looks like a style rather than a bug. Say what the reader will see when it
  goes wrong, and where they will meet it.
- **British spelling.** Colour, rasterised, behaviour, normalise. Lab 8's slug is
  `colour`, so the spelling is load-bearing in the URL as well as in the prose.
- **Typographic apostrophes**, written as `&rsquo;` in JSX prose — there is not one raw
  `’` in any essay file — and as the character itself in `lib/*.ts` strings.
- **Em dashes sparingly**, and never as a substitute for a full stop that would do.

## Commits and changelogs

Conventional-commit prefixes, an optional scope in parentheses, and a subject that says
what changed for a reader. The types actually in use are `feat`, `fix`, `docs`, `test`
and `chore`. Lowercase, no trailing full stop. Recent history:

```
fix(labs): the front door was the thinnest page, and compute buried its first figure
test: check the premises lab 1's transpose claim rests on
docs: the README was still advertising two labs
```

Every working day gets a changelog at `todo/YYYY-MM-DD.md`, written as impact rather
than as a file list. For a pull request, the description is that note.

One logical change per pull request, and fill in
[the template](./.github/PULL_REQUEST_TEMPLATE.md).

## Dependencies

`.github/dependabot.yml` checks npm and GitHub Actions once a week, on Monday morning.
Minor and patch updates are grouped into a single pull request per ecosystem; a major
bump is outside the group and arrives on its own, because it is a decision. The open
pull request limits are three for npm and two for Actions, so a week with several
majors in it can open more than one. CI runs the tests and the build on each, so a
green Dependabot pull request is usually a merge; a red one is usually a real
incompatibility rather than flakiness.

Repository-level automated security fixes are a setting rather than a file
(Settings → Code security) and are not controlled from this repository.

## Licences

Two, because the repository holds two kinds of work:

- **Code** — the TypeScript and React, the GLSL and WGSL, `lib/math/`, `lib/gl/`, the
  tests and the build — under MIT, [LICENSE](./LICENSE).
- **Writing** — the essay prose, the glossary definitions, the lab blurbs and
  takeaways, the guide copy, the annotated reading path, the README and `todo/` — under
  CC BY 4.0, [LICENSE-CONTENT](./LICENSE-CONTENT). MIT applied to writing is a category
  error: it talks about "the Software" and says nothing useful about attribution.

The split runs through individual files rather than between them — a lab essay is prose
wrapped in TSX — so read `LICENSE-CONTENT`, which says where the line falls. By opening
a pull request you licence your code under the first and your writing under the second,
and you confirm you have the right to do so. If you are quoting or adapting
someone else's explanation, figure or dataset, say so in the pull request and name the
source — the reading path exists precisely so other people's material can be pointed at
rather than absorbed.
