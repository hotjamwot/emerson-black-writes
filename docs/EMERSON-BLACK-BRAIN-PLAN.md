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

**Two mistakes that shipped a false "verified" claim:**

1. **`--textHighlight` yellow.** The fix was pinned in the theme overlay and **did not work** — `quartz-base` also declares the token and comes first in the layer order, so it won at equal specificity. `--tertiary` had escaped this by luck (nothing in `quartz-base` declared it), which is exactly why the overlay approach *looked* sound. Fixed with an unlayered `.text-highlight` rule in `custom.scss`. **Lesson: pinning a token is not proof it is pinned — only a check that reads the built stylesheet proves it.**
2. **The guard that could not fail.** It asserted "no yellow survives" by grepping `public/index.html`, which contains none of the theme variables (they live in the emitted CSS bundle). "No yellow found" was trivially true. **Lesson: a guard that cannot fail is worse than no guard — it converts an unverified claim into false assurance.** The replacement reads the real stylesheet, asserts the upstream token is still *present* (so the check can fail) **and** that the override ships; both halves proven red by deletion.

**Other logged findings**

| # | Finding | Status |
|---|---|---|
| F1–F4 | CSS/plugin cruft (15 orphaned `eb-*` classes, 3 inert plugins) | ⏳ open — marked done in the log, never actually pruned |
| F12 | Active explorer item red-on-red — a **specificity loss**, not a colour choice | ⏳ open |
| F13 | The vacuous guard + wrong-layer pin (above) | ✅ fixed |
| — | `writing-abroad` slug vs title mismatch → misleading link text | ✅ fixed by HayJay |
| — | 3 images named for a post that no longer existed | ✅ renamed to `sourcing-intrigue-for-stories` |
| — | `backlinks` excluded from the content layout — kept the column clean but removed the only way a reader discovers related posts | ⏳ open — re-enable |

**Lessons worth keeping**
- *After fixing one unpinned token, enumerate the rest — the bug class is "the token nobody looked at", and it does not come alone.*
- *Log the dismissed options too. Five minutes saves the next session from re-running them.*
- *A tidy layout decision can hide the feature that makes the links worth having.*
- *A guard that cannot fail is worse than no guard — it looks like protection.* (Hit three times: the original yellow check, then two unreachable assertions in the sitemap script I wrote days after.)
- **I6 (new, 2026-10-01): the sitemap shipped listing every post twice.** Quartz emits `Newsletters/` and `newsletters/` on a case-sensitive filesystem; macOS merges them, so **the bug cannot be reproduced locally at all.** Two failed deploys followed. Rule: test path logic against a *simulated case-sensitive tree*, never the working copy.
- **I7 (new, 2026-10-01): a build step that was correct in isolation and wrong in sequence.** The date export ran *after* `brain/public` had already been copied into the artifact, so the file never shipped. Caught by its own guard on the first attempt.
- **I8 (new, 2026-10-01): the same class again, and a working copy HID it.** `render-desk-picks` ran before the file it reads existed; it passed locally twice because a previous build's output was still sitting there. Only a **fresh `git clone`** exposed it.
- **I9 (new, 2026-10-01): a guard that reported four failures on a correct file** — the search matched the *comment explaining the fix*. A false FAIL trains you to ignore the audit, and then it waves a real regression through. **A check a comment can break is not a check.**
- **I10 (new, 2026-10-01): three visual regressions shipped in the rehaul, all mine, all caught by HayJay looking at the page.** The hero isn't full-width, the vertical rhythm is gone, the prequel cover renders as a strip. In each case the CSS was correct *as written* and the test that passed was one I had designed. **I checked a file, never the page.**
- **I11 (new, 2026-10-02): my "one real look" was a lie I nearly believed.** Chasing the I10 standing rule, I screenshotted the storefront with headless Chrome `--screenshot` and a URL fragment. Three shots — `#start-reading`, `#desk`, `#about` — came back as **byte-identical** flat dark PNGs (same md5), and I was one step from writing down "the page renders blank below the fold". The capture method was broken, not the page; HayJay's eye on the real file settled it in seconds. **Lesson: a screenshot I cannot trust is worse than no screenshot — the vacuous guard in a new costume. The fix is to measure geometry (`brain/scripts/verify-storefront.mjs`), not to look at a picture and hope.**
- *A step that "works when I run it" is not a step that works. Order matters, and only the assembled artifact can prove it.*
- **Standing rule after I6/I7/I8: reproduce a deploy from a fresh clone before pushing.** Three of these in a row, all invisible locally.
- **Standing rule after I10: after a visual change, measure the rendered thing** — image dimensions from the file, the DOM from the built artifact, and one real look. Verifying the input file is not verification.

