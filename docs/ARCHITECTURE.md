# Architecture — how the site is built

**Moved here from `EMERSON-BLACK-BRAIN-PLAN.md` §1–7 and §13 on 2026-10-04, verbatim.**
Split out because architecture changes rarely and open items change weekly — bundling
them meant all three documents churned together, which is how §12 came to be 55% of a
614-line file and quietly stopped meaning what its own header claimed.

This is the **how**: what the pieces are, where they live, what the rules are, and the
commands to run. For the **what is left to do**, see `EMERSON-BLACK-BRAIN-PLAN.md`. For
**what went wrong and why the checks are written the way they are**, see `LESSONS.md`.

Sections 1–7 are the original §1–7. Section 8 is the original §13 (Commands).

---

## 1. Architecture

```
  Obsidian vault (source of truth, iCloud-synced, unversioned)
        │  one-way rsync mirror (Publish Brain.command)
        ▼
  ~/Movies/PROJECTS/Websites/EBW website/     ← the only git repo
    ├─ index.html · bio.html · style.css · img/ · CNAME   ← storefront at /
    ├─ .github/workflows/deploy.yml                        ← builds Quartz, copies both, deploys _site/
    └─ brain/                                              ← Quartz source → served at /desk/
```

**Rules**
1. The vault is iCloud-synced and unversioned — never `git init` or `node_modules` inside it.
2. The repo lives outside iCloud and holds all code.
3. One repo, one domain, subpath routing. The deploy copies storefront files + `brain/public/` into `_site/`.
4. **Drafts** live in `Newsletters/_drafts/`; rsync `--exclude='_*'` plus `explicit-publish: true` keeps them out.
5. GitHub Pages Source must be **"GitHub Actions"** — otherwise GitHub's own Jekyll build
   overwrites the artifact and the Desk silently reverts (Incident I1).

## 2. Locations

| Thing | Path |
|---|---|
| Vault (edit here) | `~/Documents/Obsidian/…/Stormhouse/Emerson Black/` |
| Repo (code) | `~/Movies/PROJECTS/Websites/EBW website/` |
| Images (shared) | `~/Documents/Obsidian/Nexus/organise/Images/newsletters/<year>/` |
| Quartz config | `brain/quartz.config.yaml` |
| Brand CSS | `brain/quartz/styles/custom.scss` (~1,840 lines; 12 measured `[OVERRIDE]` blocks + the `[SAFE]` brand layer) |
| Theme / accent | `brain/quartz/theme/emerson.ts` |
| Verification | `brain/quartz/verify-default-mode.mjs`, `brain/quartz/theme/verify-brand.mjs`, `brain/scripts/verify-storefront.mjs`, `brain/scripts/check-desk-section.mjs`, `brain/scripts/check-desk-density.mjs`, `brain/scripts/check-book-links.mjs`, `brain/scripts/check-book-mentions.mjs` |
| Book data (canonical) | `brain/scripts/books.mjs` — number, title, ASIN, short link, cover, blurb, match patterns |
| Cover thumbnails | `brain/scripts/make-cover-thumbs.mjs` → `img/covers/thumbs/`. **Run when a cover changes, then commit.** Cards link these, not the 190 KB originals |
| Override audit | `brain/scripts/audit-overrides.mjs` + `brain/scripts/probe.mjs` — "is this override still needed?" |
| Plan (canonical, git-tracked) | `docs/EMERSON-BLACK-BRAIN-PLAN.md` — **open work only** |
| Entry point for agents | `AGENTS.md` — rules, layout, build & verify commands |
| Split docs | `docs/ARCHITECTURE.md` (this file's old §1–7 + §13) · `docs/LESSONS.md` (§8–9, verbatim) · `docs/SHIPPED.md` (§10–11 + the §12 narratives) |

## 3. Frontmatter spec

```yaml
---
title: Third Draft is Finished!
description: A writing update      # subtitle
date: 2025-10-21                   # publication date
updated: 2026-09-28
tags: [process, news]
aliases: []
type: post
publish: true                      # only publish: true is built
source: substack:176627320
---
```

- **`publish: true`** required (ExplicitPublish).
- **`date:`** required; the publish script writes `created:`/`modified:` from it. Never hand-edit those in `content/` — the mirror rewrites them.
- **`aliases:`** generates redirects if a slug ever changes; bookmarks survive.
- **`cover:` omitted** — Quartz uses it only for OG cards, and auto-filled covers mis-sell posts.
- ⚠️ Filters hide *markdown* only. Non-markdown assets in `content/` are copied publicly — keep private binaries out.

## 4. Images

Vault notes reference `![](../../../../../organise/Images/newsletters/<year>/<file>.webp)`.
The publish script rsyncs them into `brain/content/organise/images/newsletters/`
(lowercase `images` for Quartz slug casing), rewrites paths to root-relative
`/organise/images/…`, and **halts if any referenced file is missing**.

## 5. Daily workflow

1. Write/edit in Obsidian; add `[[wikilinks]]`, tags, `publish: true`.
2. Double-click **`Publish Brain.command`** — mirrors notes + images, rewrites image
   paths, runs the missing-image guard, syncs `created:`/`modified:`, commits and pushes.
3. Actions builds and deploys in ~1 minute.

## 6. Design system (locked)

- **Brand:** Gabarito (chrome) / Lora (body) / IBM Plex Mono (dates, code). Same three on
  both halves. Two Google Fonts links are unavoidable — Quartz core and the fonts plugin
  each emit one — but both are brand-identical.
- **Accent:** crimson `#CA2626` light / `#E63A3A` dark, owned by the `emerson` theme's
  `brandOverlay()` and asserted by `verify-brand.mjs`.
- **Default mode:** dark for first-time visitors; a returning reader's own choice always wins.
- **Measure:** ~74 characters, deliberately held rather than widened.
- **Layout:** `#quartz-body` grid is `320px auto` — the left sidebar keeps Quartz's own
  `$sidePanelWidth`; the empty right sidebar is collapsed rather than reclaimed.
- **Cascade rule:** theme overlays live in `@layer obsidian-theme`, which sits **after**
  `quartz-base` — so `quartz-base` wins at equal specificity. **Anything that must beat
  upstream belongs unlayered in `custom.scss`.** `custom.scss` is also appended last, so
  the *last* matching occurrence is the effective one.

## 7. Verification

```bash
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npx quartz build
node quartz/verify-default-mode.mjs     # browser checks need a static server on :8099
node quartz/theme/verify-brand.mjs
node brain/scripts/verify-storefront.mjs  # from repo root; rendered, needs Chrome
```

| Suite | Count |
|---|---|
| Desk — `verify-default-mode.mjs` | **159 checks, 0 failures** |
| Brand — `verify-brand.mjs` | passing |
| Storefront — `verify-storefront.mjs` | **34 checks, passing** |

The Desk scripts assert against the **built stylesheet / built HTML**; the storefront
script against the **rendered page**. Never the source — reading the input file is not
verification — see `LESSONS.md`).

