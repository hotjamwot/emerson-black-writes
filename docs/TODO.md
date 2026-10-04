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

Item numbers (`11.8`, `11.5`) are **kept deliberately** — they are how the work was
discussed with the author and how `SHIPPED.md` refers back to it. Renumbering them would
break every cross-reference for no gain.

### Product — in ceiling order

- **11.8 A unifying "How I Write" page** — craft posts next to the books they produced;
  arguably the most agent-interesting page on the site. Flagged, not built.
- **11.5 Tag constellation, not a graph** — settled: no force graph on the homepage. Static
  chips sized by post count, linking to tag pages, no JS. **The homepage part is done**
  (see `SHIPPED.md` §12.7): 7 static chips with post counts, linking to real tag pages,
  no JS. **What is left here is only** whether they should also appear higher up (the
  hero) — which is a taste question, below. The full graph returns once the link graph
  is dense enough.

### Taste — HayJay's call, not a defect

- **Backlinks** sit `position: left`, so desktop puts them in the sidebar and mobile under
  the article. Defensible as-is; whether related posts deserve a more prominent slot
  (e.g. an end-of-post "related" section) is a taste call.

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
