# Emerson Black — Site Plan

**Status:** Live · `emersonblackwrites.com/` (storefront) + `/desk/` (Emerson's Desk) · Quartz v5
**Updated:** 2026-10-03 · **Owner:** HayJay + AI assistant

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
| Brand CSS | `brain/quartz/styles/custom.scss` (~1,000 lines, unlayered overrides) |
| Theme / accent | `brain/quartz/theme/emerson.ts` |
| Verification | `brain/quartz/verify-default-mode.mjs`, `brain/quartz/theme/verify-brand.mjs`, `brain/scripts/verify-storefront.mjs` |
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
| Desk — `verify-default-mode.mjs` | **142 checks, 0 failures** |
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
| F1–F4 | CSS/plugin cruft (15 orphaned `eb-*` classes, 3 inert plugins) | ⏳ open |
| F12 | Active explorer item red-on-red — a **specificity loss**, not a colour choice | ⏳ open |
| F13 | The vacuous guard + wrong-layer pin | ✅ fixed |
| F14 | Two "known-failing" bio guards were unfixable, not flaky — S11 turned `bio.html` into a redirect stub, so both were specs describing an old site | ✅ fixed |
| F15 | **Two symptoms in one report were not one bug.** "Cards look different widths" + "too wide on mobile" shared a theory, got one fix; only the overflow half was real | ⏳ open — §12.1(b) |
| F16 | **"No dates" was "dates at 1.81:1".** Drawn in the DOM, invisible in light mode | ⏳ open — §12.1(a) |

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
| 11.9.4 Mobile | ⚠️ **Partly open** — see §12.2 |
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

## 12. Open items

### 12.1 🔴 The four Desk notes — recorded 2026-10-02, **not actioned**

**Nothing here is built.** Each was checked against the build, and three turned out to
be different from how they were phrased.

**(a) "Dates have not been added to /desk/ posts" → they are drawn and invisible.**
34 on the topic cards, 49 in the year rows, all asserted by the suite. But
`.eb-hub__date` is `color: var(--lightgray)` (`#a8b5c9`, a *hairline* token borrowed from
the borders) at `0.7rem` on `.eb-hub__card`'s `color-mix(--light 88%, --eb-line)` =
`#ecf0f5`. That is **1.81:1 against a 4.5:1 AA floor.** Dark mode reads 9.21:1 on the same
token, which is why this reads as "no dates" rather than "unreadable dates". The year rows
escape it by sitting on the page background rather than the card.

`.eb-hub__desc` is also below AA on that surface — **3.81:1** light, **4.39:1** dark.
Both need a token that is not a decoration colour. **Two decisions when picked up:** which
grey, and whether the date belongs under the title or in the margin beside it.

**(b) "Card widths are still different" → undiagnosed, recorded as a symptom only.**
The 11.9.11 `min(460px, 100%)` fix targeted the mobile overflow, not this; they shared
one report but not one cause. The grid is `repeat(auto-fit, minmax(min(460px, 100%), 1fr))`
and the card sets no `width`, so **tracks are equal by construction** — which means either
the ragged bottom edge is being read as uneven width (`align-self: start` was added in
11.9.11 and cards hold 5–15 items each), or the grid is not applying at the width being
viewed. Those have opposite fixes, so **this needs one look at a real browser before
anything changes. Do not re-fix `min()` on the strength of this note.**

**(c) Sidebar year folders bounce to `/desk/` → a real regression from 11.9.10.**
`/newsletters/<year>/index.html` is now a redirect stub, but the Explorer still builds its
tree from the file tree, so it still shows 2023/2024/2025/2026 as clickable folders that
lead to the Desk. The sidebar advertises four pages that do not exist.

| Option | Verdict |
|---|---|
| Re-enable `folder-page` for year folders only | Re-introduces what 11.9.10 removed; they'd need to stay out of the sitemap and unlinked from the Desk |
| **Scoped emitter, year pages only** | **Recommended** — same output, no general-purpose plugin; the pattern already exists in `archive-redirects` |
| Point the sidebar's year folders at `#everything-by-year` | **Trap** — hides the symptom while `/newsletters/2023/` still bounces for anyone holding the old link |

**(d) Drop the topic cards' post counts.** `.eb-hub__n` renders the tag's **full** count
(`15`, `9`, `7`…) directly above a list of **five**. `eb-hub__more` ("6 more on process")
already carries the honest number one line below. Cheapest of the four and independent of
the others.

### 12.2 🔴 11.9.4 Mobile — partly open, **needs a real phone**

Closed by 11.9.7c/d: mobile header is nav-only; the article precedes the explorer. Still
open: (a) the storefront header has 4 items and only drops "Subscribe" below 700px, so at
701–900px it is at its most crowded; (b) `.series-hook` collapses to one column and the
two decorative silhouettes stack *above* the text, pushing the premise below two large
images. I cannot verify rendered geometry without a device, and guessing from CSS is how
this became a list of unfixed suspects.

### 12.3 🟢 Product — untouched, in ceiling order

- **11.6 Bridge the craft writing to the books** — highest ceiling, zero cost. A line on
  craft posts pointing at the books that used the technique turns the Desk into a funnel,
  which is the actual goal.
- **11.8 A unifying "How I Write" page** — craft posts next to the books they produced;
  arguably the most agent-interesting page on the site. Flagged, not built.
- **11.7 Series reading order** — visible 0→1→2→3 with one-line hooks and a "start here"
  for the free novella.
- **11.5 Tag constellation, not a graph** — settled: no force graph on the homepage. Static
  chips sized by post count, linking to tag pages, no JS. The full graph returns once the
  link graph is dense enough.

### 12.4 🟠 Cosmetic — one `custom.scss` pass

I4 active-item red-on-red · mobile sidebar above content (needs a single-column
breakpoint + `order`) · F1–F4 cruft prune.

### 12.5 TASTE — HayJay's call, not a defect

- **Backlinks** sit `position: left`, so desktop puts them in the sidebar and mobile under
  the article. Defensible as-is; whether related posts deserve a more prominent slot
  (e.g. an end-of-post "related" section) is a taste call.

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
node brain/scripts/verify-storefront.mjs

# Publish vault → site (or double-click "Publish Brain.command")
# Local preview: double-click "Preview Brain.command"

# Deploy status without the gh CLI
curl -s "https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1" | grep conclusion
```

---

**Pre-condensation** text (1000 lines) at `75beccf`. Full narrative history: `git log`.
