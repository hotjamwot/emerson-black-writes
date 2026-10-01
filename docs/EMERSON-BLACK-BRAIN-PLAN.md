# Emerson Black Brain — Architecture, Spec & Operations Guide

**Status:** Live at `emersonblackwrites.com/desk/` · **Engine:** Quartz v5 · **Date:** 2026-09-28 · **Author:** HayJay + AI assistant
**Now (2026-10-01):** Arc 2 visual pass, one change at a time. ✅ **S5** crimson accent, owned by the Brain's own `emerson` theme (§11). ✅ **Default dark**, toggle kept (§10). ✅ **S7** favicon on both halves (§13). ✅ **S6** complete — the body-serif bug that held this up is fixed and guarded (§14). ✅ **S9** storefront accent + favicon — storefront now carries the Brain's dark accent and the halves are assertion-guarded against drift (§15). ✅ **S1 + S4** layout — the empty right sidebar was eating a third of the shell; collapsed, and the measure deliberately held at ~74 chars rather than widened (§16). ✅ **S1a** header bar — wordmark, four-link nav and search/controls in one top band, rebuilt entirely from existing plugins and config (§17). ✅ **S10 step 1 — the rename (§20):** the site is **Emerson's Desk**, the wordmark reads **`EBW`**, it is served at **`/desk/`**, and `/brain/` redirects. **Next: the tags/folders/graph spine (§22) — read all 50 posts, agree the taxonomy, then fill the links; today the graph is 8 edges across 54 notes, 79% isolated. Then the CSS/plugin prune (§24.1), post-header dates (D18/§22.3), S10 step 3, and the LLM tagging workflow (§22.2).**


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
| D1 | Subpath vs subdomain | **`emersonblackwrites.com/desk/`** *(was `/brain/` until 2026-10-01, §20)* | Shares domain authority; one repo; simpler Pages config |
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
| D16 | Site name & wordmark *(2026-10-01, §18/§20)* | **Site = "Emerson's Desk"; header wordmark = `EBW`; slug = `/desk/`** | "The Brain" promised a tool and delivered a publication. `EBW` is what a reader already recognises (favicon monogram, storefront signature); "Emerson's Desk" says *writer* where "Posts" says *feed*. The wordmark swap is presentational — `page-title` has no options — so the link keeps the full name for assistive tech |
| D17 | No About page; no hand-written breadcrumbs *(2026-10-01, §21/§23)* | **The Desk has no About page** (the bio is the storefront's) and **breadcrumbs are never hand-written again**; the plugin's trail stands for now | The house/storefront and the study room/Desk are one build with a door between them, not two sites. Full reasoning and the open breadcrumb question in §23 |
| D18 | `updated:` is a real editorial date *(2026-10-01, §22.3)* | **Never normalise or auto-stamp `updated:`.** 49 notes share `updated: 2026-09-28` because the whole archive was cleaned by hand in one day. Posts render **`Originally published {created} • Updated {modified}`** and a **client-computed** "Recently updated" badge fires when `modified` is within 3 months | A shared date across every note is the signature of a batch edit, not a broken migration. The badge is *meant* to mark the whole archive until 2026-12-28, and will differentiate as the Desk is worked on. It is derived, never stored — a stored flag would be frozen at build time and would mix system state into the tag taxonomy |

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
- [x] **The rename — DONE (2026-10-01 · S10 step 1 / §20):** the site is **Emerson's Desk**, the header wordmark reads **`EBW`**, it is served at **`/desk/`**, and a hand-written stub at `_site/brain/` redirects the old path. Nine authored lines plus the config block; the Quartz *source* directory stays `brain/`. 16 new guard checks (suite 50 → 68). **Note:** `Newsletters/index.md` lives in the *vault*, so its rename had to be made there — the repo copy is rsync'd over on every publish (this bit once; see §20).
- [x] **Stop duplicating the storefront — DONE (2026-10-01 · S10 step 2 / §21):** `brain/content/About.md` is **deleted** — the Desk is a shelf, the bio is the house's job — and `content/index.md` is now a thin landing page: what the Desk is, *Browse the archive*, *Back to the main site*, and the generated 5 newest dispatches. The curated hero pitch, four "start here" doors, four year cards, four reading trails and the books CTA are gone, along with both hand-written `_Back to …_` breadcrumbs. **7 new guard checks** (suite 68 → 77).
- [ ] **Post header dates + "Recently updated" badge (D18, §22.3).** `Originally published {created} • Updated {modified}` at the top of every post, plus a **client-computed** badge when `modified` is within 3 months. Unblocked: the `updated:` values are real editorial dates (49 notes share 2026-09-28 because the archive was cleaned by hand in one day) and the badge is *meant* to fire across the archive until 2026-12-28.
- [ ] **Prune the orphaned `eb-*` brand CSS (new, §24.1).** 15 of the 20 brand classes in `brain/quartz/styles/custom.scss` are unreferenced since the landing page was thinned in §21 — measured at 0 occurrences across all 355 built pages. HayJay: *"It's super important that you keep me updated with any findings like this… we want to keep this repo clean and the workflow immaculate."* Also fold in the three enabled-but-inert plugins in §24.1.
- [ ] **S10 step 3 — the storefront features the writing. (§19)** The homepage keeps books + the Silverbridge note and links prominently into the Desk. **`THE JOURNALISTS` stays a storefront section — HayJay's call, 2026-10-01:** no post is written for it; it is dealt with separately later.
- [ ] **Tags, folders and the graph — the spine of the Desk (new, §22).** The premise: *the way the ideas link is the important way to look at this Desk.* Today the graph is nearly empty — **8 link edges across 54 published notes, 43 notes (79%) fully isolated** (measured from `public/static/contentIndex.json`, §22.1). **Step 1 done (2026-10-01): every post read and a taxonomy proposed — 8 spheres, `process` / `mindset` / `craft-plot` / `systems` / `craft-character` / `reading` / `bookcraft` / `news`, with a 2-links-per-post proposal that takes the graph from 8 edges to ~90. Awaiting sign-off on the vocabulary and the four contested calls (§25).** Then: apply, retire the year folders from navigation, revisit breadcrumbs.
- [ ] **LLM-assisted tagging, aliases and related links — after the above (new, §22.2).** Once the taxonomy exists and the posts have been read, design prompts + a workflow to run new post copy through an LLM and emit `tags`, `aliases` and candidate `[[wikilinks]]` for review. Deliberately sequenced *after* the human pass: the prompts need the tag vocabulary and the shape of real links to aim at, and a taxonomy invented by a model is a taxonomy nobody owns.
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
| S10 | 🟢 **Steps 1–2 done; step 3 remains** | Site = **Emerson's Desk**, wordmark `EBW`, slug `/desk/` ✅ (§20) · Desk stops duplicating the storefront ✅ (§21) · remaining: the storefront features the writing; `THE JOURNALISTS` stays a storefront section, no post | §18–22 — step 3 + **tags/graph spine** next |

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
> 8. ✅ **S10 step 2** — stop duplicating the storefront: About deleted, landing page thinned, hand-written breadcrumbs dropped. §21.
> 9. ⬜ **S10 step 3** — the storefront features the writing. `THE JOURNALISTS` stays a storefront section, not a post. §19.
> 10. 🟢 **Tags → folders → graph** — the spine of the Desk. **Step 1 DONE: all 49 posts read; an 8-sphere taxonomy + full link proposal is in §25, awaiting sign-off.** Approve it and it applies in one commit. Then retire the year folders, then revisit breadcrumbs. **Biggest remaining piece.**
> 11. ⬜ **LLM-assisted tags, aliases & related links** — prompts + workflow, designed *after* the human pass. §22.2.
> 12. ✅ **Post header dates + "Recently updated" badge** — D18/§26. Live: "Published … • Updated …" + a client-gated pill. Suite guards it.
> 13. ✅ **Prune orphaned CSS + inert plugins** — §24.1 F1-F4 (the dead `.after-body-graph` block, F5, removed en route).
> 14. ✅ **Bridging second tags** — 18 posts now cross a sphere boundary (§26).
> 15. ⬜ **S3** — left sidebar cleanup.
> 16. 🟢 **S2 graph** — *unblocked and mostly done*: the local graph shows the whole Desk map (depth 100) and is taller (§26). Remaining: confirm the full map reads well once the wikilinks land.
> 17. ⬜ **S8** — visible tags done (§25); breadcrumb question resolved (removed, §26).
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


## 19. 🟢 S10 — the rename to `/desk/`, and the storefront as homepage (2026-09-30 approved · **step 1 shipped 2026-10-01, §20**) 

Owner decisions: the name is **"Emerson's Desk"** with an `EBW` wordmark (§18); the slug becomes **`/desk/`**; the Desk's `index`/`about` stop duplicating the storefront; the storefront stays the homepage and features the writing.

**`/brain/` has never been launched**, so there is no link graph to protect — the one real cost of moving the slug is gone. It was always a **subpath**, not a subdomain, so nothing at `brain.emersonblackwrites.com` exists or needs redirecting. Three steps, each independently shippable, so a bad step never strands the site half-renamed.

### Is the slug move expensive? **No — priced from the repo, not estimated**

- **Every content link is relative.** Grepping `emersonblackwrites.com/brain`, `](/brain` and `"brain/` across `brain/content/**.md` returns **nothing**. Quartz resolves links from the file tree, so none of the 50+ dispatches needs touching.
- **The slug is a build-output path, not a source path.** `deploy.yml` assembles `_site/brain/` by copying `brain/public/` into it. The Quartz *source* directory stays `brain/` permanently — only the destination folder and `baseUrl` change.
- **Redirects are available** via `@quartz-community/alias-redirects` (installed, enabled), so `/brain/` can still resolve rather than 404 — cheap insurance, and the only reason to bother given nothing has shipped.
- **Five files reference the path**, two of them comments: `deploy.yml`, `Publish Brain.command`, `index.html`, `bio.html`, `quartz.config.yaml`.

**Recommendation: merge the old steps 1 and 3.** They were separate only to protect external links, and there are none. Renaming the name and the slug together is one coherent change instead of two commits that rename the same thing twice — and it is easier to review and revert as a unit. This is *why* doing the naming first would have been worth it even with links in play.

### The three steps

**Step 1 — Rename name, wordmark and slug together. ✅ DONE 2026-10-01 — see §20.** `pageTitle` → `Emerson's Desk`; `content/index.md` frontmatter `title` + hero kicker; `About.md` prose; the two storefront nav links; the `Brain` nav entry → `Desk`; `baseUrl` → `.../desk`; `_site/brain/` → `_site/desk/` in `deploy.yml` (including the two guard paths and the smoke-test URL); a redirect stub for `/brain/`. Wordmark → `EBW`.

> ⚠️ **Correction, found by building it (§20):** this paragraph originally specified a *"`.md` redirect stub at `content/brain.md`"*. That is the right tool for a slug change **inside** the build and exactly wrong across a change of the build's own root — an alias page emits under the Quartz output, so with the app at `/desk/` it would have appeared at **`/desk/brain/`**, the wrong side of the move. The stub is written by hand in `deploy.yml` at `_site/brain/index.html` (meta refresh + canonical) and the workflow fails closed unless it points at `/desk/`.

🔴 **Do not** find-and-replace "brain". Two live dispatches use the ordinary English words *brainspace* and *change the brain*; a blanket replace corrupts published prose. Replace the exact phrase only, and read the diff.

*Guards:* (a) `pageTitle` and `content/index.md`'s frontmatter `title` must agree, so name and wordmark cannot drift apart again; (b) assert no authored page still says "The Brain"; (c) `deploy.yml` guards must check `_site/desk/index.html` — the existing ones check `_site/brain/`, so leaving them would have made them **fail closed and block the deploy**, which is at least loud.

**Step 2 — Stop duplicating the storefront. ✅ DONE 2026-10-01 — see §21.** HayJay's call went further than this section planned: **the Desk has no About page at all** ("we fully lose `brain/about.md` right? The Desk doesn't need its own about page"), and `/desk/` is a **thin landing page** — what the Desk is, *Browse the archive*, *Back to the main site*, and the 5 newest dispatches. House and study room: slight separation, but one build. The hand-written `_Back to [[index|…]]_` breadcrumbs are gone from both pages that had one.

**Step 3 — Storefront features the writing. ⬜ not started.** The homepage keeps books + a little on the Silverbridge world + a prominent link into the Desk.

> ⚠️ **Superseded in part, 2026-10-01 (HayJay):** *"let's not write the post for the Journalists. Let's keep it as a section in the index.html and we can deal with it separately later."* So the `THE JOURNALISTS` cards (Luce, Huds, Faven, Rodney) **stay a storefront section** — the reasoning below (a character card on a homepage is marketing that expires; the same words as a post are content that compounds) was sound, but the timing is wrong: the Desk does not yet have the tag taxonomy or the link density to give such a post a home (§22.1). It is deferred, not cancelled.
*Why:* a character card on a homepage is marketing that expires; the same words as a post are content that compounds — and the Desk is where writing lives.
*Note:* this is **new writing**, so it is the one step that is not purely mechanical. Draft it as a note in the vault so `Publish Brain.command` picks it up like any other dispatch, rather than hand-placing it in `content/`.

### Boundaries worth keeping

- **The storefront is the homepage; the Desk is not.** Two surfaces, one brand. Someone arriving to buy *Seen in Silverbridge* must land on the shop; integration comes from the storefront *featuring* the Desk, not from merging them.
- **Leave the `brain/` source directory alone.** Renaming it would touch `npm ci`, both `.command` scripts and every path in this plan for no user-visible gain. The URL is what readers see.
- **The plan's own filename keeps "BRAIN".** `EMERSON-BLACK-BRAIN-PLAN.md` is a long-lived internal document; renaming it would break the `Publish Brain.command` snapshot and every reference to it. Cheap to do later, no value now.

### Status: **steps 1–2 shipped 2026-10-01 (§20, §21).** Step 3 remains.

---

## 20. ✅ S10 step 1 — the rename (2026-10-01)

The site is **Emerson's Desk**. The header wordmark reads **`EBW`**. It is served at **`/desk/`**, and `/brain/` redirects. Nine authored lines plus one config block, and the Quartz **source** directory is still `brain/` — exactly as §19 priced it. (`/brain/` was never launched, so there was no link graph to protect; that is the only reason the name and the slug could move in one commit.)

**What changed**

| Where | Change |
| --- | --- |
| `brain/quartz.config.yaml` | `pageTitle` → `"Emerson's Desk"`; `pageTitleSuffix` → `" · Emerson Black Writes"`; `baseUrl` → `emersonblackwrites.com/desk`; nav entry `Brain:` → `Desk: …/desk/` |
| `brain/content/index.md` | frontmatter `title` + hero kicker |
| `About.md` (repo-only); `Newsletters/index.md` (**vault** — see finding 4) | prose + the two hand-written `_Back to [[index\|…]]_` link texts |
| `index.html`, `bio.html` | footer nav link → `desk/` |
| `brain/quartz/styles/custom.scss` | §4a: the wordmark renders `EBW` |
| `.github/workflows/deploy.yml` | `_site/brain/` → `_site/desk/`, both guard paths, the smoke-test URL, and the `/brain/` stub |

**Four things that were not obvious until built**

1. **The plan's own redirect sketch was on the wrong side of the move.** §19 specified a `.md` alias stub at `content/brain.md`. `@quartz-community/alias-redirects` emits *inside* the Quartz output, so with the app served from `/desk/` that stub would have appeared at `/desk/brain/` — a redirect at the destination, not at the origin. The old path is now a hand-written `_site/brain/index.html` written by `deploy.yml` (meta refresh to `url=/desk/` plus an absolute `canonical`), and the workflow **fails closed** on it: `grep -q 'url=/desk/' _site/brain/index.html`, where a missing file also fails. Corrected in §19.
2. **`page-title` has no options, so `EBW` cannot come from config.** The plugin README is explicit ("no configuration options"); it renders `cfg.pageTitle`. The swap is therefore presentational, in `custom.scss` §4a: the anchor is collapsed with `font-size: 0` and the mark is painted by `::before` at `--eb-wordmark-size` (a custom property, so the mark and the h2 cannot drift). The anchor *keeps* "Emerson's Desk" as its text — so the link's accessible name is the real site name and only the glyphs differ. `font-size: 0` rather than `visibility: hidden` because the latter leaves the long text occupying its box.
3. **The tab title had been glued together all along.** `Head.tsx` does `frontmatter.title + cfg.pageTitleSuffix` with no separator, so every tab in the arc read `The BrainEmerson Black Writes`. `pageTitleSuffix` now opens with `" · "`. Pre-existing, fixed here because the rename is what made it legible. (Also worth knowing: `<title>` comes from the *page's* frontmatter title, not `cfg.pageTitle` — the guard keys off that.)
4. **The publish loop itself un-did one of the edits — and the guard is what proved it.** `brain/content/Newsletters/index.md` is not authored in the repo: it is **rsync'd from `Newsletters/` in the vault** on every publish. Editing the repo copy looks like it works (the build is correct, the guards pass, the site deploys), and then the very next `Publish Brain.command` restores the vault's version and pushes it — which is exactly what happened here: the first publish commit (`0f55926`) put `[[index|The Brain]]` back, and the flow went live with the old breadcrumb for a few minutes. The fix is in the **vault** (`Newsletters/index.md`), which is the source of truth (§2, D2). Two things worth keeping: the guard written for §19's blast radius — *"no authored page still says 'The Brain'"* — is precisely the check that catches this class of error, because it reads the mirrored content and the built output rather than trusting the diff; and §19's blast-radius table listed only authored *pages*, missing that one of the nine lines lives on the vault side of the mirror. `content/index.md` and `About.md` are repo-only and were safe. `How to Publish the Brain.md` (the vault's own cheat sheet — operator docs, not a published page) carried five `/brain/` references and has been updated too.
5. **`grep` was the wrong tool for the rename, and the plan knew it.** The two dispatches that use the ordinary words *brainspace* and *change the brain* are untouched; the guards scan **case-sensitively** for `The Brain` so a future blanket replace cannot corrupt published prose.

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
---

## 21. ✅ S10 step 2 — the Desk stops duplicating the storefront (2026-10-01)

**The model:** HayJay's words — *"the storefront's index is the house, Desk is the study room, and the posts are inside the study room. So there's slight separation between the house and the room, but they should feel integrated and uniform."* Two consequences, both going further than §19 planned:

1. **The Desk has no About page.** Not a short one, not a thin one — `brain/content/About.md` is **deleted**. A shelf does not have an about page; the author bio is the *house's* job and already lives at `bio.html`, which the Desk's own header nav has always pointed at. Deleting it also removes the only page where the Desk restated the storefront's bio sentence-for-sentence.
2. **`/desk/` is a thin landing page.** Not "the curated portal, minus the books CTA" — the hero pitch, four *Start here* doors, four year cards and four reading trails are all gone. What remains: one paragraph saying what the Desk is, **Browse the archive**, **Back to the main site**, a ⌘K/graph hint, and the **generated** 5 newest dispatches.

**Why all of that had to go, specifically.** Each block was a *hand-maintained duplicate* of something the archive already knows: the year cards restate the explorer tree, and the reading trails are four hand-made tags — the exact thing §22 replaces with real ones. The doors were the only genuinely original curation, and they were weeks of shelf-keeping for four links. Meanwhile the one thing that *couldn't* rot — the recent list — was already there: `@quartz-community/recent-notes` is `afterBody` with `limit: 5` and `linkToMore: Newsletters/index`, so the page gets its post list generated on every build. **Prefer the generated thing over the curated copy of it, every time.**

**Both hand-written breadcrumbs are gone** (`About.md` and the vault's `Newsletters/index.md`). The `breadcrumbs` plugin renders a real trail; the italic `_Back to …_` lines were a second, string-typed breadcrumb system that had to be hand-edited on every rename — and did bite, in §20.

**The guard — 7 new checks, suite 68 → 77.** They assert the *contract*, not the prose, so rewording cannot quietly rebuild a second homepage:
- no `_Back to [[` idiom survives anywhere in `content/` (source-level, all files);
- the landing page carries **no** `eb-hero` / `eb-kicker` / `eb-card` / `eb-trail` / `eb-year` / `eb-grid` / `eb-section` / `eb-cta` markup;
- it **does** link forward into the archive and back to the storefront;
- it lists **exactly 5** generated recent items, and no hand-typed `eb-card` list;
- `content/About.md` stays deleted, and **no built page links to `/about`** (a link to a page that no longer exists is invisible in a green build);
- neither the landing page nor the archive index contains `bio.html`'s bio prose — **read out of `bio.html` at check time**, not hardcoded, so a future reword of the storefront is caught either way. (§15's lesson, applied to copy instead of a hex.)

**Proven by re-introducing every bug at once,** as §16 insists: re-adding `About.md` + an `href="about"` link + a hero + a card + a `_Back to [[` breadcrumb makes **four** checks go red, each naming the file at fault, and the script exits 1.

**Two of the seven checks were wrong on the first attempt** — worth recording, because both failed *for a good reason*:
- `!/>Back to/` matched the landing page's own **"Back to the main site"** button. A text match is not a statement of intent; the check now matches the *idiom* (`_Back to [[`) in the **source**. (§17 again: name the thing you mean.)
- `href="newsletters/"` never matched, because Quartz resolves a content-root-relative link to **`./newsletters/`**. Grep for what the build emits, not what you wrote. (§17's actual lesson.)

**§20's vault-mirror lesson repeated immediately.** The archive-index edit was made in the vault, and the first verify run failed on it — `brain/content/Newsletters/index.md` still held the old text until the mirror ran. Same trap, same detector; the fix is the same (edit the vault, mirror, rebuild). The *guard* caught it before anything was pushed.

**Also: 15 of the 20 `eb-*` brand classes are now unreferenced** (`eb-hero`, `eb-kicker`, `eb-hero-title`, `eb-hero-lede`, `eb-section`, `eb-section-title`, `eb-grid`, `eb-card`, `eb-card-kicker`, `eb-card-title`, `eb-card-text`, `eb-count`, `eb-cta`, `eb-trail`, `eb-year`) — 0 occurrences across all 355 built pages. They are **left in `custom.scss` for now** and filed as **F1 in §24.1** for a dedicated prune, on HayJay's standing ask to keep the repo lean rather than deleting ~200 lines of visual vocabulary inside a content commit.

**Still open from §19:** step 2 (the two site pages stop restating the storefront; drop the hand-written breadcrumbs) and step 3 (the storefront features the writing; the characters become a real post). Then S3, S2, S8.


---

## 22. 🟢 Tags, folders and the graph — the spine of the Desk (2026-10-01)

HayJay's premise, which now governs everything left: **"the way the ideas link is the important way to look at this Desk."** Folders (`Newsletters/<year>/`) are an artefact of the Substack export, not an editorial structure; tags plus links are the real navigation, and once they carry it the folders can go.

### 22.1 The measurement that sets the agenda

From the built `public/static/contentIndex.json` (the graph's data source — `slug`, `title`, `tags`, `links` per page):

| | |
| --- | --- |
| published notes | **54** |
| link edges between them | **8** |
| notes with an outgoing link | **5** |
| notes with an incoming link | **8** |
| **fully isolated notes** | **43 (79%)** |

All eight edges:

```
the-stormhouse-book-awards-2024   →  the-nerdiest-book-roundup-ever-2023
the-seen-covers-get-a-facelift-1  →  the-seen-covers-get-a-facelift-2
third-draft-is-finished           →  writing-abroad · how-to-successfully-fail-at-deadlines
                                     keep-keep-keep-writing · the-furry-region
my-new-book-is-coming-out         →  the-dangers-of-overplotting
```

So the graph — the thing the whole design leans on — currently draws **56 nodes and 8 edges**: a field of loose dots. That is not a styling problem, and it is why **S2 (a bigger graph) is blocked behind this item**: a taller graph of nothing is a bigger field of nothing. `tags: []` on every note means the tag axis contributes no edges yet either.

### 22.2 Sequence

1. **Read all 50 posts properly** and agree a small tag taxonomy — the working set is craft / process / publishing / mindset. Four is right at this size; twenty would not be.
2. **Fill the links.** Thematic `[[wikilinks]]` between essays, chosen by a human who has read them.
3. **Retire the year folders**, once tags carry navigation. Then revisit the breadcrumbs (D17).
4. **Then** the LLM workflow — prompts to run new post copy through a model and emit `tags`, `aliases` and candidate `[[wikilinks]]` for review.

The ordering of 4 is deliberate: prompts need the tag vocabulary and the shape of real links to aim at. A taxonomy invented by a model is a taxonomy nobody owns, and the review cost lands on the same person either way — better to aim it at work that already exists.

### 22.3 Post header dates + the "Recently updated" badge

Requested: *"At the beginning of every post, I want the frontmatter to say 'Originally published <date> • Updated <date>', and if a post has been updated in the last 3 months, it has a 'Recently updated' tag."*

**The `updated:` dates are deliberate and meaningful — do not normalise them.** 49 of the 51 archived notes carry `updated: 2026-09-28`, and that is because HayJay went through the entire post history **in one day** (2026-09-28), stripping cruft and stale references from every note and marking each one updated by hand. A shared date here is the *signature of a batch edit*, not evidence of a botched migration. These values will spread out as the Desk is worked on.

> ⚠️ **Correction (2026-10-01).** §22.3 first shipped claiming this was a **migration artefact**, on two pieces of evidence: `Substack-export/posts.csv` has no `updated` column, and `git log -S'updated: 2026-09-28'` lands on `3128f95` *"Quartz v5 scaffold + 49 newsletters mirrored (Phase 4)"*. Both are true and **neither is exculpatory**: the mirror commit on the 28th simply *copied* files that had already been edited that day, and the dates came from the vault — which is exactly where the cleanup happened. I had a coincidence and wrote it as a proven cause. See the lesson in §24.2.

**What this means for the badge:** it fires on the whole archive until **2026-12-28**, then starts differentiating — which is the intent. *"In three months the badge won't fire on all of the posts, so it's more of a mission for the future."* Worth saying plainly at launch, so a reader who sees it everywhere in October knows it is a marker of the site-wide cleanup pass, not a bug.

**Build notes:**
- **Mechanism:** `created:` / `modified:` are already derived by `Publish Brain.command` (D13) and `content-meta` renders `<time>`; a small local component prints the pair. Renders as **`Originally published {created} • Updated {modified}`**.
- **Compute the badge on the client**, not at build time — a build-time flag is frozen until the next publish, so in three months it would be quietly wrong. A few lines comparing `modified` against `Date.now()` cannot go stale.
- **Not a real tag.** A stored `recently-updated` tag would mix system state into the editorial taxonomy §22.2 is designing, and would need rebuilding each time it expires. Derive it; store nothing.
- **Open micro-decision:** for a note published and never touched since, `created == modified`. Printing the same date twice reads like a bug, so the component should collapse to just *Originally published {date}* in that case. Trivially reversible if the other behaviour is preferred.

---

---

## 23. D17 — no hand-written breadcrumbs; the Desk has no About page (2026-10-01)

| # | Decision | Why |
| --- | --- | --- |
| D17 | **The Desk has no About page**, and **breadcrumbs are never hand-written again.** The `breadcrumbs` plugin stays for now | The Desk is a shelf; the bio is the storefront's. Hand-written breadcrumbs are a second breadcrumb system that must be re-edited on every rename — it already cost one silent revert (§20). The plugin's trail (`✦ / Newsletter Archive / 2025 / …`) is generated and free. **Open question:** HayJay's instinct is that breadcrumbs are not needed at all once folders go (revisit with §22.2 step 3). Two things argue for keeping it until then: it is the only way *up* from a post to its year, and `showCurrentPage: true` currently repeats the article title directly beneath the `<h1>` — the one part of it that is plainly redundant, and the first thing to drop if it stays. |

## 24. Findings log — cruft & opportunities (opened 2026-10-01)

HayJay: *"It's super important that you keep me updated with any findings like this because it gives an opportunity to get leaner code and clear out unneeded cruft. Let's add this as a task to review; we want to keep this repo clean and the workflow immaculate."*

**This section exists so that finding no longer depends on it coming up in conversation.** Every observation of the shape *"this is dead / this could be leaner / this is wrong but harmless"* gets logged here with its **measurement**, not its impression. The measure is the point — §16's rule is that an unmeasured claim about cruft is indistinguishable from a guess, and a guess is how a needed rule gets deleted. Review it whenever a step ships.

### 24.1 Open — measured, actionable

| # | Finding | Measurement | Where | Status |
| --- | --- | --- | --- | --- |
| F1 | **15 of 20 `eb-*` brand classes are now unreferenced** — orphaned since §21 thinned the landing page | 0 occurrences across all 355 built pages | `brain/quartz/styles/custom.scss` | ⬜ open — prune, then re-run the suite (§16: prove the build still passes) |
| F2 | `canvas-page` plugin enabled with **no `.canvas` files anywhere** | 0 files in the vault; no `/canvas` route in `public/` | `quartz.config.yaml:192` | ⬜ open — disable |
| F3 | `bases-page` plugin enabled with **no `.base` files anywhere** | 0 files in the vault; no `/bases` output | `quartz.config.yaml:350` | ⬜ open — disable |
| F4 | `obsidian-plugin-excalidraw` enabled with **no drawings** | 0 `.excalidraw` files in vault or content | `quartz.config.yaml:371` | ⬜ open — disable |

**The 15 dead classes (F1):** `eb-hero`, `eb-kicker`, `eb-hero-title`, `eb-hero-lede`, `eb-section`, `eb-section-title`, `eb-grid`, `eb-card`, `eb-card-kicker`, `eb-card-title`, `eb-card-text`, `eb-count`, `eb-cta`, `eb-trail`, `eb-year`. Still in use: `eb-actions`, `eb-btn`, `eb-btn--primary`, `eb-btn--quiet`, `eb-fine`.

### 24.2 Checked and dismissed — recorded so they are not re-investigated

| # | Hypothesis | Verdict |
| --- | --- | --- |
| F5 | `.after-body-graph` styles were live | ❌ **Dead** — the graph plugin never emits that class (0 occurrences in every built page), and it carried its own `.graph-outer` height that silently shadowed the real one. Removed 2026-10-01; noted inline in `custom.scss`. |
| F6 | A local Quartz component can be dropped into the layout by adding a file and a config `source` | ⚠️ **True but non-obvious — it must be a mini-package.** This fork wires layout components through a manifest/package loader, not a bare import. A working local plugin needs: a **directory**, a `package.json` with a `quartz.components` manifest AND a `./components` subpath export, a **pre-compiled `.js`** entry (the loader does a computed `import()` at runtime, so the bundler cannot follow it — a `.ts` entry fails to load), and the component exported as a **constructor** `(opts) => Component` (a bare component throws `Cannot destructure 'fileData' of undefined`). `afterDOMLoaded` must be attached to the component *and* the constructor. Worked example: `quartz/plugins/post-dates/`. |
| F7 | `updated: 2026-09-28` on 49 notes is a **migration artefact** | ❌ **Wrong, and I asserted it anyway.** The evidence was circumstantial and consistent with the truth: the CSV has no `updated` column (the dates came from the vault), and the mirror commit on the 28th *copied* files already edited that day. **Lesson: two findings that agree with a hypothesis are not two findings — check whether the hypothesis is even in contention before writing it as a conclusion, and never recommend destroying data on circumstantial evidence.** The dates are hand-set editorial revisions (D18). |
| F8 | `unicode-bidi` wrapping rules may be dead in the storefront CSS | ❌ Dismissed — 0 occurrences in `style.css`, `index.html`, `bio.html`. Never existed. |
| F9 | `ox-hugo` and `roam` plugins are enabled and unused | ❌ Dismissed — both are already `enabled: false`. A grep for `source:` lines is not a grep for `enabled: true`. |
| F10 | Content contains Hugo `{{< >}}` shortcodes | ❌ Dismissed — the only match was a **binary `.webp`** (grep matching binary noise), not markdown. |

### 24.3 Standing rules

---

## 25. 🟡 The tag taxonomy — proposed, awaiting HayJay's sign-off (2026-10-01)

**This is step 1 of §22.2, done: all 49 published posts read in full, and the topic spheres that occur naturally in them identified.** The plan had guessed "craft / process / publishing / mindset"; reading the archive produced **eight** cleaner spheres. This section proposes the taxonomy and the first link graph. **Nothing has been applied to the vault yet** — the tags/links land in one commit only after the vocabulary is agreed, per §22.2's own lesson (a taxonomy nobody owns is not a taxonomy).

### 25.1 The eight spheres

| Tag | What it holds | Count |
| --- | --- | --- |
| `process` | The drafting lifecycle: starting, first drafts, rewrites, finishing, saying goodbye | 10 |
| `mindset` | Imposter, guilt, deadlines, instinct, rest, authenticity | 9 |
| `craft-plot` | Plotting, structure, sourcing ideas, overplotting, screenplay | 6 |
| `systems` | Workflow & tools: Notion, calendar, goals, ChatGPT, sidequests, crop rotation | 7 |
| `craft-character` | Building & softening characters, reader emotion, actors | 5 |
| `reading` | Reading lists, taste, book awards, "what's your fantasy" | 5 |
| `bookcraft` | Covers & presentation: cover job, facelift parts, reader's genre eye | 4 |
| `news` | Announcements & milestones: releases, awards, team | 3 |

Each post gets **exactly one** tag (mirroring how a folder used to be a single axis), and the *links* provide the crossing. Double-tagging would muddy the tag pages; the graph is where a post belongs to two worlds at once.

### 25.2 What the tags replace, and what they don't

- **They replace the year folders** for topic navigation. `/newsletters/2025/` becomes a date archive, not the way you find "everything about overplotting" — `/tags/craft-plot/` does that.
### 25.3 Every post, assigned

Read the table as the argument. Where a post could sit in two spheres, the note says what tipped it.

| Year | Post | Tag | Nearest neighbour(s) — the link proposal |
| --- | --- | --- | --- |
| 2023 | 5 Lessons: First Sequel | `process` | Saying Goodbye · Third Draft is Finished |
| 2023 | Sweeten Up Unlikeable Characters | `craft-character` | How To Build a Human · Emotional Gutting 101 |
| 2023 | Emotional Gutting 101 | `craft-character` | Your Reader's Invisible Eye · What Turns You On? |
| 2023 | An Enforced Break | `mindset` | *forced rest, not a system* → Art of Not Feeling Guilty · Master Your Calendar |
| 2023 | Breaking Up with Boring Books | `reading` | What's Your Fantasy? · Nerdiest Book Roundup |
| 2023 | Crop Rotation | `systems` | Master Your Calendar · Plan Novel Process on Notion |
| 2023 | Art of Not Feeling Guilty | `mindset` | Banish Imposter Syndrome · An Enforced Break |
| 2023 | Wandering Off-Path | `craft-plot` | Sourcing Intrigue · The Art of Restraint |
| 2023 | Banish Imposter Syndrome | `mindset` | Art of Not Feeling Guilty · Keep, Keep, Keep Writing |
| 2023 | How To Build a Human | `craft-character` | Sweeten Up Unlikeable Characters · Reader's Invisible Eye |
| 2023 | Imaginary Life Coach | `mindset` | Authenticity / Turn On Your Flame · Instinct & Intuition |
| 2023 | Cut Through the Noise | `mindset` | *audience, not craft* → Authenticity · What Turns You On? |
| 2023 | Authenticity / Turn On Your Flame | `mindset` | Instinct & Intuition · Imaginary Life Coach |
| 2023 | Instinct, Intuition and Integrity | `mindset` | Authenticity · The Art of Restraint |
| 2023 | Keep, Keep, Keep Writing | `process` | First Draft Is So Terrible · Banish Imposter Syndrome |
| 2023 | Master Your Calendar | `systems` | Who Needs Goals? · Crop Rotation |
| 2023 | Sourcing Intrigue for Stories | `craft-plot` | How a Ghost Gave Me a Story Epiphany · Wandering Off-Path |
| 2023 | Style vs. Correctness | `process` | *editor's verdict, not a plot idea* → The Art of Restraint · Peek Behind the Curtain |
| 2023 | The Art of Restraint | `process` | *editing craft* → Style vs. Correctness · Wandering Off-Path |
| 2023 | The Furry Region | `process` | The Art of Restraint · Imaginary Life Coach |
| 2023 | Nerdiest Book Roundup 2023 | `reading` | Favourite Books 2024 · Book Awards 2024 |
| 2023 | The Seen Team is Back! | `news` | New Book is Coming Out · Fiancé Has Flatlined |
| 2023 | What Turns You On? | `craft-character` | *taste → writing* → Emotional Gutting · What's Your Fantasy? |
| 2023 | What's Your Fantasy? | `reading` | What Turns You On? · Breaking Up with Boring Books |
| 2023 | Your Cover's Job | `bookcraft` | Reader's Invisible Eye · Covers Facelift Part 1 |
| 2023 | Your Reader's Invisible Eye | `bookcraft` | Your Cover's Job · Emotional Gutting 101 |
| 2024 | Peek Behind the Writer's Curtain | `process` | Saying Goodbye · Style vs. Correctness |
### 25.4 What it would do to the graph

The point of the whole programme. Measured today: **8 edges, 43 isolated notes (79%)**. The proposal gives every post ~2 outgoing links, so:

| | Today | Proposed |
| --- | --- | --- |
| link edges | 8 | **~90** |
| isolated notes | 43 (79%) | **0** |
| tag pages | 0 | **8** |

That is the difference between a graph that looks broken and one that looks like a Desk. It also makes `backlinks` (bottom-right of every post) worth reading for the first time.

### 25.5 How it would be applied — and what I need from you

**One commit, vault-first, the same way as every other change.** For each of the 49 posts: add the tag to `tags:` in frontmatter, and insert 2 `[[wikilinks]]` in the body where they genuinely belong in the prose (not dumped at the bottom — a link that reads like furniture is worse than no link). Then rebuild, run the suite, and add a guard that asserts **no note is isolated** so the graph can't silently rot back.

**Before I touch anything, two things:**

1. **Is the vocabulary right?** Eight spheres, each post in exactly one. If `craft-plot` / `craft-character` should be one `craft`, or `bookcraft` should fold into `craft`, say so now — it is trivial to change now and annoying to change after 49 files.
2. **Are the contested calls right?** The four flagged in §25.3. Those are judgement, not fact.

Also worth deciding, though it does not block the tags: **`publish: true` exists on 49 notes and `type:` is set on all of them** — Quartz's `content-index` and tag pages read `tags:` from frontmatter automatically, so no code change is needed for tags to work. The folders are a *narrative* choice, not a technical dependency — the URL structure survives untouched even after the year folders stop being the way you navigate.
| 2024 | Crack the Code to Creative Genius | `systems` | *ChatGPT* → App-Building Sidequest · Plan Novel Process |
| 2024 | How a Ghost Gave Me a Story Epiphany | `craft-plot` | Sourcing Intrigue · What Turns You On? |
| 2024 | Successfully Fail at Deadlines | `mindset` | Banish Imposter Syndrome · Who Needs Goals? |
| 2024 | How to Write a Screenplay | `craft-plot` | *format/structure* → Overplotting an Outline · Ghost Epiphany |
| 2024 | I bought a typewriter! | `systems` | *the tool as delight* → My Legs Hurt · The Furry Region |
| 2024 | Favourite Books of 2024 | `reading` | Nerdiest Book Roundup · Book Awards 2024 |
| 2024 | First Draft Is So Terrible | `process` | Starting a First Draft · Dangers of Overplotting |
| 2024 | My Legs Hurt | `mindset` | I bought a typewriter! · An Enforced Break |
| 2024 | Saying Goodbye | `process` | Peek Behind the Curtain · Third Draft is Finished |
| 2024 | Starting a First Draft | `process` | First Draft Is So Terrible · Plan Novel Process |
| 2024 | Stormhouse Book Awards 2024 | `reading` | *awards, but a reading list* → Nerdiest Book Roundup · Favourite Books 2024 |
| 2024 | Who Needs Goals? Not Us. | `systems` | Master Your Calendar · Successfully Fail at Deadlines |
| 2024 | Overplotting a Novel's Outline | `craft-plot` | Dangers of Overplotting · How to Write a Screenplay |
| 2025 | Plan Novel Process on Notion | `systems` | Starting a First Draft · Crop Rotation |
| 2025 | App-Building Sidequest | `systems` | Crack the Code to Creative Genius · Master Your Calendar |
| 2025 | Dangers of Overplotting | `craft-plot` | Overplotting an Outline · First Draft Is So Terrible |
| 2025 | Covers Facelift Part 1 | `bookcraft` | Your Cover's Job · Covers Facelift Part 2 |
| 2025 | Covers Facelift Part 2 | `bookcraft` | Covers Facelift Part 1 · Your Cover's Job |
| 2025 | Third Draft is Finished! | `process` | Saying Goodbye · 5 Lessons: First Sequel |
| 2025 | Using Actors to Improve Writing | `craft-character` | *acting informs character* → Sweeten Up Unlikeable · How To Build a Human |
| 2026 | A Fiancé Has Flatlined is out now! | `news` | New Book is Coming Out · Third Draft is Finished |
| 2026 | My new book is coming out! | `news` | A Fiancé Has Flatlined · The Seen Team is Back! |

**The contested calls** (flagged so they can be argued with, not buried): *Cut Through the Noise* (`mindset` — it's about audience, not craft); *Style vs. Correctness* and *The Art of Restraint* (`process`, not `craft-plot` — they're editing craft, and `process` is the drafting/revision home); *What Turns You On?* (`craft-character` over `reading` — taste *in service of* writing); *Book Awards* (`reading`, not `news` — it's a list, not an announcement).
- **They do NOT replace dates.** Publication year stays in frontmatter and on the post; the year folders can be retired from *navigation* without touching the *record*.
---

## 26. ✅ S10 — the post polish pass (2026-10-01)

Six changes in one sitting, because they were all facets of "make the posts read well." The through-line is that **most of what looked like several bugs was one variable.**

### 26.1 The orange-yellow and the flickering button were the same bug

The complaint was two things: an "ugly orange-yellow highlight" on tags, and a "jarring button [that] flickers on hover." They are **one unpinned variable.** Quartz's `base.scss` reads `var(--tertiary)` in exactly three places:

| rule | what the reader saw |
| --- | --- |
| `::selection` | a 60% yellow-amber wash over selected text |
| `.highlight` (search hit) | the same amber behind a matched term |
| `a:hover { color: var(--tertiary) }` behind `transition: color 0.2s` | links and buttons **fading to amber** — the "flicker" |

The Obsidian base declares `--tertiary` as a yellow-amber, and the brand overlay (D11) pinned the whole accent chain but **not this one**. So the fix was not three patches: `--tertiary: var(--color-accent)` in `emerson.ts`, alongside the accent it already owns. Selection and hover now read as brand. The `::selection` and `.highlight` washes were then softened to a 22%/16% accent tint so a highlight is a tint, not a slab.

**Lesson.** *A theme owns a palette, not just its headline colour.* The accent was pinned in five places and this one was missed; the symptom appeared in three unrelated places, which is exactly what an unpinned variable looks like from the outside.

### 26.2 The graph: the whole Desk, and room to breathe

- `localGraph.depth: 2 → 100` — the local graph now renders the **whole map** on every post instead of the current post's 2-hop neighbourhood. With the current node in the accent, it stops being a widget and becomes "where am I in the body of work."
- `.graph-outer` height `230px → clamp(360px, 52vh, 560px)`.
- Removed the **dead `.after-body-graph` block** (F5) — never emitted, and it carried a second `.graph-outer` height that was quietly shadowing the real one. *The tallest-looking graph rule was the one nothing rendered.*

### 26.3 Breadcrumbs removed

`✦ / Newsletter Archive / 2025 / <title>` — a folder-shaped way round a site that now navigates by tag. It also sat *above* the title and repeated the current page (`showCurrentPage: true`). With the year folders no longer being how you move, it had nothing left to say. Plugin disabled, a guard asserts no built page renders one, and the obsolete "breadcrumbs on the display face" font check was dropped rather than left failing.

### 26.4 The post header — a local plugin, and what it cost to learn

`Published <date> • Updated <date>`, plus a **"Recently updated"** pill. Three decisions, two of them from §22.3:

- **Client-computed pill.** A build-time flag is frozen until the next publish, so on 2026-12-29 it would still claim the whole archive was fresh. The pill ships `hidden` and ~4 lines of JS reveal it only when `modified` is genuinely inside 90 days. **It is not a tag** — that would mix system state into the editorial taxonomy.
- **CSS must not defeat the gate.** The pill's `display: inline-block` out-ranks the UA's `[hidden] { display: none }`, so without an explicit `&[hidden] { display: none }` the pill would light up on every post forever — the precise failure §22.3 exists to prevent. There is a guard for it.
- **Collapses when `created == modified`**, so a brand-new post doesn't print the same date twice.

**The cost was the wiring.** This fork does not accept a bare local component: layout components load through a manifest/package loader. A working one needs a directory, a `package.json` with a `quartz.components` manifest *and* a `./components` subpath export, a **pre-compiled `.js`** entry (the loader does a computed `import()` at runtime, so the bundler can't follow a `.ts`), and the component exported as a **constructor**. Four wrong turns, all recorded in **F6** with the fix for each, so the next local component is a copy-paste rather than an afternoon. Worth it: the Desk can now own components the upstream plugin set doesn't provide.

### 26.5 Bridging tags

18 posts that genuinely sit on a sphere boundary got a second tag (e.g. *Saying Goodbye* = `process` + `news`; *Emotional Gutting 101* = `craft-character` + `reading`). The guard now bounds posts at **1–3 tags** and *asserts bridges exist* — a taxonomy where nothing crosses a boundary is a folder list with extra steps.

**Suite 77 → 87.** Every new check proven red, including the subtle one (delete the `[hidden]` gate → that check fails).
- **`breadcrumbs` revisit point** (§22.2 step 3) lands here: once a post's trail can be `tag → post` rather than `folder → year → post`, the breadcrumb's job is done (D17).
- **Measure before claiming.** Every row above carries a count and a command that reproduces it.
- **Never delete a rule on a hunch.** F5 nearly cost a day of genuine editorial dates. If a finding says "this is unused", it must show the *zero*.
- **Log the dismissed ones too.** F6–F8 cost five minutes and save the next session from re-running them.
