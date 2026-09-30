# Emerson Black Brain — Architecture, Spec & Operations Guide

**Status:** Live at `emersonblackwrites.com/desk/` · **Engine:** Quartz v5 · **Date:** 2026-09-28 · **Author:** HayJay + AI assistant
**Now (2026-09-30):** Arc 2 visual pass, one change at a time. ✅ **S5** crimson accent, owned by the Brain's own `emerson` theme (§11). ✅ **Default dark**, toggle kept (§10). ✅ **S7** favicon on both halves (§13). ✅ **S6** complete — the body-serif bug that held this up is fixed and guarded (§14). ✅ **S9** storefront accent + favicon — storefront now carries the Brain's dark accent and the halves are assertion-guarded against drift (§15). ✅ **S1 + S4** layout — the empty right sidebar was eating a third of the shell; collapsed, and the measure deliberately held at ~74 chars rather than widened (§16). ✅ **S1a** header bar — wordmark, four-link nav and search/controls in one top band, rebuilt entirely from existing plugins and config (§17). ✅ **S10 step 1 — the rename (§20):** the site is **Emerson's Desk**, the wordmark reads **`EBW`**, it is served at **`/desk/`**, and `/brain/` redirects. **Next: S10 step 2 — stop duplicating the storefront** (`desk/index` + `desk/about` become one honest landing page; drop the two hand-written breadcrumbs). Then step 3, then S3 / S2 / S8.


**Goal:** Write in Obsidian → run `Publish Brain.command` → the newsletter archive is live at **`emersonblackwrites.com/desk/`**, built automatically via GitHub Actions.

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
  emersonblackwrites.com/desk/     ← Emerson's Desk (graph · backlinks · search · full archive)
