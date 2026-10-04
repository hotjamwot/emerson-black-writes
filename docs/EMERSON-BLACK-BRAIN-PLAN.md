# Site Plan — what's left

**Trimmed on 2026-10-04.** This file was 614 lines and had stopped meaning what its own
header claimed: it promised *"§12 is the only section with work in it"* while §12 held
**twenty `✅` marks** and had grown to **55% of the document**. A later reader — or a
later LLM — who trusted the header would skip the shipped history, re-read it as a
backlog, and re-propose work that was already done.

**That had already happened.** §11.7 was proposed twice because a one-line checklist
entry was read without opening the page it described. So:

- **`docs/ARCHITECTURE.md`** — how the site is built (§1–7, §13). Changes rarely.
- **`docs/LESSONS.md`** — the traps, verbatim from §8–9. Read before writing a guard.
- **`docs/SHIPPED.md`** — §10–11, the record of what is done and why.
- **This file** — **only what is genuinely open.**

> **This is now true, and it is the reason the split happened.** If you add a `✅` to
> this file, move the item to `SHIPPED.md` in the same commit. A backlog that records
> finished work is a backlog nobody can trust.

---

## Open items

### Product — in ceiling order

- **11.8 A unifying "How I Write" page** — craft posts next to the books they produced;
  arguably the most agent-interesting page on the site. Flagged, not built.
- **11.5 Tag constellation, not a graph** — settled: no force graph on the homepage. Static
  chips sized by post count, linking to tag pages, no JS. **Largely SHIPPED by 12.7:**
  the homepage now carries exactly this — 7 static chips with post counts, linking
  to real tag pages, no JS. What is left is only whether they should also appear
  higher up (the hero), which is the remaining taste question. The full graph
  returns once the link graph is dense enough.

### Taste — HayJay's call, not a defect

- **Backlinks** sit `position: left`, so desktop puts them in the sidebar and mobile under
  the article. Defensible as-is; whether related posts deserve a more prominent slot
  (e.g. an end-of-post "related" section) is a taste call.

---

**Nothing else is open.** Everything that was is in `docs/SHIPPED.md`, and the reasoning
for *how* things are done is in `docs/LESSONS.md`. If you are about to start something
that is not in this file, either it is already done — check `SHIPPED.md` and the built
site before building — or it is new, in which case add it here.
