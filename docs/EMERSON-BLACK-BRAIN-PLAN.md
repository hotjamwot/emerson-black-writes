# Emerson Black Brain — Architecture, Spec & Operations Guide

**Status:** Live at `emersonblackwrites.com/brain/` · **Engine:** Quartz v5 · **Date:** 2026-09-28 · **Author:** HayJay + AI assistant
**Now (2026-09-30):** Arc 2 visual pass, one change at a time. ✅ **S5** crimson accent, owned by the Brain's own `emerson` theme (§11). ✅ **Default dark**, toggle kept (§10). ✅ **S7** favicon on both halves (§13). ✅ **S6** complete — the body-serif bug that held this up is fixed and guarded (§14). ✅ **S9** storefront accent + favicon — storefront now carries the Brain's dark accent and the halves are assertion-guarded against drift (§15). **Next: S1 / S1a / S2 / S3 / S4 / S8.**


**Goal:** Write in Obsidian → run `Publish Brain.command` → the newsletter archive is live at **`emersonblackwrites.com/brain/`**, built automatically via GitHub Actions.

---

## 1. System Architecture

```
  YOU WRITE HERE
       │
       ▼
  Obsidian vault — source of truth     ~/Documents/…/Stormhouse/Emerson Black/Newsletters/
  iCloud-synced · markdown only        frontmatter · tags · [[wikilinks]] · images
       │
       │   one-way rsync mirror         (Publish Brain.command)
       ▼
  ~/Movies/PROJECTS/Websites/EBW website/         ← single git repo, OUTSIDE iCloud
    ├─ index.html · bio.html · style.css · img/ · CNAME   ← storefront (served at /)
    ├─ .github/workflows/deploy.yml                       ← builds brain, copies storefront, deploys _site/
    └─ brain/                                             ← Quartz v5 (served at /brain/)
       │
       │   git push → GitHub Actions builds Quartz & deploys Pages artifact
       ▼
  emersonblackwrites.com/          ← storefront (unchanged)
  emersonblackwrites.com/brain/    ← digital garden (graph · backlinks · search · full archive)
```

### Core Architecture Rules
1. **The Vault is iCloud-synced and unversioned:** Never run `git init` or install `node_modules` inside the vault.
2. **The Storefront repo holds the code:** Lives at `~/Movies/PROJECTS/Websites/EBW website/`.
3. **One repo, one domain, subpath routing:** Quartz lives in `brain/` and builds to `brain/public/`. The deploy workflow copies root storefront files and `brain/public/` into `_site/` (with brain at `_site/brain/`).
4. **Draft Privacy:** Drafts sit in `Newsletters/_drafts/` inside the vault. Rsync `--exclude='_*'` ensures drafts never reach the repository. In addition, Quartz config sets `explicit-publish: true` as a secondary safety net.
5. **Pages Source must be "GitHub Actions":** Repo → Settings → Pages → Build and deployment → Source = **GitHub Actions**. If it is left on "Deploy from a branch", GitHub runs its own Jekyll build on every push and **overwrites** the `deploy-pages` artifact — the Brain silently reverts to a Jekyll page generated from `brain/README.md`. See §9 Incident I1. The workflow now smoke-tests the live URL after deploying and warns when this happens.

---

## 2. Directory Layout & Locations

- **Vault Notes:** `~/Documents/Obsidian/Nexus/projects/Stormhouse/Emerson Black/Newsletters/<year>/<slug>.md`
- **Vault Archive Index:** `~/Documents/Obsidian/Nexus/projects/Stormhouse/Emerson Black/Newsletters/index.md`
- **Vault Images:** `~/Documents/Obsidian/Nexus/organise/Images/newsletters/<year>/<slug>-<nn>.<ext>`
- **Quartz App:** `~/Movies/PROJECTS/Websites/EBW website/brain/`
- **Quartz Content:** `~/Movies/PROJECTS/Websites/EBW website/brain/content/`
- **Publish Script:** `~/Movies/PROJECTS/Websites/EBW website/Publish Brain.command`
- **Preview Script:** `~/Movies/PROJECTS/Websites/EBW website/Preview Brain.command` (double-click → serves the Brain at `http://localhost:8080`)
- **Deploy Workflow:** `~/Movies/PROJECTS/Websites/EBW website/.github/workflows/deploy.yml`

---

## 3. Decisions Locked

| # | Topic | Decision | Why |
| --- | --- | --- | --- |
| D1 | Subpath vs subdomain | **`emersonblackwrites.com/brain/`** | Shares domain authority; one repo; simpler Pages config |
| D2 | Vault boundary | **iCloud vault is source of truth; git repo is outside** | Zero risk of node/git/sync corruption in iCloud |
| D3 | Sync mechanism | **`Publish Brain.command` (one-way rsync)** | Fast, clean, zero overhead; full control over what leaves the vault |
| D4 | Markdown flavours | **Obsidian-flavoured markdown (OFM)** | Native wikilinks, callouts, embeds; Quartz renders OFM directly |
| D5 | Substack boilerplate | **Stripped completely** | Brain is an evergreen digital garden, not an email inbox |
| D6 | Image optimization | **w_1600, webp, centralized** | 124 MB → 41 MB total; preserved quality without repo bloat |
| D7 | Drafts handling | **`Newsletters/_drafts/` excluded via rsync** | Physical isolation prevents accidental leaks |
| D8 | Footers & Attribution | **Disabled Quartz default footer; attribution in About** | Keeps every page clean, honors MIT credit appropriately |
| D9 | Typography & Palette | **Gabarito (display) + Lora (reading serif) + IBM Plex Mono, on both storefront and Brain, with `#CA2626` light · `#E63A3A` dark** *(rev. 2026-09-29, shipped)* | Visual harmony between storefront and garden; one shared type system ahead of the fold-out integration |
| D10 | Publication flag | **`explicit-publish: true`** | Double-safety backstop: only `publish: true` is built |
| D11 | Repo hygiene | **`.DS_Store` never tracked; swept out of `_site` before upload** | Keep macOS junk out of commits and out of the published artifact; also stops `git add -A` producing a spurious commit on every publish |
| D12 | Brain homepage | **`content/index.md` is a hand-curated portal** (hero → Start here → archive-by-year → reading trails → books CTA), written as raw HTML inside markdown | A digital garden needs doors, not a directory listing; raw HTML survives Quartz's pipeline and its relative `href`s are auto-resolved into internal links |
| D13 | Archive dates | **`created:` / `modified:` frontmatter is derived from `date:` / `updated:` by `Publish Brain.command`** | Quartz's `created-modified-date` reads `frontmatter.created`; without it every mirrored note inherited its git commit date, so the whole archive claimed to be published "today" |
| D14 | Brand layer | **All Brain styling lives in `brain/quartz/styles/custom.scss`** (framework CSS untouched; components configured via `quartz.config.yaml`) | `custom.scss` is appended *after* `@layer quartz-base`, so brand rules win without `!important` and framework updates stay safe |
| D15 | Storefront ↔ Brain link | **Footer nav row on the storefront (`index.html` + `bio.html`) points to `/brain/`** | First thread of the eventual full integration; left the storefront layout untouched until the index redesign lands |