## 10. Where the Desk stands (measured 2026-10-01)

- **49 published posts**, all 8 tags, **7 posts carrying wikilinks** (~7 edges; HayJay is adding more by hand).
- **8 tags:** `process` 14 · `mindset` 13 · `news` 9 · `systems` 7 · `reading` 7 · `craft-character` 6 · `craft-plot` 5 · `bookcraft` 4. All 49 carry at least one — **no untagged orphans.** (This taxonomy is about to become *public homepage navigation*, so re-confirm the vocabulary before that.)
- **The graph is not yet a map.** 8 tag nodes and ~7 edges reads as broken, not connected. It improves as wikilinks are added — which is why "always-visible graph links" and "tag hover reliability" are blocked on the wikilink pass, not on styling.
- **`contentIndex.json` exports no date field** (`slug, filePath, title, links, tags, content`). Dates exist at build time (`fileData.dates`) but are never emitted — **this blocks any "latest posts" widget.**
---

## 11. 🔵 S11 — the storefront as a writer's site

The storefront is two static files, **zero `<script>` tags**, 9.6KB + 20KB. Sections: hero → books → series hook → free novella (Substack iframe) → characters → author → footer. **The Desk is linked in the footer only** — 49 posts of craft writing are invisible until a visitor scrolls to the bottom.

### ✅ 11.1 Make the site findable — DONE 2026-10-01

Found while checking analytics, and almost certainly **why it felt like nobody reads it** — bigger than any design question. Measured before/after:

| Check | Before | After |
|---|---|---|
| `meta description` on `/` | ❌ none | ✅ search copy |
| `og:` / `twitter:` tags on `/` | ❌ none | ✅ social copy |
| canonical URL | ❌ none | ✅ both pages |
| `sitemap.xml` | ❌ 404 | ✅ **62 URLs** (49 posts + 9 tag pages + 4 site pages) |
| `robots.txt` | ❌ 404 | ✅ |

