# Lessons — the traps that cost a deploy

**Moved here from `EMERSON-BLACK-BRAIN-PLAN.md` §9 and §8 on 2026-10-04, verbatim.**
Nothing was rewritten. It was split out because it has the longest half-life of any
document here — the architecture changes rarely and the open items change weekly, but
every rule below was bought with a failed deploy or a guard that lied, and none expire.

**Read this before writing a guard or touching the theme.** Most of it is about
verification failing *quietly*, which is the recurring theme of this project.

> The general form of the most common bug here: **a negative result is only as good as
> the coverage behind it.** A check that reports "nothing" must first be asked what would
> have had to be true for it to fire — and that must be proven.

**If you only read one thing:** *a guard that cannot fail is worse than no guard.*

---

## 1. Standing rules

Each was bought with a failed deploy, a wrong fix, or a guard that lied. Full stories
in git; the ones worth not rediscovering:

- **A suite number means nothing unless you know which checks ran.** Browser-measured
  guards execute only when `public/` is served; otherwise they are skipped silently and
  the count still looks complete. F18 sat red and undetected for weeks behind a
  173/173. **Always serve `public/` on :8099 before trusting `verify-default-mode.mjs`**,
  and read the last line — it names the count, so compare it against expectations.
- **Ask the Quartz-native question first.** On every styling/structure request, the
assistant queries HayJay with the override-free alternative before touching upstream
selectors or plugin markup — e.g. tokens + own `eb-*` classes, additive slot components,
config options, or accepting the default. An override ships only on an explicit call.
- **Stock Quartz renders; brand lives in tokens + `eb-*`.** Nothing overrides upstream
selectors (`.page`, `.tag-link`, `.section`, layered theme rules). See §12.6.
- **A guard that cannot fail is worse than no guard.** Hit repeatedly: a check that
  grepped `index.html` for theme vars that live in the CSS bundle; two unreachable
  sitemap assertions; `--screenshot` captures that produced byte-identical PNGs (I11 —
  *measure geometry, never eyeball screenshots*).
- **A guard that the code is *present* is not a guard that the code *works*.** The
  11.9.7e header probe was `article h1`; on content pages the title is not inside
  `<article>`, so the probe matched nothing and the feature was inert with no error.
- **Assert absences, not presences**, for anything removed. Two of three 11.9.7f bugs
  passed guards asserting code was present; a guard that something is *gone* cannot pass
  for the wrong reason.
- **Assert a thing is on the *right* page, not merely that it is somewhere.**
- **Pin the token *and* own the property.** A component rule in `@layer quartz-base`
  reading a theme token cannot be fixed by pinning the token alone.
- **Ownership of a virtual page comes from `generate()`, not `match`.** Tag pages are
  virtual; `match` is never consulted.
- **A config value that resolves to `undefined` and is then ignored produces a build
  that looks fine and is wrong.** `condition: index` is not a condition — only
  `not-index` / `has-tags` / `has-backlinks` / `has-toc` exist.
- **A crashed suite is worse than a red one** — it hides every check that had not run yet.
- **Presence in the DOM is not visibility.** See F16.
- **After a visual change, measure the rendered thing.** Verifying the input is not verification (I10).
- **A check a comment can break is not a check.** Strip comments before pattern-matching (I9).
- **After fixing one unpinned token, enumerate the rest.**
- **An unpushed fix is an unfixed fix.** `deploy.yml` runs on push to `main`.
- **Commit messages: never write them to `/tmp`** — a concurrent write overwrote one mid-flight.

---

## 2. Incidents

| # | Symptom | Cause | Status |
|---|---|---|---|
| I1 | Desk silently reverted to a Jekyll page | Pages Source left on "Deploy from a branch" | ✅ fixed + smoke-tested |
| I2 | Sun/moon toggle invisible (~3% opacity) | Theme paints icons via `background` + `mask-image`; a blanket `background` rule overwrote it | ✅ fixed — set `--icon-color` only |
| I3 | Body serif never reached paragraphs | `@quartz-community/quartz-fonts` appends its layer **last** and beat the pin | ✅ fixed — fonts pinned **unlayered** |
| I4 | Active sidebar item red-on-red | Theme's `.active` won on specificity, painting a crimson wash under crimson text | ⏳ **open** (F12 — does not reproduce in the build; re-check on device) |

**I2 lesson:** for these components *the icon is the background*. Any blanket
`background` rule on an icon button destroys it.

**I5 (left sidebar 320px) is closed** — 11.9.7g settled on Quartz's own
`$sidePanelWidth`, which is the right answer rather than an override.

---

## 3. Findings

