# Current work

**Everything still open on this site. Nothing else.** Nine items, and only nine.

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

Item numbers (`11.8`, `11.5`) are **kept deliberately** — they are how the work was
discussed with the author and how `SHIPPED.md` refers back to it. Renumbering them would
break every cross-reference for no gain.

### Closed by the author, 2026-10-04

- ~~**11.8 A unifying "How I Write" page**~~ — **NOT NEEDED.** The author's call: the
  §11.6 *"Mentioned in this post"* cards already do the job this page would have done.
  They connect craft writing to the books **per post**, automatically, and only where
  the post actually mentions a book — which is more accurate than a hand-built page
  pairing posts with books, and free to maintain. **Superseded, not descoped.**

### Graph — the Desk shows one dot, and it should show the map

**Measured, not guessed** (Chrome, 1440px, built site):

- `contentIndex.json` holds **63 entries, but only 8 have any `links` at all** — and
  the Desk's own entry has `links: []`. **A graph of one node is the correct rendering
  of the data.** This is the documented §12.6 condition: *"the full graph returns once
  the link graph is dense enough."* It is not dense enough.
- **This is a content problem, not a config problem.** `localGraph.depth: 100` is already
  set; depth cannot invent edges that the markdown does not contain.
- **Homepage stays graph-free** — author's decision, settled. The concern here is only
  the graph *on the Desk*.
- **So the fix is authoring, not code:** more `[[wikilinks]]` between posts. That is
  the author's own writing, and it also fixes backlinks (below), which are driven by
  exactly the same links.

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

### 11.10 Homepage head nav — "Desk" should leave the homepage

- The head nav on the homepage: **Desk** currently links to the Desk *section of the
  homepage* (an in-page anchor). It should navigate to
  **emersonblackwrites.com/desk/** instead — that is what the label promises.

### 11.11 Desk — post images are huge on desktop, right on mobile

- In the Desk, images render far too large on desktop; they need to display at a much
  more comfortable size. Mobile sizing is nice as-is, so any fix must be
  responsive — improve desktop without regressing mobile. (*No approach chosen yet —
  per AGENTS.md, ask the Quartz-native question first.*)

### 11.12 "Mentioned in this post" cards — the homepage Books-section link isn't reliable

- The §11.6 cards in the Desk link to the **Books section of the homepage**, which
  isn't a reliable destination. Open question, author's call:
  - **Option A:** link each card to its **Amazon short link** (already single-sourced
    in `brain/scripts/books.mjs`).
  - **Option B:** build a **dedicated page per book** — blurb, some reviews, and room
    for bonus content later (character backstories, etc.). More to maintain, but it
    gives the cards a durable on-site destination.
  - Not decided; flagged for discussion rather than implementation.

### 11.13 Desk header nav — "Books" and "About" don't go where they're meant to

- In the Desk's header nav, clicking **Books** doesn't take us to the book section,
  even though it's meant to; clicking **About** just lands at the top of the homepage
  instead of the `#about` section.
- Possibly a Brave-specific bug — **verify in a second browser before treating it as
  a site defect.**

### 11.15 Year/Topic pages — tag pills use odd vertical space vs. short titles

- On the Desk's Year pages (`newsletters/<year>`) and Topic (tag) pages, the tag pills
  in the post lists look squeezed and take odd vertical space next to comparatively
  short post titles and subtitles.
- Open: ideas for making the list styling fit better.

### 11.16 Desk sidebar — sort by publishing date, and show the dates

- The Explorer sidebar ("The Archive") currently sorts posts by **modified** date, so a
  touch-up to an old post silently reorders the archive. It should sort by the
  original **publishing date** (`frontmatter` → `date:`, already plumbed through as
  `defaultDateType: created` in `quartz.config.yaml`).
- Upstream default `sortFn` is display-name only and has no date branch; the local
  `year-archives` plugin already sorts by publish date (`byDateAndAlphabetical`), so
  the precedent is in-repo. A custom `sortFn` on the explorer options should do it.
- Also: showing each post's date in the sidebar would help orientation. (Taste call —
  dates in a file-tree nav add clutter as well as context.)

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
