# AGENTS.md

**Emerson Black Writes** — `emersonblackwrites.com` (storefront) + `/desk/` (Emerson's Desk).

You are working on a **two-part static site**: a hand-written storefront at the root and
a [Quartz](https://quartz.jzha.xyz) blog at `/desk/`, both built by GitHub Actions from
this repo into `_site/`. Read this file before changing anything.

---

## The five things that matter most

1. **The build is green ≠ the feature works.** This project's most expensive bugs
   produced clean builds and clean suites while the site was quietly wrong. The §11.6
   book cards shipped **zero cards, twice**. Before you believe anything works, **grep
   the built output** in `_site/` — not the source.
2. **Verify the rendered thing.** Reading the input file is not verification. Guards
   assert against the built stylesheet/HTML; rendered-geometry ones need `public/`
   served on **:8099** or they are silently skipped while still counting.
3. **Make every guard demonstrably falsifiable.** Prove a new check fails by breaking
   the thing it guards, and report that you did. A guard that cannot fail is worse than
   no guard.
4. **Stock Quartz renders; the brand lives in tokens and `eb-*` classes.** Never
   override upstream selectors or plugin markup. Use `--eb-*` tokens and own classes.
   If something genuinely can't be done natively, **say so and ask** before overriding.
5. **Verify before building.** An item on a plan is a *claim about the site*, not a
   description of it. §11.7 was proposed twice because a checklist line was read without
   opening the page it described.

## Docs — read the right one

| File | What it is | Read it when |
|---|---|---|
| **`AGENTS.md`** (this file) | Entry point, rules, common tasks | Always, first |
| `docs/ARCHITECTURE.md` | How it's built: paths, frontmatter, design system, **all commands** | Before touching config, content or CSS |
| `docs/LESSONS.md` | The traps, each bought with a failed deploy | **Before writing any guard or touching the theme** |
| `docs/SHIPPED.md` | What's done and *why* | Before proposing work |
| `docs/TODO.md` | **Only genuinely open work** | To pick up a task |
| `README.md` | The author, the series, the audience | Writing copy or judging tone |

> If you finish an item in the plan, **move it to `SHIPPED.md` in the same commit.** A
> backlog that records finished work is a backlog nobody can trust — that is why the
> plan doc was split on 2026-10-04.

## Layout

```
index.html · bio.html · style.css · img/ · CNAME   ← storefront, served at /
.github/workflows/deploy.yml                        ← builds + deploys _site/
brain/                                              ← Quartz source, served at /desk/
  quartz.config.yaml · quartz/ · content/ · scripts/
docs/ · AGENTS.md
```

## Common tasks

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"   # Node 22, keg-only

# Build the Desk
cd brain && npx quartz build

# Assemble the full site exactly as deploy.yml does, then verify it
cd .. && rm -rf _site && mkdir -p _site/desk
cp index.html bio.html CNAME style.css README.md _site/ && cp -R img _site/
node brain/scripts/export-post-dates.mjs brain brain/public >/dev/null
node brain/scripts/render-desk-picks.mjs brain brain/public _site/index.html >/dev/null
cp -R brain/public/. _site/desk/ && rm -f _site/desk/CNAME
```

Then run **all seven**, from the repo root:

```bash
node brain/quartz/verify-default-mode.mjs   # needs public/ served on :8099
node brain/quartz/theme/verify-brand.mjs
node brain/scripts/verify-storefront.mjs _site      # rendered, needs Chrome
node brain/scripts/check-desk-section.mjs _site
node brain/scripts/check-desk-density.mjs _site
node brain/scripts/check-book-links.mjs .
node brain/scripts/check-book-mentions.mjs _site
```

For browser-measured guards:
```bash
cd brain/public && python3 -m http.server 8099 &
```

## Things that will bite you

- **Publishing is vault → repo.** The Obsidian vault is iCloud-synced and unversioned;
  this repo is the only git repo. `Publish Brain.command` rsyncs one way. Never
  `git init` inside the vault.
- **Posts need `publish: true` and a `date:`.** Frontmatter details in ARCHITECTURE §3.
- **Images referenced from `content/` are mirrored and path-rewritten.** Keep private
  binaries out of `content/` — filters hide markdown only.
- **`img/` deploys at the site ROOT, but posts are served from `/desk/`.** So a cover
  URL on a post must be **absolute** (`/img/…`). A relative path works on the homepage
  and 404s on every post. Asserted by `check-book-mentions.mjs`.
- **Book data lives in exactly one place:** `brain/scripts/books.mjs` (title, ASIN,
  short link, cover, blurb, match patterns). Never hardcode a book anywhere else.
- **Covers:** the cards use `img/covers/thumbs/` (150×240, ~6 KB), **not** the
  1600×2560 originals (~190 KB). If a cover changes, run
  `node brain/scripts/make-cover-thumbs.mjs` and **commit the result**.
- **A local Quartz plugin must export a zero-arg constructor that returns the
  component.** `ComponentRegistry` calls any registered function with `undefined`; a
  directly-exported component is invoked with no props, returns `null`, and is cached —
  so it renders nowhere and the build still succeeds. See `brain/quartz/plugins/*`.
- **`tree` is a hast node, so `String(tree)` is `"[object Object]"`** — to read rendered
  text, walk `children`/`value` (see `treeText` in `eb-book-mentions`).
- **Commit and push.** `deploy.yml` runs on push to `main`. An unpushed fix is an
  unfixed fix.

## Voice

The author is a professional writer. On craft posts, **prose quality is the product** —
a technically-correct change that reads like machine output is a regression.

- No hype, no "unlock/dive/game-changer", no emoji in visible copy.
- Never write marketing claims the site can't substantiate. The §11.6 card says
  *"Mentioned in this post"* rather than *"This book came from this post"* for a reason:
  the first is a claim about the text, the second is a claim about causation, and only
  the first is true. A guard enforces the wording.
- Ask before adding copy that needs maintaining per-item, forever.

## Working with the author

The author is the decision-maker; **you propose, they choose.** Two habits that matter:

- **Ask the Quartz-native question first.** Before any styling or structural override,
  offer the override-free option: tokens + own `eb-*` classes, additive slot components,
  config options, or accepting the default.
- **Some things are taste, not defects** — backlinks placement, whether tag chips
  belong in the hero. Flag them as HayJay's call; don't fix them unilaterally.