---

## 4. Frontmatter & Metadata Spec

Every published newsletter note follows this schema:

```yaml
---
title: Third Draft is Finished!
description: A writing update      # CSV subtitle
date: 2025-10-21                   # CSV post_date
tags: [writing, seen-in-silverbridge]
aliases: []
type: post                         # vault convention (organisation, search, future dataview)
publish: true                      # only publish: true is built (ExplicitPublish)
source: substack:176627320         # numeric part of post_id
---
```

- **`publish: true`:** Required for Quartz to include note (`explicit-publish: true`). Unpublished notes stay in `Newsletters/_drafts/` (rsync excludes them).
- **`date:`** Required so notes don't fall back to filesystem timestamps. **`Publish Brain.command` now also writes `created: <date>` and `modified: <updated>`** — Quartz's `created-modified-date` transformer reads `frontmatter.created`, so this is what makes each note show (and sort by) its real publication date. Never edit these two keys by hand in `content/`: the mirror rewrites them on every publish.
- **`aliases:`** Quartz has `@quartz-community/alias-redirects` enabled by default. If you ever rename a note file or change its slug, you can add the old slug to the `aliases:` list (e.g. `aliases: [old-post-name]`). Quartz will automatically generate an HTML redirect at the old URL pointing to the new one so external links or bookmarks never break. Note that internally in Obsidian, renaming a note file automatically updates all `[[wikilinks]]` in your other notes.
- **`type: post`** vault convention (organisation, search, future dataview).
- **`cover:` is omitted** — Quartz uses `cover` only for OG cards, never on-page banners; auto-filled covers mis-sell posts. Hand-curate later only if banner components are added.
- ⚠️ **Filters hide markdown only:** Quartz copies all non-markdown assets in `content/` publicly, even unlinked ones. Keep private binaries out of `content/`.
---

## 5. Image Pipeline & Resolution

- **Vault paths:** Markdown notes in the vault sit 5 levels deep and reference images as:
  `![](../../../../../organise/Images/newsletters/<year>/<filename>.webp)`
- **Mirror & path normalization:** `Publish Brain.command` automatically:
  - Rsyncs images into `brain/content/organise/images/newsletters/` (lowercase `images` matching Quartz slug routing conventions).
  - Rewrites all `(\.\./)+organise/[Ii]mages/` occurrences to root-relative `/organise/images/`.
  - Quartz's link transformer resolves `/organise/images/...` to exact depth-relative HTML attributes (e.g. `../../organise/images/...` from `newsletters/<year>/<slug>.html`), preventing directory breakout bugs.
- **Safety guard:** The publish script scans all image references in `content/Newsletters/` and halts before commit if any referenced image file is missing.
- **Status:** Verified working across all 184 local images across the archive with 0 missing or broken links.

---

## 6. Daily Publishing Workflow

1. Write or edit notes in Obsidian (`Newsletters/<year>/...`).
2. Add `[[wikilinks]]`, tags, and ensure `publish: true` is in frontmatter.
3. Double-click **`Publish Brain.command`** in `EBW website/` (or run via terminal):
   - Rsyncs notes to `brain/content/Newsletters/` (dropping `_drafts/`).
   - Rsyncs images to `brain/content/organise/images/newsletters/`.
   - Rewrites image paths to root-relative `/organise/images/...`.
   - Runs missing image guard check.
   - Adds `created:` / `modified:` to each note's frontmatter (from `date:` / `updated:`, idempotent) so archive dates and ordering stay truthful.
   - Commits with date stamp and pushes to GitHub.
4. GitHub Actions builds Quartz and deploys to `emersonblackwrites.com/brain/` in ~1 minute.

---

## 7. Roadmap & Next Actions

- [x] **Phases 0–5 — DONE (2026-09-28, history in git log):** Node 22 + git-free vault; 49 published notes converted cleanly from the Substack export; 206 images centralised as `<slug>-<nn>.<ext>`; drafts isolated in `_drafts/`; Quartz v5 scaffolded in `brain/`; deployed live to Pages via `.github/workflows/deploy.yml`.
- [x] **Fix Image Display:** Standardized image storage to lowercase `images`, updated `Publish Brain.command` to rewrite relative paths to `/organise/images/...`, and verified 184/184 images resolve with 0 broken local links.
- [x] **Pages Source — DONE (2026-09-28):** Repo → Settings → Pages → Build and deployment → **Source = "GitHub Actions"**. Verified live: `/brain/` serves Quartz (`id="quartz-root"`), `<title>The Brain…</title>`, and note URLs return 200. This was the root cause of Incident I1.
- [x] **Repo hygiene — `.DS_Store` untracked (2026-09-28):** `git rm --cached .DS_Store`; the root `.gitignore` already lists `.DS_Store`, so `git add -A` can never re-stage it. The workflow also sweeps `_site` with `find _site -name '.DS_Store' -delete` before upload.
- [x] **Brain Homepage & Visual Pass — DONE (2026-09-28, Arc 1 of the "vibe" revamp):**
  - `brain/content/index.md` rebuilt as a curated portal: hero + CTAs, "Start here" (4 doors), "The archive by year" (4 cards), four reading trails, and a "books behind the notes" CTA.
  - Brand layer added in `brain/quartz/styles/custom.scss` (~1,000 lines): storefront tokens, film-grain overlay, Jost display labels, crimson rules, card lift, archive-list styling, sidebar/explorer/search/TOC/graph polish, light + dark variants, reduced-motion and print guards.
  - `film_grain.webp` + brand `icon.png` (favicon) copied into `brain/quartz/static/`.
  - Explorer → title "The Archive", folders collapse by default and click through to their year page; graph tags off, hover focus on; "Latest dispatches" hides folder pages.
  - Archive dates fixed (D13): notes now show `May 15, 2025` instead of the mirror date; year pages sort newest-first.
  - `About.md`, `Newsletters/index.md`, `content/index.md` carry `created: 2023-01-19` so site pages never outrank a real dispatch.
  - Storefront footer nav row (Books · About · The Brain · Subscribe) added to `index.html` + `bio.html`; © bumped to 2026.