**Copy decisions (HayJay's drafts, split by moment).** Search `description` gets the concrete pitch + free entry point; **og:description gets the emotional hook** ("Friendship is survival. Love complicates justice…"). Same page, two audiences — a searcher wants to know what it is, a social click wants to want it. `og:title` drops "warm, witty" because at preview size those adjectives eat the characters needed for the series name; the tone does the work in the description instead. OG image = `cover_fiance_has_flatlined.webp` (Book 3), changeable later.

**The sitemap is generated, not committed** (`brain/scripts/generate-sitemap.mjs`, runs in `deploy.yml` after Quartz is assembled). **Reason:** 49 posts that change on every publish would rot a hand-written list, and "it's still there, it must be fine" is precisely how the `writing-abroad` link text and the vacuous yellow guard both went unnoticed. It is generated from the **actual `_site` tree**, so it cannot disagree with what shipped.

Two decisions worth keeping:
- **Clean URLs, no `.html`.** Pages serves both `/desk/tags/process` and `/desk/tags/process.html`, but Quartz's own internal links are extensionless, so the `.html` form would advertise a second address for the same page and split crawl signals. *(Verified against live Pages — the local Python server 404s on clean URLs, which is why this was checked for real rather than assumed.)*
- **Thin folder pages excluded** (`/desk/newsletters/`, `/desk/2023/` etc.) and the `/brain/` redirect is not listed. Both are duplicate/redirect URLs, not content.

**Guarded in `deploy.yml`**, and each guard was **proven red by removing the thing it checks** (the F13 lesson applied forward — a check that cannot fail is worse than none). Including a *count* guard: a `sitemap.xml` containing one URL is technically valid and completely useless, so the deploy aborts if fewer than 40 posts are listed.

**Not done:** a separate Books page. HayJay prefers the single flowing homepage — agreed, since the books are one short section mid-page and a second page would add a hop for no gain. The Books/Newsletter metas were therefore not used.

#### ⚠️ The case-variant trap — two failed deploys, and the lesson is bigger than the fix

Quartz emits the archive **twice under different casing on a case-sensitive filesystem**: `Newsletters/` (the content folder's own name, holding folder/year index pages) and `newsletters/` (the slug it links to, holding the posts). Pages serves both.

**macOS cannot reproduce this.** A case-insensitive filesystem merges the two directories, so the working copy looks fine and the duplicate only ever appears in Linux CI. This is the first bug in this project that was *structurally invisible* from the dev machine.

Sequence, because the wrong turns are the useful part:
1. First deploy of the sitemap shipped **112 URLs — every post listed twice** (50 capitalised + 49 lowercase). Caught by *resolving the URLs in the live sitemap*, not by reading the file.
2. Added a duplicate guard → **deploy failed.** The guard normalised case, which made both spellings collide, and CI legitimately produced duplicates. My first hypothesis (lowercase-only regexes in the thin-page filters) was **wrong** — fixing it changed nothing.
3. Real cause: the guard treated a *case fold* as fatal. Both spellings are the same page, so the correct response is to **dedupe**, not abort.

**Also removed: both in-script guards, as dead code.** Once `urlFor()` lowercases unconditionally and the list is `Set`-deduped, "no duplicates" and "no uppercase paths" are *provably unreachable*. They looked like safety nets while being incapable of failing — **the F13 trap again, in miniature, written by me two days after learning it.** The honest guarantees are the `Set` dedupe and the deploy's independent `SITEMAP_POSTS` count guard, which *can* fail and has been proven red.

**The durable rule:** anything touching these paths must be tested against a **simulated case-sensitive tree**, never the working copy. macOS will keep telling you everything is fine.

**Verified live after the final deploy:** 61 URLs, no uppercase, no duplicates, 404 excluded, and a sample of URLs all returning **200**.

### 11.2 Analytics (blocked on setup)

**There is no analytics anywhere on the site.** The Desk's `analytics: provider: plausible` is *core Quartz* config, but no analytics plugin is installed and no domain is set, so **nothing is emitted** — verified `0` matches in the live HTML. (An earlier note claiming the Desk had Plausible was **wrong**; corrected here.)

Consequence: we cannot tell whether the Desk link gets clicked, whether adding it helps or hurts book clicks, or **whether readers who arrive from the Desk buy books**. Every other S11 idea is unfalsifiable until this is fixed. **Blocked on HayJay creating a Plausible account.**

### ✅ 11.3a Date export — DONE 2026-10-01

`contentIndex.json` had **no date field at all** — upstream's `content-index` plugin runs `delete content2.date` before serialising (verified in its `dist`). Deliberate, not an oversight: it keeps a hot-path payload small.

**Approach:** rather than fork or monkey-patch the plugin, `brain/scripts/export-post-dates.mjs` runs post-build and writes a separate, purpose-built `static/postDates.json` — `{slug, date, title, description}`, newest first. Adding a file rather than mutating one means an upstream change makes this fail loudly instead of silently corrupting the index the Desk itself reads.

#### ⚠️ The `<time datetime>` is a day wrong — and looks correct

The obvious data source is the `datetime` attribute the post-dates component already renders. **It disagrees with the text right next to it:**

```
frontmatter   date: 2025-02-14
rendered      <time datetime="2025-02-13T21:00:00.000Z">Feb 14, 2025</time>
```

Quartz parses the date as **UTC midnight**, which in any timezone behind UTC is the *previous* day. Slicing the ISO to `[:10]` therefore reports **every post one day early** — and would mis-order the storefront's "latest" strip and mis-date anything built on it. The visible text is right; the machine-readable twin is wrong.

So the script reads **frontmatter directly** — same value the page displays, no UTC round-trip. *(Lesson: when a page has both human text and a machine-readable attribute for the same value, verify they agree before trusting the machine-readable one. They are generated by different code paths and here they do not.)*

**Verified:** all **49/49** dates cross-checked against the rendered pages — **0 mismatches**; re-confirmed against **12 live pages** after deploy — **0 mismatches**. Malformed dates are reported loudly rather than silently sorted to the top of a "newest" list.

#### I7 — an ordering bug the guard caught

First deploy attempt failed. The generator wrote into `brain/public/static/` **after** `cp -R brain/public/. _site/desk/` had already run, so the file never reached the artifact. Correct in isolation, wrong in sequence — the same class as I6.

The guard caught it on the first try, which is worth noting: **it is the first check in this project to catch a real ordering fault rather than a missing file.** Had the guard only checked "the script ran," this would have shipped silently.

**Deploy guards** reject an empty, short (<40), unsorted, or malformed-date export — **all four proven red** by constructing each failure.

### ✅ 11.3b "From the Desk" section — DONE 2026-10-01

Placed after the series hook, before the signup: high enough to be seen, but it doesn't outrank the books. Two groups, deliberately:

| Group | How | Why |
|---|---|---|
| **Start here** (3) | Fixed, hand-chosen | The only part a stranger or agent should land on cold. Proves intent. |
| **Latest** (3) | Auto-generated from `postDates.json` | Proves the site is alive, with zero upkeep. |

**Random selection was considered for the curated trio and rejected.** A random post can be a perfectly good post that is simply a poor first impression ("How to Cut Through the Noise" has the description *"Going viral"*); it also makes the page unstable, which fights a static, fast, dependency-free design. Random optimises for *not being bad*, never for *being good*.

The three curated picks are all craft-forward, because that is what demonstrates range to an agent: **The Dangers of Overplotting** (failure and self-critique), **How I Plan My Novel Writing Process** (system and discipline), **Sourcing Intrigue for Stories** (technique).

**Rendered server-side at deploy time**, not fetched client-side. The obvious implementation is a `fetch()` on page load — which would add the **first JavaScript to a page that deliberately ships none**, plus a request and a visible reflow, bought for a list of three links. Static HTML means zero JS, no failure mode at runtime, and no layout shift.

- Renders into the **`_site` copy**, never the source `index.html`, so no snapshot of "latest" is ever committed — the same rot we avoided for the sitemap.
- **Idempotent:** a no-op rebuild is a clean pass, not a failed deploy.
- **Guards:** exactly 6 picks, exactly 3 generated, all pointing at real dated post URLs, and no `{{DESK_COUNT}}` may reach production. Each proven red.

**Verified live:** 6 picks rendered, both groups correct, all 6 links return 200, 17 CSS rules shipped.

#### I8 — an ordering bug that a working copy *hid*

`render-desk-picks.mjs` reads `postDates.json`, which the Quartz build does not produce. It was placed before the date export, so CI died with `ENOENT`. **It worked locally twice** because `postDates.json` was already sitting in `brain/public/static/` from an earlier build.

**Reproducing the deploy from a fresh `git clone` — which is what CI effectively is — was the only thing that exposed it.** That is now the standing rule, after three ordering bugs in a row (I6, I7, I8): *a working copy carries state that hides exactly this class of failure.* Related: I cannot read the Actions log without admin rights, so each failure has to be diagnosed by replicating CI locally — which is only reliable if the clone is clean.

### ✅ 11.3c Storefront rehaul — DONE 2026-10-01

A visible redesign, not a tidy-up. HayJay approved a full restyle with the series leading and the free novella called out.

**The hero was a launch page that was never decommissioned.** Its `h1` read *"Book 3 is out now!"* with a "NEW BOOK / OUT NOW" badge — a headline with a shelf life, rewritten every few months, each rewrite a chance to forget. It also buried the free novella, the best conversion the site has, in section 4.

| | Before | After |
|---|---|---|
| Hero | Dated launch banner | **The series pitch** — expires never |
| First offer | Book 3, paid | **Book 0, free** |
| Header | Absolute `<h1>`, not a nav | **Sticky wordmark + Books/Desk/About/Subscribe** |
| About | `bio.html` stub (2 sentences) | **`#about` section, 3 paragraphs** |
| Hype | "THE SERIES" / "GET THE FREE NOVELLA" | Sentence case |

**A launch now belongs in the books grid as a badge, never in the `h1`.** Book 3's "Latest" badge is a badge, not a headline.

**`bio.html` was folded in but NOT deleted.** It stays as a redirect: it is a live URL, and an agent may have bookmarked it. A 404 is a worse answer than a jump. Kept `noindex`, excluded from the sitemap, and the deploy guard now *requires* it remain a working redirect.

#### Defects fixed along the way — real bugs, not taste

- **`background-attachment: fixed`** on the hero — a well-known iOS Safari jank and battery trap. Now a static `cover` layer, visually identical.
- **`:root { font-size: 14px }` at ≤600px** — shrank every rem at once; with already-small body copy, real phone text landed near **11.5px**. Removed. 14px is the floor.
- **No `:focus-visible` anywhere** — keyboard users had no focus indicator at all.
- **No `prefers-reduced-motion`** — every hover animation was unconditional.
- **The `h1–h3` rule uppercased *every* heading.** That is why the page shouted. Uppercasing is now a per-heading decision.
- **`100vh` on the hero** — includes the mobile address bar, so it always overflows. Now `100dvh` (kept `100vh` on `body`, where `dvh` would reflow the page as the bar hides).
- Typos in shipped copy: *"engagment"*, *"blows up"*.

**Still zero JavaScript.** The mobile nav drops "Subscribe" rather than becoming a hamburger menu — that would have been the site's first script. Subscribe remains in the footer and About.

**Guards:** findability no longer demands meta/og of a `noindex` redirect, but *does* require it stay a working redirect; every nav anchor is asserted against a real section id (a renamed id produces a nav that silently goes nowhere); the sitemap excludes the stub. All three proven red.

**Live verified:** correct `h1`, 4-link nav, all 5 anchors resolve, 7 sections, free badge present, `bio.html` redirects, sitemap clean.

**I9 — my own audit lied to me**

The first version of the redesign audit reported **four failures on a correct file**: `grep` for `background-attachment: fixed` was matching the *comment explaining the fix*. A false "FAIL" is not a nuisance — it teaches you to ignore the audit, and then it waves a real regression through. Fixed by stripping comments before pattern-matching. The lesson generalises past this project: **a check that a comment can break is not a check.**

**I10 — the rehaul shipped three regressions, because I verified what I *wrote* and not what I *shipped***

11.9.1–11.9.3 are all regressions **I introduced less than an hour earlier**: a full-width hero that isn't full-width, vertical rhythm that vanished, and a book cover that renders as a strip. In every case the CSS I wrote was correct *as written* and the test that passed was one I had designed.

The pattern across all three: **I checked a file, never the page.** `grep -c bleed index.html` returning 0 would have caught the hero in one second. The prequel cover was correct in CSS and correct in the source image (`1280×2048`, exactly 5:8) — it was the *rendered box* that was wrong, which no source-level check can see.

**The standing rule now: after a visual change, measure the rendered thing** — dimensions from the image file, the DOM from the built artifact, and one real look at the page. Verifying the input file is not verification.

### ✅ 11.4 A real link to the Desk in the header — DONE 2026-10-01

Shipped as part of the 11.3c rehaul: a sticky header carrying the wordmark plus Books / Desk / About / Subscribe. Anchors only — no router, no script. The Desk was previously reachable only by scrolling or via the footer, so a visitor had no reason to suspect it existed.

New guard: every nav target is asserted to exist as a section `id`, because a renamed id renders a perfectly normal-looking link that goes nowhere.

### 🟠 11.9 Post-rehaul defect list — 1–3 FIXED 2026-10-02 · 4–8 OPEN

HayJay's report from using the site after the rehaul. **Every item was reproduced against the live site or the source before being written down**, and the likely cause is recorded where it was diagnosable — so each pass starts from a cause, not a symptom. Items 1–5 are homepage; 6–8 are the Desk.

**Items 1–3 are fixed, measured, and looked at.** (HayJay opened the page — that is the only check that actually settles "does it look right".) The three fixes were one commit; most of the session went on the measuring stick below, which is the part worth keeping.

#### ✅ The measuring stick — `brain/scripts/verify-storefront.mjs` (new 2026-10-02)

**Built before the fixes, not after, and run against the broken page first: 19 of its 33 checks failed.** That is the only thing that makes it worth having (the F13 lesson — a check that cannot fail is worse than none). All 33 pass now.

**Two tiers.** Static checks over the source, with `/* … */` stripped before anything is matched (I9). Then rendered geometry out of headless Chrome at 1400 / 1100 / 390px: the page loads in an **iframe**, because an iframe's width *is* a viewport — the page's own media queries apply inside it, and `100vw` there is the iframe's width, which is what makes the full-bleed assertion honest rather than decorative. It serves the directory itself over a loopback HTTP server (no python, no separate "start a server first" step) and generates the probe document **in memory**, never on disk. It also passes `--disable-dev-shm-usage`, because the CI runner is a container and Chrome's default `/dev/shm` use is a classic crash there.

**It is a deploy guard**, running against `_site` after assembly and before the upload. The browser tier aborts on a measured regression; if Chrome is ever absent it says so loudly and skips, because "cannot measure here" is not evidence of a regression — whereas "measured, and wrong" is.

**The honest part: the first attempt at "one real look" was worthless.** Headless Chrome `--screenshot` with a URL fragment produced three **byte-identical** flat dark PNGs for `#start-reading`, `#desk` and `#about` — identical md5. I was one step from reading that as "the page is blank below the fold". A screenshot I cannot trust is worse than no screenshot (I11).

#### ✅ 11.9.1 The hero image does not span the full width — FIXED 2026-10-02

**Cause, confirmed.** `.main-content` is `max-width: 1100px`, and `.hero` is a plain child of it. In the rehaul `.bleed` and `.shell` were defined as helpers and then **never applied to any section** — `grep -c bleed index.html` returned **0** — so the hero's background painted inside an 1100px column. The sections that looked right did so because they still hand-rolled `width: 100vw; margin-left: calc(50% - 50vw)`, four times over.

**Fix — and a correction to this item's own fix note.** The note above said to put `bleed` on hero/desk/characters/**start-reading** and `shell` on their inner content. Measured, that turned out to be two different things:

- The four real bands — hero, series hook, Desk picks, characters — now carry `bleed`, and the hand-rolled lines are **deleted**, so the escape hatch exists in exactly one place. Asserted: exactly one `100vw` in the stylesheet.
- **`start-reading` is deliberately NOT a band.** It has no background and its content is a 900px grid inside the measure, so bleeding it would only widen an invisible box. What it *had* was worse: `padding-left: calc(50% - 550px + …)`, a hard-coded half-shell that silently collapsed to 0 below ~1160px — i.e. exactly where it was meant to widen — and that would break the day `--shell` changed. Deleted.
- **`.shell` wrappers were not needed on the other bands either.** They already re-centre with their own padding, and wrapping the character grid would have narrowed it for no reason.

**Measured:** hero `182…1218 of 1400` → **`0…1400`**, at 1400, 1100 and 390px. The 390px run also caught a horizontal overflow that had nothing to do with the hero — `scrollWidth 406 → 390` — which was the `550px` calc above.

#### ✅ 11.9.2 Content is vertically cramped — FIXED 2026-10-02

**Cause, confirmed against the rehaul diff.** `.main-content` used to be `padding: var(--space-2xl) 0; gap: var(--space-2xl)`. The rehaul made it `padding: 0 var(--space-lg)` and dropped **both** the gap and the vertical padding, so the 6rem rhythm vanished — and no section supplies a top margin of its own.

**Fix:** `gap: var(--space-2xl)` restored, plus a `padding-bottom` that is the last section's breathing room before the footer. Sections the rehaul had given their own vertical padding now add none, or the two stack: `.about` is `padding: 0` and `.start-reading` lost its 6rem, because the container gap *is* the rhythm and seven hand-set margins drift. The `≤700px` media query's `.main-content { padding: 0 var(--space-md) }` was also silently overwriting the new bottom padding on mobile; it now carries it through.

**Measured:** tightest gap between sections **0px → 96px** (6rem) at 1400px.

#### ✅ 11.9.3 `.prequel-cover img` renders long and skinny — FIXED 2026-10-02

**Cause, confirmed by measuring the rendered box — and it was worse than "left-aligned".** The files are correct (`1280×2048`, exactly 5:8) and the CSS did say `aspect-ratio: 5/8`. But the ratio was on the `<img>`, which also had `max-width: 280px` and **no `height`** — so the `height="750"` *presentational attribute* won, and the cover rendered **280×750**: a ratio of **0.373**. Not a small book — a genuine strip. `.book-cover` escapes this only because its rule sets `height: 100%`; the prequel is the copy that went stale, exactly as this item guessed.

**Fix:** the `.book-cover` recipe, which is what this item asked for — the ratio on the **box**, the image filling it:

```css
.prequel-cover { width: 100%; max-width: 320px; justify-self: center; aspect-ratio: 5 / 8; overflow: hidden; }
.prequel-cover img { display: block; width: 100%; height: 100%; object-fit: cover; }
```

`height: 100%` is not decoration — it is the declaration that stops the presentational attribute from winning, and it is why the books grid was never affected. The `≤768px` rule that capped the **image** at 200px is now a cap on the **box** (240px), because capping the image inside a wider box is the same bug again.

**Also corrected:** the `width="500" height="750"` attributes on all five covers, which claimed 2:3 while the files are 5:8. They are only hints, so they matter exactly when CSS does *not* constrain the box — which is the case that broke.

**Measured:** box `418×759` with image **`280×750` (0.373)** → box `320×512` with image `320×512`, **ratio 0.625**, image filling the box. At 390px: box 240×384, same ratio.

#### 🔴 11.9.4 Mobile is a mess, on both the homepage and the Desk

Not yet root-caused; needs a real device pass. Two known suspects already: (a) the header nav has 4 items and only drops "Subscribe" below 700px, so at 701–900px it is at its most crowded; (b) `.series-hook` collapses to one column and the two decorative silhouettes stack *above* the text, pushing the premise below two large images. **Fix the known ones, then look again on a real phone** rather than guessing at more.

#### 🔴 11.9.5 Reconsider `/desk/` — but "copy the content over" is not what it seems

HayJay: *"emersonblackwrites.com/desk/ is pointless — would love to lose it if possible. Or copy over the nice tidy content from `#desk`."*

**`/desk/` cannot simply be removed, and this is worth being explicit about.** `/desk/` is the **Quartz build — all 49 posts**, plus the archive, tag pages and search. It is not a duplicate of the homepage's `#desk` section: that section is **six links**. Removing `/desk/` deletes the writing itself — and every `postDates.json` entry, every sitemap post URL and every desk-pick link points into it.

What is genuinely redundant is that a visitor now meets the Desk **twice**: six highlights on the homepage, then the full archive at `/desk/`. So the real options are:

- **(a) Recommended — keep `/desk/`, fix how it presents.** The homepage section is the shop window; `/desk/` is the stockroom. The problem is the *jump* between them, not the archive. Give `/desk/` the storefront's header (11.9.6) and the redundancy resolves into a front door and a destination.
- **(b) Merge the highlights into `/desk/`'s index**, dropping the homepage section. Lightens the homepage but sends craft readers one hop deeper — and the homepage section is what proves to a *stranger* that a person writes these books. Not recommended.
- **(c) Serve the homepage content at `/desk/`, archive the rest under `/desk/archive`.** Possible, but breaks 49 live URLs, the sitemap and every inbound link. **Not recommended** — the same "don't break live URLs" reasoning that kept `bio.html` as a redirect applies with far more force at 49 URLs.

**HayJay to confirm (a) before anything is built.** This is a decision about what the Desk *is*, not a bug.

#### 🟠 11.9.6 Fold the homepage header into the Desk, so the two sites feel like one

**The strongest item on the list, and close to free.** The homepage header (sticky wordmark + Books/Desk/About/Subscribe, over the campus hero) exists in `style.css`; the Desk has its own in `brain/quartz/styles/custom.scss`.

HayJay: *"The header of the homepage on desktop looks brilliant. Would love to fold that exact style to the desk."*

**Cause of the mismatch:** the two headers live in different systems — hand-written CSS versus Quartz components styled through `custom.scss` — so they share a palette but not a layout. The fix is to make the Desk's header *look like* the storefront's (same wordmark treatment, nav and sticky behaviour), **not** to share code across two build systems that do not share a stylesheet.

#### 🟠 11.9.7 The Desk's visual problems

Reported together because they are one pass over `custom.scss`:

| Symptom | Likely cause |
|---|---|
| Left column too wide | §4b reclaimed the empty *right* sidebar; the left was never narrowed |
| Sidebar at the top on mobile, covering content | Desktop grid retained at small widths — needs a single-column breakpoint and `order` |
| **Tag pills have ugly yellow behind them** | **Almost certainly the theme-layer leak below** — highest-confidence item here |
| Search bar too narrow | Never resized after the sidebar change |
| Post body images far too large | No `max-width` on `.content img` — longest-standing of these |

**⚠️ The yellow tags are very likely the same bug as the violet accent, already solved.** The theme lives in `@layer obsidian-theme`, which beats `@layer quartz-base` on *layer order* — so anything Quartz derives from a theme token, including `--tag-color` (`var(--secondary)`, `quartz/util/theme.ts:263`), beats anything written in `custom.scss` regardless of specificity. `custom.scss:60` sets only `font-family` on `.tags .tag`; it never sets a colour, because a colour written there would lose anyway. **Fix it in the theme's own aspect block, exactly as the violet was fixed** — not by escalating the CSS from outside, which would appear to work and silently not be true.

#### 🟢 11.9.8 The Desk wordmark should go to the homepage, not the Desk's index

Clear and correct. The Desk's header wordmark currently links to the Desk's own index; it should go to `/`. The storefront's wordmark goes home, and the two must behave identically or the shared design reads as a coincidence.

**Do this inside the 11.9.6 header work**, not separately — the link target and the visual style are one decision.

### 11.5 🟢 Tag constellation, not a graph

The **tags are the connective tissue** — all 49 posts hang off them — and clicking a tag should land on `/desk/tag/<name>`. Settled: **the force graph does not go on the homepage.** At 8 nodes and ~7 edges it reads as broken rather than as a map, and it visualises a network without creating one.

Instead: a **static tag constellation** — tags as chips sized by post count, linking to the tag pages. No JS, no library, uses data that already exists. The full graph can return to the homepage later, once the link graph is dense enough to be worth looking at.

### 11.6 🔴 Bridge the craft writing to the books (highest ceiling, zero cost)

*How I Plan My Novel Writing Process*, *The Dangers of Overplotting*, *Sourcing Intrigue for Stories* and *The Art of Restraint* are **literally how a mystery thriller is written** — and right now that connection is invisible. On craft posts (and in the Desk sidebar), a line in the vein of *"Want to see these techniques applied? Read A Rock Star Has Exploded."*

This turns the newsletter from a side project into a funnel, and is **the single most on-brief item for the screen-adaptation goal**: it demonstrates craft to exactly the reader who buys fiction, and to exactly the agent who needs to see it.

### 11.7 🟢 Series reading order

A visitor who lands on Book 3 (the hero) has no idea who Luce is. A visible 0→1→2→3 order with a one-line hook each is cheap and typically lifts completion. Also an explicit **"start here"** for the free novella, already the natural on-ramp.

### 11.8 🟢 A unifying "How I Write" page (needs a decision)

`/` sells books; `/desk/` writes about writing. A page putting the craft posts **next to the books they produced** is arguably the most honest expression of "one coherent house", and the page most likely to interest an agent. Bigger than a nav change — flagged, not built.

## 12. Roadmap

**Now: the rest of the 11.9 defect list.** ✅ 11.9.1–11.9.3 are fixed, measured and looked at (2026-10-02): hero full-bleed, section rhythm restored, prequel cover 5:8 — plus the guard that now measures the rendered page on every deploy. **Next: 11.9.6 (fold the storefront header into the Desk)** — highest-value and nearly free, and it should carry 11.9.8 with it; then 11.9.4 (mobile — needs a real phone, two suspects already named) and 11.9.7 (the Desk's own CSS pass, where the yellow tags are the highest-confidence item). **11.9.5 is a decision, not a bug — needs HayJay's answer first.** Then craft→books bridge (11.6) → tag constellation (11.5).
**Also open:** Search Console is live with the sitemap. Analytics stays off — at current traffic levels Plausible's ~$9/month isn't justified, and **Search Console is free and answers the more useful question** (what people search for, and whether they find us). Revisit when traffic justifies it.
**Then:** backlinks enabled · sidebar width + active item (I4/I5) · F1–F4 cruft prune.
**Deferred until enough wikilinks exist:** always-visible graph links, reliable tag hover.

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

Resolved and closed — one line each; the reasoning lives in git. §5 crimson accent owned by the `emerson` theme · §10 default dark mode + working toggle (I2) · §12 body serif reaching paragraphs (I3) · §13 favicon on both halves · §15 storefront accent + drift assertions · §16 empty right sidebar collapsed, measure held at ~74ch · §17 header bar · §18 naming settled ("Emerson's Desk") · §20 the rename to `/desk/` with `/brain/` redirect · §21 `/desk/` reduced to a thin landing page · §22 tag taxonomy + `depth: 100` graph · §23 no breadcrumbs, no About page · §25 tag sign-off · §26 post polish (yellow, duplicate dates, hairline divider).
- Graph at `depth: 100` so the whole map shows; breadcrumbs disabled entirely; `/desk/` is a thin landing page.