| # | Finding | Status |
|---|---|---|
| F1–F4 | CSS/plugin cruft — **cut**: 20 orphaned `eb-*` classes (**276 lines**; the "15" became 20 as the last five went dead too), the now-orphaned `--eb-shadow-lift` token, and 3 inert plugins (`canvas-page`, `bases-page`, `obsidian-plugin-excalidraw`) | ✅ fixed |
| F12 | Active explorer item "red-on-red" — **not reproducible in the build**: the theme declares `--nav-item-background-active: var(--highlight)` but nothing consumes it, so only our `--eb-surface` paints the active item. Re-check on device before trusting | ✅ fixed (verify) |
| F13 | The vacuous guard + wrong-layer pin | ✅ fixed |
| F14 | Two "known-failing" bio guards were unfixable, not flaky — S11 turned `bio.html` into a redirect stub, so both were specs describing an old site | ✅ fixed |
| F15 | **Two symptoms in one report were not one bug.** "Cards look different widths" + "too wide on mobile" shared a theory, got one fix; only the overflow half was real | ⏳ open — §12.1(b) |
| F16 | **"No dates" was "dates at 1.82:1".** Drawn in the DOM, invisible in light mode. Fixed with a real `--eb-meta` token + a computed-contrast guard | ✅ fixed |
| F17 | **`--gray` (#6b7a91) as *text* is 3.94:1 on the page background** — below AA. Used by section labels, `.folder-title`, tag pills, `h4–h6` and table headers | ⏳ open |
| F18 | **Three wordmark guards had been failing since 11.9.6 and nobody saw it**, because they only run when `public/` is served — a plain build skips them, so a permanently red section looked like a passing one | ✅ fixed |
| F19 | **The override audit's first pass called three blocks "deletable" and all three were wrong** — the probe had only loaded pages that do not contain the affected elements. A negative result measured on the wrong page is the same failure as a guard that greps the wrong file | ✅ fixed |

**F14's lesson — a red guard is not automatically a bug.** Two checks were filed as
"known-failing, ignore" long enough to become scenery. A guard that has never passed is
not flaky; it is a spec that no longer matches reality, and it was suppressing the real
signal. Ask whether it describes the site or describes an old site.

**F15's lesson — one theory unifying two reports is a hypothesis, not a diagnosis.** The
unifying explanation was written in the same sentence as the fix, which is where
confidence goes to hide. The fix was verified against the symptom that had a CSS-level
theory, and not against the one that did not.

**F16's lesson — "the feature is missing" and "the feature is invisible" produce the same
report and completely different fixes.** Presence checks cannot see contrast.

**F18's lesson — F14's, plus why it survived so much longer.** F14 was two guards
filed as "known-failing, ignore". F18 is three guards asserting the *old* EBW wordmark,
retired by 11.9.6 in favour of the stacked name — they could never pass again. The
difference is not severity but **invisibility**: browser-measured checks run only when
`public/` is being served, so in every plain `npx quartz build` they are skipped
entirely. A section that is silently absent is indistinguishable from a section that is
green, and the suite reported 173/173 while three of its checks were dead. Any guard
that needs a browser must be run deliberately, with the server up, or it is decoration.
Both halves now assert the *current* contract (stacked name, real `aria-label`, both
lines measured) and were confirmed falsifiable: hiding either line reports `0px`, and
dropping the `aria-label` reports `null`.

**F19's lesson — "no measured effect" is a claim about coverage, not about the code.**
The override audit disabled each of the 12 `[OVERRIDE]` blocks and re-measured. Three
came back with zero differences, which reads as "deletable". All three were wrong. The
probe had loaded the Desk and one post, and those blocks govern the year/tag archives
and the chrome fonts — none of which exist on either page. The element was never
measured. Re-run across all four page types, all three showed large changes.

The general form, which has now appeared three times in this project: **a negative
result is only as good as the coverage behind it.** Grepping `index.html` for theme
variables (F13), a coverage guard that compared zero pairs (12.1a), and this. The
defence is always the same — when a check reports "nothing", first ask *what would have
had to be true for it to fire*, and prove that. A "no change" verdict from a probe that
never loaded the element is the same error as a guard that greps the wrong file.

---

## 4. Dead code and traps worth remembering

- `@quartz-community/folder-page` and `tag-page` each **compile their own copy of
  `PageList` into `dist/`**, which drops `description`, and expose no option to swap the
  list component. The local `quartz/components/PageList.tsx` you find by grepping is a
  **dead copy** — nothing imports it.
- `treeTransforms` runs over the **markdown** tree before layout renders, so it can never
  see `.page-listing`.
- A plain-JS local plugin cannot import from `quartz/util` (it is loaded as a runtime
  module), so `tag-hub` / `year-foldouts` emit `"./" + slug` and guard on
  `fileData.slug !== "index"` themselves.
- `!slug.endsWith("/")` excludes **folder** slugs only. Root slug `"index"` does not end
  in a slash, so it survives that filter — which is how the Desk listed itself as a post.
- `minmax(460px, 1fr)` has a **hard 460px floor** and cannot narrow below it.
- `quartz/static/` is the **assets** directory and publishes to `<output>/static/` — a
  redirect written there lands at a path nothing links to, in a clean build.

---

**The general lesson across all of these:** the failures that cost the most time were
never the ones that threw an error. They were the ones that produced a clean build, a
green suite, and a site that was quietly wrong. Everything here exists to make the quiet
failures loud — verify the *rendered output*, and make each guard demonstrably
falsifiable before trusting it.

**§11.6 added the newest instance.** The book mention cards shipped **zero cards,
twice, with a clean build both times** — Quartz calls a directly-exported component as a
constructor with no props, and `String(tree)` on a hast node is `"[object Object]"`.
Neither threw. Nothing about a card that renders nowhere is visible in build output, so
`check-book-mentions.mjs` now checks the *rendered HTML*: that cards exist, sit on posts
only, list books in ascending series order, carry canonical numbers, and that every cover
exists on disk and is a thumbnail.
