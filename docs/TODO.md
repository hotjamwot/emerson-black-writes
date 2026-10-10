# Current work

**Everything still open on this site. Nothing else.** Six items, and only six.

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

### Graph — SSP-inspired presentation (author feedback, 2026-10-10)

- The native graph config now shows the whole map on every instance, with drag,
  zoom, hover focus, restored label sizing, and stronger centering. The
  plugin initializes labels fully hidden; `opacityScale` only changes their
  opacity after a zoom event. Its `scale` option changes label size, not the
  initial graph zoom.
- The author likes the SSP graph's spacious canvas, readable connected titles,
  category colors, and legend. The installed `@quartz-community/graph` renderer
  does not expose a legend or per-category colors; matching those means replacing
  or extending the renderer, not adding Quartz config options.
- Idle link contrast is improved by owning `--lightgray` in the Emerson theme
  overlay; the Obsidian theme overrides Quartz's palette config at runtime.
- **Every node stays in the graph** (`depth: -1`); the first viewport may be
  zoomed into the current area, with the rest reachable by pan and zoom.
- **Decision before plugin work:** keep the current renderer and accept these
  limits, or authorize a small maintained patch to show labels on first render,
  and highlight/center the active post. A full renderer replacement is still a
  separate choice for the reference's legend and category styling.

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

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
