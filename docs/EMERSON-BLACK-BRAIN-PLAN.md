# Emerson Black — Site Plan & Log

**Status:** Live · `emersonblackwrites.com/` (storefront) + `/desk/` (Emerson's Desk) · Quartz v5 · **Updated:** 2026-10-01
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
| Verification | `brain/quartz/verify-default-mode.mjs`, `brain/quartz/theme/verify-brand.mjs` |
| Mirrored plan | `docs/EMERSON-BLACK-BRAIN-PLAN.md` (rsync target) |

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
```

**Suite currently 91/91.** Both scripts assert against the **built stylesheet**, not the source — see §9.

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
- *A step that "works when I run it" is not a step that works. Order matters, and only the assembled artifact can prove it.*

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

### 11.3b 🔵 "From the Desk" section — now unblocked

Six posts (title, one-line description, date) near the hero — **hand-picked, not the auto-listed 49.** An auto-list is an archive; six is a pitch. The data now exists at `/desk/static/postDates.json` (49 entries, 10KB, newest first), so this is a front-end change on the storefront rather than plumbing.

**Still open for HayJay:** *which* six, and whether they are fixed or rotate. A rotating list stays current with zero upkeep; a fixed one can be curated. Genuinely a judgement call, not a technical one.

### 11.4 🔵 A real link to the Desk in the header

One nav item at the top, so visitors see the site has a second half rather than finding it in the footer.

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

**Now:** "From the Desk" (11.3b) → header link to the Desk (11.4) → craft→books bridge (11.6). Analytics remains deferred (§11.2).
**Also open:** Search Console is live with the sitemap. Analytics stays off — at current traffic levels Plausible's ~$9/month isn't justified, and **Search Console is free and answers the more useful question** (what people search for, and whether they find us). Revisit when traffic justifies it.
**Then:** tag constellation (11.5) · backlinks enabled · sidebar width + active item (I4/I5) · F1–F4 cruft prune · series order (11.7).
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

# Publish vault → site (or double-click "Publish Brain.command")
# Local preview: double-click "Preview Brain.command"
# Plan sync: rsync the vault plan to docs/, then commit

# Deploy status without the gh CLI
curl -s "https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1" | grep conclusion
```

## 14. History

Resolved and closed — one line each; the reasoning lives in git. §5 crimson accent owned by the `emerson` theme · §10 default dark mode + working toggle (I2) · §12 body serif reaching paragraphs (I3) · §13 favicon on both halves · §15 storefront accent + drift assertions · §16 empty right sidebar collapsed, measure held at ~74ch · §17 header bar · §18 naming settled ("Emerson's Desk") · §20 the rename to `/desk/` with `/brain/` redirect · §21 `/desk/` reduced to a thin landing page · §22 tag taxonomy + `depth: 100` graph · §23 no breadcrumbs, no About page · §25 tag sign-off · §26 post polish (yellow, duplicate dates, hairline divider).
- Graph at `depth: 100` so the whole map shows; breadcrumbs disabled entirely; `/desk/` is a thin landing page.