```
> The Quartz **source** directory is still `brain/` (§20) — only the served URL moved.

### Core Architecture Rules
1. **The Vault is iCloud-synced and unversioned:** Never run `git init` or install `node_modules` inside the vault.
2. **The Storefront repo holds the code:** Lives at `~/Movies/PROJECTS/Websites/EBW website/`.
3. **One repo, one domain, subpath routing:** Quartz lives in `brain/` and builds to `brain/public/`. The deploy workflow copies root storefront files and `brain/public/` into `_site/` (with the Desk at `_site/desk/`, and a legacy redirect stub at `_site/brain/`).
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
| D1 | Subpath vs subdomain | **`emersonblackwrites.com/desk/`** *(was `/brain/` until 2026-09-30, §20)* | Shares domain authority; one repo; simpler Pages config |
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
| D15 | Storefront ↔ Brain link | **Footer nav row on the storefront (`index.html` + `bio.html`) points to the Desk (`desk/`)** | First thread of the eventual full integration; left the storefront layout untouched until the index redesign lands |
| D16 | Site name & wordmark *(2026-09-30, §18/§20)* | **Site = "Emerson's Desk"; header wordmark = `EBW`; slug = `/desk/`** | "The Brain" promised a tool and delivered a publication. `EBW` is what a reader already recognises (favicon monogram, storefront signature); "Emerson's Desk" says *writer* where "Posts" says *feed*. The wordmark swap is presentational — `page-title` has no options — so the link keeps the full name for assistive tech |

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
4. GitHub Actions builds Quartz and deploys to `emersonblackwrites.com/desk/` in ~1 minute.

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
- [x] **The rename — DONE (2026-09-30 · S10 step 1 / §20):** the site is **Emerson's Desk**, the header wordmark reads **`EBW`**, it is served at **`/desk/`**, and a hand-written stub at `_site/brain/` redirects the old path. Nine authored lines plus the config block; the Quartz *source* directory stays `brain/`. 16 new guard checks (suite 50 → 68).
- [ ] **S10 steps 2–3 — next (§19).** Step 2: `desk/index` + `desk/about` stop restating the storefront and become one honest landing page, with the two hand-written `_Back to …_` breadcrumbs dropped (the `breadcrumbs` plugin already renders that trail). Step 3: the storefront keeps books + the Silverbridge note and *features* the Desk; the `THE JOURNALISTS` character cards become a dated, cross-linked post written in the vault.
- [ ] **Storefront Integration — tracked as S10 (§19).** Originally framed as “merge the storefront and the Brain into one shell, shared header/nav across `/` and `/brain/`”. Refined: the storefront **stays the homepage** and **features** the Desk rather than merging with it, and S1a has already built the Desk's own header bar (§17). The rename and the slug move are **done** (§20); what remains is steps 2–3 above and a genuinely *shared* nav across both halves. Currently connected by the storefront footer nav row (D15) and the Desks's own header nav (§17).
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

# Is the live Desk actually the Quartz build? (expect a count >= 1)
curl -s "https://www.emersonblackwrites.com/desk/?smoke=$RANDOM" | grep -c 'id="quartz-root"'

# The legacy path must redirect rather than 404
curl -s "https://www.emersonblackwrites.com/brain/" | grep -o 'url=/desk/'

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
| S1 | Wider master body | ⚠️ **RE-SCOPED — DONE 2026-09-30.** The target was stale: `.page` was *already* 1500px. The real constraint was an empty 320px right-sidebar track. Now: 2 tracks / 420px explorer / article held at 780px ≈ **74 chars**. **See §16** |
| S1a | Header w/ navlinks + search | ✅ **DONE 2026-09-30** — wordmark + Books·About·Brain·Subscribe + search/dark/reader in the `header` slot. Nav is the `footer` plugin repurposed; no new component. **See §17** |
| S2 | Graph everywhere, larger | Local graph bottom of every post (afterBody, taller); global graph as hero/secondary feature on index | `graph` second instance `afterBody` + `.graph-outer` height + homepage `global-graph` embed section |
| S3 | Left sidebar cleanup | Drop `THE BRAIN` title; TOC + backlinks above `The Archive`; remove `Newsletter archive` parent node | `page-title` → header, `table-of-contents`+`backlinks` → left, explorer `filterFn` hides `newsletters/index` |
| S4 | Kill right sidebar | All secondary info left | ✅ **DONE 2026-09-30, folded into S1** — collapsed to 2 grid tracks, since every right sidebar in the build is empty. **See §16** |
| S5 | Crimson links | **`#CA2626` light / `#E63A3A` dark**, no purple anywhere | ✅ **DONE** — owned `emerson` theme, §11 |
| S6 | Display + body fonts | **Gabarito** titles · **Lora** body (supersedes the Source Serif 4 shortlist) | ✅ **DONE 2026-09-30** — storefront fonts shipped with S6; the Brain's body serif needed a second pass after a sibling-layer defeat. Fixed unlayered in `custom.scss` §1b, chrome pinned to display in §1c, guarded by a computed-style check. **See §14** |
| S7 | EBW favicon, crimson | Rebuild from **`Emerson Signature square_red.png`** (1280×1280 RGBA monogram) | ✅ **DONE 2026-09-29** — 512×512 tight-cropped RGBA to `brain/quartz/static/icon.png` + `img/favicon.png`; §13 |
| S8 | Frontmatter-rich header | `Originally published` / `Last updated`; visible tags; breadcrumb starts at year | Local `ContentMeta` override or CSS labels + `tag-list` (on) + breadcrumbs `rootName`/`spacerSymbol` |
| S9 | Storefront fold-out | ✅ **DONE 2026-09-30** — §15. Homepage wears the same brand: Gabarito display + Lora body + `#E63A3A` accent + new favicon | `style.css` `--font-display`/`--font-body`/`--accent-red*` + Google Fonts `<link>` in `index.html`/`bio.html` + favicon swap |
| S10 | 🟢 **Rename done; integration next** | Site = **Emerson's Desk**, wordmark `EBW`, slug `/desk/` — ✅ **step 1 shipped 2026-09-30** (§20). Remaining: Desk stops duplicating the storefront; storefront stays homepage and features the writing; characters become a real post | §18–20 — steps 2–3 **next** |

