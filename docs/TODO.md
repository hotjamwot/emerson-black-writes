# Current work

**Everything still open on this site. Nothing else.** Three items, and only three.

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

Item numbers (`11.12`) are **kept deliberately** — they are how the work was
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

### 11.12 "Mentioned in this post" cards — the homepage Books-section link isn't reliable

- The §11.6 cards in the Desk link to the **Books section of the homepage**, which
  isn't a reliable destination. Open question, author's call:
  - **Option A:** link each card to its **Amazon short link** (already single-sourced
    in `brain/scripts/books.mjs`).
  - **Option B:** build a **dedicated page per book** — blurb, some reviews, and room
    for bonus content later (character backstories, etc.). More to maintain, but it
    gives the cards a durable on-site destination.
  - Not decided; flagged for discussion rather than implementation.

### 11.15 Year/Topic pages — tag pills use odd vertical space vs. short titles

- On the Desk's Year pages (`newsletters/<year>`) and Topic (tag) pages, the tag pills
  in the post lists look squeezed and take odd vertical space next to comparatively
  short post titles and subtitles.
- Open: ideas for making the list styling fit better.

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