- [x] **Accent ownership — DONE (2026-09-29 · Change #1 / S5):** The Brain now runs **its own Quartz theme, `emerson`** (`brain/quartz/theme/emerson.ts`). Rather than fighting the Obsidian theme's cascade layer, we append the crimson accent to the theme itself and register it as `emerson` — so links, tags, checkboxes, graph nodes, search highlights and callouts resolve **`#CA2626` light / `#E63A3A` dark at the source**. `node quartz/theme/verify-brand.mjs` proves it against the built CSS, and in-theme assertions fail the build loudly if upstream renames a variable we pin. See §11.
- [x] **Body serif reaches paragraphs — DONE (2026-09-30, incident I3 / §14):** the last outstanding piece of S6. Root cause was a *sibling* cascade layer — `@quartz-community/quartz-fonts` loads after the theme sheet, so its `@layer quartz-fonts` is appended last and its hardcoded sans `--font-interface` beat our pin inside `@layer obsidian-theme`. Fixed by pinning the font variables **unlayered** in `custom.scss` §1b (serif for body, display for titles) and pinning the chrome to Gabarito in §1c, so the sidebar/TOC/breadcrumbs no longer inherit the reading serif. `verify-default-mode.mjs`'s static text checks are replaced by a **headless-Chrome computed-style assertion** — the old ones stayed green while the page was visibly wrong. Verified by re-introducing the bug.
- [ ] **Storefront Integration (next milestone):** Merge the storefront and the Brain into one shell — shared header/nav across `/` and `/brain/`, brain-aware index page, and a link back to `/` from inside the garden. Currently connected only by the footer nav row (D15).
- [ ] **Editorial pass (Arc 2 candidates):**
  - Tag taxonomy: all 50 notes carry `tags: []` — agree a small tag set (craft / process / publishing / mindset) so tag pages and graph clusters become useful.
  - Thematic `[[wikilinks]]` between essays so Backlinks and the graph fill in.
  - Two title/slug mismatches to reconcile in the vault: `writing-abroad` (titled "Overplotting a novel's outline") and `5-lessons-i-learned-writing-my-first-book` (titled "…My First Sequel").
- [ ] **Small config tidy:** `quartz.config.yaml` still lists `@quartz-community/obsidian-plugin-excalidraw`, which isn't installed (harmless build warning). Either `npm run install-plugins` or delete the entry.
- [x] **Font pipeline tidy — DONE (2026-09-29, with S6):** `quartz-fonts` now declares `header: Gabarito` / `body: Lora` / `code: IBM Plex Mono` **and** `useThemeFonts: false`, and Quartz core's own `theme.typography` block was corrected too (it was the *real* source of the Jost sheet). Pages no longer request Schibsted Grotesk or Source Sans Pro. The third off-brand family is gone; two brand-identical links remain because core and the plugin each emit one and neither can be switched off. Storefront `style.css` + both pages now load the same Gabarito/Lora. Guarded in `verify-default-mode.mjs`. See §12.
- [x] **Default colour mode — DONE (2026-09-29):** the Brain now opens **dark** for a first-time visitor and the light/dark toggle still works. `quartz/default-color-mode.ts` seeds `localStorage.theme` (and `saved-theme`) only when the reader has no stored preference, so a returning reader's own choice always wins. Registered from `quartz.ts`; verified by `node quartz/verify-default-mode.mjs`, which runs both real scripts in **both** execution orders against a fake DOM. See §10.
- [x] **Toggle invisible — FIXED (2026-09-29, incident I2):** the sun/moon toggle was in the DOM on every page but rendered at ~3% opacity. Cause: the theme hides the real `<svg>` and paints the glyph with `background: var(--quartz-icon-color)` + `mask-image`, and our unlayered `.search-button, .darkmode, .readermode { background: var(--eb-surface) }` overwrote that background — for these buttons the icon *is* the background. `.darkmode`/`.readermode` now set only `--icon-color`; `.search-button` keeps its pill. Reader mode had the same bug. Guarded in `verify-default-mode.mjs`. Details in §9 → I2.

---

## 8. Appendix — Commands Reference

> ⚠️ **Copy-paste trap (2026-09-29):** macOS zsh has **`interactive_comments` off**, so a trailing `# …` is *not* a comment — it is passed to the command as arguments. That is why `npx quartz build --serve   # http://localhost:8080` fails with `Unknown arguments: #, http://localhost:8080` and prints CLI help instead of serving. Either drop the trailing notes when pasting, or enable comments once: `echo 'setopt interactive_comments' >> ~/.zshrc` → new terminal. For the preview, the robust route is to **double-click `Preview Brain.command`** — no shell quoting involved.

```bash
# Node 22 environment (keg-only)
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Local Quartz preview (the easy way: double-click "Preview Brain.command")
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
npx quartz build --serve

# Brand palette check — reads the *built* CSS and proves the accent chain still
# resolves to crimson light / dark (guards against the violet regression)
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
npx quartz build && node quartz/theme/verify-brand.mjs

# Default colour mode check — proves a first visit gets dark, that the result
# holds in either script order, and that the light/dark toggle is still visible.
# Also asserts the RENDERED fonts (Lora body / Gabarito chrome) via headless
# Chrome — see §14. The browser section needs a static server on :8099; without
# one it prints a "skipping" note and the rest of the checks still run.
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
npx quartz build
(cd public && python3 -m http.server 8099 &) && sleep 1
node quartz/verify-default-mode.mjs
pkill -f 'http.server 8099'

# Publish script
~/Movies/PROJECTS/Websites/EBW\ website/Publish\ Brain.command

# Is the live Brain actually the Quartz build? (expect a count >= 1)
curl -s "https://www.emersonblackwrites.com/brain/?smoke=$RANDOM" | grep -c 'id="quartz-root"'

# Inspect recent deploys without the gh CLI (works with no auth)
curl -s "https://api.github.com/repos/hotjamwot/emerson-black-writes/actions/runs?per_page=5" \
  | grep -E '"name"|"display_title"|"conclusion"|"updated_at"'
```

---

## 9. Incident Log

### I1 — 2026-09-28 · Brain "went offline" minutes after a successful deploy — **RESOLVED**

- **Symptom:** `/brain/` returned 200 but served a bare Jekyll page titled *"Quartz v5 | emerson-black-writes"*; every note and image 404'd — while the GitHub Actions run reported success.
- **Root cause:** Pages **Source** was set to "Deploy from a branch", so GitHub ran its own Jekyll pipeline on every push and published it **7 seconds after** `actions/deploy-pages` — clobbering the artifact. `deploy-pages` cannot defend itself; the setting must be **"GitHub Actions"**.
- **Fix (one-time, done):** Repo → Settings → Pages → Build and deployment → Source = **GitHub Actions**.
- **Prevention shipped (`072e653`):** `_site/.nojekyll` is written during artifact assembly; guards abort on **0 newsletter pages / 0 images**; a post-deploy **smoke test** fetches `/brain/` (cache-busted, 6 attempts) for `id="quartz-root"` and warns when the live site is not Quartz.
- **Lesson:** a green Actions run only proves the *artifact* was uploaded — the truth is what the CDN serves. Second tell: `/` looked perfect while `/brain/` regressed, because Jekyll passes the storefront's plain static HTML through untouched.

### I2 — 2026-09-29 · The light/dark toggle was invisible — **RESOLVED**

- **Symptom:** the toggle was in the DOM on every page (`<button class="darkmode" aria-label="Dark mode">`) but nothing was visible in the sidebar toolbar, so the theme could not be changed. Reader mode was affected identically. Search, right next to it, looked fine.
- **Root cause:** the theme does **not** draw the sun/moon with an `<svg>`. It hides the real one and paints the glyph with the button's own background:
  `button.darkmode > svg { display: none !important }` plus `background: var(--quartz-icon-color)` + `mask-image: var(--sun-icon|--moon-icon)`. For these buttons **the background *is* the icon**, and the mask also clips any border or pill. Our brand layer set `.search-button, .darkmode, .readermode { background: var(--eb-surface) }` — a 3–3.5% tint — and because `custom.scss` is unlayered it beat the theme's layered rule regardless of specificity. The icon was therefore painted in its own shape at ~3% opacity: present, clickable, invisible.
- **Fix:** split the rule. `.search-button` keeps the surface pill (it draws a real inline `<svg>`, so it is unaffected). `.darkmode, .readermode` now set **only** `--icon-color` (hover → `--eb-accent`), which flows `--icon-color` → `--quartz-icon-color` → the mask, so the glyph paints at full strength and survives the mask.
- **Prevention:** `verify-default-mode.mjs` now parses the built `index*.css` and fails if any `background`/`border` declaration lands on `.darkmode`/`.readermode`. Tested by re-introducing the bug — it reports the offending declaration and exits 1.
- **Lesson:** when a framework paints an icon via `background` + `mask`, *any* background or border rule aimed at that element destroys it. Unlayered brand CSS wins over everything, so "our rule was harmless" is not a safe assumption — check what the property is actually *for* on that selector. Distinguishing tell: Search was visible while its neighbours were not, because it uses a real `<svg>` and they do not.

---

## 10. Design Log

### Arc 2 — "Second-brain readability" (2026-09-29 · in progress · one change at a time)

**Reference:** sspaeti `second-brain-public` (Hugo fork of Quartz v3) + `ssp.sh/blog/from-obsidian-to-enterprise-company-brain/`. What we borrow: wider measure, top header bar with nav + search, single left sidebar, large graph (bottom-of-post + homepage feature), crimson links, writerly serif body, branded favicon, richer ContentMeta header, trimmed breadcrumbs.

| # | Item | Target state | Levers |
| --- | --- | --- | --- |
| S1 | Wider master body | sspaeti-like measure (~1100–1200px centre; page ~1500px max) | `custom.scss` override of `.page` + `.center`/`article` max-widths |
| S1a | Header w/ navlinks + search | `EBW` wordmark top-left; links: Books · About · Brain · Subscribe; search in header-right toolbar | `page-title` → `header` pos + footer `links` → header nav (custom CSS) + search/darkmode/reader-mode in header toolbar group |
| S2 | Graph everywhere, larger | Local graph bottom of every post (afterBody, taller); global graph as hero/secondary feature on index | `graph` second instance `afterBody` + `.graph-outer` height + homepage `global-graph` embed section |
| S3 | Left sidebar cleanup | Drop `THE BRAIN` title; TOC + backlinks above `The Archive`; remove `Newsletter archive` parent node | `page-title` → header, `table-of-contents`+`backlinks` → left, explorer `filterFn` hides `newsletters/index` |
| S4 | Kill right sidebar | All secondary info left | `table-of-contents`, `backlinks`, `graph(right)` → left/afterBody; `byPageType.content.positions.right: []` |
| S5 | Crimson links | **`#CA2626` light / `#E63A3A` dark**, no purple anywhere | ✅ **DONE** — owned `emerson` theme, §11 |
| S6 | Display + body fonts | **Gabarito** titles · **Lora** body (supersedes the Source Serif 4 shortlist) | ✅ **DONE 2026-09-30** — storefront fonts shipped with S6; the Brain's body serif needed a second pass after a sibling-layer defeat. Fixed unlayered in `custom.scss` §1b, chrome pinned to display in §1c, guarded by a computed-style check. **See §14** |
| S7 | EBW favicon, crimson | Rebuild from **`Emerson Signature square_red.png`** (1280×1280 RGBA monogram) | ✅ **DONE 2026-09-29** — 512×512 tight-cropped RGBA to `brain/quartz/static/icon.png` + `img/favicon.png`; §13 |
| S8 | Frontmatter-rich header | `Originally published` / `Last updated`; visible tags; breadcrumb starts at year | Local `ContentMeta` override or CSS labels + `tag-list` (on) + breadcrumbs `rootName`/`spacerSymbol` |
| S9 | Storefront fold-out | Homepage wears the same brand: Gabarito display + Lora body + `#E63A3A` accent + new favicon | `style.css` `--font-display`/`--font-body`/`--accent-red*` + Google Fonts `<link>` in `index.html`/`bio.html` + favicon swap |

> **How we work this arc:** one item at a time → edit → `npx quartz build` → eyeball at `localhost:8080` → tick the box → only then move on. (`Preview Brain.command` serves it; see §8 for the zsh comment trap.)
>
> **Execution order:**
> 1. ✅ **S5** — crimson accent Brain-wide: resolved 2026-09-29 by the owned `emerson` theme (§11). The config/`custom.scss`/`callouts.scss` edits from the first pass all remain.
> 2. ✅ **S6** — Gabarito + Lora, both halves. Resolved 2026-09-30: the storefront shipped with it, and the Brain's body serif took a second pass (§14 — it had been losing to the `@layer quartz-fonts` sibling layer).
> 3. ✅ **S7** — crimson EBW monogram favicon on both halves. Shipped 2026-09-29; see §13.
> 4. ⬜ **S9** — storefront fold-out: *fonts already done in S6* — remaining is the accent (`--accent-red*` → `#E63A3A`) + favicon swap.
> 5. ⬜ **S1** — wider master body (~1100–1200px centre; page ~1500px max).
> 6. ⬜ **S1a** — header: EBW wordmark, Books · About · Brain · Subscribe, search.
> 7. ⬜ **S2** — graph: taller afterBody instance + homepage feature.
> 8. ⬜ **S3** — left sidebar cleanup + explorer `Newsletter archive` parent node.
> 9. ⬜ **S4** — kill right sidebar (may fold into S1).
> 10. ⬜ **S8** — `Originally published` / `Last updated` + visible tags + breadcrumbs from year (blocked on the tagging pass).
>
> **✅ DONE 2026-09-29 — default dark, toggle kept.** HayJay's call: the Brain should open **dark** (it matches the storefront) and the light/dark toggle must stay usable. The stock behaviour follows the OS instead (`localStorage.getItem("theme") ?? matchMedia(...)`).
>
> **Why not `@quartz-themes/core` `mode: dark`.** It looks like the authoritative lever, but `composeCSS` treats any `mode !== "both"` as single-mode and then injects, on every page: `button.darkmode { display: none !important }`, `:root { color-scheme: dark }`, **and** a `beforeDOMReady` script that hard-writes `saved-theme` *and* `localStorage.theme`. So it deletes the toggle **and** stamps over the reader's own choice on every page load — permanently. Rejected. (`mode: both` must stay in `quartz.config.yaml`.)
>
> **What shipped.** `quartz/default-color-mode.ts` registers a bare component whose `beforeDOMLoaded` seeds the storage key — and the `saved-theme` attribute — only when the reader has no stored preference. Called from `quartz.ts`; no plugin packaging needed, because `getComponentResources()` reads the component registry singleton directly. Two traps found the hard way, both now commented in the source:
> - **The component must not be a function.** `getAllComponents()` branches on `typeof component === "function"` and *calls* it; a render function throws with no props and a factory returning `null` is falsy, so either way the component is silently dropped and its script never reaches `prescript.js`. A plain object is taken as-is.
> - **We do not control execution order.** `getComponentResources()` adds emitter-supplied components to its set *before* registry ones, so Darkmode's IIFE always lands ahead of ours — registering earlier does not help. Hence the seed writes **both** the key and the attribute, making the outcome identical whichever script runs last. Both are synchronous in `<head>`, so there is no flash of the wrong theme.
>
> **Verified:** `node quartz/verify-default-mode.mjs` — 8 checks, exit 1 on regression. It asserts the toggle is not hidden, that the seed reached the built `prescript.js`, and runs the two real scripts in **both** orders across four scenarios (first visit on light OS, first visit on dark OS, returning-light, returning-dark). It tests the *sources* rather than the minified bundle on purpose — order-independence is a property of the two scripts, and esbuild's re-wrapping makes the built file brittle to slice. OS-following was achievable but is explicitly *not* wanted: a first visit always gets dark, and only an explicit toggle moves it.

**Intent.** The storefront sells a moody, cinematic mystery series: near-black navy, crimson accents, film grain, geometric uppercase display type, generous negative space. The Brain keeps that mood while becoming a *reading room*, not a billboard. Film grain (`film_grain.webp`, 0.22 dark / 0.10 light), crimson and the display face carry across; body copy is **Lora** (a reading serif — Gabarito at paragraph length is punishing); article headings are **not** uppercased (50+ dispatches in caps would shout, so structure labels carry the caps); and both palettes are first-class — light is "warm paper" (multiply grain, softer glow) so daylight readers are not punished.

**How the CSS wins without `!important`:** `componentResources.ts` wraps the framework stylesheet in `@layer quartz-base` and appends `custom.scss` outside it — unlayered rules beat layered ones. The Obsidian theme is a *separate, higher* layer; see §11.

**Iteration points, fastest first**
1. Copy + curation → `brain/content/index.md`.
2. Colour/typography tokens → `quartz.config.yaml` (`configuration.theme`) → `custom.scss`; brand accent → `quartz/theme/emerson.ts` (§11).
3. Component behaviour → `quartz.config.yaml` (`plugins[].options`, `layout.byPageType`).
4. Structure/hooks → `quartz/components/frames/*` (a `full-width` and a `minimal` frame already exist).
5. Deepest lever (not yet used): a local component or frame for a shared header/nav — the path to full storefront integration.

---

## 11. Theme ownership — how the brand accent is owned (2026-09-29)

**Why it needed solving.** `@quartz-themes/core` emits the Obsidian theme CSS as its **own top-level cascade layer** (`@layer obsidian-theme`) in an *extracted* stylesheet (`static/resource-style-<hash>.css`) linked **after** `index.css`. Because `quartz-base` already exists, `obsidian-theme` is appended **after** it — so it outranks it **by layer order, not specificity**. The theme's `base` aspect declares `--accent-h: 258` (Obsidian violet), and `--color-accent → --text-accent → --secondary → --link-color / --tag-color / --checkbox-color / graph` all resolve from that chain. Our config palette and `custom.scss` tokens only *referenced* `var(--secondary)`, so they faithfully inherited the violet — the colour was never ours to begin with.

**The fix — "become the theme", not "out-shout the theme":**

| File | Role |
| --- | --- |
| `brain/quartz/theme/emerson.ts` | `registerEmersonTheme()`: loads `@quartz-themes/default` via the plugin's own `loadTheme()`, **appends** a brand block to the aspect emitted last (`misc`), and registers it as `emerson` through the public `registerTheme()` API. `ACCENT = { light: "#CA2626", dark: "#E63A3A" }` is the single source of truth; the HSL is derived from the hex so `hsl(h, s%, l%)` round-trips exactly. |
| `brain/quartz.ts` | calls `registerEmersonTheme()` before `loadQuartzConfig()`, so the id resolves at emit time |
| `brain/quartz.config.yaml` | `@quartz-themes/core` → `options.theme: emerson` |
| `brain/quartz/theme/verify-brand.mjs` | reads the **built** CSS, finds the *winning* declaration per mode, asserts the palette (exit 1 when off-brand) |

**Design choices worth remembering**
- The overlay is **appended, never string-matched**, so an upstream reformat cannot break it; `PINNED_VARIABLES` are still **asserted to exist** in the theme's `base` aspect, so an upstream *rename* fails the build loudly (`[emerson] Theme overlay is stale: …`).
- `--color-purple` / `--color-pink` (+ their `-rgb` companions) are collapsed onto the accent, closing every off-brand hue path (code tokens, canvas, sync avatars, the "example" callout). Upstream's violet declarations remain *earlier* in the layer — overridden, not rewritten — so a bare `grep` still finds them; the *winning* declaration is what `verify-brand.mjs` checks.
- Rejected routes: `aspects: { base: false }` (166 variables live only in `base`, and just 19 are covered by Quartz core — headings/callouts/tables would shatter); literal string patching of the upstream hexes (brittle); an npm `file:` fork of the 434KB theme.

**To change the accent:** edit `ACCENT` in `quartz/theme/emerson.ts`. Links, hover tints, tags, checkboxes, graph and callouts follow in both modes; `custom.scss` keeps its unlayered brand layer for anything structural.

**To verify:** `cd brain && npx quartz build && node quartz/theme/verify-brand.mjs` (12/12 declarations). Resolved values — light `hsl(0, 68.333%, 47.059%)` = **`#CA2626`**, hover `#D8272A`; dark `hsl(0, 77.477%, 56.471%)` = **`#E63A3A`**, hover `#EC585F`. The check is deliberately **not** a CI gate — a one-command local proof, so a false positive can never block a publish.

---

## 12. Typography ownership — two font emitters, one brand (2026-09-29)

**The surprise.** The Brain loads fonts from **two independent places**, and only one of them is in the plugin the roadmap named:

| # | Emitter | Config | Controls |
| --- | --- | --- | --- |
| 1 | **Quartz core** | `quartz.config.yaml` → `theme.typography` + `theme.fontOrigin` | The sheet that actually rendered the site's type |
| 2 | **`@quartz-community/quartz-fonts`** | `plugins[].options` | A *second*, separate Google Fonts link |

Neither can be switched off. Core has no opt-out, and the plugin always emits. So pages loaded **two** font `<link>`s and — before this pass — three distinct families: `Jost · Source Serif 4` from core, `Schibsted Grotesk · Source Sans Pro` from the plugin's hardcoded `QUARTZ_DEFAULT_HEADER/BODY/CODE` constants, plus IBM Plex Mono from both.

**Why `useThemeFonts: false` matters.** The plugin defaults it to `true`, which makes it *also* consult the theme's font registry. Setting `header`/`body`/`code` alone therefore still leaves the theme's sheet in place — the fix that looks sufficient is not. It is set explicitly for that reason.

**The trap that cost the most time.** Fixing only the plugin looked like it half-worked: the Gabarito/Lora sheet appeared, but Jost/Source Serif 4 were *still* being requested, because core's `theme.typography` is the one that had been rendering the site all along. `grep` for the off-brand names in `node_modules` finds nothing — the culprit is our own `quartz.config.yaml`, 100 lines above the plugin entry. **Always check both emitters before assuming a font change landed.**

**The fix, both halves set to the same three faces**

| File | Change |
| --- | --- |
| `brain/quartz.config.yaml` | `theme.typography` → `header: Gabarito` · `body: Lora` · `code: IBM Plex Mono` |
| `brain/quartz.config.yaml` | `quartz-fonts` `options` → same three, plus `useThemeFonts: false` |
| `brain/quartz/styles/custom.scss` | `--eb-display: "Gabarito", …`; **new** `--eb-serif: "Lora", …`; the reading-experience rule now uses `var(--eb-serif)` instead of hardcoding Source Serif 4 |
| `style.css` (storefront) | `--font-display: "Gabarito", "Century Gothic", …`; `--font-body: "Lora", …`; **new** `--font-mono`. Old stacks kept as fallbacks so a blocked font request degrades to the previous look, not to Times |
| `index.html` + `bio.html` | `preconnect` × 2 + the Google Fonts `<link>` (same query string as the Brain) |

Result: **no** Schibsted Grotesk, Source Sans Pro, Jost or Source Serif 4 anywhere; two `<link>`s remain, both requesting the identical brand trio (harmless — the browser dedupes by URL only if identical, so this is the honest floor without patching the theme).

**Guarded:** `verify-default-mode.mjs` gained a *Font pipeline* section (5 checks) asserting no off-brand family, ≤ 2 sheets, every sheet on-brand, and `useThemeFonts: false` in config. Verified by reverting core to `Jost` — it reported 3 failures and exited 1.

**Note on the storefront:** `--font-display` previously resolved to the *local* `"Century Gothic"`, so the storefront was never actually loading a display webfont. It now genuinely loads Gabarito, so the storefront's headings will look different on first load — this is the intended brand change, not a regression, and is the single biggest visual delta of S6.

---

## 13. The favicon — one monogram, two traps (2026-09-29)

**Source.** `~/Documents/Seen in Silverbridge/Stormhouse Docs/Emerson branding/Emerson Signature square_red.png` — 1280×1280 RGBA, the **EB / W** monogram as a flat `#CA2626` fill on transparency. That hex is *exactly* the Brain's light-mode accent, so the favicon is on-brand by construction and needs no recolouring.

**Trap 1 — the sibling file is a decoy.** The same folder contains `EBW icon.png`: the identical monogram, same 1280×1280, but in **magenta `#E6007E`**. It is arguably the more obvious filename, and nothing about the two files hints at the difference. It is the wrong brand. `verify-default-mode.mjs` now decodes the icon's ink and asserts `#CA2626` exactly, so a swap is caught rather than shipped.

**Trap 2 — a naive resize is an illegible blob.** The master has generous padding (ink occupies 59% of the canvas, and the monogram is asymmetric: 228px left margin vs 188px right). Resizing the *whole canvas* to 16–32px fills the `B` counters and the gaps between the `W`'s arms, leaving an unreadable red smear in the tab bar. The fix is to **crop to the ink bounding box first**, then area-average down. Cropped, the same mark is cleanly legible at 32px and crisp at 48px.

**Tooling.** No ImageMagick, no `sips` crop-to-content, no PIL on this machine, so a scratch `build-favicon.cjs` (deliberately not committed) decodes the PNG by hand — parse `IHDR`/`IDAT`, inflate, unfilter all five filter types — then crops, box-filters down with **premultiplied alpha** (so transparent edges don't bleed dark), and re-encodes RGBA. Box-filter rather than bilinear is deliberate: 1280→16 is an 80× reduction, where point sampling aliases and bilinear just smears.

**A bug worth recording.** The first build produced an icon that *looked* correct in every image viewer but had a **maximum alpha of 1/255** — the entire monogram at 0.4% opacity. Image viewers scale alpha for display, so it rendered fine; as an actual favicon it would have been near-invisible. Cause: in the premultiplied average, alpha is the mean source alpha over the footprint, i.e. `a / (255 × weight)`, but I divided by `wsum` alone and got a 0–1 value. The colour-channel divisor (`a`) was right, which is exactly why the result looked plausible. Caught only because the guard added a *pixel-level* check — every dimension check passed on the broken file.

**What shipped.** 512×512 RGBA, tight-cropped with 2% padding, 4.4 KB — to `brain/quartz/static/icon.png` (which `Head.tsx` serves as the single `<link rel="icon">`) and to `img/favicon.png`. 512 rather than 180 is deliberate: browsers downscale, and a large master downscales far better than a small one magnified. 35 KB → 4.4 KB.

**Guarded (8 checks):** square, ≥180px, RGBA colour type 6 (the old default was a palette PNG, type 3), storefront and Brain icons identical, file size sane, decodable, ink exactly `#CA2626`, and the monogram actually present (37.5% opaque). Verified by swapping in the magenta master — reported and failed.

**Lesson:** for icon work, *dimension* checks are not enough — assert on the decoded pixels (colour, alpha coverage). A file can be square, correctly sized, valid RGBA, the right bytes on both halves, and still be functionally invisible.

---

## 14. ✅ RESOLVED — body serif now reaches paragraphs (found 2026-09-30, closed same day)

**Symptom (HayJay's eyes, correct).** In the Brain, post **titles** are Gabarito and the **breadcrumb** picks up the serif, and **numbered lists** (`ol li`) render in Lora — but the **main body paragraphs are still sans-serif**. Storefront fonts are fine.

**Confirmed, not guessed.** Reproduced in headless Chrome with a computed-style probe against the built site:
```
body paragraph => ui-sans-serif, -apple-system, "system-ui", … | inContent=true
numbered item  => Lora, Georgia, "Times New Roman", serif
article title  => Gabarito | h2 => Gabarito
```
Lora *is* downloaded and *is* applied elsewhere, so this is a cascade problem, not a missing font.

**Root cause (confirmed by walking every stylesheet's rules).** `@quartz-themes/default`, inside `@layer obsidian-theme`, emits:
```css
html[saved-theme="dark"]  body p { font-family: var(--font-interface) }
html[saved-theme="light"] body p { font-family: var(--font-interface) }
```
and `--font-interface` resolves to the Obsidian sans stack (`--font-default-obsidian`). The rule names `p` **directly**, so it outranks our unlayered `.markdown-preview-view.markdown-rendered { font-family: var(--eb-serif) }` container rule. It says nothing about `ol li` — which is exactly why lists kept the serif while paragraphs lost it. S6 shipped the fonts correctly at every layer we control; this rule was never something `custom.scss` could reach.

**Attempted fix (built, correct at the layer, still not winning).** Following the §11 "own it at the source" rule, `emerson.ts` now also pins the typography variables in its trailing aspect: `--font-default`, `--font-text`, `--font-interface`, `--font-monospace*`, `--bodyFont`, `--headerFont`, `--titleFont`, `--codeFont`. The generated theme CSS confirms the brand `--font-interface: "Lora", …` is now the **last** declaration inside `@layer obsidian-theme`. **This did not change the rendered result** — a fresh computed-style probe still reports the sans stack for `article p`.

**The untested hypothesis — CONFIRMED, and it was the whole story.** Dumping the `@layer` block order from the built CSS resolved it in one step. The theme sheet (`static/resource-style-7a880073.css`) opens with an explicit layer list:

```css
@layer quartz-base, obsidian-theme, quartz-themes-base, obsidian-theme-overrides;
```

…and `@quartz-community/quartz-fonts` ships `static/resource-style-a19e7ad2.css`, which loads **after** it and opens with `@layer quartz-fonts{…}`. A layer named for the first time *later* is **appended last**, so `quartz-fonts` sits at the end of the layer list and wins on **order**, beating both `quartz-base` and `obsidian-theme` regardless of specificity — and it hardcodes `--font-interface: ui-sans-serif, -apple-system, …`. `useThemeFonts: false` does not suppress that declaration. Our pin in `emerson.ts` was correct and genuinely could not win: it was inside a layer that no longer had last word.

**The fix (`5107310`) — one unlayered block in `custom.scss` §1b.** `custom.scss` is appended *outside* every layer, so an unlayered `:root` there outranks all of them:
```scss
:root {
  --font-interface: var(--eb-serif);
  --font-text: var(--eb-serif);
  --font-default: var(--eb-serif);
  --bodyFont: var(--eb-serif);
  --titleFont: var(--eb-display);
  --headerFont: var(--eb-display);
  --codeFont: var(--eb-mono);
  --font-monospace: var(--eb-mono);
  --font-monospace-default: var(--eb-mono);
}
```
Pinning the **variable** rather than adding `body p { font-family }` repairs every consumer at once — the theme's `body p`, Quartz core's `--bodyFont` chain and the plugin's own `--font-text`.

**A second-order effect worth knowing.** Those same variables drive the theme's *UI*, not just copy, so the first build also turned the explorer, TOC and breadcrumbs serif. They were never designed as sans either — before, they merely *inherited* the system stack. `custom.scss` §1c now pins that chrome to the display face explicitly (Gabarito, matching the tracked-uppercase section labels), so navigation is a deliberate choice rather than an accident. Verified: `article p` → Lora, `article li` → Lora, `blockquote` → Lora, `h1`/`h2` → Gabarito, `p.content-meta` → IBM Plex Mono, explorer/TOC/breadcrumb/search → Gabarito.

**The guard is now a computed-style assertion (the lesson of this whole section).** The old checks were static text and — as §14 recorded — **stayed green the entire time paragraphs rendered sans**, because they could not see a competing *sibling* layer. `verify-default-mode.mjs` now serves `public/`, drives headless Chrome, and asserts what the reader actually gets: paragraphs and lists in Lora, titles in Gabarito, chrome on the display face. Two cheap static checks remain alongside it, so the *cause* is still visible in the output when the browser probe is skipped (it needs Chrome **and** `python3 -m http.server 8099` in `brain/public`, else it says so and continues). **Proven by re-introducing the bug:** removing §1b reproduces the original symptom exactly — paragraphs back to `ui-sans-serif` while `li` keeps Lora — and the guard reports it and exits 1.

**Lesson to carry forward.** A cascade-layer fix must be made in a layer that is genuinely **last**, and "last" is a property of the *whole document*, not of the file you edited. Before trusting a layered fix, dump the layer order (`@layer` statements across every emitted sheet) and confirm where your declaration lands. When a static assertion is green but the page is visibly wrong, the assertion is measuring the wrong thing — assert on computed style, not on the text of a stylesheet you happen to be reading.

**Reusable technique (worth keeping).** `grep` over the built CSS could not find the culprit — the winning declaration lives in a *different stylesheet file*. The thing that actually resolved it: serve a copy of `public/`, inject a probe, and walk `document.styleSheets` reporting every rule that sets `font-family` and matches the target element, annotated with its `@layer`. Gotcha: with nested-CSS support, a plain style rule exposes an empty-but-truthy `cssRules`, so test `r.style.fontFamily` *before* recursing or every rule is silently skipped. Second gotcha, cost an hour: `.explorer .tree-item-self` matches the folder `<div>` as well as the note `<a>`, so a probe using it silently measured the wrong element and made a correct fix look broken. Always assert the element you *meant* — and when a result contradicts a hypothesis, check the measurement before changing the code.

## 15. ✅ S9 — storefront accent + favicon (2026-09-30)

The storefront (`index.html`, `bio.html`) is a *separate* hand-written site from the Brain — its own `style.css`, its own palette. S5 gave the Brain the crimson brand; the storefront never followed and was still on `#E31C3D`, a pinker red from before the brand existed. S9 is the two halves agreeing to look like one site.

**Accent.** Storefront is **dark-only** — no `prefers-color-scheme`, no `color-scheme`, no `data-theme` — so it carries the Brain's **dark** accent, not the light one:

| | before | after |
|---|---|---|
| `--accent-red` | `#E31C3D` | `#E63A3A` (= Brain dark `ACCENT`) |
| `--accent-red-bright` | `#FF3B4A` | `#EC585F` (= Brain dark hover) |

Because it is dark-only, `--accent-red` is pinned to the dark value at the top level with no mode branch. There is no light storefront to sit against, so using the light `#CA2626` would be wrong — this is the easy mistake to make here.

**Favicon.** Already correct from S7 — both halves point at the same `img/favicon.png`, byte-identical to the Brain's `static/icon.png`. Verified by SHA-256 (both `886e2bf3…`), so S9 changed only the accent.

**Why a guard, and why this kind.** Nothing structurally connected the two palettes; only a human noticing a colour mismatch would have caught the drift, which is exactly how it survived. `verify-default-mode.mjs` §5 now parses the `ACCENT` map out of `brain/quartz/theme/emerson.ts` — **not** a hardcoded hex — and asserts the storefront matches. Parsing the source of truth means a future brand change in one file is caught in the other automatically, and it holds even if nobody updates the verifier. It also asserts the storefront does *not* use the light accent (the regression a future well-meaning edit would introduce) and that the old pink is gone. Proven by re-introducing `#E31C3D`: two assertions fail and the script exits 1.

**Lesson.** *Shared brand ≠ shared file.* The two halves are genuinely separate codebases that must look identical, and no amount of care inside either one protects the pair. When one file restates another's values, that relationship is a fact worth encoding as an assertion — otherwise it silently rots the first time someone edits only one side.