---

## 8. Commands

```bash
bash
# Node 22 (keg-only)
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Build + verify
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain
npx quartz build
node quartz/verify-default-mode.mjs        # serve public/ on :8099 first for browser checks
node quartz/theme/verify-brand.mjs

# Storefront geometry (rendered; needs Chrome) — run from the repo root
node brain/scripts/verify-storefront.mjs _site

# The homepage Desk section: content + rendered density (12.7c)
node brain/scripts/check-desk-section.mjs _site
node brain/scripts/check-desk-density.mjs _site

# Books (§12.9 canonical data)
node brain/scripts/check-book-links.mjs .          # homepage + posts agree with books.mjs
node brain/scripts/check-book-mentions.mjs _site   # the §11.6 cards: covers, order, numbers

# Docs hygiene: the open plan must hold only open work. (§11.7 was proposed twice
# as already-done work because finished items sat in the backlog.)
node brain/scripts/check-docs.mjs

# ⚠️ RUN THIS WHEN A COVER CHANGES, AND COMMIT THE RESULT.
# Generates img/covers/thumbs/*.webp (150x240, ~6 KB) from the 1600x2560 artwork
# in img/covers/. The §11.6 mention cards link these, not the originals: serving
# 190 KB artwork to paint a 60px cover would add ~5.7 MB across 15 posts.
#
# The thumbs are COMMITTED, not built in CI — deployed bytes would otherwise
# depend on the runner's libvips. Needs `sharp`, which lives in brain/node_modules
# (Quartz's own image dep), so there is nothing to install. macOS `sips` CANNOT do
# this: it reads WebP but not write it (Error 13).
node brain/scripts/make-cover-thumbs.mjs

# Has upstream Quartz moved? (ARCH-8 note — needs network, READ-ONLY, safe to run anytime)
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain && node quartz/check-quartz-upstream.mjs
#   exit 0 = up to date · 1 = upstream is ahead · 2 = could not reach GitHub
#   Deliberately NOT part of verify-default-mode: that suite must never need a network.

# Re-run the override audit — "is this override still needed?" (§12.6)
# Needs the server up. ~10 min: 12 rebuilds x 4 pages x 2 widths.
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain/public && python3 -m http.server 8099 &
cd ~/Movies/PROJECTS/Websites/EBW\ website/brain && node scripts/audit-overrides.mjs
#   Restores custom.scss automatically, even if killed — see the header comment.

# Publish vault → site (or double-click "Publish Brain.command")
# Local preview: double-click "Preview Brain.command"

# Deploy status without the gh CLI
curl -s "https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1" | grep conclusion
```
