# Emerson Black — Site Plan & Log

**Status:** Live · `emersonblackwrites.com/` (storefront) + `/desk/` (Emerson's Desk) · Quartz v5 · **Updated:** 2026-10-02
**Owner:** HayJay + AI assistant · **Full narrative history:** git log (this file was condensed from 1000 lines on 2026-10-01; the pre-condensation text is at commit `75beccf`)

**Goal:** Write in Obsidian → run `Publish Brain.command` → the archive is live at **`emersonblackwrites.com/desk/`**, built by GitHub Actions.

**Direction (settled 2026-10-01):** *a writer's site that happens to sell books.* Lead with the person; the books link to Amazon anyway. The real target is readership → **rights consideration for a screen adaptation, and signing with an agent.** That reframes priorities: an industry reader wants evidence of range and craft, which is what the Desk holds and the storefront was hiding.

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
5. **GitHub Pages Source must be "GitHub Actions"** — otherwise GitHub's own Jekyll build overwrites the artifact and the Desk silently reverts (Incident I1).

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
| Plan (canonical, git-tracked) | `docs/EMERSON-BLACK-BRAIN-PLAN.md` in this repo |

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

Vault notes reference `![](../../../../../organise/Images/newsletters/<year>/<file>.webp)`. The publish script rsyncs them into `brain/content/organise/images/newsletters/` (lowercase `images` for Quartz slug casing), rewrites paths to root-relative `/organise/images/…`, and **halts if any referenced file is missing**. Verified: 184/184 resolve.

## 5. Daily workflow

1. Write/edit in Obsidian; add `[[wikilinks]]`, tags, `publish: true`.
2. Double-click **`Publish Brain.command`** — mirrors notes + images, rewrites image paths, runs the missing-image guard, syncs `created:`/`modified:`, commits and pushes.
3. Actions builds and deploys in ~1 minute.
## 6. Design system (locked)

- **Brand:** Gabarito (chrome) / Lora (body) / IBM Plex Mono (dates, code). Same three on both halves. Two Google Fonts links are unavoidable — Quartz core and the fonts plugin each emit one — but both are brand-identical.
- **Accent:** crimson `#CA2626` light / `#E63A3A` dark, owned by the `emerson` theme's `brandOverlay()` and asserted by `verify-brand.mjs`.
- **Default mode:** dark for first-time visitors; a returning reader's own choice always wins.
- **Measure:** ~74 characters, deliberately held rather than widened when the right sidebar collapsed.
- **Cascade rule (learned the hard way, twice):** theme overlays live in `@layer obsidian-theme`, which sits **after** `quartz-base` — so `quartz-base` wins at equal specificity. **Anything that must beat upstream belongs unlayered in `custom.scss`.**

## 7. Verification

```bash
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npx quartz build
node quartz/verify-default-mode.mjs     # browser checks need a static server on :8099
node quartz/theme/verify-brand.mjs
# Storefront (run from the repo root) — measured AS RENDERED, needs Chrome
node brain/scripts/verify-storefront.mjs      # ...or `_site`, which is what CI runs
```

**Suite currently 91/91 for the Desk + 33/33 for the storefront.** The Desk scripts assert against the **built stylesheet** and the storefront script against the **rendered page** — never the source, because reading the input file is not verification — see §9.

## 8. Incidents

| # | Symptom | Cause | Status |
|---|---|---|---|
| I1 | Desk silently reverted to a Jekyll page | Pages Source left on "Deploy from a branch" | ✅ fixed + smoke-tested |
| I2 | Sun/moon toggle invisible (~3% opacity) | Theme paints icons via `background` + `mask-image`; our blanket `background` rule overwrote it | ✅ fixed — set `--icon-color` only |
| I3 | Body serif never reached paragraphs | `@quartz-community/quartz-fonts` appends its layer **last** and beat our pin | ✅ fixed — fonts pinned **unlayered** |
| I4 | Active sidebar item red-on-red | Theme's `.active` won on specificity, painting a crimson wash under crimson text | ⏳ open (F12) |
| I5 | Left sidebar still upstream's 320px | Never overridden | ⏳ open — one-line grid override |

**Lesson from I2:** for these components *the icon is the background*. Any blanket `background` rule on an icon button destroys it.

## 9. Findings & hard-won lessons

F13 (the vacuous guard + wrong-layer pin) is why every guard below must read the built artifact and be proven red by deletion — see the two bullets it took to learn it:

1. **`--textHighlight` yellow.** Pinned in the theme overlay, which lost to `quartz-base` on layer order. Fixed unlayered in `custom.scss`. Lesson: pinning is not proof — only a check reading the built stylesheet proves it.
2. **The guard that could not fail.** Grepped `public/index.html` for theme vars that live in the CSS bundle — trivially true. Replacement reads the real stylesheet and asserts the upstream token is still *present* (so it can fail) *and* the override ships.

**Other logged findings**

| # | Finding | Status |
|---|---|---|
| F1–F4 | CSS/plugin cruft (15 orphaned `eb-*` classes, 3 inert plugins) | ⏳ open — marked done in the log, never actually pruned |
| F12 | Active explorer item red-on-red — a **specificity loss**, not a colour choice | ⏳ open |
| F13 | The vacuous guard + wrong-layer pin (above) | ✅ fixed |
| F14 | **Two "known-failing" bio guards were unfixable, not flaky.** Both assumed `bio.html` still held about copy; S11 §11.3c turned it into a redirect stub, so one demanded a nav link from a page with no nav, and the other read `<div class="bio-text">` — gone — leaving `bioProse` always `""`, so its own `length > 40` half could never pass | ✅ fixed 2026-10-02 — suite **69 checks, 0 failures** |
| — | `writing-abroad` slug vs title mismatch → misleading link text | ✅ fixed by HayJay |
| — | 3 images named for a post that no longer existed | ✅ renamed to `sourcing-intrigue-for-stories` |
| — | `backlinks` excluded from the content layout — kept the column clean but removed the only way a reader discovers related posts | ⏳ open — re-enable |

**F14's real lesson — a red guard is not automatically a bug.** These two were filed
as "known, pre-existing, ignore them" for long enough that they became scenery. A
guard that has never passed is not a flaky guard; it is a **spec that no longer
matches reality**, and it was silently suppressing the real signal. When a check is
written off, ask whether it is describing the site or describing an old site.

**The two new pill guards failed this test too.** The first regex matched the
`:hover` rule; the second matched `transition: background-color`. Both passed with
the fix *deleted*. Only deleting the fix and re-running exposed it.

**Standing rules** (each bought with a failed deploy — full stories in git log)
- *A guard that cannot fail is worse than no guard.* Hit four times: the yellow check, two unreachable sitemap assertions, and a `--screenshot` capture that produced byte-identical PNGs (I11).
- *Reproduce a deploy from a fresh clone before pushing.* Working copies carry state that hides ordering bugs — I6 (case-variant sitemap dupes, invisible on macOS), I7 (date export ordered after artifact copy), I8 (`render-desk-picks` reading a file that only existed from a prior build).
- *After a visual change, measure the rendered thing* — image dimensions from the file, the DOM from the built artifact, one real look. Verifying the input is not verification (I10).
- *A check a comment can break is not a check.* Strip comments before pattern-matching (I9).
- *After fixing one unpinned token, enumerate the rest. Log the dismissed options too. A tidy layout can hide the feature that makes the links worth having.*
- *Pin the token **and** own the property.* A component rule in `@layer quartz-base` that reads a theme token cannot be fixed by pinning the token alone — the pill was yellow after a correct pin, for a full day, mostly because the fix was never pushed. Fix at the layer that provably wins, then prove it in the built bundle (depth 0, no enclosing `@layer`).
- *Commit messages: never write them to `/tmp`.* A concurrent write overwrote one mid-flight and a commit landed with a message describing entirely different work. Write the message with the editor tool, under a filename unique to that commit.
- *An unpushed fix is an unfixed fix.* `deploy.yml` runs on push to `main`; a green local build proves nothing about what a reader sees.

## 10. Where the Desk stands (measured 2026-10-01)

- **49 published posts**, all 8 tags, **7 posts carrying wikilinks** (~7 edges; HayJay is adding more by hand).
- **8 tags:** `process` 14 · `mindset` 13 · `news` 9 · `systems` 7 · `reading` 7 · `craft-character` 6 · `craft-plot` 5 · `bookcraft` 4. All 49 carry at least one — **no untagged orphans.** (This taxonomy is about to become *public homepage navigation*, so re-confirm the vocabulary before that.)
- **The graph is not yet a map.** 8 tag nodes and ~7 edges reads as broken, not connected. It improves as wikilinks are added — which is why "always-visible graph links" and "tag hover reliability" are blocked on the wikilink pass, not on styling.
- **`contentIndex.json` exports no date field** — worked around via `postDates.json` (11.3a).
---

## 11. 🔵 S11 — the storefront as a writer's site

The storefront is two static files, **zero `<script>` tags**, 9.6KB + 20KB. Sections: hero → books → series hook → free novella (Substack iframe) → characters → author → footer.

### ✅ 11.1 Make the site findable — DONE 2026-10-01

Added `meta description`, `og:`/`twitter:` tags, canonical URLs, `robots.txt`, and a **generated `sitemap.xml`** (`brain/scripts/generate-sitemap.mjs`, built from the actual `_site` tree so it cannot disagree with what shipped — 61 URLs, clean URLs without `.html`, thin folder pages and `/brain/` excluded, count guard aborts below 40 posts). Search description = concrete pitch; `og:description` = emotional hook. No separate Books page — single flowing homepage. Full story in git log (incl. I6 case-variant trap: dedupe, don't abort).

### 11.2 Analytics — off (Search Console instead)

No analytics anywhere (the `plausible` config key emits nothing — no plugin, no domain). Decision 2026-10-02: Plausible ~$9/mo unjustified at this traffic; Search Console (live, sitemap submitted) answers the useful question free. Revisit when traffic justifies it.

### ✅ 11.3a Date export — DONE 2026-10-01

`contentIndex.json` carries no date (upstream deletes it deliberately), so `brain/scripts/export-post-dates.mjs` writes a separate `static/postDates.json` (`{slug, date, title, description}`, newest first). It reads **frontmatter**, not `<time datetime>` (Quartz parses dates as UTC midnight, rendering a day early). Guards reject empty/short/unsorted/malformed exports — all proven red. Full story in git log (incl. I7 ordering bug: export must run before the artifact copy).

### ✅ 11.3b "From the Desk" section — DONE 2026-10-01

Placed after the series hook: 3 hand-chosen craft posts (**Overplotting**, **Plan My Novel Writing Process**, **Sourcing Intrigue** — chosen for range, not random) + 3 auto-generated Latest from `postDates.json`. Rendered server-side at deploy into the `_site` copy (never the source, so no snapshot rots), zero JS. Guards: exactly 6 picks, 3 generated, all real dated URLs, no placeholders. Full story in git log (incl. I8: must run after the date export).

### ✅ 11.3c Storefront rehaul — DONE 2026-10-01

Full restyle: series pitch replaces the dated launch-banner hero (a launch now belongs in the books grid as a badge, never the `h1`), Book 0 free leads, sticky header (Books/Desk/About/Subscribe), `#about` section replaces the `bio.html` stub (kept as a `noindex` redirect — a live URL may be bookmarked). Still zero JS. Along the way: killed iOS-janky `background-attachment: fixed`, the 14px root shrink, missing `:focus-visible`/`prefers-reduced-motion`, the all-headings uppercase rule, `100vh` hero overflow, two typos. Guards: redirect stays working, every nav anchor hits a real section id, sitemap excludes the stub. Full story in git log (incl. I9/I10).

### ✅ 11.4 A real link to the Desk in the header — DONE 2026-10-01

Shipped inside the rehaul above: sticky header with Desk link (was footer-only). Guard asserts every nav target exists as a section `id`.

### 🟠 11.9 Post-rehaul defect list — 1–3 + 6 + 7 + 8 DONE 2026-10-02 · 4–5 OPEN

**Fixed 2026-10-02** (one commit, measured, HayJay eyeballed): 11.9.1 hero full-bleed, 11.9.2 section rhythm, 11.9.3 prequel cover 5:8. Fixes + guard story in git log.

**The guard that made it stick** — `brain/scripts/verify-storefront.mjs`, built *before* the fixes and run against the broken page first (19/33 failed — the only thing that makes it worth having).

Static tier (comments stripped per I9) + rendered geometry via headless Chrome at 1400/1100/390px. Deploy guard against `_site`; browser tier aborts on measured regression, skips loudly if Chrome is absent. (I11: `--screenshot` captures were byte-identical PNGs — measure geometry, never eyeball screenshots.)

#### ✅ 11.9.1–11.9.3 FIXED — detail in git log

#### ✅ 11.9.7d Mobile header — nav only — FIXED & SHIPPED 2026-10-02

HayJay's read on the phone: the sticky header is good but too busy. Gone
below 800px: the **search button**, the **dark/light toggle**, and **Reader
mode** — which is the "little book icon" (`.readermode`), *not* part of the
wordmark. What remains is the four links: Books · Desk · About · Subscribe.

The **wordmark was already `display: none` below 800px** since §4a-bis, so the
mobile bar was nav + those three controls. Worth stating plainly, because it
corrects an assumption: the **post title, dates and tags were never sticky**.
`.page-header` sits *inside* `.center`, and the title/dates/tags follow it in
the DOM, so they have always scrolled away. Only the header bar sticks.

`display: none`, not `visibility` or a size clamp — these are buttons, and a
hidden-but-present control is still in the tab order.

**Subscribe was reconsidered and KEPT.** Once the controls go the bar is short,
so it costs nothing visually, and it is the only conversion path in the header.

Desktop untouched (same `max-width: 800px` query as §4a-bis). To get the theme
toggle back on phones, delete `.darkmode` from that one selector.

Two guards, both proven red — and the second is the one worth keeping. It
asserts the hide rule sits **inside** the mobile query, verified by moving the
rule out: the "drops controls" check still passed while "only below 800px" went
red. That is exactly the desktop regression a hide-only guard waves through.

*Guard-authoring note:* the first two versions failed on **correct** CSS by
slicing 24 then 23 characters against `@media (max-width:800px){`, which is 25.
Anchored against a generous slice now — no magic numbers. A green/red cycle is
not proof the CSS is right; sometimes the guard is simply wrong.

#### ✅ 11.9.5(a) The Desk hub — one card per topic — FIXED & SHIPPED 2026-10-02

**Decided:** keep `/desk/` and give it a front door. One card per topic, the 5
most recent posts in each, with the description under every title. `news`
excluded by name — award announcements date badly and pull a craft archive
toward being a newswire.

Shipped: **7 cards, 34 posts, 34 descriptions**, `news` absent, all 34 links
resolve to real newsletter posts (28 unique — 6 appear twice by multi-tag,
which is the nature of a tag hub). Descriptions clamp to two lines so card
heights in a row stay even.

**The root cause of "titles only" was not styling.** `description` exists on
all 50 published posts and was never rendered: `@quartz-community/folder-page`
and `tag-page` each **compile their own copy of PageList** into `dist/`, that
copy has a `div.desc` wrapper holding only the `<h3>`, and neither exposes an
option to swap the list component. The local `quartz/components/PageList.tsx`
you find by grepping is a **dead copy** — nothing imports it.

Also worth recording: `/newsletters/` never listed posts at all. It lists
**year folders** (2023, 2024, 2025). Real post lists live on the year and tag
pages.

**The bug this shipped with** — kept here because it is the most dangerous class
of mistake in the plan so far. The config said `condition: index`. **`index` is
not a condition** — only `not-index` / `has-tags` / `has-backlinks` / `has-toc`
exist — and an unrecognised condition name resolves to `undefined` and is
**silently ignored**. The hub rendered on *every page of every page type*: 7
cards on the post page, 7 on `/newsletters/`, no error anywhere. The guard
caught it.

Fixed three ways, deliberately redundant — new `is-index` builtin (the existing
`not-index` had been left without its positive form), a component self-guard on
`fileData.slug !== "index"`, and a guard asserting the hub is on the index **and
on no other page**. Proven-red by peeling the layers one at a time: removing
only the self-guard still passed, reverting only the condition still passed.
Both had to go before the guard went red.

*Lesson (same shape as 11.9.7e):* a config value that resolves to `undefined`
and is then ignored produces a build that **looks** fine and is wrong. The
type-shaped mistakes — unknown condition names, dead local copies of vendored
files — are the ones nothing complains about. Assert on the built artifact, and
check a thing is on the *right* page, not merely that it is somewhere.

#### ✅ 11.9.7f Three real bugs in 11.9.7e — FIXED & SHIPPED 2026-10-02

The reader checked on a real phone and a real desktop, and 11.9.7e did not work
on either. All three failures share one shape: **a guard passed on a build that
was wrong.**

**1. The header never collapsed — on any viewport.** The probe was
`querySelector("article h1")`. On content pages the title is **not inside
`<article>`** — Quartz renders `beforeBody` components into a
`<div class="popover-hint">` *before* the article element:

```
</header><div class="popover-hint"><h1 class="article-title">…</h1>
```

The probe found nothing, took the early return, and `.eb-header--compact` was
never added. The feature was simply **inert, with no error anywhere to say so**.
Now `h1.article-title`.

*This is the guard lesson worth keeping:* the earlier guard asserted the probe
**string** shipped in the bundle. It did — faithfully — while the selector
matched nothing on every real page. **A guard that the code is present is not a
guard that the code works.**

**2. The title leaked into the desktop header.** Its `display: none` sat inside
the `max-width:800px` query. The plugin emits the element on *every* page
regardless of viewport, so above 800px nothing declared a display for it and it
rendered as an inline text node — nav wrapping to two lines, search squashed.
Hidden is now the **default, unconditional** state, with the mobile compact
rules opting it back in. Default-off/opt-in is the safe direction to be wrong in:
a missing rule shows one extra word; the reverse would have shown it on phones.

Guarded by **brace depth**, not by scanning backwards for `@media`. A textual
scan cannot tell an open media block from a closed one — it reported this rule
as *inside* the query when it was at the top level, i.e. it would have passed
the exact bug it was written to catch.

**3. No viewport gate.** The collapse styles only exist below 800px, but the
script set the class at *any* width, so on desktop scrolling past the title
would have hidden the nav. Now gated on `matchMedia("(max-width: 800px)")` with
a `change` listener so rotating a tablet re-evaluates.

**Also: the book icon is out at every width.** Reader mode is disabled as a
**plugin**, not hidden with CSS — a `display:none` control is still in the tab
order and still keyboard-reachable, which is worse than absent. The guard
asserts absence from the built **markup** for that reason.

**Suite: 86 checks, 0 failures.** Four new guards proven red: the
unconditional-hide (by moving the rule back inside the query), both probe
guards (by reverting to `article h1`), and reader mode (by re-enabling).

*Note on the first attempt at the probe test:* a blind `sed` replaced the first
match, which was in a **comment**, leaving the code untouched — so the guard
passed and the test proved **nothing**. Caught by inspecting the built bundle
rather than trusting the exit code. Proof of failure requires proof the mutation
reached the artifact.

#### ✅ 11.9.7g No sticky header — desktop and mobile — SHIPPED 2026-10-02

After two failed attempts at a scroll-driven header (11.9.7e, 11.9.7f), the
reader's call: **no sticky header on either.** The right call, and the cheap
one — two attempts is enough evidence the feature wasn't earning its complexity.

**Removed:** `position: sticky` / `top` / `z-index` / `backdrop-filter` from
`.page-header`; the entire `sticky-title` plugin (render, scroll handler, rAF
throttle, matchMedia gate, SPA teardown, config entry, directory); the
collapsed-header CSS; six guards asserting the machinery was **present**.

**Kept:** wordmark, nav, hairline border, solid background — the header still
reads as a distinct band, it just scrolls away. The translucency and blur went
*with* the stickiness: they only mattered because content scrolled under the
bar, and in normal flow would just show the page background through.

**The non-obvious part — why this wasn't a four-line delete.** The base theme
ships:

```
.page>#quartz-body .sidebar { padding: 6rem 2rem 2rem; position: sticky; top: 0 }
```

That `6rem` existed **to clear the sticky header**. Remove the header and it
becomes a 6rem hole above the explorer — in a sidebar that is `height: 100vh`,
so 6rem of the reading column wasted on nothing. Reduced to `1rem`, scoped
`min-width: 1200px` (the base sheet sets a different padding at mobile widths).
**Guarded**, because a silently inherited layout value nobody remembers is
exactly how a header gap reappears three releases later.

The **left sidebar keeps its own stickiness** — the explorer staying put while
you read is useful. Only the header stopped sticking.

**Suite: 85 checks, 0 failures.** All proven red: re-sticking the header fails
two guards, restoring the `6rem` fails the padding guard.

*Lesson, now written into the shape of the tests:* the new guards assert
**absences**. That inversion is deliberate — two of the three 11.9.7f bugs
passed guards that asserted code was **present**. A guard that something is
gone cannot pass for the wrong reason.

#### 🔴 11.9.4 Mobile is a mess, on both the homepage and the Desk

**Partly closed by 11.9.7c/11.9.7d below** (mobile header is now nav-only; the article precedes the explorer). Still open: (a) the storefront header nav
has 4 items and only drops "Subscribe" below 700px, so at 701–900px it is at
its most crowded; (b) `.series-hook` collapses to one column and the two
decorative silhouettes stack *above* the text, pushing the premise below two
large images. **Needs a real phone** — I cannot verify rendered geometry
without one, and guessing at more from the CSS is exactly how 11.9.4 became a
list of unfixed suspects in the first place.

#### 🔴 11.9.5 Reconsider `/desk/` — decision needed, not a bug

`/desk/` is the Quartz build — all 49 posts. It can't be removed (every sitemap URL, desk pick and `postDates.json` entry points into it); the homepage `#desk` is six links. **Recommendation (a): keep it, fix how it presents** — the homepage is the shop window, `/desk/` the stockroom, and the 11.9.6 header fold resolves the redundancy. (b) merging highlights into `/desk/` buries the craft proof; (c) serving homepage content at `/desk/` breaks 49 live URLs. **HayJay to confirm (a).**

#### 🟠 11.9.6 Fold the homepage header into the Desk — DONE 2026-10-02

New local `Wordmark` plugin (`quartz/plugins/wordmark`): the storefront's two-line stacked mark linking to `/`, replacing `page-title` (no options, linked back into `/desk/`). Carries 11.9.8 (wordmark → `/`, done in the same swap). Header sticky + 12px blur, per-mode 82% background; nav type/hover matches the storefront; order Books/Desk/About/Subscribe with About → `/#about`. Verified against the built bundle; `verify-brand` + `verify-storefront` green.

#### 🟠 11.9.7 The Desk's visual problems (one `custom.scss` pass)

| Symptom | Status |
|---|---|
| **Tag pills have ugly yellow behind them** | ✅ **fixed and shipped** — see below. Was the highest-confidence item, and the prescribed fix was wrong |
| Left column too wide | ⏳ open — §4b reclaimed the empty *right* sidebar; the left was never narrowed |
| Sidebar at the top on mobile, covering content | ⏳ open — desktop grid retained at small widths; needs a single-column breakpoint and `order` |
| Search bar too narrow | ⏳ open — never resized after the sidebar change |
| Post body images far too large | ⏳ open — no `max-width` on `.content img`; longest-standing of these |

> **The original prescription here was wrong, and it is worth keeping the correction.** It said: *"Fix the yellow tags in the theme's own aspect block… not by escalating CSS from outside (layer order means it would appear to work and silently not be true)."*
>
> Pinning `--highlight` in the theme overlay was necessary but **not sufficient**. The rule that actually paints the pill is `a.internal.tag-link{background-color:var(--highlight)}`, which lives in `@layer quartz-base` and reads a *theme* token — so the pill was never really ours to pin. **Lesson: pinning a token is not the same as owning the property.** Where a component reads a borrowed token, declare the property itself, at a layer that provably wins.

#### ✅ 11.9.7a Yellow tag pills — FIXED & SHIPPED 2026-10-02

**Two causes, stacked.** The devtools reading was `#FFD00066` = upstream's
`rgba(255, 208, 0, 0.4)`, declared by the theme's `base` aspect inside
`@layer obsidian-theme`, which outranks the `quartz-base` layer the crimson pins
lived in — so the config palette could never win.

1. **Token pinned** (`quartz/theme/emerson.ts`): `--highlight` set to the
   `ACCENT`-derived `rgba(202,38,38,.12)` / `rgba(230,58,58,.18)` pair, and joined
   `PINNED_VARIABLES` so upstream dropping the anchor fails the build. Verified in
   the emitted bundle that the brand declaration lands after the amber one per mode.
2. **Property owned** (`quartz/styles/custom.scss`) — the part that actually
   mattered. `custom.scss` is *unlayered* and the component rule is in
   `@layer quartz-base`, so declaring the pill background there outranks every
   layer regardless of specificity. Verified in the built bundle at **brace depth 0
   with no enclosing `@layer`**. Uses `--eb-accent`, which already resolves per
   `saved-theme`, so no mode-specific values.

*(Renaming the pill's class was considered and rejected: it needs a Quartz plugin
patch, and leaves `--highlight` amber for anything else that reads it.)*

**Also merged the legacy `.tag-link` block**, which was stranded inside
`@media (min-width: 1200px)` and so styled pills on desktop only. One unlayered
rule now, no duplicated declarations, identical pills at every width. HayJay
confirmed on real devices: pills correct at mobile and desktop.

**Two guards added, and proven red by deletion.** Worth recording *how* they
nearly weren't: the first regex also matched the `:hover` rule, and the second
matched `transition: background-color` — so both passed with the fix deleted. They
are now anchored on `background-color:` excluding `:hover`.

#### ✅ 11.9.7b Header declutter — content-meta + ToC disabled

`content-meta` printed the publication date plus a
reading time under the title, beside the header Published/Updated line - the date
twice. Its S10 CSS suppression had been nested inside `.eb-post-dates`, compiling to
`.eb-post-dates .content-meta time` (matches nothing) while the guard passed on an
unanchored regex.

Rather than re-nest the rule, `content-meta` and `table-of-contents` are now
**disabled in `quartz.config.yaml`** and the dead rules deleted from `custom.scss`; the
guards assert on built HTML instead, a fact that cannot silently stop matching. The
header is now title, then Published/Updated, then topics.

#### ✅ 11.9.7c Mobile: the article before the explorer — FIXED & SHIPPED 2026-10-02

Not a taste question — a layout-order defect. Base Quartz stacks, at
`max-width: 800px`: `grid-sidebar-left → grid-header → grid-center → …`, so
the **whole left sidebar** (explorer file tree + backlinks) rendered *above*
the page header and the article. A screen of navigation before the title, paid
by every phone reader.

`order` cannot fix it: grid items placed by `grid-area` names are placed by the
template, and `order` only affects auto-placed items. Redefining
`grid-template` at the same breakpoint is the lever that moves the tracks.
`custom.scss` is unlayered, so it beats the layered base rule with no
`!important`. Desktop untouched.

Two guards, proven red by deletion. Writing them surfaced two traps worth
keeping: the first regex matched the **base** rule — which appears first, so
passing would have meant nothing — and took the first match rather than the
winning declaration. `custom.scss` is unlayered *and* appended last, so the
effective rule is the **last** occurrence.

#### 🟢 11.9.8 Desk wordmark → `/` (do inside 11.9.6 — link target and style are one decision)

### 11.5 🟢 Tag constellation, not a graph

Settled: no force graph on the homepage (8 nodes / ~7 edges reads as broken). Instead a static tag constellation — chips sized by post count, linking to tag pages. No JS. Full graph returns once the link graph is dense enough.

### 11.6 🔴 Bridge the craft writing to the books (highest ceiling, zero cost)

Highest-ceiling open item for the screen-adaptation goal: a line on craft posts / in the Desk sidebar — *"Want to see these techniques applied? Read A Rock Star Has Exploded."* Turns the newsletter into a funnel.

### 11.7 🟢 Series reading order

Visible 0→1→2→3 order with one-line hooks each + explicit "start here" for the free novella.

### 11.8 🟢 A unifying "How I Write" page (needs a decision)

Craft posts next to the books they produced — arguably the most agent-interesting page. Flagged, not built.

## 12. Roadmap

**Goal now:** everything remaining is either cosmetic polish or a decision — no more
structural work on the Desk.

1. **Reading-first navigation** — 11.9.7c shipped (article now precedes the
   explorer on mobile). Left: the storefront's 701–900px nav crowding and the
   `.series-hook` silhouette stacking, then how backlinks / related-post links
   should surface. 11.9.4 still needs a real phone.
2. **HayJay's call on 11.9.5** — recommendation (a) stands: keep `/desk/`, fix how it
   presents. Still unconfirmed.
3. **Cosmetic, in one `custom.scss` pass:** left column width · sidebar/search sizing ·
   `max-width` on `.content img` (the longest-standing) · I4 active-item red-on-red ·
   F1–F4 cruft prune.
4. **Backlinks** — currently `position: left`, so on desktop they live in the
   sidebar and on mobile they now sit under the article. That is defensible, but
   whether related posts deserve a more prominent slot (e.g. an end-of-post
   "related" section) is a **taste call for HayJay**, not a defect.

**Verification suite: 85 checks, 0 failures** (was 67/2 — F14 closed 2026-10-02).

**Deferred until enough wikilinks exist:** always-visible graph links, reliable tag hover.

**Highest-ceiling product item, still untouched:** 11.6 craft→books bridge — a line on
craft posts pointing at the books that used the technique. Turns the Desk into a funnel,
which is the actual goal.

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

## 14. History

Resolved and closed — one line each; the reasoning lives in git. Pre-condensation 1000-line text at `75beccf` · S11 findability + generated sitemap (I6 case-variant trap) · date export via frontmatter (I7) · desk picks rendered at deploy (I8) · rehaul + header Desk link (I9/I10) · 11.9.1–11.9.3 measured fixes + `verify-storefront.mjs` (I11) · plan went repo-canonical 2026-10-02, vault mirror deleted · crimson accent owned by `emerson` theme · default dark mode + working toggle (I2) · body serif reaching paragraphs (I3) · favicon on both halves · empty right sidebar collapsed, measure held at ~74ch · header bar · naming settled ("Emerson's Desk") · rename to `/desk/` with `/brain/` redirect · thin landing page · tag taxonomy + `depth: 100` graph · no breadcrumbs, no About page · **yellow tag pills fixed twice over (token pinned *and* property owned unlayered), legacy desktop-only `.tag-link` block merged, confirmed on mobile + desktop** · **header declutter: `content-meta` + ToC disabled, duplicate date gone** · **verification suite fully green, 85/85 (F14)** · **mobile: article precedes the explorer (11.9.7c); sticky header is nav-only — search, reader mode and theme toggle dropped below 800px (11.9.7d)**
- Graph at `depth: 100` so the whole map shows; breadcrumbs disabled entirely; `/desk/` is a thin landing page.