# Shipped — the record of what is done, and why

**Moved here from the old single plan file on 2026-10-04, verbatim** (then called
`EMERSON-BLACK-BRAIN-PLAN.md`; it now holds only open work and is `TODO.md`).
Git history is the real archive; this exists because git cannot be *read* the way a
decision log can. Each entry is one line of decision kept — the alternatives are in
git, but the reasoning behind the choice is not, and that is what stops the same
proposal being made again.

Full narratives of the larger changes: `docs/LESSONS.md` §3.

---

## 1. Where the Desk stands (measured 2026-10-03)


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

---

## 2. Shipped


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
| 12.9 (2026-10-04) | **Canonical book data** (`brain/scripts/books.mjs`) — built while scoping §11.6, and it found a real bug: the homepage and 18 posts carried **two contradictory ASIN sets**, with no guard comparing them. Also fixed `index.html`'s *"A Rock Star"* → **"A Rockstar"** (author-confirmed; 17 posts already used it). Short links proven to geo-redirect, bare ASINs cannot. `check-book-links.mjs` + a CI step keep homepage, posts and cards in agreement |
| 12.10 / 11.6 (2026-10-04) | **Book mention cards** — `eb-book-mentions`, an `afterBody` component naming the books a dispatch mentions, on **15 of 49 posts**, entirely automatic. *"Mentioned in this post"* (the author's phrasing) is what makes it safe to automate: a claim about the **text**, not about causation. **Shipped zero cards twice with a clean build** — Quartz calls a directly-exported component as a constructor with no props, and `String(tree)` is `"[object Object]"`. Styling uses **only existing `--eb-*` tokens**, so it inherits the theme. `check-book-mentions.mjs` + a CI step guard the invisible failures |
| 11.14 New-post graph (2026-10-07) | **No bug: stale `contentIndex.json`.** A new post briefly showed one slug-labelled node — the graph renders client-side from the index, and a cached pre-publish copy contains no entry for the post (label falls back to slug, BFS has no edges). Proven by simulation (fresh → 41 nodes + title; post removed → 1 node + slug). **Self-heals** on next fetch. Author's call: **accept the transient**, no cache-busting, no upstream-owned code touched |
| 11.10 Homepage head nav (2026-10-09) | **Already shipped.** The `Desk` link in `index.html` points at `https://www.emersonblackwrites.com/desk/`, not an in-page anchor — changed 2026-10-07 (commit `1ccafd0`, typo fixed in `b10769a`). Closed on verification, not on code |
| 11.16 Desk sidebar (2026-10-07) | **Stays as-is, author's call.** Sorting by publish date would need a custom `sortFn` fed from per-file dates, and showing dates needs custom node rendering — upkeep for a nav the author wants tight. Year folders already give date order |
---

# 3–7. The larger changes, in detail

Each of these was a multi-step change with a failure mode worth remembering, so
the reasoning is kept here rather than left to `git log`. They are **done** —
this is the record of why, not a backlog.

## §11.7 — proposed twice because nobody opened the page

The "series reading order" line read *"visible 0→1→2→3 with one-line hooks and a
'start here' for the free novella"* — and the Books section **already was exactly
that**: explicit `Book 0`–`Book 3` labels in ascending order, a one-line hook on each,
and Book 0 badged `Free`. Nothing to build.

It was proposed **twice**, both times by reading the checklist line without opening the
page it described — the same error as mistaking the Safari CSS cache for broken pills.

> **An item on a plan is a claim about the site, not a description of the site.
> Verify before building.**

This is now rule 5 of `AGENTS.md`, and `check-docs.mjs` enforces that the open plan
contains no finished work — the same failure, guarded against from the other side.


---

## 3. §12.1 The four Desk notes — all four shipped ✅

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


---

## 4. §12.2 11.9.4 Mobile — closed by measurement (2026-10-04)

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


---

## 5. §12.7 The Desk leads with recency (2026-10-04)

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

**§11.6 SHIPPED — the mention cards. "Mentioned in this post" is the author's phrasing and it is the load-bearing design decision.** The first proposal asserted a post *demonstrated* a book — a claim about **causation** that no machine can verify, since most mentions are passing (*"thanks to everyone who downloaded A Student Has Drowned"*). Naming that *"this book came out of this post"* would have the site over-claiming on the author's behalf. **"Mentioned in this post" is a claim about the TEXT**, which is exactly true and exactly what code may assert — and that reframe is what made automation acceptable at all. 15 of 49 posts qualify; no per-post decision is required ever.

**🔴 IT SHIPPED ZERO CARDS TWICE, WITH A CLEAN BUILD BOTH TIMES.** The most valuable thing in this section. **Quartz's `ComponentRegistry` treats any registered `function` as a `QuartzComponentConstructor` and calls it with `undefined`** (`instantiate()` in `quartz/components/registry.ts`), so a component exported directly is invoked with no props, returns `null`, and is cached — the card never renders anywhere and the build reports success. The fix is the **constructor/component split** `eb-latest`, `tag-hub` and `year-foldouts` all use. **Then, `String(tree)` on a hast node returns `"[object Object]`** — every match failed, every card silently vanished. Fixed with a vendored nine-line `hast-util-to-string` (the same function `@quartz-community/description` bundles), not a new dependency.

**The lesson is that BOTH failures are invisible to the build, so the guard checks the OUTPUT.** `check-book-mentions.mjs` asserts cards exist, sit on posts only (never the Desk or a tag page), list books in **ascending series order**, carry each book's **canonical number**, never link Amazon, and — the honesty guarantee — **still say "Mentioned in this post"**, so a future edit cannot quietly upgrade the claim into an unverified causal one. All proven red, including restoring the original all-cards-missing state.

**It works WITH Quartz, and the styling inherits rather than overrides.** An `afterBody` component rather than a `textTransform`/`markdownPlugins` transformer, because the transformer route would have to inject raw HTML as a string, hand-rolling markup that the renderer then has to be trusted not to reflow. `afterBody` hands over a real DOM, so the card is real elements with real links and the theme's own stylesheet can style them like anything else. Styling uses **only existing tokens** (`--eb-accent`, `--eb-line`, `--eb-surface`, `--eb-meta`, `--eb-display/mono`, `--eb-radius`, `--eb-tracking`, `--eb-shadow`), so the card inherits the brand by REFERENCING it and cannot drift from the rest of the reading room; it introduces no new colour and touches no upstream selector. It is a hairline-ruled block rather than a floating box, because a shadowed card in a prose column reads as an advertisement — and the whole point is that this is a quiet door. **The card never links Amazon** — it names the book and points at the homepage where the buy links already are, which is also why it cannot drift from an ASIN.

**THE CARDS CARRY THE ACTUAL COVERS, at 60px — the author's framing: *"being text only is missing a trick."*** What the cover buys is **recognition**: a returning reader identifies which of the four books this is from the artwork alone, before reading a word, which typography cannot do. **60px, not the homepage's 500px** — at hero size the end of a craft post becomes an advertisement for a book, the exact failure mode the wording above exists to prevent.

**🔴 THE COVERS WERE 190 KB ARTWORK BEING SERVED AT 60px, AND ONLY A GUARD CAUGHT IT.** The full covers are 1600×2560 at 179-224 KB; 15 posts × 2 books is **~5.7 MB of image weight added to a page made of text**, to paint thumbnails. `make-cover-thumbs.mjs` generates real 150×240 WebP at ~6 KB — **97% smaller, 32 KB for the entire set.** **`sips` was tried first and cannot do it**: macOS `sips` READS WebP but cannot WRITE it (`Error 13: Can't write format: org.webmproject.webp`), so the script uses **sharp**, which Quartz already depends on — no new dependency. Thumbs are **committed, not generated in CI**: the deployed bytes would otherwise depend on the runner's libvips, and a re-run could silently produce different files.

**A broken `src` is invisible to a build**, so the guard resolves every cover URL against the assembled `_site` and asserts each is **under 32 KB**, which makes a `thumbs/` → `covers/` regression fail the deploy instead of quietly costing every reader 190 KB. It also asserts the path is **absolute from root**, because pages are served from `/desk/` while `img/` deploys at the site root — a relative `img/covers/…`, which is exactly what the homepage uses and works there, **404s on every single card**. Both proven red.

**§12.9 Canonical book data — found while scoping §11.6, and it was a bug hunt.** Author approved: *"Nice to play cleanup as we go."*

**🔴 THE FINDING: two contradictory ASIN sets were already in the repo.** 18 posts link books straight to Amazon, and they did **not** match the homepage. Resolving the homepage's short links proved what they point at:

| Book | Homepage short link | → resolves to | Posts' own ASIN |
|---|---|---|---|
| 1 Rockstar | `amzn.eu/d/2hPym9v` | **B0BTML7L86** | `B0BTML7L86` ✅ same |
| 2 Actress | `amzn.eu/d/7QcaE4n` | **B0CJ5Z85S4** | `7Vg6bSy` ❌ differs |
| 3 Fiancé | `a.co/d/0bxUbDmW` | **B0GY5YH83F** | `B0GY5YH83F` ✅ same |

So Book 2 was the odd one, and `B0CJ5Z85S4` — which looked like a **stray ASIN belonging to no book** — is in fact **Book 2**. Two posts pointed at it without a matching homepage entry. **Short links are preferred over bare ASINs for a reason now proven, not assumed: `amzn.eu`/`a.co` short links geo-redirect** (Book 1's landed on `amazon.co.uk`, Book 3's on `amazon.com`), whereas a hardcoded `amazon.com/dp/…` in a post **cannot** — it sends a Swedish or Japanese reader to the US storefront. That is the author's stated requirement, and a bare ASIN would have failed it.

**"Mentioned in this post" is the assertion that makes §11.6 safe to automate** (author's framing, and the correction to the objection that killed the earlier version). A title mention is a **verifiable statement about the text**, not a claim that the book came out of this post — which is why code may assert it and why 15 posts qualify without the site over-claiming on the author's behalf. The earlier objection was to *"this book demonstrates this post"*, which is unfalsifiable; this is not.

**Two content bugs found while building it.** The site spells Book 1 *"A Rock **Star** Has Exploded"*; **17 posts spell it *"Rockstar"***, and the author confirmed *Rockstar* is correct — so `index.html` was wrong. And one post contains **corrupted text**: `favA Rockstar Has Explodednguishing physical traits` — a title glued into a word, which no reader has reported because it is mid-paragraph and reads as a typo rather than a break.

**The canonical set is the ASIN plus the short link**, so the file serves two needs: bare ASINs for diagnostics, short links for the country-redirect behaviour actually wanted.

**§12.8 (unchanged by 12.9) The Books section stays hand-maintained — a settled decision, not an oversight.** Author's call after being shown the automation. The book metadata lives in an Obsidian vault (`~/Documents/Obsidian/Nexus/…/See in Silverbridge`, **not a git repository**), so a build reading it would work locally and **fail in CI**. Every alternative costs something the author actually values: a committed `books.json` means **returning to VSCode to re-run a script whenever a book file moves**; vendoring the files breaks the vault; pointing the build at the vault breaks CI outright. The author's stated preference: *"Easier to come back to VSCode if the ASIN changes, or when a new book publishes, and just update that section in `index.html`."*

Note the two sections are complementary, not in tension: **§12.8 keeps the homepage's layout hand-written, while §12.9 makes the underlying links correct and single-sourced.** The author still edits HTML to reorder or re-badge books; they no longer have to guess which ASIN is right.

This is the **general lesson of §12.8** — automation was the right default for the *Desk*, which is generated from files that are **already in this repo** and regenerate on every deploy, so it costs nothing. The Books section is the counter-case: its source of truth is **outside the repo**, so automating it would *add* upkeep rather than remove it. The rule that follows: **generate from what is already committed; leave alone what is maintained elsewhere.** A system that is technically superior and that you will not maintain is worse than the manual thing you will.

**The guard is therefore the lightest in the repo** — it does not try to know the right answer, only to catch the three mistakes invisible in a diff: a **typo'd cover filename** (a broken image nobody notices until it ships), a buy link pasted as a full product URL instead of a short link, and a book missing or out of series order. It **deliberately does not fetch the URLs**: a network call per deploy fails when Amazon rate-limits or the runner has no egress, and a deploy that fails for a reason the author cannot fix is worse than a stale ASIN. All three proven red in both the local checker and the CI block.

**Two things the vault revealed that the site does not yet say.** The vault holds **six** books, but only four are released — `A Supermodel Slain` is `3rd draft` and `Silver and Gold` is `1st draft` (151k words, *"Once Silverbridge series finishes…"*). Filtering on `status` would need **matching, not `==`**, since values are free text (`"1st draft is 151,000 words"`). And Book 0 is numbered **`0.5`** in the vault but reads **"Book 0"** on the site. Neither blocks anything today; both are the kind of drift a manual section accumulates, which is why the count and the order are now asserted.

**No new frontmatter, no new data, nothing to maintain.**


---

## 6. §12.4 Cosmetic — shipped 2026-10-03

Done: F1–F4 cruft prune (20 orphaned `eb-*` classes, 276 lines; 3 inert plugins off),
§12.1(a) contrast, §12.1(d) count chip.

**Two items that were filed here are stale and are removed.** "Mobile sidebar above
content (needs a single-column breakpoint + `order`)" was already fixed by 11.9.7c — the
`grid-template` redefinition at `max-width: 800px` in `custom.scss` §4c — and §12.2 says so
on the same page. I4 (F12) does not reproduce in the build: the theme declares
`--nav-item-background-active` but nothing consumes it. Remaining cosmetic work is whatever
`--gray`-as-text (F17) becomes.


---

## 7. §12.6 The Quartz truce — stop fighting the theme (agreed 2026-10-04)

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
- **11.11 — post images capped desktop-height, portrait tamed (done 2026-10-07,
  reworked 2026-10-07).** Article images were full-bleed slabs at the 780px
  column; a 40rem width cap fixed landscape but the first height cap — bare
  `max-height: 80vh` — scaled with the monitor and left a 1200×1518 portrait
  rendering 660×835 on a normal Mac screen. Now `max-height: min(32rem, 80vh)`
  + `width: auto` + `display: block` on `.page article img` (whichever cap
  bites first wins, aspect ratio kept, narrowed portrait truly centred) —
  landscape still hits the width cap (780×444 untouched), portrait renders a
  figure not a slab (405×512 measured in Chrome at 1440px), mobile never
  noticed. Guards proven red against the old 80vh-only rule.
- **Stray `content/Newsletters/index.md` excluded at the mirror (done 2026-10-07).**
  The vault's retired "Newsletter Archive" page kept republishing over the
  `archive-redirects` stub, building to `newsletters/index.html` with a 2023 date —
  a 51st "post" in the 2023 fold-out and a leak into search and the graph.
  `Publish Brain.command` now excludes `index.md` from the Newsletters mirror, and
  `year-foldouts` belts-and-braces filters `newsletters` / `newsletters/index` from
  its listing. Year/post-count guards derive from the build instead of hardcoding.
