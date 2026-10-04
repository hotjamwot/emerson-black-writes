# Emerson Black — Site Plan

**Status:** Live · `emersonblackwrites.com/` (storefront) + `/desk/` (Emerson's Desk) · Quartz v5
**Updated:** 2026-10-04 · **Owner:** HayJay + AI assistant

**Goal:** Write in Obsidian → run `Publish Brain.command` → the archive is live at
**`emersonblackwrites.com/desk/`**, built by GitHub Actions.

**Direction (settled 2026-10-01):** *a writer's site that happens to sell books.* Lead
with the person; the books link to Amazon anyway. The real target is readership →
**rights consideration for a screen adaptation, and signing with an agent.** An
industry reader wants evidence of range and craft, which is what the Desk holds and
the storefront was hiding.

> **How to read this file.** §1–7 and §13 are operational — paths, rules, commands.
> §8–9 are the incident and lesson log; the lessons are distilled, the narratives are
> in git. §11 is what has shipped, as one line each. **§12 is the only section with
> work in it.** Anything not in §12 is either settled or in the git log.

---

## 1. Architecture

```
  Obsidian vault (source of truth, iCloud-synced, unversioned)
        │  one-way rsync mirror (Publish Brain.command)
        ▼
  ~/Movies/PROJECTS/Websites/EBW website/     ← the only git repo
    ├─ index.html · bio.html · style.css · img/ · CNAME   ← storefront at /
    ├─ .github/workflows/deploy.yml                        ← builds Quartz, copies both, deploys _site/
    └─ brain/                                              ← Quartz source → served at /desk/
```

**Rules**
1. The vault is iCloud-synced and unversioned — never `git init` or `node_modules` inside it.
2. The repo lives outside iCloud and holds all code.
3. One repo, one domain, subpath routing. The deploy copies storefront files + `brain/public/` into `_site/`.
4. **Drafts** live in `Newsletters/_drafts/`; rsync `--exclude='_*'` plus `explicit-publish: true` keeps them out.
5. GitHub Pages Source must be **"GitHub Actions"** — otherwise GitHub's own Jekyll build
   overwrites the artifact and the Desk silently reverts (Incident I1).

## 2. Locations

| Thing | Path |
|---|---|
| Vault (edit here) | `~/Documents/Obsidian/…/Stormhouse/Emerson Black/` |
| Repo (code) | `~/Movies/PROJECTS/Websites/EBW website/` |
| Images (shared) | `~/Documents/Obsidian/Nexus/organise/Images/newsletters/<year>/` |
| Quartz config | `brain/quartz.config.yaml` |
| Brand CSS | `brain/quartz/styles/custom.scss` (~1,840 lines; 12 measured `[OVERRIDE]` blocks + the `[SAFE]` brand layer) |
| Theme / accent | `brain/quartz/theme/emerson.ts` |
| Verification | `brain/quartz/verify-default-mode.mjs`, `brain/quartz/theme/verify-brand.mjs`, `brain/scripts/verify-storefront.mjs`, `brain/scripts/check-desk-section.mjs`, `brain/scripts/check-desk-density.mjs` |
| Override audit | `brain/scripts/audit-overrides.mjs` + `brain/scripts/probe.mjs` — "is this override still needed?" |
| Plan (canonical, git-tracked) | `docs/EMERSON-BLACK-BRAIN-PLAN.md` |

## 3. Frontmatter spec

```yaml
---
title: Third Draft is Finished!
description: A writing update      # subtitle
date: 2025-10-21                   # publication date
updated: 2026-09-28
tags: [process, news]
aliases: []
type: post
publish: true                      # only publish: true is built
source: substack:176627320
---
```

- **`publish: true`** required (ExplicitPublish).
- **`date:`** required; the publish script writes `created:`/`modified:` from it. Never hand-edit those in `content/` — the mirror rewrites them.
- **`aliases:`** generates redirects if a slug ever changes; bookmarks survive.
- **`cover:` omitted** — Quartz uses it only for OG cards, and auto-filled covers mis-sell posts.
- ⚠️ Filters hide *markdown* only. Non-markdown assets in `content/` are copied publicly — keep private binaries out.

## 4. Images

Vault notes reference `![](../../../../../organise/Images/newsletters/<year>/<file>.webp)`.
The publish script rsyncs them into `brain/content/organise/images/newsletters/`
(lowercase `images` for Quartz slug casing), rewrites paths to root-relative
`/organise/images/…`, and **halts if any referenced file is missing**.

## 5. Daily workflow

1. Write/edit in Obsidian; add `[[wikilinks]]`, tags, `publish: true`.
2. Double-click **`Publish Brain.command`** — mirrors notes + images, rewrites image
   paths, runs the missing-image guard, syncs `created:`/`modified:`, commits and pushes.
3. Actions builds and deploys in ~1 minute.

## 6. Design system (locked)

- **Brand:** Gabarito (chrome) / Lora (body) / IBM Plex Mono (dates, code). Same three on
  both halves. Two Google Fonts links are unavoidable — Quartz core and the fonts plugin
  each emit one — but both are brand-identical.
- **Accent:** crimson `#CA2626` light / `#E63A3A` dark, owned by the `emerson` theme's
  `brandOverlay()` and asserted by `verify-brand.mjs`.
- **Default mode:** dark for first-time visitors; a returning reader's own choice always wins.
- **Measure:** ~74 characters, deliberately held rather than widened.
- **Layout:** `#quartz-body` grid is `320px auto` — the left sidebar keeps Quartz's own
  `$sidePanelWidth`; the empty right sidebar is collapsed rather than reclaimed.
- **Cascade rule:** theme overlays live in `@layer obsidian-theme`, which sits **after**
  `quartz-base` — so `quartz-base` wins at equal specificity. **Anything that must beat
  upstream belongs unlayered in `custom.scss`.** `custom.scss` is also appended last, so
  the *last* matching occurrence is the effective one.

## 7. Verification

```bash
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npx quartz build
node quartz/verify-default-mode.mjs     # browser checks need a static server on :8099
node quartz/theme/verify-brand.mjs
node brain/scripts/verify-storefront.mjs  # from repo root; rendered, needs Chrome
```

| Suite | Count |
|---|---|
| Desk — `verify-default-mode.mjs` | **159 checks, 0 failures** |
| Brand — `verify-brand.mjs` | passing |
| Storefront — `verify-storefront.mjs` | **34 checks, passing** |

The Desk scripts assert against the **built stylesheet / built HTML**; the storefront
script against the **rendered page**. Never the source — reading the input file is not
verification (§9).

## 8. Incidents

| # | Symptom | Cause | Status |
|---|---|---|---|
| I1 | Desk silently reverted to a Jekyll page | Pages Source left on "Deploy from a branch" | ✅ fixed + smoke-tested |
| I2 | Sun/moon toggle invisible (~3% opacity) | Theme paints icons via `background` + `mask-image`; a blanket `background` rule overwrote it | ✅ fixed — set `--icon-color` only |
| I3 | Body serif never reached paragraphs | `@quartz-community/quartz-fonts` appends its layer **last** and beat the pin | ✅ fixed — fonts pinned **unlayered** |
| I4 | Active sidebar item red-on-red | Theme's `.active` won on specificity, painting a crimson wash under crimson text | ⏳ **open** (F12) |

**I2 lesson:** for these components *the icon is the background*. Any blanket
`background` rule on an icon button destroys it.

**I5 (left sidebar 320px) is closed** — 11.9.7g settled on Quartz's own
`$sidePanelWidth`, which is the right answer rather than an override.

## 9. Findings & hard-won lessons

### 9.1 Standing rules

Each was bought with a failed deploy, a wrong fix, or a guard that lied. Full stories
in git; the ones worth not rediscovering:

- **A suite number means nothing unless you know which checks ran.** Browser-measured
  guards execute only when `public/` is served; otherwise they are skipped silently and
  the count still looks complete. F18 sat red and undetected for weeks behind a
  173/173. **Always serve `public/` on :8099 before trusting `verify-default-mode.mjs`**,
  and read the last line — it names the count, so compare it against expectations.
- **Ask the Quartz-native question first.** On every styling/structure request, the
assistant queries HayJay with the override-free alternative before touching upstream
selectors or plugin markup — e.g. tokens + own `eb-*` classes, additive slot components,
config options, or accepting the default. An override ships only on an explicit call.
- **Stock Quartz renders; brand lives in tokens + `eb-*`.** Nothing overrides upstream
selectors (`.page`, `.tag-link`, `.section`, layered theme rules). See §12.6.
- **A guard that cannot fail is worse than no guard.** Hit repeatedly: a check that
  grepped `index.html` for theme vars that live in the CSS bundle; two unreachable
  sitemap assertions; `--screenshot` captures that produced byte-identical PNGs (I11 —
  *measure geometry, never eyeball screenshots*).
- **A guard that the code is *present* is not a guard that the code *works*.** The
  11.9.7e header probe was `article h1`; on content pages the title is not inside
  `<article>`, so the probe matched nothing and the feature was inert with no error.
- **Assert absences, not presences**, for anything removed. Two of three 11.9.7f bugs
  passed guards asserting code was present; a guard that something is *gone* cannot pass
  for the wrong reason.
- **Assert a thing is on the *right* page, not merely that it is somewhere.**
- **Pin the token *and* own the property.** A component rule in `@layer quartz-base`
  reading a theme token cannot be fixed by pinning the token alone.
- **Ownership of a virtual page comes from `generate()`, not `match`.** Tag pages are
  virtual; `match` is never consulted.
- **A config value that resolves to `undefined` and is then ignored produces a build
  that looks fine and is wrong.** `condition: index` is not a condition — only
  `not-index` / `has-tags` / `has-backlinks` / `has-toc` exist.
- **A crashed suite is worse than a red one** — it hides every check that had not run yet.
- **Presence in the DOM is not visibility.** See F16.
- **After a visual change, measure the rendered thing.** Verifying the input is not verification (I10).
- **A check a comment can break is not a check.** Strip comments before pattern-matching (I9).
- **After fixing one unpinned token, enumerate the rest.**
- **An unpushed fix is an unfixed fix.** `deploy.yml` runs on push to `main`.
- **Commit messages: never write them to `/tmp`** — a concurrent write overwrote one mid-flight.

### 9.2 Findings

| # | Finding | Status |
|---|---|---|
| F1–F4 | CSS/plugin cruft — **cut**: 20 orphaned `eb-*` classes (**276 lines**; the "15" became 20 as the last five went dead too), the now-orphaned `--eb-shadow-lift` token, and 3 inert plugins (`canvas-page`, `bases-page`, `obsidian-plugin-excalidraw`) | ✅ fixed |
| F12 | Active explorer item "red-on-red" — **not reproducible in the build**: the theme declares `--nav-item-background-active: var(--highlight)` but nothing consumes it, so only our `--eb-surface` paints the active item. Re-check on device before trusting | ✅ fixed (verify) |
| F13 | The vacuous guard + wrong-layer pin | ✅ fixed |
| F14 | Two "known-failing" bio guards were unfixable, not flaky — S11 turned `bio.html` into a redirect stub, so both were specs describing an old site | ✅ fixed |
| F15 | **Two symptoms in one report were not one bug.** "Cards look different widths" + "too wide on mobile" shared a theory, got one fix; only the overflow half was real | ⏳ open — §12.1(b) |
| F16 | **"No dates" was "dates at 1.82:1".** Drawn in the DOM, invisible in light mode. Fixed with a real `--eb-meta` token + a computed-contrast guard | ✅ fixed |
| F17 | **`--gray` (#6b7a91) as *text* is 3.94:1 on the page background** — below AA. Used by section labels, `.folder-title`, tag pills, `h4–h6` and table headers | ⏳ open |
| F18 | **Three wordmark guards had been failing since 11.9.6 and nobody saw it**, because they only run when `public/` is served — a plain build skips them, so a permanently red section looked like a passing one | ✅ fixed |
| F19 | **The override audit's first pass called three blocks "deletable" and all three were wrong** — the probe had only loaded pages that do not contain the affected elements. A negative result measured on the wrong page is the same failure as a guard that greps the wrong file | ✅ fixed |

**F14's lesson — a red guard is not automatically a bug.** Two checks were filed as
"known-failing, ignore" long enough to become scenery. A guard that has never passed is
not flaky; it is a spec that no longer matches reality, and it was suppressing the real
signal. Ask whether it describes the site or describes an old site.

**F15's lesson — one theory unifying two reports is a hypothesis, not a diagnosis.** The
unifying explanation was written in the same sentence as the fix, which is where
confidence goes to hide. The fix was verified against the symptom that had a CSS-level
theory, and not against the one that did not.

**F16's lesson — "the feature is missing" and "the feature is invisible" produce the same
report and completely different fixes.** Presence checks cannot see contrast.

**F18's lesson — F14's, plus why it survived so much longer.** F14 was two guards
filed as "known-failing, ignore". F18 is three guards asserting the *old* EBW wordmark,
retired by 11.9.6 in favour of the stacked name — they could never pass again. The
difference is not severity but **invisibility**: browser-measured checks run only when
`public/` is being served, so in every plain `npx quartz build` they are skipped
entirely. A section that is silently absent is indistinguishable from a section that is
green, and the suite reported 173/173 while three of its checks were dead. Any guard
that needs a browser must be run deliberately, with the server up, or it is decoration.
Both halves now assert the *current* contract (stacked name, real `aria-label`, both
lines measured) and were confirmed falsifiable: hiding either line reports `0px`, and
dropping the `aria-label` reports `null`.

**F19's lesson — "no measured effect" is a claim about coverage, not about the code.**
The override audit disabled each of the 12 `[OVERRIDE]` blocks and re-measured. Three
came back with zero differences, which reads as "deletable". All three were wrong. The
probe had loaded the Desk and one post, and those blocks govern the year/tag archives
and the chrome fonts — none of which exist on either page. The element was never
measured. Re-run across all four page types, all three showed large changes.

The general form, which has now appeared three times in this project: **a negative
result is only as good as the coverage behind it.** Grepping `index.html` for theme
variables (F13), a coverage guard that compared zero pairs (12.1a), and this. The
defence is always the same — when a check reports "nothing", first ask *what would have
had to be true for it to fire*, and prove that. A "no change" verdict from a probe that
never loaded the element is the same error as a guard that greps the wrong file.

### 9.3 Dead code and traps worth remembering

- `@quartz-community/folder-page` and `tag-page` each **compile their own copy of
  `PageList` into `dist/`**, which drops `description`, and expose no option to swap the
  list component. The local `quartz/components/PageList.tsx` you find by grepping is a
  **dead copy** — nothing imports it.
- `treeTransforms` runs over the **markdown** tree before layout renders, so it can never
  see `.page-listing`.
- A plain-JS local plugin cannot import from `quartz/util` (it is loaded as a runtime
  module), so `tag-hub` / `year-foldouts` emit `"./" + slug` and guard on
  `fileData.slug !== "index"` themselves.
- `!slug.endsWith("/")` excludes **folder** slugs only. Root slug `"index"` does not end
  in a slash, so it survives that filter — which is how the Desk listed itself as a post.
- `minmax(460px, 1fr)` has a **hard 460px floor** and cannot narrow below it.
- `quartz/static/` is the **assets** directory and publishes to `<output>/static/` — a
  redirect written there lands at a path nothing links to, in a clean build.

## 10. Where the Desk stands (measured 2026-10-03)

- **49 published dispatches**, 2023→2026, all building; none lost in the 11.9.10 archive migration.
- **`/desk/`** = title + standfirst + **7 topic cards** (34 posts) + **4 collapsible year
  sections** (49 posts). No body copy.
- **Retired:** `/Newsletters/` and its four year pages all **redirect to `/desk/`**
  (`quartz/plugins/archive-redirects`) — all five were in the published sitemap, so they
  bounce rather than 404. Known regression: §12.1(c).
- **Tag taxonomy:** `set` 13 · `news` 9 · `systems` 7 · `reading` 7 · `craft-character` 6 ·
  `craft-plot` 5 · `bookcraft` 4. All 49 carry at least one — **no untagged orphans.**
- **The graph is not yet a map** — 8 tag nodes and ~7 edges reads as broken, not connected.
  It improves as wikilinks are added, which is why always-visible graph links and tag
  hover are blocked on the wikilink pass, not on styling.
- `contentIndex.json` exports no date field — worked around via `postDates.json`.

## 11. Shipped

One line each; the reasoning is in git. **S11 = storefront as a writer's site (2026-10-01/02),
11.9 = defect list, 11.9.10/11 = Desk (2026-10-02/03).**

| Item | Decision kept |
|---|---|
| 11.1 Findability | Generated sitemap from the actual `_site` tree so it cannot disagree with what shipped; no separate Books page |
| 11.2 Analytics | **Off.** Plausible ~$9/mo unjustified; Search Console answers the useful question free |
| 11.3a Date export | `contentIndex.json` has no date, so `export-post-dates.mjs` reads **frontmatter**, not `<time datetime>` (Quartz parses as UTC midnight → renders a day early) |
| 11.3b "From the Desk" | 3 hand-chosen craft posts + 3 generated, rendered at deploy into `_site`, never the source |
| 11.3c Storefront rehaul | Series pitch replaces the dated hero; `#about` replaces the `bio.html` stub (kept as a `noindex` redirect) |
| 11.4 Desk link in header | Moved footer-only → sticky header |
| 11.9.1–3 | Hero full-bleed, section rhythm, prequel cover 5:8 — all measured, not eyeballed |
| 11.9.4 Mobile | ✅ **Closed 2026-10-04** (§12.2) — header never wrapped (guarded across 7 widths); series hook's premise no longer stacks below two decorative images |
| 11.9.5(a) Desk hub | One card per topic, 5 most recent each; `news` excluded by name (award announcements date badly and pull a craft archive toward a newswire) |
| 11.9.5(b) Tag page descriptions | `listing-descriptions` — a **full replacement** for `tag-page`; the community plugin drops `description` and cannot be patched |
| 11.9.5(c) Standfirst on posts | Shipped *twice* and read as never shipped: it was on `/desk/` and `/tags/`, never in a post body. An empty paragraph under a title is worse than nothing |
| 11.9.6(b) Hover popovers | Off; verified `.popover{` count 3 → 0 in the built stylesheet |
| 11.9.7a Yellow tag pills | **Token pinned *and* property owned** — see §6/§9.1. Legacy desktop-only `.tag-link` block merged |
| 11.9.7b Header declutter | `content-meta` + ToC **disabled**, not restyled — the date was printed twice |
| 11.9.7c Mobile order | Article precedes the explorer. `order` cannot fix it: `grid-area`-placed items are placed by the template; redefining `grid-template` is the lever |
| 11.9.7d Mobile header | Nav only below 800px — search, reader mode, theme toggle gone. `display: none`, not `visibility`: a hidden-but-present control is still in the tab order |
| 11.9.7e/f Search + header collapse | Recorded causes were **wrong**; the fixes shipped only after real-device checking |
| 11.9.7g No sticky header | Reader's call after two failed attempts. Kept: wordmark, nav, border. Removed: stickiness *and* the translucency that only mattered because content scrolled under it |
| 11.9.9 Hub cards | Neutral surface (a "muted grey" `--secondary` is actually the crimson accent, so the cards came out red-on-red) |
| 11.9.10 Retire `/Newsletters/` | Folded into the Desk as `<details>` by year. Recent-notes overflow link **off**: it counts files, not dispatches, and a missing list is worse than a wrong number |
| 11.9.11 Desk cleanup | Body emptied; grid floor made adaptive; year rows gained standfirsts |
| 12.1(a)/12.1(d) + F1–F4 (2026-10-03) | Desk metadata contrast fixed with a real `--eb-meta` token (light **5.57:1** / dark **6.56:1** on the card; was `--lightgray` at **1.82:1**); `.eb-hub__desc` aligned to `.eb-listing-desc`; the contradicting per-tag count chip dropped; the orphaned landing kit pruned (**276 lines**); `canvas-page` / `bases-page` / `obsidian-plugin-excalidraw` disabled. **17 new checks**, all proven red by breakage |
| 12.1(b) card widths (2026-10-04) | **Not a grid bug: `.page article` capped every card at 780px + `margin-inline: auto`, which un-stretches grid items** — measured 399–524px ragged at 1440px. Scoped to `:not(.eb-hub__card)`; tracks now equal |
| 12.1(c) year archives (2026-10-04) | **New `year-archives` page-type plugin**: the four `/newsletters/<year>/` URLs are real listing pages again (newest first, title + standfirst + tags, tag-page row shape); top-level `/newsletters/` stays a redirect |
| 12.7 (2026-10-04) | **`eb-latest`** puts the newest five dispatches first on the Desk, with standfirsts — replacing a `recent-notes` list that was rendering ~48k chars into the document, inside the sidebar graph. The homepage's hand-written "Start here" trio is **deleted**; its Desk section is now **six dense rows in two columns** in the same shape as the Desk, plus a one-line topic sentence. Guard arithmetic rewritten to minimums + resolved tag links, and **density is now measured** (`check-desk-density.mjs`) |
| 12.7d / 12.8 (2026-10-04) | **11.7 closed as already-shipped** — the Books section already shows 0→1→2→3 with hooks and a free-novella start-here. **The Books section stays hand-maintained** (author's decision): its source of truth is an Obsidian vault outside the repo, so automating it would *add* upkeep. Given the **lightest guard in the repo** — cover files exist, links are Amazon short links, books are in order |

## 12. Open items

### 12.1 The four Desk notes — all four shipped ✅

Each was checked against the build, and three turned out to be different from how they
were phrased. **All four are done** (§11, 2026-10-03/04); the remaining styling item is
large desktop images (deferred as cosmetic, §12.4).

**(a) "Dates have not been added to /desk/ posts" → they were drawn and invisible.** ✅
Done. `.eb-hub__date` was `color: var(--lightgray)` on the card surface — **1.82:1** against
a 4.5:1 AA floor, which is why it read as "no dates". Fixed with a real metadata token
`--eb-meta` (light `#556072` = **5.57:1**, dark `#8b98ab` = **6.56:1** on the card), applied
to `.eb-hub__date`, the three year-row metadata rules and the disclosure chevron;
`.eb-hub__desc` now matches `.eb-listing-desc` (`--dark` @ 0.85 = **10.3:1**). A computed
contrast guard resolves the tokens from the *built* stylesheet and fails under AA. Decision
taken: the date stays under the title. `--lightgray` is a decoration token, so the
"enumerate the rest" rule was applied to every Desk use of it.

**(b) "Card widths are still different" → the reading column was capping the cards.** ✅
Done 2026-10-04, diagnosed from the built DOM. The hub cards are themselves
`<article class="eb-hub__card">`, so `.page article { max-width: 780px;
margin-inline: auto }` capped every card *and* un-stretched it (auto margins absorb
the track's free space): measured 399–524px ragged at 1440px with equal 523.5px
tracks underneath. Scoped to `.page article:not(.eb-hub__card)`. The hub grid was
never broken; the `min(460px, 100%)` floor stays as the mobile-overflow fix.

**(c) Sidebar year folders bounce to `/desk/` → the folders were right; the pages were missing.** ✅
Done 2026-10-04. 11.9.10 retired `/newsletters/<year>/` to redirect stubs, but the
Explorer builds its tree from the file tree, so the sidebar kept advertising four
folders that bounced. New **`year-archives` page-type plugin** (`generate()` claims
`newsletters/<year>/index` — the `/index` suffix is load-bearing: it is the URL the
sidebar's folder-link points at): each year is a real listing page again, newest
first, title + standfirst + tags in the tag-page row shape. Top-level `/newsletters/`
stays a redirect (nothing links there but old bookmarks do). `folder-page` stays off;
`archive-redirects` emits only the top-level stub now. Suite asserts all four pages
exist, are not stubs, and list exactly their year's posts with standfirsts.

**(d) Drop the topic cards' post counts.** ✅ Done. `.eb-hub__n` printed the tag's full
count (`15`, `9`, `7`…) above a list of five; `.eb-hub__more` ("6 more on process") already
carries the honest remainder, so the chip was deleted from the `tag-hub` component *and* the
stylesheet. The suite asserts `eb-hub__n` is absent from the built HTML and CSS.

### 12.2 ✅ 11.9.4 Mobile — closed by measurement (2026-10-04)

Closed by 11.9.7c/d (header nav-only; article precedes explorer) and finished here.
**Both open items were filed as "needs a real phone". They did not — they needed
rendered geometry, which `verify-storefront.mjs` already had.** The suite was
extended from 3 widths to **7 (1400/ 1100 / 900 / 768 / 701 / 690 / 390)**,
chosen to straddle both named breakpoints, then each item was measured before any
CSS was touched. **One of the two was real; one was not.**

- **(a) The crowded header — NOT A DEFECT. It never wrapped at any width.** All
  four nav links share one `top` at **every** width from 1400 down to 701, and the
  nav's right edge stays inside the header at all seven (1218 ≤ 1250 at 1400;
  374 ≤ 390 at 390). §12.2(a) guessed "most crowded at 701–900px" from reading CSS
  and measuring nothing; the rendered row simply fits, because the wordmark is
  allowed to shrink before anything is dropped. The suspicion was reasonable and
  the conclusion was wrong — which is the same lesson as the override audit in
  §12.6, one layer up: **a claim of crowding is not a measurement of it.**
  What did ship is the *guard*: nav links are read from computed style, so a
  `display: none` item cannot masquerade as present, and "one line" is asserted
  as one distinct `top` rather than eyeballed.
- **(b) The premise below two silhouettes — REAL, fixed.** Below the 768px
  breakpoint the grid goes to one column and stacks in DOM order, which is
  visuals → text → visuals. Both images are decorative (`alt=""`,
  `aria-hidden="true"`) and ~250px tall, so the band opened on **two pictures
  before any words**: measured text top **2716 vs image top 2634** at 768, and
  **4194 vs 4190** at 390 — the premise sat ~278px down the band, under both.
  Fixed with `.series-hook > .series-hook-text { order: -1 }` in the existing
  `max-width: 768px` block. **`order` works here and did NOT in §11.9.7c**, and
  the difference is the whole point: no child of this grid is `grid-area`-placed,
  so items are placed by source order and `order` is the honest lever. Text now
  leads at every width (4194 vs 4893 at 390).
- **Two of my own new checks were wrong on first run, and both were caught by
  measuring instead of fixing.** The desktop "text between the silhouettes" check
  was written backwards (`t[0] < v1[2]`) and failed a band that is measurably
  correct — v1 ends at 352, text runs 380…1020, v2 starts at 1048. And I first
  asserted a 14px floor on nav type, which would have failed the design's
  deliberate `0.72rem` uppercase micro-labels — the 14px floor in the CSS is
  about *prose*, not navigation. Both were recalibrated to what the design
  actually is, not relaxed to whatever passed. **A guard that rejects the good
  case trains you to ignore the guard**, which is the failure mode §9's false
  failures were about.
- **Proven red, not assumed green.** With `order: -1` reverted to `order: 0` the
  suite fails on exactly the 4 premise checks and nothing else; restored, it
  passes. That is the standard every new check here is held to.

### 12.3 🟢 Product — untouched, in ceiling order

- **11.6 Bridge the craft writing to the books** — highest ceiling, zero cost. A line on
  craft posts pointing at the books that used the technique turns the Desk into a funnel,
  which is the actual goal. **Revision after §12.8:** this was previously costed as
  *needing* a book data layer. It does not — the four books are named in `index.html`, so
  a `book: 3` line on a post is four characters in frontmatter and a plugin read. The
  **loglines are already written** in the vault, so the hook copy costs the author
  nothing. Cheaper than originally assessed; still the best remaining item.
- **11.8 A unifying "How I Write" page** — craft posts next to the books they produced;
  arguably the most agent-interesting page on the site. Flagged, not built.
- ~~**11.7 Series reading order**~~ — **CLOSED as already-shipped (§12.7d).** The line
  read *"visible 0→1→2→3 with one-line hooks and a 'start here' for the free novella"*, and
  the Books section **already is exactly that**: explicit `Book 0`–`Book 3` labels in
  ascending order, a one-line hook on each, and Book 0 badged `Free` with the line
  *"the prequel novella, and the easiest place to start"*. Nothing to build. It was
  proposed twice by reading the checklist line without opening the page — the same error
  as mistaking the Safari CSS cache for broken pills. **An item on a plan is a claim about
  the site, not a description of the site; verify before building.**
- **11.5 Tag constellation, not a graph** — settled: no force graph on the homepage. Static
  chips sized by post count, linking to tag pages, no JS. **Largely SHIPPED by 12.7:**
  the homepage now carries exactly this — 7 static chips with post counts, linking
  to real tag pages, no JS. What is left is only whether they should also appear
  higher up (the hero), which is the remaining taste question. The full graph
  returns once the link graph is dense enough.

### 12.7 ✅ The Desk leads with recency; the homepage's last hand-written list is gone (2026-10-04)

Both items came from the reader, not from an audit. *"I click Desk and always scroll to the year dropdowns, because I want the most recent posts and to work backwards"* is a report of the page's ordering being wrong. The homepage's Desk section was flagged at the same time as manual upkeep.

**(a) The newest dispatches, at the TOP of the Desk.** New `eb-latest` plugin, `beforeBody` priority **4** — above the topic cards (8) and the fold-outs. **The list already existed and was invisible**: `@quartz-community/recent-notes` was enabled, rendering, and sitting at offset **~48465** in the built index, *inside the sidebar's graph container* — after everything, off the reading path. The page was answering the question in the one place nobody scrolls. Disabled it and replaced it with one that renders in the body, with standfirsts. It could not have been restyled: no `beforeBody` priority lands it above the hub, and it drops `description`, which is the 11.9.11 bare-titles complaint all over again. Five rows, one-line-clamped standfirsts, `--eb-meta` dates (never re-introducing the 1.82:1 `--lightgray` bug 12.1(a) fixed).

**(b) The homepage's topic strip replaces the curated trio.** The three hand-chosen "Start here" posts are **deleted**, not relocated. They were the last hand-maintained list on the site, and their guard could only check that a URL matched a *shape* — a renamed post left a dead link and passed. Now generated entirely from tags that were already in every post's frontmatter; `news` excluded by name, matching tag-hub. `tags` is now exported by `export-post-dates.mjs` and handles **both** YAML shapes — verified against `writing-abroad.md`, the one block-sequence file in the archive, which a flow-only regex would have silently dropped.

**(c) …then the section was rebuilt twice more, because it was wrong twice.** Worth recording, because both failures were invisible to a source-level check and only showed up when rendered:

- **Three cards → six dense rows.** The cards were rejected as *"large and clunky"*, and the real cause was **density, not padding**: three cards out of forty-nine posts means you see three, and each shouts equally, so nothing leads. Measured after: **6 posts in 181px (30px each)** against the cards' **3 in 168px (56px each)** — nearly double the content per screenful. The rows use **the Desk's own shape** (`.eb-latest`), so the homepage stops describing the archive and becomes a window onto it. The standfirsts do the pulling and were already written as hooks; **no copy is authored for this page.**
- **Topic pills → one sentence.** Seven chips reading `process 15` were not *broken* — measured, they rendered correctly. They failed because a bare label plus a number **answers no question**, and as a block they competed with the list above them, which is the same mistake the cards made. Seven names on one line give the same signal for a third of the weight.
- **The grouped-with-a-written-line idea was rejected on maintenance, not taste.** *"Writing can be hard. It's important to keep a strong mindset"* is one hand-written sentence **per topic, forever** — the same category of upkeep as the curated trio this change deleted. What is free is the topic name; that is what ships.

**The guards were rewritten, not renumbered.** The old *"exactly 6 = 3 curated + 3 latest"* described a split that no longer exists, so it is now: ≥3 topics, every tag href **resolved against the built tag pages** (a dead link now fails — proven red by pointing `bookcraft` at `bookcraff`, which the old shape-check would have passed), ≥3 latest picks, all pointing at dated posts. Counts are **minimums, not exact numbers** — an exact count is a number to edit every time a post is written, which is the upkeep this change exists to remove. `check-desk-section.mjs` runs the same block locally against an assembled `_site`.

**Three guards proven red, and one false positive caught by measuring.** eb-latest's ordering guard fails when its priority moves to 40; its newest-first and standfirst guards fail on a reversed sort and stripped descriptions. Then the *"Start here must not come back"* check fired on a **correct** build — because `index.html`'s own comment explains that 12.7 removed it, and grepping raw HTML reports that comment as the feature returning. Both the local checker and the CI guard now strip comments before matching (the I9 rule). Empty tags fail loudly and name the suspect script; the renderer is idempotent across repeat runs.

**§12.7(c) added two more guard sets, because a section can fail in ways a source check cannot see.** `check-desk-density.mjs` measures the rendered block and asserts *density as a property*: two columns wide, one column on a phone, every standfirst clamped to a single line, and posts-per-height under 40px. The clamp is proven red by removing it (tallest goes 19px → 39px, and 58px on mobile). `check-desk-section.mjs` asserts that **neither rejected design can return** — `desk-pick` and `desk-topic__n` in the markup now abort the deploy, because a guard that only checks what is *present* is how the old one missed a section that had quietly changed shape.

**One of the new density checks was itself wrong, and measuring caught it.** It first compared the block's height against the old cards' 168px and failed at 181px — but three cards was ONE row of three and six rows in two columns is THREE rows of two, so the blocks were never comparable at equal height. The assertion is now posts-per-height, which is what "denser" actually means.

**§12.8 The Books section stays hand-maintained — a settled decision, not an oversight.** Author's call after being shown the automation. The book metadata lives in an Obsidian vault (`~/Documents/Obsidian/Nexus/…/See in Silverbridge`, **not a git repository**), so a build reading it would work locally and **fail in CI**. Every alternative costs something the author actually values: a committed `books.json` means **returning to VSCode to re-run a script whenever a book file moves**; vendoring the files breaks the vault; pointing the build at the vault breaks CI outright. The author's stated preference: *"Easier to come back to VSCode if the ASIN changes, or when a new book publishes, and just update that section in `index.html`."*

This is the **general lesson of §12.8** — automation was the right default for the *Desk*, which is generated from files that are **already in this repo** and regenerate on every deploy, so it costs nothing. The Books section is the counter-case: its source of truth is **outside the repo**, so automating it would *add* upkeep rather than remove it. The rule that follows: **generate from what is already committed; leave alone what is maintained elsewhere.** A system that is technically superior and that you will not maintain is worse than the manual thing you will.

**The guard is therefore the lightest in the repo** — it does not try to know the right answer, only to catch the three mistakes invisible in a diff: a **typo'd cover filename** (a broken image nobody notices until it ships), a buy link pasted as a full product URL instead of a short link, and a book missing or out of series order. It **deliberately does not fetch the URLs**: a network call per deploy fails when Amazon rate-limits or the runner has no egress, and a deploy that fails for a reason the author cannot fix is worse than a stale ASIN. All three proven red in both the local checker and the CI block.

**Two things the vault revealed that the site does not yet say.** The vault holds **six** books, but only four are released — `A Supermodel Slain` is `3rd draft` and `Silver and Gold` is `1st draft` (151k words, *"Once Silverbridge series finishes…"*). Filtering on `status` would need **matching, not `==`**, since values are free text (`"1st draft is 151,000 words"`). And Book 0 is numbered **`0.5`** in the vault but reads **"Book 0"** on the site. Neither blocks anything today; both are the kind of drift a manual section accumulates, which is why the count and the order are now asserted.

**No new frontmatter, no new data, nothing to maintain.**

### 12.4 🟠 Cosmetic — shipped 2026-10-03

Done: F1–F4 cruft prune (20 orphaned `eb-*` classes, 276 lines; 3 inert plugins off),
§12.1(a) contrast, §12.1(d) count chip.

**Two items that were filed here are stale and are removed.** "Mobile sidebar above
content (needs a single-column breakpoint + `order`)" was already fixed by 11.9.7c — the
`grid-template` redefinition at `max-width: 800px` in `custom.scss` §4c — and §12.2 says so
on the same page. I4 (F12) does not reproduce in the build: the theme declares
`--nav-item-background-active` but nothing consumes it. Remaining cosmetic work is whatever
`--gray`-as-text (F17) becomes.

### 12.5 TASTE — HayJay's call, not a defect

- **Backlinks** sit `position: left`, so desktop puts them in the sidebar and mobile under
  the article. Defensible as-is; whether related posts deserve a more prominent slot
  (e.g. an end-of-post "related" section) is a taste call.

### 12.6 🟢 The Quartz truce — stop fighting the theme (agreed 2026-10-04)

Settled direction, not a defect list. Quartz stays as the content engine (Obsidian →
markdown → HTML + `contentIndex.json` + graph); brand lives in tokens and our own
`eb-*` classes; upstream selectors and plugin markup are read-only unless HayJay
explicitly approves an override after seeing the Quartz-native alternative (§9.1).

- **Split `custom.scss` (done 2026-10-04, comment-only).** All ~1,800 lines now carry
  a banner: `[SAFE — brand]` (own `eb-*` classes, `:root` tokens — survives any
  update) or `[OVERRIDE — upstream]` (restyles Quartz's selectors, with the
  Quartz-native fallback named so a future LLM can price the fight before
  joining it). LLM edit rule from here: touch `eb-*` and tokens only; an upstream
  selector needs an explicit ask first.
- **Every override is now MEASURED, and none is deletable (2026-10-04).** The open
  question was whether the truce was real or cosmetic. Answered by experiment
  rather than argument: each of the 12 `[OVERRIDE]` blocks was disabled, rebuilt,
  and re-measured in Chrome, then diffed against the baseline. **All 12 change
  something a reader sees** — body copy reverts to the system sans, the graph
  collapses to 250px, the article loses its 780px measure, the explorer goes
  16px, the page title loses its uppercase, the listing grid loses its spacing.
  Each banner now carries the measured consequence, and five new guards keep the
  inventory intact.
  **The two that matter most are proven, not assumed.** Removing the highlight
  block paints search hits `rgba(255, 208, 0, 0.4)` — the amber this whole truce
  was called to kill. Removing the pill block turns every tag pill into a
  `0.18`-alpha crimson slab at `8px` radius, because upstream's
  `a.internal { background-color: var(--highlight) }` matches a pill and no
  Quartz-native setting stops that short of not using `<a>`. **So: the fighting
  is bounded, and it is nearly all load-bearing.** CSS is byte-identical — this
  was documentation only.
  **Method worth keeping:** the first pass reported three blocks as having "no
  measured effect". All three were wrong — its probe had loaded only the Desk and
  one post, and those blocks govern the year/tag archives and the chrome fonts,
  which exist on neither. Re-run across all four page types and all three proved
  load-bearing. A deletability claim measured on a page that does not show the
  element is the same error as a guard that greps the wrong file.
- **Additive plugins stay; replacement plugins are pinned.** `tag-hub`, `year-foldouts`,
  `post-deck`, `post-dates` render into slots upstream leaves open — update-safe, keep.
  `listing-descriptions` (replaces `tag-page`) and `year-archives` (replaces `folder-page`)
  reimplement upstream pages: keep, but pin Quartz in `package.json` and check exactly
  those two files on update day.
- **Storefront ↔ Desk palette: aligned, and now guarded (2026-10-04).** `style.css`
  already carried the Desk's dark palette as CSS variables, so the alignment work
  was done; what was missing is that **only the accent was ever checked**. The other
  five shared colours and all three typefaces were copied by hand and unguarded —
  change `--gray` in `quartz.config.yaml` and the Desk's muted text moves while the
  storefront's stays, and the site silently becomes two brands. Five new checks
  compare both halves against the config, read from it rather than hardcoded.
  **Trap worth remembering: `lightgray` and `darkgray` swap meaning between modes.**
  In lightMode `lightgray` is the pale hairline; in darkMode it is the dark surface.
  Reading the names "obviously" produced two false failures on first run. Mapping is
  written out by value, with the swap explained in place.
- **Provenance, not a pin (done 2026-10-04).** `brain/package.json` *is*
  `@jackyzha0/quartz` 5.0.0 — core is **vendored**, not a dependency, so `npm update`
  cannot move it and there is nothing to pin. What was missing was a record of what
  we forked from, now in a `//ebw` block: upstream URL, tag, full 40-char commit,
  fork date, our edit surface, and a 5-step upgrade-day procedure that names the
  two replacement plugins as the first thing to check. Five offline guards keep it
  honest (notably: `version` must equal `v${upstreamRef}`, since bumping one and not
  the other yields a record that looks authoritative and is wrong). We are on
  **v5.0.0, the latest tag**.
- **An opt-in upstream check.** `brain/quartz/check-quartz-upstream.mjs` — read-only,
  needs network, three distinct exit codes (0 current / 1 behind / 2 unreachable) so
  a flaky connection is never read as "you are out of date". **Not** in the verify
  suite, which must never require a network. Sorts versions *numerically*: a string
  sort picks `9.0.0` as newer than `10.0.1`, verified.
- **Updates become deliberate.** That record + the verify suites turn an upstream
  release into bump → build → read the failures, instead of surprise catchup.

## 13. Commands

```bash
# Node 22 (keg-only)
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Build + verify
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
npx quartz build
node quartz/verify-default-mode.mjs        # serve public/ on :8099 first for browser checks
node quartz/theme/verify-brand.mjs

# Storefront geometry (rendered; needs Chrome) — run from the repo root
node brain/scripts/verify-storefront.mjs _site

# The homepage Desk section: content + rendered density (12.7c)
node brain/scripts/check-desk-section.mjs _site
node brain/scripts/check-desk-density.mjs _site

# Has upstream Quartz moved? (§12.6 — needs network, READ-ONLY, safe to run anytime)
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain && node quartz/check-quartz-upstream.mjs
#   exit 0 = up to date · 1 = upstream is ahead · 2 = could not reach GitHub
#   Deliberately NOT part of verify-default-mode: that suite must never need a network.

# Re-run the override audit — "is this override still needed?" (§12.6)
# Needs the server up. ~10 min: 12 rebuilds x 4 pages x 2 widths.
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain/public && python3 -m http.server 8099 &
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain && node scripts/audit-overrides.mjs
#   Restores custom.scss automatically, even if killed — see the header comment.

# Publish vault → site (or double-click "Publish Brain.command")
# Local preview: double-click "Preview Brain.command"

# Deploy status without the gh CLI
curl -s "https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1" | grep conclusion
```

---

**Pre-condensation** text (1000 lines) at `75beccf`. Full narrative history: `git log`.