> **How we work this arc:** one item at a time → edit → `npx quartz build` → eyeball at `localhost:8080` → tick the box → only then move on. (`Preview Brain.command` serves it; see §8 for the zsh comment trap.)
>
> **Execution order** (this list is the live one; the Arc 2 table above is the catalogue):
> 1. ✅ **S5** — crimson accent, owned by the `emerson` theme. §11.
> 2. ✅ **S6** — Gabarito + Lora, both halves. §14 (the body serif took a second pass).
> 3. ✅ **S7** — EBW monogram favicon on both halves. §13.
> 4. ✅ **S9** — storefront accent + favicon. §15.
> 5. ✅ **S1 + S4** — empty right sidebar collapsed, measure held at ~74 chars. §16. *(S1 was re-scoped: `.page` was already 1500px.)*
> 6. ✅ **S1a** — header bar: wordmark, four-link nav, search + controls. §17.
> 7. ✅ **S10 step 1** — the rename: site name, `EBW` wordmark, slug → `/desk/`, `/brain/` redirect. §20.
> 8. 🟢 **S10 step 2** — stop duplicating the storefront: `desk/index` + `desk/about` become one honest landing page; drop the two hand-written breadcrumbs. §19. **Next.**
> 9. ⬜ **S10 step 3** — storefront features the writing; the `THE JOURNALISTS` characters become a dated post written in the vault. §19. *(New writing, not mechanical.)*
> 10. ⬜ **S3** — left sidebar cleanup; the wordmark has already left the sidebar, so this is mostly finishing that job.
> 11. ⬜ **S2** — graph: taller afterBody instance + homepage feature.
> 12. ⬜ **S8** — `Originally published` / `Last updated` + visible tags + breadcrumbs from year. Blocked on the tagging pass.
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

**Intent.** The storefront sells a moody, cinematic mystery series: near-black navy, crimson accents, film grain, geometric uppercase display type, generous negative space. The Desk keeps that mood while becoming a *reading room*, not a billboard. Film grain (`film_grain.webp`, 0.22 dark / 0.10 light), crimson and the display face carry across; body copy is **Lora** (a reading serif — Gabarito at paragraph length is punishing); article headings are **not** uppercased (50+ dispatches in caps would shout, so structure labels carry the caps); and both palettes are first-class — light is "warm paper" (multiply grain, softer glow) so daylight readers are not punished.

**How the CSS wins without `!important`:** `componentResources.ts` wraps the framework stylesheet in `@layer quartz-base` and appends `custom.scss` outside it — unlayered rules beat layered ones. The Obsidian theme is a *separate, higher* layer; see §11.

**Iteration points, fastest first**
1. Copy + curation → `brain/content/index.md`.
2. Colour/typography tokens → `quartz.config.yaml` (`configuration.theme`) → `custom.scss`; brand accent → `quartz/theme/emerson.ts` (§11).
3. Component behaviour → `quartz.config.yaml` (`plugins[].options`, `layout.byPageType`).
4. Structure/hooks → `quartz/components/frames/*` (a `full-width` and a `minimal` frame already exist).
5. A local component or frame for a **shared** header/nav across both halves — still unused. S1a solved the Desk's header by reusing an existing plugin (§17); a genuinely shared one is the next step if the two surfaces should ever render nav from one source.

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

## 16. ✅ S1 + S4 — the empty sidebar, and a measure on purpose (2026-09-30)

S1 was specified as "wider master body (~1100–1100px centre; page ~1500px max)". Measuring before editing found **two of those three targets already true**: `.page` was already `max-width: 1500px`. The plan had been written against a remembered default, not the built stylesheet.

What was actually constraining the reading column was a **phantom grid track**. The default frame always renders `<div class="right sidebar">` — unconditionally, even when `quartz.config.yaml` sets `right: []`. It was `display:flex; visibility:visible` with **zero children**, still occupying a live 320px track. A third of a 1500px shell spent on an empty box.

**Before → after (measured @1920px, headless Chrome):**

| | before | after |
|---|---|---|
| grid tracks | `320px 850px 320px` | `420px 1075px` |
| empty right track | 320px | 0 (`display:none`) |
| explorer | 320px | 420px |
| article | 802px | 780px |
| **chars/line** | **76** | **74** |

