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

#### 🔴 11.9.4 Mobile is a mess, on both the homepage and the Desk

Not yet root-caused; needs a real device pass. Two known suspects already: (a) the header nav has 4 items and only drops "Subscribe" below 700px, so at 701–900px it is at its most crowded; (b) `.series-hook` collapses to one column and the two decorative silhouettes stack *above* the text, pushing the premise below two large images. **Fix the known ones, then look again on a real phone** rather than guessing at more.

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

1. **Reading-first navigation** — the last substantive item. Simplify the mobile
   header/sidebar (11.9.4), and decide how backlinks / related-post links surface
   (the open finding above). Then everything else is cosmetic.
2. **HayJay's call on 11.9.5** — recommendation (a) stands: keep `/desk/`, fix how it
   presents. Still unconfirmed.
3. **Cosmetic, in one `custom.scss` pass:** left column width · sidebar/search sizing ·
   `max-width` on `.content img` (the longest-standing) · I4 active-item red-on-red ·
   F1–F4 cruft prune.
4. **11.9.4 needs a real phone.** Desktop and mobile pill rendering is confirmed; the
   rest of the mobile pass is not.

**Verification suite: 69 checks, 0 failures** (was 67/2 — F14 closed 2026-10-02).

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

Resolved and closed — one line each; the reasoning lives in git. Pre-condensation 1000-line text at `75beccf` · S11 findability + generated sitemap (I6 case-variant trap) · date export via frontmatter (I7) · desk picks rendered at deploy (I8) · rehaul + header Desk link (I9/I10) · 11.9.1–11.9.3 measured fixes + `verify-storefront.mjs` (I11) · plan went repo-canonical 2026-10-02, vault mirror deleted · crimson accent owned by `emerson` theme · default dark mode + working toggle (I2) · body serif reaching paragraphs (I3) · favicon on both halves · empty right sidebar collapsed, measure held at ~74ch · header bar · naming settled ("Emerson's Desk") · rename to `/desk/` with `/brain/` redirect · thin landing page · tag taxonomy + `depth: 100` graph · no breadcrumbs, no About page · **yellow tag pills fixed twice over (token pinned *and* property owned unlayered), legacy desktop-only `.tag-link` block merged, confirmed on mobile + desktop** · **header declutter: `content-meta` + ToC disabled, duplicate date gone** · **verification suite fully green, 69/69 (F14)**.
- Graph at `depth: 100` so the whole map shows; breadcrumbs disabled entirely; `/desk/` is a thin landing page.