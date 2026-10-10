# Current work

**Everything still open on this site. Nothing else.** Seven items, and only seven.

*Renamed from `EMERSON-BLACK-BRAIN-PLAN.md` on 2026-10-04 — same file, shorter name.
It was 614 lines and had stopped meaning what its own header claimed: it promised
*"§12 is the only section with work in it"* while §12 held **twenty `✅` marks** and had
grown to **55% of the document**. A later reader — or a later LLM — who trusted the
header would skip the shipped history, re-read it as a backlog, and re-propose work
that was already done.*

**That had already happened.** §11.7 was proposed twice because a one-line checklist
entry was read without opening the page it described. So the file was split:

- **`AGENTS.md`** — the entry point. Read first.
- **`docs/ARCHITECTURE.md`** — how the site is built. Changes rarely.
- **`docs/LESSONS.md`** — the traps, verbatim from §8–9. Read before writing a guard.
- **`docs/SHIPPED.md`** — what is done, and why.
- **This file** — **only what is genuinely open.**

> **This is now true, and it is the reason the split happened.** If you tick something
> off here, move it to `SHIPPED.md` in the same commit. `check-docs.mjs` enforces it. A
> backlog that records finished work is a backlog nobody can trust.

---

## Open items

Item numbers are **kept deliberately** — they are how the work was
discussed with the author and how `SHIPPED.md` refers back to it. Renumbering them would
break every cross-reference for no gain.

### Graph — every instance shows the whole map (fixing 2026-10-09)

**Measured, not guessed** (real `contentIndex.json`: 64 entries, 9 with any
`links`, the Desk hub itself `links: []`):

- **The one dot was the correct rendering of the config, not a data bug.**
  The graph client BFS-filters from the current page when `depth >= 0` — and
  the hub has no edges, so its neighbourhood is itself. `depth: 100` made the
  filter wider, not absent. Fix: `localGraph.depth: -1`, which takes the
  else-branch and renders every node on every instance.
- **Proven by simulation on the real index:** depth 100 from `index` → 1 node;
  depth -1 → all 64, from the hub and from a post alike.
- **Homepage stays graph-free** — author's decision, settled.
- Wikilinks still matter for backlinks and edges — but a sparse archive now
  reads as a scattered map, not a broken widget.

### Sidebar — two real defects, both confirmed by measurement

Both were reported by the author as "worth checking", and both are real. Measured on
`the-art-of-restraint.html`, which has the most backlinks of any post:

| | Desktop 1440 | Mobile 390 |
|---|---|---|
| Backlinks block | 255×**106px** | 241×115px |
| Explorer (Archive) | **1023px tall, 53 links** | **34px tall, collapsed** |
| Sidebar children | `backlinks:106 explorer:1023` | `backlinks:115 explorer collapsed:34` |

- **Backlinks: 11 of 53 posts render them at all.** `content` page type
  **excludes** `backlinks` in `quartz.config.yaml`, and separately **only 8 posts in
  the archive contain any wikilinks** — so most posts have no backlinks to show. On
  the busiest post it is a 106px block: small, as reported. **Not a styling bug.** It is
  thin for the same reason the graph is a dot — the link graph is nearly empty.
- **Mobile blank space: real, and it is the collapsed Archive.** At 390px the whole
  sidebar is 147px, of which the collapsed explorer header is 34px. The page still
  scrolls **8420px**. So the reader gets a short "Archive" heading, no visible links, and
  then has to keep scrolling — a dead zone where navigation should be.

### 11.15 Year/Topic pages — tag pills use odd vertical space vs. short titles

- On the Desk's Year pages (`newsletters/<year>`) and Topic (tag) pages, the tag pills
  in the post lists look squeezed and take odd vertical space next to comparatively
  short post titles and subtitles.
- Open: ideas for making the list styling fit better.
- See '20261009-year-post-view.jpg' file in docs/ for a visual example of what they look like rendered on screen currently. On phone, we don't have the tags visible on the years, so that's fine. Desktop only.

### Desk topic cards — an icon on each tag title (Option A agreed 2026-10-09)

- **The ask.** The seven topic cards on `/desk/` (`mindset`, `process`, `reading`,
  `systems`, `craft-character`, `craft-plot`, `bookcraft` — `news` stays excluded by
  name) have all-caps titles at `0.82rem` that read as little more than a slightly
  larger post line. Add a small symbol beside each title so the card announces its
  topic at a glance and reads unmistakably as a heading. Requested as "SF symbols or
  even emoji or something".
- **Agreed approach — Option A: inline SVG in `tag-hub`.** A `TAG_ICONS` map at the
  top of `brain/quartz/plugins/tag-hub/index.js` (7 entries), rendered as
  `<svg aria-hidden="true" focusable="false">` *inside* the existing `<a>` with
  `stroke: currentColor`, styled only in the existing `[SAFE]` `.eb-hub__tag` block of
  `custom.scss` using existing `--eb-*` tokens. ~1–2 KB for all seven, no new
  dependency, no new font, no upstream selector touched — and `currentColor` means the
  icon inherits the link's hover accent and dark mode with zero extra rules. Stock
  Quartz has no tag-icon feature to use (its only near-miss, the Lucide markdown-tag
  transformer, PR jackyzha0/quartz#2346, was closed unmerged and targets post content,
  not component markup), but `tag-hub` is this repo's own component, so the
  override-free path and the implementation path are the same path.