**The centre got wider and the text deliberately did not.** Removing the empty track widened the centre to 1075px, which pushed paragraphs to **98 characters per line** — well past where the eye reliably finds the start of the next line. So the reclaimed width is capped back out: `.page article { max-width: 780px; margin-inline: auto }`, and the surplus becomes gutter. 780 / 10.53px-per-ch ≈ **74 chars**. S1's stated 1100–1200px target would have been ~110 chars. **Wider shell, held measure** — the roomy feel without the long line. (This is the §10 intent, "a reading room, not a billboard", taken literally enough to contradict the plan's own numbers.)

**Three bugs, each found by measuring rather than reading.** None of these produced an error, a stack trace, or a build failure:
1. **Nested `:has()` is invalid CSS.** `:has(> .sidebar.right:not(:has(> *)))` — a `:has()` inside a `:not()` inside a `:has()` — is rejected wholesale by Chrome, so the rule was **silently dropped** while a sibling rule kept `display:none` on the sidebar. Result: a 320px hole, no diagnostic anywhere. `:has(> .sidebar.right:empty)` is a single level and works. Found by asking Chrome `matches()` and reading the returned `SyntaxError`.
2. **The unlayered rule beat the base media queries at *every* width.** `custom.scss` is unlayered, so it outranks the framework's `@media (max-width:800px)` / `(min-width:800px) and (max-width:1200px)` collapsing rules regardless of specificity. Applied globally, the 420px left track survived down to a 420px viewport — measured as `420px 420px`, i.e. horizontal overflow on a phone. Fixed by scoping to `@media (min-width: 1200px)`, letting the base queries own small screens. Verified at 1920/1280/1024/420: no overflow at any width.
3. **The first guard did not fail when it should have.** `chars` alone was not a sufficient assertion — reverting the grid rule to `:not(:empty)` left the sidebar hidden by its own rule and the measure at **67 chars**, comfortably inside the 45–90 band, so all four original checks passed on a genuinely regressed layout. The check that actually catches it is the **track count** (2, not 3), added after this was caught. The lesson from §14 again, one layer down: *a check that has never been seen to fail is not yet a check.*

**The guard.** Five new computed-layout checks in `verify-default-mode.mjs` (§ S1/S4 block), reusing the existing browser probe: no phantom children, `display:none`, **exactly 2 tracks**, 45–90 chars/line, no horizontal overflow. The measure is asserted as a *band*, not a pixel value, so it survives a future font change. Suite is now **42/42**.

**Lesson.** *Measure the thing before you change it, and re-measure after — but also test that the test fails.* S1 was a no-op as written, and would have been "completed" with an honest-looking green build. The plan is a design document written from memory; the built stylesheet is the fact. When they disagree, build the argument from measurement — and when a guard is new, **prove it goes red** before trusting it.

## 17. ✅ S1a — the header bar, and a specificity fight (2026-09-30)

Target: `EBW` wordmark top-left, links Books · About · Brain · Subscribe, search top-right — one band across the top of the shell, like the storefront.

**Almost no new code.** The `header` is a first-class layout position alongside `left`/`right`/`beforeBody`, so this is a config move: `page-title` and the `footer` plugin from `left`/`footer` into `header`, plus `search`/`darkmode`/`reader-mode`. The nav itself is the **`footer` plugin reused** — it already renders `links` as `<ul><li><a>`, exactly the markup a nav wants, so writing a component would have been busywork. Its "Created with Quartz v5 © 2026" line is the one thing unwanted; `custom.scss` hides `header > footer > p` and nothing else.

**That reuse is also the whole difficulty.** Because the nav *is* a `<footer>`, it inherits every rule aimed at the real page footer:
- base: `.page > #quartz-body footer { grid-area: grid-footer; min-width: 100%; margin-inline: auto }`
- Obsidian theme: `@media (min-width:1200px) { .page>#quartz-body footer { min-width/max-width: calc(100% - 3rem); padding-inline: 1.5rem } }`

**The theme rule wins, and no amount of care in `custom.scss` beats it** — it selects on an **ID**. `#quartz-body` outranks any number of class selectors, so a class-only reset loses on specificity no matter how many classes are stacked. Computed `min-width` stayed `calc(100% - 48px)` while the authored value was `0`. §11 called the theme a "separate, higher layer", and it is also simply more specific; the two are independent problems and only the second one bit here.

**How it was found.** Not by reading the stylesheet — `grep` for `100% - 48px` across every emitted `.css` and `.js` returned *nothing at all*. A `getComputedStyle` said `calc(100% - 48px)`; the authored rule said `0`. Scanning `document.styleSheets` for matching rules found only the losing one, because the winner was in a stylesheet my scan skipped. The string was written as `3rem` in source and only computed to `48px` — searching the build for the *computed* value found it immediately. **Search for the value the browser reports, not the value you wrote.**

**Two more silent failures on the way, both invisible to a green build:**
- `.page > #quartz-body > .page-header` never matched — `.page-header` is nested inside `.center`, not a direct child. An entire revision of the section was applying to nothing.
- The toolbar collapsed to **zero width** (`left === right === 1875`) rather than overflowing, because the loader's inline `flex-grow: 1` fought `margin-left: auto`. Search and both toggles were simply *absent from the page* while it rendered perfectly. Nothing errors when a flex child vanishes.

**Result, measured 1920 → 360px:** no horizontal overflow at any of ten widths, nav shrinks and wraps (282px → 312px as space tightens), toolbar holds 167px, wordmark hides below 800px. Reading measure untouched at 74 chars.

**The guard.** Eight new checks: 4 links present, wordmark in the header, **`min-width` computed to `0px`** (not merely authored that way), `grid-area: auto`, toolbar width > 0, search width > 0, no overflow, and the nav contained by the header box. Suite is **50/50**. **Proven by reverting the ID from the selectors**: four checks go red, reporting `calc(100% - 48px)` and `overflow: true`, and the script exits 1.

**Lesson.** *A reset only resets what it outranks.* Overriding a stylesheet is not about specificity or layers in the abstract — it is about matching the thing that is actually beating you, here an ID selector inherited from an element you reused for a different purpose. And when computed style disagrees with authored style, **the computed value is the only thing that exists** — grep the build for what the browser says, not for what you wrote.

## 18. ✅ DECIDED — "Emerson's Desk" (2026-09-30)

Owner: *"Something about the language 'The Brain' just doesn't sit right with me — it never has."* Agreed, and the reason is in the inventory below. **Decision: the site is "Emerson's Desk"; the header wordmark is `EBW`.** Implementation is §19.

**What it actually is.** A hub for everything Emerson Black writes that **isn't fiction**: newsletter dispatches, craft notes, thoughts, links. The name should describe *what it is*, not a metaphor for it. "The Brain" promises a second brain — a tool, a system, a workspace. What is actually here is a **publication**: a writer's non-fiction shelf. The mismatch is why the name never settled.

**The blast radius, which is small:**

| Where | Occurrences | Cost to change |
|---|---|---|
| `quartz.config.yaml` `pageTitle` | 1 | one line |
| `content/index.md` frontmatter `title` + hero kicker | 2 | two lines |
| `About.md` prose ("This is the Brain") | 1 | reword |
| `About.md` + `Newsletters/index.md` breadcrumb link text | 2 | two lines |
| storefront `index.html` + `bio.html` nav link | 2 | two lines |
| already-generated `public/` HTML | 58 | **regenerated, not edited** |
| `Newsletters/2023/how-to-banish-imposter-syndrome-forever.md`, `2025/the-dangers-of-overplotting.md` | 2 | **none — see below** |

**Nine authored lines total.** The 58 in `public/` are build output, replaced by rebuilding. The two "brain" hits inside actual dispatches are the ordinary English words *brainspace* and *change the brain* — **must not be touched**. A blind find-and-replace would corrupt published prose; this is the single most important warning in the section.