- **Why the alternatives were rejected, recorded so they are not re-proposed.**
  **SF Symbols cannot go on a website at all** — there is no webfont, and Apple's
  licence covers use in Apple-platform apps, not images placed on a web page (the
  sf-symbols.com gallery had to strip its icons for exactly this reason). **Emoji** is
  zero-code but is barred by the Voice rule in `AGENTS.md` (no emoji in visible copy)
  and renders differently on every OS. **CSS `::before` masks** still need per-tag
  markup and split the tag→icon mapping across two files, so they are not leaner. **An
  icon webfont** adds a download, a FOUT and an external dependency to draw seven glyphs.
- **Open decisions.** (1) The seven glyphs themselves — Lucide is ISC-licensed and
  stroke-based like Quartz's own chrome; suggestions were compass / repeat / book-open /
  layers / masks / route / bookmark, HayJay's call. (2) Whether the title also comes up
  off `0.82rem` (e.g. ~0.9rem); that must be measured via `check-desk-density.mjs`,
  not eyeballed.
- **Guard plan.** Extend `verify-default-mode.mjs`: icon count equals card count, exactly
  one icon per card, `aria-hidden` present, index-only (the hub's `condition: is-index`),
  and a fallback in the map so a future tag with no entry cannot ship a broken card.
  Each check proven red by removing an icon before it is trusted; any browser-measured
  check only runs with `public/` served on :8099, otherwise it is silently skipped.

### Desk header — centre the nav links on desktop (author ask, 2026-10-10)

- **The ask.** On desktop, the header nav (`Books · Desk · About · Subscribe`) sits
  immediately beside the stacked wordmark and reads left-heavy. Explore centring those
  nav buttons in the header bar while the wordmark stays top-left and search + theme
  controls stay top-right (the layout described in `custom.scss` §4a).
- **Quartz-native first.** This is pure layout in the existing `[OVERRIDE — upstream]`
  `.page-header` block — no new components, no footer-plugin changes. Likely a grid or
  a centred flex region between wordmark and toolbar; measure at 1440/1280/1024 so the
  nav still fits one line (`verify-default-mode.mjs` `headerFits` / `navLinks` checks).
- **Open.** Whether “centred” means centred in the full header width or centred in the
  space between wordmark and toolbar (they differ once the sidebar column is included).
  HayJay's call after seeing a build.

### Desk header — mobile nav: EBW · Books · Desk only (author ask, 2026-10-10)

- **The ask.** When reading a post on mobile, the header shows four links —
  `Books · Desk · About · Subscribe`. Drop `About` and `Subscribe`. Replace the hidden
  wordmark with a leading **EBW** link to `https://emersonblackwrites.com/` (or `/`), then
  **Books** and **Desk** — three items total, all routes readers actually use from a post.
- **Where it lives.** Nav links come from `@quartz-community/footer` in
  `quartz.config.yaml` (11.9.6). That config is global, not per-breakpoint — so either
  the same three links apply at every width (storefront parity changes) or we need a
  small custom header-nav component / duplicate link set with CSS show-hide. **Decide
  before coding:** desktop storefront still ships four links in `index.html`; the author
  asked specifically about mobile-on-post, not necessarily the homepage header.
- **Follow-through.** Update `custom.scss` §4a-bis comments (still say “four links”),
  `verify-default-mode.mjs` (currently asserts `navLinks === 4`), and any guard that
  assumes `Books / Desk / About / Subscribe` order matches the storefront exactly.

### Sample chapters on the Desk — content + site wiring (author ask, 2026-10-10)

- **The idea (author).** Publish the first chapter of each book on the Desk, linkable
  from “Mentioned in this post” cards, homepage book buttons, and other sensible doors.
  Date each piece with the **book’s publish date**; tag with something like `sample-chapter`.
- **Recommendation — yes, good plan, with one canonical map.** Treat chapters like any
  other Desk note (`publish: true`, real `title`, `description`, `date:`). Use tag
  `sample-chapter` (and optionally `type: sample` in frontmatter) so guards and filters
  can find them. Put notes in a dedicated folder in the vault (e.g. `Samples/` or
  `Books/Sample chapters/`) so they are easy to spot when syncing — slug becomes the
  stable ID either way.
- **Single source of truth (same rule as covers and ASINs).** Add one field per book in
  `brain/scripts/books.mjs` — e.g. `sampleSlug: "samples/rockstar-chapter-1"` or
  `sampleUrl: "/desk/…"` — pointing at the built Desk URL. Homepage, `eb-book-mentions`,
  and future CTAs import that field; never hardcode chapter paths in HTML or posts.
- **Card behaviour (product call).** Today mention cards link the series block on the
  homepage (`/#books`) by design — no Amazon in craft posts. With samples live, a strong
  default is: **card → sample chapter when `sampleSlug` is set**, else keep `/#books`.
  Secondary “Buy” stays on the homepage/book row. Wording may stay “Mentioned in this post”
  (text claim) while the link becomes “read the opening” rather than “buy”.
- **Homepage.** Add a clear secondary action on each paid book (e.g. “Read chapter one” →
  `/desk/…`). *A Student Has Drowned* is free and already uses `#start-reading` — decide
  whether it gets a Desk sample, points at a full free text, or stays as-is.
- **Desk surfacing.** Samples should appear in search and direct links; **open:** exclude
  from “latest on homepage” / hub hero picks if they would clutter the writing feed
  (`render-desk-picks.mjs`, tag hub, year lists). Tag page `sample-chapter` is enough for
  curious readers; no need to spam the main index.
- **Author workflow (Obsidian).** Draft chapters in the vault → `publish: true` → Publish
  Brain → we wire links in a follow-up pass once slugs are stable. No code change required
  in the vault beyond normal frontmatter.
- **Guard plan (when wiring).** Assert every non-free book with an ASIN has a resolvable
  `sampleSlug`; built HTML contains the link on mention cards and homepage; sample posts
  carry `sample-chapter` and the expected `date:`; falsify by breaking one slug.

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