**Why the two-part name.** `EBW` in the header (already the favicon monogram and the storefront's signature — the thing a reader actually recognises), **"Emerson's Desk"** for the site itself: warm, human, unmistakably *a writer's* rather than a system's, and it matches the near-black/navy, crimson, film-grain register where "Brain" never did. It says *writer* where "Posts" says *feed*, and it survives being read aloud, which `EBW` does not — worth it for a name that lives in a `<title>`.

**Alternatives considered and why not:**
- **EBW Posts** — accurate but reads like a CMS project name; "posts" undersells a curated dispatch archive.
- **Dispatches** — collides with the existing "Latest dispatches" panel and the per-year archives; would confuse navigation.
- **The Notebook / Field Notes** — "field notes" is already the homepage description and reads like unfinished drafts.
- **Non-Fiction / The Archive** — describes a category, not a place. Fails the "where do I go to read him" test.

**Also worth fixing at the same time:** `brain/content/Newsletters/index.md` and `About.md` use a hand-written breadcrumb (`_Back to [[index|The Brain]]_`) that duplicates what the `breadcrumbs` plugin already renders (`rootName: "✦"`). Two breadcrumb systems, one of them a string to hand-edit on every future rename. Folded into §19 step 2.


## 19. 🟢 S10 — the rename to `/desk/`, and the storefront as homepage (2026-09-30 · **APPROVED, not yet started**)

Owner decisions: the name is **"Emerson's Desk"** with an `EBW` wordmark (§18); the slug becomes **`/desk/`**; the Desk's `index`/`about` stop duplicating the storefront; the storefront stays the homepage and features the writing.

**`/brain/` has never been launched**, so there is no link graph to protect — the one real cost of moving the slug is gone. It was always a **subpath**, not a subdomain, so nothing at `brain.emersonblackwrites.com` exists or needs redirecting. Three steps, each independently shippable, so a bad step never strands the site half-renamed.

### Is the slug move expensive? **No — priced from the repo, not estimated**

- **Every content link is relative.** Grepping `emersonblackwrites.com/brain`, `](/brain` and `"brain/` across `brain/content/**.md` returns **nothing**. Quartz resolves links from the file tree, so none of the 50+ dispatches needs touching.
- **The slug is a build-output path, not a source path.** `deploy.yml` assembles `_site/brain/` by copying `brain/public/` into it. The Quartz *source* directory stays `brain/` permanently — only the destination folder and `baseUrl` change.
- **Redirects are available** via `@quartz-community/alias-redirects` (installed, enabled), so `/brain/` can still resolve rather than 404 — cheap insurance, and the only reason to bother given nothing has shipped.
- **Five files reference the path**, two of them comments: `deploy.yml`, `Publish Brain.command`, `index.html`, `bio.html`, `quartz.config.yaml`.

**Recommendation: merge the old steps 1 and 3.** They were separate only to protect external links, and there are none. Renaming the name and the slug together is one coherent change instead of two commits that rename the same thing twice — and it is easier to review and revert as a unit. This is *why* doing the naming first would have been worth it even with links in play.

### The three steps

**Step 1 — Rename name, wordmark and slug together. ✅ DONE 2026-09-30 — see §20.** `pageTitle` → `Emerson's Desk`; `content/index.md` frontmatter `title` + hero kicker; `About.md` prose; the two storefront nav links; the `Brain` nav entry → `Desk`; `baseUrl` → `.../desk`; `_site/brain/` → `_site/desk/` in `deploy.yml` (including the two guard paths and the smoke-test URL); a redirect stub for `/brain/`. Wordmark → `EBW`.

> ⚠️ **Correction, found by building it (§20):** this paragraph originally specified a *"`.md` redirect stub at `content/brain.md`"*. That is the right tool for a slug change **inside** the build and exactly wrong across a change of the build's own root — an alias page emits under the Quartz output, so with the app at `/desk/` it would have appeared at **`/desk/brain/`**, the wrong side of the move. The stub is written by hand in `deploy.yml` at `_site/brain/index.html` (meta refresh + canonical) and the workflow fails closed unless it points at `/desk/`.

🔴 **Do not** find-and-replace "brain". Two live dispatches use the ordinary English words *brainspace* and *change the brain*; a blanket replace corrupts published prose. Replace the exact phrase only, and read the diff.

*Guards:* (a) `pageTitle` and `content/index.md`'s frontmatter `title` must agree, so name and wordmark cannot drift apart again; (b) assert no authored page still says "The Brain"; (c) `deploy.yml` guards must check `_site/desk/index.html` — the existing ones check `_site/brain/`, so leaving them would have made them **fail closed and block the deploy**, which is at least loud.

**Step 2 — Stop duplicating the storefront.** `desk/index` and `desk/about` restate what the storefront already says, and are weak enough to read as an oversight. Replace with a short, honest landing page: forward into the archive, back to the storefront for books and bio. Drop the hand-written `_Back to [[index|…]]_` breadcrumbs at the same time — the `breadcrumbs` plugin already renders a trail, so these are a second, hand-maintained breadcrumb system that must be edited on every future rename. Keep `bio.html` as a thin redirect rather than deleting it; a homepage pointing at a page that has gone is worse than the duplication.

**Step 3 — Storefront features the writing; the characters become a real post.** The homepage keeps books + a little on the Silverbridge world + a prominent link into the Desk. The characters section (`THE JOURNALISTS` — Luce, Huds, Faven, Rodney) becomes **a dated, cross-linked post inside the Desk** rather than a storefront widget.
*Why:* a character card on a homepage is marketing that expires; the same words as a post are content that compounds — and the Desk is where writing lives.
*Note:* this is **new writing**, so it is the one step that is not purely mechanical. Draft it as a note in the vault so `Publish Brain.command` picks it up like any other dispatch, rather than hand-placing it in `content/`.

### Boundaries worth keeping

- **The storefront is the homepage; the Desk is not.** Two surfaces, one brand. Someone arriving to buy *Seen in Silverbridge* must land on the shop; integration comes from the storefront *featuring* the Desk, not from merging them.
- **Leave the `brain/` source directory alone.** Renaming it would touch `npm ci`, both `.command` scripts and every path in this plan for no user-visible gain. The URL is what readers see.
- **The plan's own filename keeps "BRAIN".** `EMERSON-BLACK-BRAIN-PLAN.md` is a long-lived internal document; renaming it would break the `Publish Brain.command` snapshot and every reference to it. Cheap to do later, no value now.

### Status: **step 1 shipped 2026-09-30 (§20).** Steps 2–3 next.

---

## 20. ✅ S10 step 1 — the rename (2026-09-30)

The site is **Emerson's Desk**. The header wordmark reads **`EBW`**. It is served at **`/desk/`**, and `/brain/` redirects. Nine authored lines plus one config block, and the Quartz **source** directory is still `brain/` — exactly as §19 priced it. (`/brain/` was never launched, so there was no link graph to protect; that is the only reason the name and the slug could move in one commit.)

**What changed**

| Where | Change |
| --- | --- |
| `brain/quartz.config.yaml` | `pageTitle` → `"Emerson's Desk"`; `pageTitleSuffix` → `" · Emerson Black Writes"`; `baseUrl` → `emersonblackwrites.com/desk`; nav entry `Brain:` → `Desk: …/desk/` |
| `brain/content/index.md` | frontmatter `title` + hero kicker |
| `About.md`, `Newsletters/index.md` | prose + the two hand-written `_Back to [[index\|…]]_` link texts |
| `index.html`, `bio.html` | footer nav link → `desk/` |
| `brain/quartz/styles/custom.scss` | §4a: the wordmark renders `EBW` |
| `.github/workflows/deploy.yml` | `_site/brain/` → `_site/desk/`, both guard paths, the smoke-test URL, and the `/brain/` stub |

**Four things that were not obvious until built**

1. **The plan's own redirect sketch was on the wrong side of the move.** §19 specified a `.md` alias stub at `content/brain.md`. `@quartz-community/alias-redirects` emits *inside* the Quartz output, so with the app served from `/desk/` that stub would have appeared at `/desk/brain/` — a redirect at the destination, not at the origin. The old path is now a hand-written `_site/brain/index.html` written by `deploy.yml` (meta refresh to `url=/desk/` plus an absolute `canonical`), and the workflow **fails closed** on it: `grep -q 'url=/desk/' _site/brain/index.html`, where a missing file also fails. Corrected in §19.
2. **`page-title` has no options, so `EBW` cannot come from config.** The plugin README is explicit ("no configuration options"); it renders `cfg.pageTitle`. The swap is therefore presentational, in `custom.scss` §4a: the anchor is collapsed with `font-size: 0` and the mark is painted by `::before` at `--eb-wordmark-size` (a custom property, so the mark and the h2 cannot drift). The anchor *keeps* "Emerson's Desk" as its text — so the link's accessible name is the real site name and only the glyphs differ. `font-size: 0` rather than `visibility: hidden` because the latter leaves the long text occupying its box.
3. **The tab title had been glued together all along.** `Head.tsx` does `frontmatter.title + cfg.pageTitleSuffix` with no separator, so every tab in the arc read `The BrainEmerson Black Writes`. `pageTitleSuffix` now opens with `" · "`. Pre-existing, fixed here because the rename is what made it legible. (Also worth knowing: `<title>` comes from the *page's* frontmatter title, not `cfg.pageTitle` — the guard keys off that.)
4. **`grep` was the wrong tool for the rename, and the plan knew it.** The two dispatches that use the ordinary words *brainspace* and *change the brain* are untouched; the guards scan **case-sensitively** for `The Brain` so a future blanket replace cannot corrupt published prose.

**The guard — 16 new checks, suite 50 → 68** (`node quartz/verify-default-mode.mjs`, exit 1 on regression):

- `pageTitle` and `content/index.md`'s frontmatter `title` **agree**, and the name contains "Desk" — §19's guard (a), so the two statements of the site's name cannot drift apart again.
- No **authored** page and no **built** page still says "The Brain" (case-sensitive) — guard (b), extended to the output so a stale config option is caught too.
- Homepage `<title>` keeps the name *and* its separator.
- `baseUrl` is `…/desk`, and no `/brain/` URL survives in `quartz.config.yaml` (that is the header nav).
- Both storefront pages link `desk/` and no longer link `brain/`.
- The workflow stages **and guards** `_site/desk/`, smoke-tests the live `/desk/`, and writes a stub pointing at `/desk/` — guard (c). Leaving the old guard paths would have failed the deploy closed, which is at least loud.
- Computed-style (headless Chrome): the header **paints** `EBW` (`::before` content), the anchor **keeps** the full name, its computed size is **`0px`** — i.e. the name is present but *not* painted — and the painted mark has real width (**37px**).

**Proven by re-introducing both bugs, not by a green run.** (i) `pageTitle: "The Brain"` → 3 failures, exit 1. (ii) Commenting out `font-size: 0` → the "kept but not painted" check fails at **29.8px** and the mark's width doubles to **178px**, which is what the state *would* have looked like: the full name and `EBW` side by side. That second check exists because the first version of this probe would have passed it — `mark` alone still reads `"EBW"` when the collapse rule is missing. §16's rule, one section on.

**The workflow's own shell was executed, not eyeballed.** The assemble + guard steps were extracted from `deploy.yml`, redirected to a temp `_site`, and run verbatim: 54 newsletter pages and 184 images staged, stub content correct, all guards passed. The `printf` quoting in the stub is the part that most needed that.

**Lesson.** *A plan can be right about the shape of a change and wrong about a path.* §19 predicted a content-alias redirect for `/brain/`; that is the correct tool for a slug change **inside** the build and exactly wrong across a change of the build's own root. And where a framework component offers no configuration, a presentational swap is legitimate — but assert on **both** halves of it (what is painted, what is announced), because either on its own can look correct while being wrong.

**Still open from §19:** step 2 (the two site pages stop restating the storefront; drop the hand-written breadcrumbs) and step 3 (the storefront features the writing; the characters become a real post). Then S3, S2, S8.

