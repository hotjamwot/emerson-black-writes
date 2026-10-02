#!/usr/bin/env node
/**
 * Default colour mode check — proves a first-time visitor gets the intended
 * mode *and* that the light/dark toggle survives.
 *
 *   cd brain && node quartz/verify-default-mode.mjs
 *
 * Why it exists: `@quartz-community/darkmode` initialises from
 * `localStorage.getItem("theme") ?? matchMedia(...)`, so out of the box the Brain
 * inherits the reader's OS. `quartz/default-color-mode.ts` seeds the key for
 * visitors with no stored preference, fixing the default without touching
 * Darkmode. The subtlety: we do **not** control execution order —
 * `getComponentResources()` adds emitter-supplied components before registry
 * ones, so Darkmode's IIFE lands ahead of ours in `prescript.js`. The seed is
 * written to be order-independent, and this proves it by running both real
 * scripts in *both* orders against a fake DOM.
 *
 * Also catches the two silent regressions: the toggle being hidden
 * (`@quartz-themes/core` `mode:` left at light/dark instead of `both`, which
 * injects `button.darkmode { display: none !important }` and re-writes the
 * reader's choice every load), and the seed IIFE never reaching `prescript.js`.
 *
 * Exit 0 = default correct in any order, toggle intact. Exit 1 = regression.
 */
import { execFile } from "node:child_process"
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createConnection } from "node:net"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import zlib from "node:zlib"

const brain = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** The mode a first-time visitor must get. Mirrors default-color-mode.ts. */
const EXPECTED_DEFAULT = "dark"

const problems = []
const check = (ok, message) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${message}`)
  if (!ok) problems.push(message)
}

// ── 1. the toggle must not be hidden ──────────────────────────────────────────
console.log("Toggle visibility")
const staticDir = join(brain, "public", "static")
let css = ""
try {
  for (const f of readdirSync(staticDir)) {
    if (f.endsWith(".css")) css += readFileSync(join(staticDir, f), "utf8")
  }
} catch {
  console.error("  ! public/static not found — run `npx quartz build` first.")
  process.exit(1)
}
check(
  !/button\.darkmode\s*\{\s*display:\s*none/.test(css),
  "no `button.darkmode { display: none }` rule (mode: both keeps the toggle)",
)

// The theme paints the sun/moon with `background` + `mask-image` and hides the
// real <svg>. Any `background`/`border` we add to .darkmode/.readermode therefore
// paints over (and is clipped by the mask around) the icon itself, which is how
// the toggle became invisible once already. custom.scss is unlayered, so it wins
// over the theme regardless of specificity — this guards the override.
const mainCss = readdirSync(join(brain, "public")).find((f) => /^index.*\.css$/.test(f))
const unlayered = mainCss ? readFileSync(join(brain, "public", mainCss), "utf8") : ""
let offenders = []
if (unlayered) {
  for (const m of unlayered.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\.darkmode|\.readermode/.test(m[1])) continue
    for (const decl of m[2].split(";")) {
      if (/^(background|border)(-[\w-]+)?\s*:/.test(decl.trim())) {
        offenders.push(`${m[1].trim().slice(0, 40)} => ${decl.trim().slice(0, 50)}`)
      }
    }
  }
}
check(
  Boolean(unlayered) && offenders.length === 0,
  `no background/border overriding the masked icon${
    offenders.length ? ` — found: ${offenders.join(" | ")}` : ""
  }`,
)
check(
  /--icon-color:\s*var\(--darkgray\)/.test(unlayered),
  "icon colour is set via --icon-color (survives the mask)",
)

// ── 2. the font pipeline must stay on-brand and non-duplicated ───────────────
console.log("\nFont pipeline (S6)")
const page = readFileSync(join(brain, "public", "index.html"), "utf8")
const sheets = [...page.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/g)].map(
  (m) => decodeURIComponent(m[1].replace(/&amp;/g, "&")),
)

// Off-brand families: the plugin's hardcoded QUARTZ_DEFAULT_* set (Schibsted
// Grotesk / Source Sans Pro) and the pre-S6 faces (Jost / Source Serif 4).
// Any of these means a second emitter is still writing a stylesheet.
const OFF_BRAND = ["Schibsted Grotesk", "Source Sans Pro", "Jost", "Source Serif 4"]
const offBrandInSheets = OFF_BRAND.filter((f) => sheets.some((s) => s.includes(f)))
check(
  offBrandInSheets.length === 0,
  `no off-brand families in font links${offBrandInSheets.length ? ` — found: ${offBrandInSheets.join(", ")}` : ""}`,
)

// Two Google Fonts links are expected (Quartz core `theme.typography` and the
// quartz-fonts plugin each emit one and neither can be switched off), but both
// must request the same brand faces. A third would mean a new emitter appeared.
check(sheets.length <= 2, `at most 2 font stylesheets (got ${sheets.length})`)
const FAMILIES = ["Gabarito", "Lora", "IBM Plex Mono"]
const wrongFaces = sheets.filter((s) => !FAMILIES.every((f) => s.includes(f)))
check(
  wrongFaces.length === 0,
  `every font link requests Gabarito + Lora + IBM Plex Mono${wrongFaces.length ? `\n      off: ${wrongFaces.join("\n      off: ")}` : ""}`,
)

// `useThemeFonts: false` is what stops the plugin falling back to the theme's
// registry. Assert it in config too, so the intent survives a re-read.
const config = readFileSync(join(brain, "quartz.config.yaml"), "utf8")
check(/useThemeFonts:\s*false/.test(config), "quartz-fonts has `useThemeFonts: false`")
check(
  /header:\s*Gabarito[\s\S]*body:\s*Lora/.test(config),
  "core `theme.typography` is Gabarito + Lora",
)

// ── 3. the favicon must be the crimson monogram ──────────────────────────────
console.log("\nFavicon (S7)")
// Decompose the icon's own IHDR to confirm real dimensions without an image lib.
function pngSize(file) {
  const b = readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colourType: b[25] }
}
const iconPath = join(brain, "quartz", "static", "icon.png")
const icon = pngSize(iconPath)
check(icon.w === icon.h, `icon.png is square (${icon.w}x${icon.h})`)
check(
  icon.w >= 180,
  `icon.png is at least 180px (got ${icon.w}) — 16px tabs need a large source to downscale from`,
)
check(
  icon.colourType === 6,
  `icon.png keeps its alpha channel (colour type ${icon.colourType}, want 6/RGBA)`,
)

// The old default icon was a palette PNG (colour type 3) and 200px; a regression
// back to either is the most likely way this silently undoes.
const storefrontIcon = join(brain, "..", "img", "favicon.png")
const sIcon = pngSize(storefrontIcon)
check(
  sIcon.w === icon.w && sIcon.h === icon.h,
  `storefront favicon matches the Brain icon (${sIcon.w} vs ${icon.w})`,
)
check(
  readFileSync(iconPath).length < 20000,
  "icon.png is optimised (small file, not the 36 KB master)",
)

// ── 4. the brand faces must actually RENDER (computed style, not source text) ─
// Regression guard for the "serif on lists but sans in paragraphs" bug (S6/§14).
//
// This section is a *computed-style* check on purpose. The previous version
// asserted on the text of the built CSS and stayed green through the entire
// period when paragraphs rendered sans: pinning `--font-interface` inside
// `@layer obsidian-theme` is genuinely correct and genuinely insufficient,
// because `@quartz-community/quartz-fonts` emits its own top-level
// `@layer quartz-fonts` in a *later* stylesheet. A later-declared layer is
// appended last, so it wins on order regardless of specificity — no static
// grep over one file can see a competing sibling layer. Only a real cascade
// evaluation can.
// ── 5. the two halves must not drift apart (S9) ──────────────────────────────
// The storefront and the Brain are separate files with separate palettes, and
// nothing but a human noticing a colour mismatch keeps them aligned. S9 realigned
// `--accent-red` on the storefront (it was still #E31C3D, a pinker red predating
// the Brain's palette), so assert the agreement here.
console.log("\nStorefront ↔ Brain brand agreement")
const storefrontCss = readFileSync(join(brain, "..", "style.css"), "utf8")
const emersonTheme = readFileSync(join(brain, "quartz", "theme", "emerson.ts"), "utf8")

// Parse the Brain's ACCENT map rather than hardcoding, so this keeps working if
// the brand colour is ever changed in emerson.ts (the single source of truth).
const themeAccent = Object.fromEntries(
  [...emersonTheme.matchAll(/(light|dark):\s*"(#[0-9A-Fa-f]{6})"/g)].map((m) => [
    m[1],
    m[2].toUpperCase(),
  ]),
)
const storeAccent = /--accent-red:\s*(#[0-9A-Fa-f]{6})/.exec(storefrontCss)?.[1].toUpperCase()
const storeBright = /--accent-red-bright:\s*(#[0-9A-Fa-f]{6})/
  .exec(storefrontCss)?.[1]
  .toUpperCase()

check(!!themeAccent.dark && !!storeAccent, "both halves declare an accent")
check(
  storeAccent === themeAccent.dark,
  `storefront accent matches the Brain's dark accent (${storeAccent} vs ${themeAccent.dark})`,
)
// The storefront is dark-only — no prefers-color-scheme, no colour-scheme switch,
// no data-theme — so it must carry the DARK accent, not the light one. This is
// the assertion that stops someone "fixing" it to #CA2626 by eye.
check(
  storeAccent !== themeAccent.light,
  "storefront uses the dark accent (it has no light mode to sit against)",
)
check(
  !!storeBright && storeBright !== storeAccent,
  `storefront hover tint is distinct from the base accent (${storeBright})`,
)
check(
  !/#E31C3D|#FF3B4A/i.test(storefrontCss.replace(/Was #E31C3D[^\n]*/, "")),
  "the pre-S9 pinker accent is fully retired",
)

// ── 5b. the rename must be complete on both halves (S10) ─────────────────────
// The site is "Emerson's Desk" (§18) and it is served at /desk/. Nothing
// structurally connects the places that name and that path are written —
// `quartz.config.yaml`, `content/index.md`, the storefront footer and the deploy
// workflow — and "The Brain" surviving a whole design pass is what that costs.
console.log("\nRename — Emerson's Desk at /desk/ (S10)")
const storefrontIndex = readFileSync(join(brain, "..", "index.html"), "utf8")
const storefrontBio = readFileSync(join(brain, "..", "bio.html"), "utf8")
const workflow = readFileSync(join(brain, "..", ".github", "workflows", "deploy.yml"), "utf8")
const homeSource = readFileSync(join(brain, "content", "index.md"), "utf8")
const unquote = (s) => (s ?? "").trim().replace(/^["']|["']$/g, "")
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// (a) The name is stated twice — `cfg.pageTitle` (what the header wordmark link
// and the <title> fallback use) and the homepage's own frontmatter title. They
// must agree, or the site is called two different things depending on where you
// look. This is the guard §19 asked for.
const cfgTitle = unquote(/^\s*pageTitle:\s*(.+)$/m.exec(config)?.[1])
const homeTitle = unquote(/^title:\s*(.+)$/m.exec(homeSource)?.[1])
check(
  cfgTitle === homeTitle && /Desk/.test(cfgTitle),
  `pageTitle and content/index.md title agree ("${cfgTitle}" / "${homeTitle}")`,
)

// (b) No authored page may still say "The Brain". CASE-SENSITIVE on purpose:
// two live dispatches use the ordinary English words *brainspace* and *change
// the brain* (§18), so a blind find-and-replace would corrupt published prose.
const authored = readdirSync(join(brain, "content"), { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".md"))
const stillBrain = authored.filter((f) =>
  /The Brain/.test(readFileSync(join(brain, "content", f), "utf8")),
)
check(
  stillBrain.length === 0,
  `no authored page still says "The Brain"${stillBrain.length ? ` — ${stillBrain.join(", ")}` : ""}`,
)

// (c) And no *built* page either. A stale name can only reach the output through
// the config, so this is what catches a pageTitle (or an og-image option) left
// behind after the content pass looked complete.
const builtHtml = readdirSync(join(brain, "public"), { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".html"))
const builtBrain = builtHtml.filter((f) =>
  /The Brain/.test(readFileSync(join(brain, "public", f), "utf8")),
)
check(
  builtBrain.length === 0,
  `no built page says "The Brain"${builtBrain.length ? ` — ${builtBrain.slice(0, 3).join(", ")}` : ""}`,
)

// Head.tsx builds <title> from the *page's* frontmatter title (not cfg.pageTitle),
// and concatenates the suffix straight onto it, so the separator is asserted
// rather than assumed: without it the tab read "The BrainEmerson Black Writes"
// for the whole of Arc 1.
const homeDoc = readFileSync(join(brain, "public", "index.html"), "utf8")
const homeTabTitle = /<title>([^<]*)<\/title>/.exec(homeDoc)?.[1] ?? ""
check(
  new RegExp(`${escapeRe(homeTitle)}\\s*·\\s*Emerson Black Writes`).test(homeTabTitle),
  `homepage <title> keeps the name and its separator ("${homeTabTitle}")`,
)

// (d) The slug. `baseUrl` is what every absolute URL is built from (OG cards,
// canonical link, sitemap), so this is the assertion that the move is real.
check(
  /baseUrl:\s*emersonblackwrites\.com\/desk\s*$/m.test(config),
  "baseUrl is emersonblackwrites.com/desk",
)
check(
  !/emersonblackwrites\.com\/brain\b/.test(config),
  "no /brain/ URL left in quartz.config.yaml (that is the header nav)",
)

// (e) The storefront's own two pages must point at the new path.
// bio.html is exempt, and deliberately: S11 11.3c turned it into a redirect stub
// to /#about, where the about copy now lives. It has no nav and no Desk link by
// design, so demanding `href="desk/"` of it asserted an intent that was retired.
// It is checked for its actual contract instead, below.
check(/href="desk\/"/.test(storefrontIndex), "storefront index.html links the Desk at desk/")
check(
  !/href="brain\//.test(storefrontIndex) && !/href="brain\//.test(storefrontBio),
  "storefront links no longer point at brain/",
)
check(
  /http-equiv="refresh"[^>]*url=\/#about/.test(storefrontBio) &&
    /href="\/#about"/.test(storefrontBio),
  "storefront bio.html redirects to /#about (and offers a manual link)",
)
check(
  /id="about"/.test(storefrontIndex),
  "the #about target the bio redirect points at actually exists",
)

// (f) The workflow moves the artifact, and leaves a redirect behind. Note the
// stub at `_site/brain/index.html` is *intended*, so the guard checks the app
// paths and the stub's target rather than banning the string "/brain/".
check(
  /cp -R brain\/public\/\. _site\/desk\//.test(workflow),
  "deploy.yml stages the build at _site/desk/",
)
check(
  /_site\/desk\/index\.html/.test(workflow) &&
    !/_site\/brain\/(newsletters|organise)/.test(workflow),
  "deploy.yml guards check _site/desk/, not the retired paths",
)
check(
  /https:\/\/www\.emersonblackwrites\.com\/desk\//.test(workflow),
  "deploy.yml smoke-tests the live /desk/",
)
check(/url=\/desk\//.test(workflow), "deploy.yml writes the legacy /brain/ stub pointing at /desk/")

// ── 5c. the Desk is a room off the house, not a second house (S10 step 2) ────
// The Desk had its own hero pitch, four "start here" doors, four year cards, four
// reading trails and an About page restating bio.html — a parallel brand homepage
// one click from the real one. HayJay's call: the storefront is the house, the
// Desk is the study room, the posts live inside it. Say what the Desk is *once*,
// forward into the archive, back out to the house.
//
// These assert the contract rather than the prose, so rewording cannot quietly
// reintroduce a second homepage, and so a hand-typed list of posts cannot creep
// back in beside the generated one (which is what rots).
console.log("\nLanding page — a room off the house (S10 step 2)")
const archiveDoc = readFileSync(join(brain, "public", "newsletters", "index.html"), "utf8")

// (a) The hand-written `_Back to …_` breadcrumbs are gone from both pages that
// had one. The `breadcrumbs` plugin owns that trail; the hand-written version was
// a string to re-edit on every rename — which is exactly what bit us in §20.
//
// Asserted on the SOURCE and on the *idiom* (`_Back to [[`), not on the words.
// The first version scanned the built HTML for "Back to" and failed immediately:
// the landing page has a perfectly legitimate "Back to the main site" button. A
// check has to name the thing it means (§17), not a phrase it half-remembers.
const handWrittenCrumbs = authored.filter((f) =>
  /_Back to \[\[/.test(readFileSync(join(brain, "content", f), "utf8")),
)
check(
  handWrittenCrumbs.length === 0,
  `no hand-written "_Back to …_" breadcrumb survives in content${handWrittenCrumbs.length ? ` — ${handWrittenCrumbs.join(", ")}` : ""}`,
)

// (b) No pitch. The hero band, the curated doors, the year cards and the reading
// trails are all gone: each was a hand-maintained duplicate of something the
// archive already knows (the explorer lists years, the graph lists connections).
check(
  !/class="eb-(hero|kicker|hero-title|hero-lede|trail|year|grid|card)"/.test(homeDoc),
  "the landing page has no hero pitch, curated doors, year cards or reading trails",
)

// (c) What it must still do: name the Desk, forward into the archive, and link
// back to the house. Dropping About removed the only other place the Desk
// explained itself, so this is the page that has to carry it.
check(
  /href="(?:\.\/)*newsletters\/"/.test(homeDoc) &&
    /href="https:\/\/emersonblackwrites\.com\/"/.test(homeDoc),
  "the landing page forwards into the archive and links back to the storefront",
)

// (d) The recent-posts list is generated, not typed. `recent-notes` is already
// `afterBody` with limit 5, so the page gets a list that cannot go stale — the
// property the hand-written doors and year cards did not have.
const recentItems = (homeDoc.match(/class="recent-li"/g) ?? []).length
check(
  /class="recent-notes"/.test(homeDoc) && recentItems === 5,
  `the landing page lists the newest 5 dispatches, generated (found ${recentItems})`,
)

// (e) About is deleted by decision, not by accident: no source file, and — the
// part that actually matters — no dangling `href="about"` anywhere in the output.
// A link to a page that no longer exists is invisible in a green build.
check(
  !existsSync(join(brain, "content", "About.md")),
  "brain/content/About.md stays deleted (the Desk has no about page of its own)",
)
const danglingAbout = builtHtml.filter((f) =>
  /href="(?:\.\/|\.\.\/)*about\/?"/.test(readFileSync(join(brain, "public", f), "utf8")),
)
check(
  danglingAbout.length === 0,
  `no built Desk page links to the deleted /about${danglingAbout.length ? ` — ${danglingAbout.slice(0, 3).join(", ")}` : ""}`,
)

// (f) The storefront owns the bio prose; the Desk must not restate it. Read from
// the source rather than hardcoded, so a future reword of the storefront is
// caught either way - the section 15 lesson, applied to copy instead of a hex.
// S11 11.3c moved this copy out of bio.html into index.html's #about, and with it
// out of a <div class="bio-text"> wrapper into .about-body behind an eyebrow and
// an <h2>. Reading bio.html here matched nothing, so bioProse was always "" and
// the length>40 half of the assertion could never pass.
const bioProse = (
  /<div class="about-body">[\s\S]*?<h2>[^<]*<\/h2>\s*<p>([\s\S]*?)<\/p>/.exec(
    storefrontIndex,
  )?.[1] ?? ""
)
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
check(
  bioProse.length > 40 && !homeDoc.includes(bioProse) && !archiveDoc.includes(bioProse),
  `the Desk does not restate the storefront bio${bioProse ? ` ("${bioProse.slice(0, 44)}…")` : ""}`,
)

// ── 5d. the tag taxonomy holds (S10 §25) ────────────────────────────────────
// Eight spheres were read out of all 49 posts and signed off (§25.3). Two things
// can then happen to them silently: a new post ships with `tags: []` (or invents
// a ninth tag, which mints a near-empty page and fragments the vocabulary), or a
// tag page stops being generated. Both are invisible in a green build, so they
// are asserted here. The vocabulary is deliberately a fixed set — a tag earns its
// place at 3+ posts, not at 1.
console.log("\nTag taxonomy — 8 spheres, one tag per post (§25)")
const TAXONOMY = [
  "process",
  "mindset",
  "craft-plot",
  "craft-character",
  "systems",
  "reading",
  "bookcraft",
  "news",
]
const frontmatterTag = (src) => {
  const fm = src.split("---")[1] ?? ""
  const m = /^tags:\s*\[(.*?)\]\s*$/m.exec(fm)
  if (m)
    return m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  const block = /^tags:\s*\n((?:\s*-\s*.+\n?)+)/m.exec(fm)
  return block
    ? block[1]
        .split("\n")
        .map((l) => l.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : []
}
// `readdirSync(..., {recursive:true})` yields POSIX separators on macOS, and the
// vault mirror is flat under `Newsletters/`. `index.md` is the archive landing
// page, not a post — it is a navigation surface and carries no topic, so it is
// excluded (a folder index has no subject to categorise).
const noteFiles = authored.filter(
  (f) => f.startsWith("Newsletters/") && !f.includes("_drafts") && !f.endsWith("/index.md"),
)
const tagOf = new Map(
  noteFiles.map((f) => [f, frontmatterTag(readFileSync(join(brain, "content", f), "utf8"))]),
)
const untagged = [...tagOf].filter(([, t]) => t.length === 0).map(([f]) => f)
// One tag is the default, and a second (bridging) tag is deliberate and good —
// it is what connects two spheres on the tag graph. What must not happen is a
// post that lists everything and therefore belongs nowhere, or a ninth tag. So
// the bound is 1-3, not exactly 1.
const overTagged = [...tagOf].filter(([, t]) => t.length > 3).map(([f, t]) => `${f} (${t.length})`)
const bridges = [...tagOf].filter(([, t]) => t.length === 2).length
check(
  overTagged.length === 0,
  `no post carries more than 3 tags (a post that lists everything belongs nowhere)${overTagged.length ? ` — ${overTagged.slice(0, 3).join(", ")}` : ""}`,
)
check(
  bridges > 0,
  `bridging second tags are in use (${bridges} posts cross a sphere boundary) — this is what makes the tag graph a graph`,
)
const offVocabulary = [...tagOf].flatMap(([f, t]) =>
  t.filter((x) => !TAXONOMY.includes(x)).map((x) => `${f} (${x})`),
)
check(
  untagged.length === 0,
  `every one of the ${noteFiles.length} published posts carries a tag${untagged.length ? ` — untagged: ${untagged.slice(0, 3).join(", ")}` : ""}`,
)
check(
  offVocabulary.length === 0,
  `no post invents a tag outside the 8 spheres${offVocabulary.length ? ` — ${offVocabulary.slice(0, 3).join(", ")}` : ""}`,
)
// The trail is gone (S10): a second, folder-shaped navigation model sitting
// above the title, repeating the current page. Locked off so it cannot creep
// back with the plugin re-enabled.
const anyBreadcrumb = builtHtml.some((f) =>
  /class="[^"]*breadcrumb/.test(readFileSync(join(brain, "public", f), "utf8")),
)
check(!anyBreadcrumb, "no built page renders a breadcrumb trail (breadcrumbs are disabled, §25.2)")
// The taxonomy only earns its keep if the pages it promises actually exist.
// FLAT output, not `tags/<tag>/index.html`: Quartz emits `tags/process.html`.
// (Asserting the directory form here is the §17 trap again — the build is the fact.)
const missingTagPages = TAXONOMY.filter(
  (t) => !existsSync(join(brain, "public", "tags", `${t}.html`)),
)
check(
  missingTagPages.length === 0,
  `all 8 tag pages are generated${missingTagPages.length ? ` — missing: /tags/${missingTagPages.join(", /tags/")}` : ""}`,
)
// And a tag must be *findable* on the post, not just present in the frontmatter.
const samplePost = readFileSync(
  join(brain, "public", "newsletters", "2025", "the-dangers-of-overplotting.html"),
  "utf8",
)
check(
  /class="tags"[\s\S]{0,200}href="[^"]*tags\/craft-plot"/.test(samplePost),
  "a post renders its tag as a pill linking to its tag page",
)

// The post header (S10 / D18): `Published <date> • Updated <date>` plus a
// client-gated "Recently updated" pill. Two things can break it invisibly —
// the local plugin failing to load (which is silent; the build just omits the
// component), or the pill losing its `hidden` gate and firing on every post
// forever. Both are asserted on the built output.
const headerPost = readFileSync(
  join(brain, "public", "newsletters", "2025", "the-dangers-of-overplotting.html"),
  "utf8",
)
check(
  /class="eb-post-dates"/.test(headerPost) && /eb-post-dates__label">Published</.test(headerPost),
  "a post renders the Published/Updated header",
)
check(
  /class="eb-recently-updated"[^>]*data-modified="\d{4}-\d{2}-\d{2}"[^>]*hidden/.test(headerPost),
  "the Recently updated pill ships hidden, carrying its date for the client check",
)
const headerCss = readFileSync(
  join(
    brain,
    "public",
    readdirSync(join(brain, "public")).find((f) => /^index-.*\.css$/.test(f)),
  ),
  "utf8",
)
check(
  /\.eb-recently-updated\[hidden\][^{}]*\{[^}]*display:\s*none/.test(headerCss),
  "the pill keeps a [hidden] gate in CSS (a bare display rule would light it on every post)",
)
// 11.9.7c - the article must come before the explorer on mobile. Base Quartz
// stacks grid-sidebar-left FIRST, putting a full screen of file tree above the
// title. Two traps here, both hit: matching the BASE rule (it appears first,
// and passing would mean nothing), and taking the first hit rather than the
// winning one. custom.scss is unlayered AND appended last, so the effective
// declaration is the LAST occurrence - assert on that.
const mobileGrids = [
  ...headerCss.matchAll(
    /@media \(max-width:800px\)\{\.page>#quartz-body\{grid-template:([^}]*)\}/g,
  ),
].map((m) => m[1])
const mobileGrid = mobileGrids.at(-1)
check(
  mobileGrids.length > 1,
  "the mobile grid override ships in custom.scss, after the base stack it must beat",
)
check(
  !!mobileGrid &&
    mobileGrid.indexOf("grid-center") > -1 &&
    mobileGrid.indexOf("grid-center") < mobileGrid.indexOf("grid-sidebar-left"),
  `the article is placed before the sidebar on mobile${mobileGrid ? "" : " (no override found)"}`,
)

// 11.9.7d - the mobile sticky bar is the nav alone. Two halves, and the second
// matters as much as the first: the controls must disappear on phones AND stay
// on desktop. A guard that only checked the hide rule would pass if someone
// moved it out of the media query and killed search everywhere.
//
// The selector list is matched with `[^}]*` rather than requiring `.readermode`
// to sit immediately before `{`. That is not defensive padding: lightningcss
// MERGES adjacent rules that share a declaration, so when 11.9.7e added
// `.eb-sticky-title { display: none }` directly below this one, the built rule
// became `.search,.darkmode,.readermode,.eb-sticky-title{display:none}` and the
// adjacency-anchored pattern failed on correct CSS. The merge is correct and
// wanted; the guard only has to tolerate it.
const hideRule =
  /(\.page>#quartz-body \.page-header \.search,[^}]*\.readermode[^{}]*)\{display:none\}/.exec(
    headerCss,
  )
check(!!hideRule, "the mobile header drops search, the theme toggle and reader mode")
const hideAt = hideRule ? headerCss.indexOf(hideRule[0]) + hideRule[0].length : -1
const lastMedia = headerCss.lastIndexOf("@media", hideAt)
// Anchored against a generous slice rather than an exact character count: two
// attempts used 24 then 23, and "@media (max-width:800px){" is 25 characters,
// so each one failed on correct CSS for want of a closing paren.
check(
  hideAt > -1 &&
    /^@media \(max-width:800px\)\s*\{/.test(headerCss.slice(lastMedia, lastMedia + 40)),
  "those controls are hidden only below 800px (desktop keeps search and reader mode)",
)
// 11.9.5(b) - descriptions on the tag listing pages.
//
// These assert on the BUILT pages, and the first one is the one that matters:
// 126 of 126 entries carry a description. This feature was nearly shipped twice
// while reporting success — first as a `treeTransforms` plugin that matched
// nothing (it runs over the markdown tree, before the layout renders the
// listing), then as a page type whose `match` never ran (these are VIRTUAL
// pages; the dispatcher emits each with the layout of the page type that
// GENERATED it). Both built clean with zero descriptions. So the count is
// checked against the real artifact, not against the plugin's own intent.
const tagPages = readdirSync(join(brain, "public", "tags"))
  .filter((f) => f.endsWith(".html"))
  .map((f) => join(brain, "public", "tags", f))
check(tagPages.length > 0, `tag pages exist to check (${tagPages.length} found)`)

let tagEntries = 0
let tagDescs = 0
const tagPagesMissing = []
for (const file of tagPages) {
  const html = readFileSync(file, "utf-8")
  const entries = html.match(/class="section-li"/g)?.length ?? 0
  const descs = html.match(/class="eb-listing-desc"/g)?.length ?? 0
  tagEntries += entries
  tagDescs += descs
  if (entries !== descs) tagPagesMissing.push(`${file.split("/").pop()} ${descs}/${entries}`)
}
check(
  tagEntries > 0,
  `tag listings have entries to check (${tagEntries} across ${tagPages.length} pages)`,
)
check(
  tagEntries === tagDescs,
  `every tag listing entry shows its description (${tagDescs}/${tagEntries})${
    tagPagesMissing.length ? ` — short: ${tagPagesMissing.join(", ")}` : ""
  }`,
)

// The replacement reimplements the page, so the surrounding furniture has to
// still be there. Each of these is a thing that silently vanished in one of the
// two failed attempts.
const anyTag = readFileSync(tagPages[0], "utf-8")
check(
  tagPages.every((f) => /class="section-ul"/.test(readFileSync(f, "utf-8"))),
  "every tag page renders the section list (listPage markup survived the swap)",
)
check(
  tagPages.every((f) => /items with this tag\./.test(readFileSync(f, "utf-8"))),
  "every tag page keeps its 'N items with this tag.' count line",
)
// tag-page's stylesheet was the ONLY source of the `3fr` listing grid as far as
// THIS plugin is concerned, and it died with the plugin. Losing it stacks date,
// title and tags vertically.
//
// Read the CSS the tag pages actually LINK, not just index-*.css: component
// styles ship as separate `component-*.css` files, and the first version of this
// check looked only at index-*.css - so it failed while the rule was sitting in
// a component stylesheet the page was loading.
//
// hrefs are relative to the page (`../component-x.css` from /tags/<x>/), so they
// resolve against the page's own directory. Joining them onto public/ directly
// - as a second attempt did - looks in brain/component-x.css and throws ENOENT.
//
// KNOWN AND ACCEPTED: this asserts the rule is REACHABLE from a tag page, not
// that this plugin authored it. `@quartz-community/folder-page` (still enabled,
// it owns /newsletters/) bundles an identical copy of listPage.scss, so the rule
// has two sources. That redundancy is why deleting only this plugin's copy left
// the guard green - so proven-red for this one has to strip BOTH copies. The
// plugin still carries its own because it is a standalone replacement and should
// not depend on another plugin's incidental CSS to lay out its own page.
const tagCssFiles = new Set()
for (const file of tagPages) {
  const html = readFileSync(file, "utf-8")
  for (const m of html.match(/href="[^"]*component-[^"]*\.css"/g) ?? []) {
    tagCssFiles.add(resolve(dirname(file), m.slice(6, -1)))
  }
}
const tagCss = [...tagCssFiles].map((f) => readFileSync(f, "utf-8")).join("\n")
check(
  tagCssFiles.size > 0,
  `tag pages link component stylesheets to check (${tagCssFiles.size} found)`,
)
check(
  /li\.section-li>\.section\{[^}]*grid-template-columns:fit-content\(8em\) 3fr 1fr/.test(tagCss),
  "the tag listing still has tag-page's 3-column grid (its CSS is carried over)",
)
// Every tag page is a virtual page with an empty body. If someone adds a real
// content/tags/*.md, this body would silently drop that markdown - so assert the
// assumption still holds rather than trusting it.
//
// Whitespace inside a class attribute is MEANINGFUL here, so match it rather
// than stripping whitespace first. The first version did
// `.replace(/\s+/g, "")`, which turned
// `class="markdown-preview-view markdown-rendered"` into
// `class="markdown-preview-viewmarkdown-rendered"` and failed every page.
check(
  tagPages.every((f) =>
    /<article[^>]*><div class="markdown-preview-view markdown-rendered"><\/div><\/article>/.test(
      readFileSync(f, "utf-8"),
    ),
  ),
  "tag pages carry an empty article block (no content/tags/*.md to be dropped)",
)
// Internal links are hand-rolled (resolveRelative is ported, since a local
// plugin cannot import quartz/util). Every one of them has to resolve.
let tagLinks = 0
const brokenTagLinks = []
for (const file of tagPages) {
  const html = readFileSync(file, "utf-8")
  for (const href of new Set(html.match(/href="[^"]+"/g)?.map((m) => m.slice(6, -1)) ?? [])) {
    if (/^(https?:|#|mailto:)/.test(href)) continue
    tagLinks++
    const target = resolve(dirname(file), href)
    if (
      !existsSync(target) &&
      !existsSync(`${target}.html`) &&
      !existsSync(join(target, "index.html"))
    ) {
      brokenTagLinks.push(`${file.split("/").pop()} -> ${href}`)
    }
  }
}
check(
  brokenTagLinks.length === 0,
  `all ${tagLinks} internal links on tag pages resolve${
    brokenTagLinks.length ? ` (broken: ${brokenTagLinks.slice(0, 3).join(", ")})` : ""
  }`,
)
// And tag-page must stay disabled, or two page types would generate the same
// virtual slugs and silently overwrite one another.
//
// Anchored on the SAME entry: the first version used
// /tag-page[\s\S]{0,80}enabled:\s*true/, whose `[\s\S]` happily ran past the end
// of this entry, across `- source:`, and matched the NEXT plugin's
// `enabled: true` - reporting tag-page as enabled when it was disabled.
check(
  /- source: "@quartz-community\/tag-page"\s*\n\s*enabled: false/.test(config),
  "@quartz-community/tag-page stays disabled (the replacement owns /tags/)",
)

// 11.9.5(c) The standfirst on post pages, plus 11.9.6(b) popovers off.
//
// 11.9.5(c) exists because 11.9.5(a) and (b) were both shipped and BOTH looked
// like the feature had never worked: the description showed on /desk/ and
// /tags/<x>/, and not on a post. The reader checked a post and saw no standfirst.
// So the guard that matters is not "the text exists somewhere" - it is "every
// post shows it, in the header, in the right order".
// Year folders only — public/newsletters/ also holds og-image.webp, and
// readdir-ing a file as a directory throws ENOTDIR.
//
// `index.html` inside a year folder is a LISTING page, not a post: it has no
// frontmatter of its own and must not be expected to carry a standfirst. The
// first version of this guard counted them and reported 49/53.
const builtPosts = readdirSync(join(brain, "public", "newsletters"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((y) =>
    readdirSync(join(brain, "public", "newsletters", y.name))
      .filter((f) => f.endsWith(".html") && f !== "index.html")
      .map((f) => `newsletters/${y.name}/${f}`),
  )

let decks = 0
const decksMissing = []
const decksMisordered = []
for (const f of builtPosts) {
  const html = readFileSync(join(brain, "public", f), "utf-8")
  if (/<p class="eb-post-deck">[^<]+<\/p>/.test(html)) decks++
  else decksMissing.push(f)
  // Order: title, then deck, then the dates. The deck is the sentence that sets
  // the post up, so it reads before the metadata - not after it as a footnote.
  const t = html.indexOf('class="article-title"')
  const d = html.indexOf('class="eb-post-deck"')
  const p = html.indexOf('class="eb-post-dates"')
  if (!(t !== -1 && d !== -1 && p !== -1 && t < d && d < p)) decksMisordered.push(f)
}
check(
  builtPosts.length > 0,
  `built posts exist to check the standfirst on (${builtPosts.length} found)`,
)
check(
  decks === builtPosts.length,
  `every post shows its description as a standfirst (${decks}/${builtPosts.length})${
    decksMissing.length ? ` — missing: ${decksMissing.slice(0, 3).join(", ")}` : ""
  }`,
)
check(
  decksMisordered.length === 0,
  `the standfirst sits between the title and the dates on every post${
    decksMisordered.length ? ` (wrong order: ${decksMisordered.slice(0, 3).join(", ")})` : ""
  }`,
)
// The text must be the post's own frontmatter description, not the meta tag's
// copy or a generic filler.
{
  const one = builtPosts[0]
  const html = readFileSync(join(brain, "public", one), "utf-8")
  const deck = html.match(/<p class="eb-post-deck">([^<]+)<\/p>/)?.[1]
  const meta = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
  check(!!deck && deck.length > 10, "the standfirst carries real text, not a placeholder")
  check(
    !!deck && !!meta && deck.trim() === meta.trim(),
    "the standfirst is the post's own description (not a stock string)",
  )
}
// Pages with NO description must not get a standfirst - an empty gap under the
// title is worse than nothing. Tag pages and the 404 are generated/virtual and
// have none.
//
// The homepage is deliberately NOT in this list. content/index.md carries its own
// description, so a standfirst there is correct and wanted. The first version of
// this check listed index.html and failed - the component was right and the
// assertion was wrong.
const descriptionless = [
  join(brain, "public", "404.html"),
  join(brain, "public", "tags", "process.html"),
  join(brain, "public", "newsletters", "2023", "index.html"),
]
check(
  descriptionless.every((f) => !/class="eb-post-deck"/.test(readFileSync(f, "utf-8"))),
  "pages with no description get no standfirst (no empty gap under the title)",
)
check(
  /class="eb-post-deck"/.test(readFileSync(join(brain, "public", "index.html"), "utf-8")),
  "the Desk index shows its own standfirst (it has a description too)",
)

// The built theme stylesheet, read once. (Declared here rather than reusing the
// `indexSrc` further down this file, which is in its temporal dead zone at this
// point — referencing it threw a ReferenceError.)
const hubCss = readFileSync(
  join(
    brain,
    "public",
    readdirSync(join(brain, "public")).find((f) => /^index-.*\.css$/.test(f)),
  ),
  "utf8",
)

// 11.9.6(b) Hover popovers off. These fire on EVERY internal link, which on a
// phone means every tap-then-tap opens a preview instead of the post.
//
// PROBE THE CSS, NOT JS STRINGS. The first version scanned the built .js for
// "popover" and passed no matter what — VACUOUS, and it took a proven-red test
// to discover. The emitted script is minified, so it never contains that
// literal: with popovers ON postscript is 640 bytes and carries the code, with
// them OFF 588 bytes and carries none, and neither contains the word. A guard
// that cannot go red is not a guard.
//
// The stylesheet is the honest probe, and it discriminates cleanly: `.popover{`
// appears 3 times with popovers on and 0 times with them off.
check(
  !/\.popover\{/.test(hubCss),
  "no popover stylesheet is shipped (the hover-preview boxes are gone)",
)
check(/enablePopovers:\s*false/.test(config), "enablePopovers stays false in quartz.config.yaml")

// The hub cards were red on red. `--secondary` is the Emerson ACCENT (#CA2626)
// in this theme, not a muted grey, so a card background mixing in `--secondary`
// tinted every surface pink and the grey standfirsts sat on it badly.
// Assert the surface is built from neutral tokens only.
const hubCard = hubCss.match(/\.eb-hub__card\{[^}]*\}/)?.[0] ?? ""
check(!!hubCard, "the hub card rule exists in the built CSS")
check(
  !!hubCard && !/var\(--secondary\)|var\(--color-accent\)|#ca2626/i.test(hubCard),
  "the hub card surface does not mix in the red accent (no red-on-red)",
)
// Two columns on a wide desktop, not three: 460px floor, was 320px.
check(
  /\.eb-hub\{[^}]*minmax\(460px,1fr\)/.test(hubCss),
  "the hub lays out two cards per row (460px floor gives text room to breathe)",
)

// 11.9.5(a) - the Desk hub: one card per topic, five most recent posts each,
// with the description under every title.
//
// The `condition: index` is load-bearing, not tidiness. The component emits
// "./" + slug links, which are right from the index and wrong anywhere else,
// because a plain-JS local plugin cannot import quartz's resolveRelative. So
// the guard asserts BOTH that the hub is on the index and that it is nowhere
// else - widening the condition should fail loudly, not ship 404s.
const hubHtml = readFileSync(join(brain, "public", "index.html"), "utf8")
const hubCards = (hubHtml.match(/class="eb-hub__card"/g) ?? []).length
const hubItems = (hubHtml.match(/class="eb-hub__item"/g) ?? []).length
const hubDescs = (hubHtml.match(/class="eb-hub__desc"/g) ?? []).length
check(hubCards > 0, `the Desk hub renders one card per topic (${hubCards} cards)`)
check(
  hubItems > 0 && hubDescs === hubItems,
  `every post in the hub shows its description (${hubDescs}/${hubItems})`,
)
// `news` is excluded by name, deliberately: award announcements date badly.
check(
  !/eb-hub__tag">[\s\S]{0,140}?href="\.\/tags\/news"/.test(hubHtml),
  "the hub excludes the news topic",
)
check(
  !headerPost.includes("eb-hub__card"),
  "the hub does not leak onto post pages (condition: index holds)",
)
// Every hub link must be a real newsletter post. A slug shape change, or a
// future tag accidentally gaining a title, would otherwise ship a dead link.
const hubHrefs = [...hubHtml.matchAll(/eb-hub__link internal" href="([^"]+)"/g)].map((m) => m[1])
check(
  hubHrefs.length === hubItems && hubHrefs.every((x) => x.startsWith("./newsletters/")),
  `all ${hubHrefs.length} hub links point at real newsletter posts`,
)

const scriptsDir = join(brain, "public", "static", "scripts")
const scriptBlob = readdirSync(scriptsDir)
  .map((f) => readFileSync(join(scriptsDir, f), "utf8"))
  .join("\n")

// 11.9.7f - Reader mode is gone at EVERY width, by disabling the plugin.
//
// Asserted on the BUILT MARKUP rather than on a CSS rule. A display:none hide
// would leave the button in the DOM and still in the tab order, so "no markup"
// is the stronger and more honest claim: the control is genuinely absent.
check(
  !/class="readermode"/.test(headerPost) && !/readerIcon/.test(headerPost),
  "Reader mode (the book icon) is absent from the markup at every width",
)

// 11.9.7g - THE HEADER IS NOT STICKY, AT ANY WIDTH.
//
// Six guards about the scroll-driven header were deleted along with it. These
// replace them, and they are deliberately simpler: they assert an ABSENCE, so
// none of them can be satisfied by a selector matching for the wrong reason.
//
// The standing temptation in this repo has been to assert that code is PRESENT.
// Two of the three 11.9.7f bugs passed exactly that kind of guard - the probe
// string shipped faithfully while the selector matched nothing on any real page.
// Asserting that something is GONE cannot fail that way.

// Every `position: sticky` in the bundle, and whether its selector names
// .page-header. Scoped to the rule that owns the declaration rather than
// searching backwards for a class name, so a sticky header authored by any
// route is caught.
const headerSticky = [...headerCss.matchAll(/position:\s*sticky/g)].filter((m) => {
  const braceStart = headerCss.lastIndexOf("{", m.index)
  const braceEnd = headerCss.lastIndexOf("}", m.index)
  return /\.page-header/.test(headerCss.slice(braceEnd + 1, braceStart))
})
check(
  headerSticky.length === 0,
  "the page header is not position:sticky at any width (the whole 11.9.7g point)",
)

// The blur existed only because content scrolled *under* a translucent bar.
// With the bar in normal flow it would only blur the page background.
check(
  !/\.page-header[^{]*\{[^}]*backdrop-filter/.test(headerCss),
  "the header no longer carries a backdrop-filter blur",
)

// The whole feature is gone, not merely unused: element, CSS and script.
check(
  !headerPost.includes("eb-sticky-title"),
  "the shrunken-title element is gone from the markup (plugin deleted)",
)
check(
  !headerCss.includes("eb-sticky-title") && !headerCss.includes("eb-header--compact"),
  "no sticky-title or compact-header CSS survives in the bundle",
)
check(
  !scriptBlob.includes("__ebStickyTitleTeardown") && !scriptBlob.includes("eb-header--compact"),
  "the scroll handler is gone from every shipped script",
)

// The sidebar's `padding: 6rem 2rem 2rem` existed ONLY to clear the sticky
// header. Left in place once the header scrolls away it becomes a 6rem hole
// above the explorer, so the release is asserted rather than assumed.
check(
  /\.page>#quartz-body \.sidebar\.left\{padding-top:1rem\}/.test(headerCss),
  "the sidebar's dead 6rem header-clearance padding is released",
)
check(
  scriptBlob.includes("data-eb-recently-updated") && scriptBlob.includes("days < 90"),
  "the client script that reveals the pill is actually shipped",
)
check(
  /eb-post-dates__sep/.test(headerPost) && !/eb-post-dates__line">[^<]*•/.test(headerPost),
  "the Published/Updated divider is a hairline rule, not a middot",
)
// 11.9.7 - header declutter. Two things used to live in the post header:
// content-meta printed the publication date plus a reading time ("Feb 14, 2025 /
// 8 min read") under the title, duplicating the date the post header already
// prints as "Published ... | Updated ...", and the table of contents added a
// second navigation model next to the title. The reader asked for less, not more.
// Both components are disabled in quartz.config.yaml, so the assertions belong
// on the built HTML rather than on a CSS rule that can silently stop matching.
// That is how the old content-meta guard passed for months: its rule had been
// nested inside .eb-post-dates, compiling to a selector no page can have, and
// the unanchored regex still matched the text.
const anyPageRenders = (pattern) =>
  builtHtml.some((f) => pattern.test(readFileSync(join(brain, "public", f), "utf8")))
check(
  !anyPageRenders(/class="[^"]*\bcontent-meta\b/),
  "no built page renders content-meta (no duplicate date line under the title)",
)
check(
  !anyPageRenders(/class="(?:toc|toc-header|toc-content)\b/),
  "no built page renders a table of contents",
)
// S10/F13 · no upstream yellow survives IN THE BUILT STYLESHEET.
//
// The first version of this guard grepped `public/index.html`, which does not
// contain the theme variables at all — they live in the emitted CSS bundle — so
// "no yellow found" was trivially true and the check passed while the yellow was
// still being served. A guard that cannot fail is worse than no guard: it
// converts an unverified claim into a false assurance.
//
// Read the actual bundle, and assert the *unlayered* override exists in it —
// `.text-highlight` in custom.scss is what actually wins the cascade, because
// quartz-base also declares --textHighlight and comes first in the layer order.
const allCss = readdirSync(join(brain, "public"))
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync(join(brain, "public", f), "utf8"))
  .join("\n")
check(
  allCss.length > 0 && /--textHighlight:\s*#(fff236|b3aa02)/i.test(allCss),
  "sanity: the upstream yellow token is actually present in the bundle (so this check can fail)",
)
// 11.9.7 - the tag pills must not be able to go yellow again. --highlight is a
// theme token (upstream: amber), so pinning it in the overlay is necessary but
// not sufficient: a future aspect could re-declare it and the pill would follow.
// custom.scss is unlayered, so an explicit pill background there outranks every
// layer. Assert it ships AND that it sits outside any @layer - an unanchored
// match would pass on a rule that had accidentally been nested, which is exactly
// how the original content-meta guard gave a false assurance.
const pillRule = /(^|})\s*(ul\.tags )?a\.tag-link[^{}:]*\{[^}]*background-color:[^}]*\}/.exec(
  headerCss,
)
check(!!pillRule, "the tag pill background is set from custom.scss, not inherited from the theme")
check(
  !!pillRule && !/var\(--highlight\)/.test(pillRule[0]),
  "the tag pill background never routes through --highlight (the amber token)",
)

check(
  /\.text-highlight\{[^}]*eb-accent/.test(headerCss),
  "the yellow highlight is overridden from unlayered custom.css (the only place that beats quartz-base)",
)

console.log("\nTypography (computed style — what the reader actually sees)")

// Cheap static companion to the browser check below: it documents the layer
// order that caused the bug, so the *reason* is visible in the output even
// when the browser probe is skipped. `quartz-fonts` must not end up declaring
// `--font-interface` in a layer that sorts after the one custom.scss escapes.
const layerSheets = readdirSync(staticDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ f, src: readFileSync(join(staticDir, f), "utf8") }))
const fontsLayer = layerSheets.find(({ src }) => src.includes("@layer quartz-fonts"))
check(
  !!fontsLayer && /--font-interface:\s*ui-sans-serif/.test(fontsLayer.src),
  "known cause still present: @layer quartz-fonts hardcodes a sans --font-interface",
)
const indexCss = join(
  brain,
  "public",
  readdirSync(join(brain, "public")).find((f) => /^index-.*\.css$/.test(f)),
)
const indexSrc = existsSync(indexCss) ? readFileSync(indexCss, "utf8") : ""
check(
  /:root\{--font-interface:var\(--eb-serif\)/.test(indexSrc),
  "custom.scss pins --font-interface unlayered (outranks every @layer)",
)

// Serve public/ so the probe page and the article share an origin (same-origin
// is required to read the iframe's document).
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p
  return null
}

/** True when something is already listening on the probe origin's port. */
function isPortUp(base) {
  const { hostname, port } = new URL(base)
  return new Promise((res) => {
    const s = createConnection({ host: hostname, port: Number(port) })
    const done = (ok) => {
      s.destroy()
      res(ok)
    }
    s.on("connect", () => done(true))
    s.on("error", () => done(false))
    setTimeout(() => done(false), 500)
  })
}

const execFileSyncAsync = (cmd, args) =>
  new Promise((res) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) =>
      res({ stdout: stdout ?? "" }),
    )
  })

/**
 * Evaluate a probe function inside a real browser against one built page and
 * return whatever it wrote to `document.title`.
 *
 * The page is loaded in an iframe from a tiny generated probe document so that
 * `contentDocument` is readable; computed styles are then read from the live
 * cascade. `virtual-time-budget` lets the webfonts and scripts settle without
 * us needing a display.
 */
async function computedInBrowser(pageRelPath, probeBody) {
  const chrome = findChrome()
  if (!chrome) return null
  const probePath = join(brain, "public", "__verify_probe.html")
  writeFileSync(
    probePath,
    `<!doctype html><meta charset="utf-8"><title>pending</title>
<iframe id="f" src="${pageRelPath}" style="width:1400px;height:900px"></iframe>
<script>
const f = document.getElementById("f")
f.onload = () => setTimeout(() => {
  const out = []
  try { ${probeBody} } catch (e) { out.push("PROBE ERROR: " + e.message) }
  document.title = out.join(" || ")
}, 1800)
<\/script>`,
  )
  try {
    const { stdout } = await execFileSyncAsync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--virtual-time-budget=9000",
      "--dump-dom",
      `${PROBE_BASE}/__verify_probe.html`,
    ])
    const m = /<title>([^<]*)<\/title>/.exec(stdout)
    return m ? m[1] : null
  } finally {
    rmSync(probePath, { force: true })
  }
}

const PROBE_BASE = process.env.EB_VERIFY_BASE ?? "http://localhost:8099"

if (!findChrome() || !(await isPortUp(PROBE_BASE))) {
  console.log(
    `  ! skipping computed-style check — need Chrome and a server on ${PROBE_BASE}.\n` +
      `    Serve it with:  cd brain/public && python3 -m http.server 8099`,
  )
} else {
  const probe = await computedInBrowser(
    "newsletters/2023/5-lessons-i-learned-writing-my-first-book.html",
    `
    const d = f.contentDocument
    const ff = (sel) => { const e = d.querySelector(sel); return e ? getComputedStyle(e).fontFamily : "MISSING" }
    out.push("p=" + ff("article p"))
    out.push("li=" + ff("article li"))
    out.push("h1=" + ff("h1.article-title"))
    out.push("explorer=" + ff(".explorer a.nav-file-title.tree-item-self"))
    out.push("breadcrumb=" + ff(".breadcrumb-element"))
  `,
  )
  const field = (name) => {
    const hit = (probe ?? "").split(" || ").find((s) => s.startsWith(name + "="))
    return hit ? hit.slice(name.length + 1) : null
  }
  const isSerif = (v) => !!v && /^"?Lora"?/.test(v.trim())
  const isDisplay = (v) => !!v && /^"?Gabarito"?/.test(v.trim())

  check(field("p") !== null, `computed-style probe ran (${probe ? "browser ok" : "no output"})`)
  check(isSerif(field("p")), `body paragraphs render in Lora (got: ${field("p") ?? "n/a"})`)
  check(isSerif(field("li")), `list items render in Lora (got: ${field("li") ?? "n/a"})`)
  check(isDisplay(field("h1")), `article titles render in Gabarito (got: ${field("h1") ?? "n/a"})`)
  // The serif variable is inherited by the theme's UI, so the chrome must be
  // pinned to the display face explicitly or the whole sidebar turns to Lora.
  // (Breadcrumbs dropped out of this list in S10 — the trail is disabled, §25.2.)
  for (const [name, label] of [["explorer", "explorer links"]]) {
    check(
      isDisplay(field(name)),
      `${label} stay on the display face (got: ${field(name) ?? "n/a"})`,
    )
  }

  // ── S4 + S1: no empty right sidebar, and a held reading measure ────────────
  // Both are computed-layout facts, so both need the browser; a static grep of
  // the stylesheet would happily pass while the page overflows, which is exactly
  // what happened while developing this (see the comments in custom.scss §4).
  //
  // The assertion that matters most is `chars`. The default frame ALWAYS renders
  // `<div class="right sidebar">`, even with `right: []`, and it stayed a live
  // 320px grid track — a third of the shell spent on an empty box. Collapsing it
  // widened the centre, which then had to be re-capped, and the number that
  // actually governs readability is characters per line, not pixels. Assert the
  // 45–90 band rather than an exact width: it fails for a missing column, for a
  // regressed cap, and for a future font change that re-measures differently.
  const lay = await computedInBrowser(
    "newsletters/2023/5-lessons-i-learned-writing-my-first-book.html",
    `
    const d = f.contentDocument
    const rs = d.querySelector(".sidebar.right")
    const bd = d.querySelector("#quartz-body")
    out.push("rightKids=" + (rs ? rs.children.length : -1))
    out.push("rightDisplay=" + (rs ? getComputedStyle(rs).display : "absent"))
    out.push("cols=" + (bd ? getComputedStyle(bd).gridTemplateColumns : "?"))
    const p = d.querySelector("article p")
    if (p) {
      const st = getComputedStyle(p)
      const probe = d.createElement("div")
      probe.style.cssText = "position:absolute;visibility:hidden;width:10ch"
      probe.style.font = st.font
      d.body.append(probe)
      const perCh = probe.getBoundingClientRect().width / 10
      probe.remove()
      out.push("paraW=" + Math.round(p.getBoundingClientRect().width))
      out.push("chars=" + Math.round(p.getBoundingClientRect().width / perCh))
    }
    out.push("overflow=" + (d.documentElement.scrollWidth > d.documentElement.clientWidth))
  `,
  )
  const lf = (name) => {
    const hit = (lay ?? "").split(" || ").find((s) => s.startsWith(name + "="))
    return hit ? hit.slice(name.length + 1) : null
  }
  check(
    lf("rightKids") === "0",
    `right sidebar renders no phantom column (kids: ${lf("rightKids") ?? "n/a"})`,
  )
  check(
    lf("rightDisplay") === "none",
    `empty right sidebar is display:none (got: ${lf("rightDisplay") ?? "n/a"})`,
  )
  const chars = Number(lf("chars"))
  // Assert the TRACK COUNT, not just the empty/hidden state. Reverting the grid
  // rule to `:not(:empty)` leaves the sidebar `display:none` via its own rule and
  // the measure at 67 chars — every other check still passes, while the layout is
  // in fact the old 3-track one. That regression was caught only by counting
  // tracks, which is why this check exists and why `chars` alone was not enough.
  const trackCount = lf("cols") ? lf("cols").trim().split(/\s+/).length : null
  check(
    trackCount === 2,
    `shell collapses to 2 grid tracks, not 3 (got: ${trackCount ?? "n/a"} — "${lf("cols") ?? "?"}")`,
  )
  check(
    lf("chars") !== null && chars >= 45 && chars <= 90,
    `reading measure holds 45-90 chars/line (got: ${lf("chars") ?? "n/a"})`,
  )
  check(
    lf("overflow") === "false",
    `no horizontal overflow at 1920px (got: ${lf("overflow") ?? "n/a"})`,
  )

  // ── S1a: the header bar ───────────────────────────────────────────────────
  // The nav is the `footer` plugin rendered into the `header` slot, so it is a
  // real `<footer>` and inherits every rule aimed at the page footer — including
  // an ID-selector `min-width: calc(100% - 3rem)` from the Obsidian theme that
  // beat a class-only rule no matter how specific. That produced a 24px
  // horizontal overflow at EVERY width, with a green build and no error.
  //
  // So this asserts the *computed* min-width rather than trusting the authored
  // one, and it re-measures overflow in a NARROW viewport too. A desktop-only
  // check would have been green throughout the whole of that bug.
  const hdr = await computedInBrowser(
    "newsletters/2023/5-lessons-i-learned-writing-my-first-book.html",
    `
    const d = f.contentDocument
    const nav = d.querySelector(".page-header header > footer")
    const wm = d.querySelector(".page-header .page-title")
    const tb = d.querySelector(".page-header > header > .flex-component")
    const search = d.querySelector(".page-header .search-button")
    out.push("navMinW=" + (nav ? getComputedStyle(nav).minWidth : "ABSENT"))
    out.push("navW=" + (nav ? Math.round(nav.getBoundingClientRect().width) : -1))
    out.push("navLinks=" + d.querySelectorAll(".page-header footer ul li a").length)
    out.push("navGridArea=" + (nav ? getComputedStyle(nav).gridArea : "ABSENT"))
    out.push("wordmarkInHeader=" + (wm ? "yes" : "no"))
    // S10: the header paints the short mark EBW while the anchor keeps the
    // site's full name as its accessible text (see custom.scss 4a).
    const wmLink = d.querySelector(".page-header .page-title a")
    out.push("mark=" + (wmLink ? getComputedStyle(wmLink, "::before").content : "ABSENT"))
    out.push("wmName=" + (wmLink ? wmLink.textContent.trim() : "ABSENT"))
    // The name must be *present but not painted*: the mark alone would still read
    // "EBW" if the collapse rule were dropped, and the page would then show the
    // full name and the mark at once. Assert the collapsed size and that the
    // painted mark has real width.
    out.push("wmFontSize=" + (wmLink ? getComputedStyle(wmLink).fontSize : "ABSENT"))
    out.push("wmW=" + (wmLink ? Math.round(wmLink.getBoundingClientRect().width) : -1))
    out.push("toolbarW=" + (tb ? Math.round(tb.getBoundingClientRect().width) : -1))
    out.push("searchW=" + (search ? Math.round(search.getBoundingClientRect().width) : -1))
    out.push("overflow1920=" + (d.documentElement.scrollWidth > d.documentElement.clientWidth))
    // Narrow: resize the iframe's own viewport is not possible from inside, so
    // measure the header's fit instead — the row must not exceed its parent.
    const hdr = d.querySelector(".page-header > header")
    out.push("headerFits=" + (hdr && nav ? hdr.getBoundingClientRect().width >= nav.getBoundingClientRect().right - hdr.getBoundingClientRect().left - 1 : false))
  `,
  )
  const hf = (name) => {
    const hit = (hdr ?? "").split(" || ").find((s) => s.startsWith(name + "="))
    return hit ? hit.slice(name.length + 1) : null
  }
  check(hf("navLinks") === "4", `header nav renders all 4 links (got: ${hf("navLinks") ?? "n/a"})`)
  check(hf("wordmarkInHeader") === "yes", `wordmark sits in the header, not the sidebar`)
  check(
    hf("navMinW") === "0px",
    `nav min-width is 0, not the theme's calc(100% - 3rem) (got: ${hf("navMinW") ?? "n/a"})`,
  )
  check(
    hf("navGridArea") === "auto",
    `nav is not pinned to grid-footer (got: ${hf("navGridArea") ?? "n/a"})`,
  )
  // The toolbar collapsed to ZERO width at one point while the page still
  // rendered — the search button and both toggles were simply gone. Assert the
  // controls are actually present and sized.
  check(Number(hf("toolbarW")) > 0, `header toolbar has width (got: ${hf("toolbarW") ?? "n/a"})`)
  check(
    Number(hf("searchW")) > 0,
    `search control is visible in the header (got: ${hf("searchW") ?? "n/a"})`,
  )
  check(
    hf("overflow1920") === "false",
    `header causes no overflow at 1920px (got: ${hf("overflow1920") ?? "n/a"})`,
  )
  check(
    hf("headerFits") === "true",
    `nav row stays inside the header box (got: ${hf("headerFits") ?? "n/a"})`,
  )

  // ── S10: the wordmark ──────────────────────────────────────────────────────
  // `page-title` has no options, so the `EBW` mark is a presentational swap over
  // the site's real name. Assert BOTH halves: a rule that painted "EBW" but also
  // rewrote the anchor text would look right on screen and read wrong in a screen
  // reader, and a rule that failed to apply at all leaves the full name visible
  // (`font-size: 0` never set) — neither shows up in a static check.
  check(
    (hf("mark") ?? "").replace(/^["']|["']$/g, "") === "EBW",
    `header wordmark paints "EBW" (got: ${hf("mark") ?? "n/a"})`,
  )
  check(
    hf("wmName") === cfgTitle,
    `wordmark link keeps the full site name for assistive tech (got: ${hf("wmName") ?? "n/a"})`,
  )
  check(
    hf("wmFontSize") === "0px",
    `the full name is kept but not painted (computed size ${hf("wmFontSize") ?? "n/a"}, want 0px)`,
  )
  check(Number(hf("wmW")) > 0, `the painted mark has real width (got: ${hf("wmW") ?? "n/a"}px)`)
}

// The branding folder also ships `EBW icon.png`, which is the SAME monogram in
// magenta #E6007E. Swapping in the wrong master is the easiest mistake here and
// dimension checks cannot catch it, so decode the ink and assert the crimson.
function dominantInk(file) {
  const b = readFileSync(file)
  let p = 8
  let w, h, ct
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const t = b.toString("ascii", p + 4, p + 8)
    if (t === "IHDR") {
      w = b.readUInt32BE(p + 8)
      h = b.readUInt32BE(p + 12)
      ct = b[p + 17]
    }
    if (t === "IDAT") idat.push(b.subarray(p + 8, p + 8 + len))
    if (t === "IEND") break
    p += 12 + len
  }
  if (ct !== 6) return null
  const ch = 4
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let o = 0
  let ro = 0
  for (let y = 0; y < h; y++) {
    const f = raw[ro++]
    const line = raw.subarray(ro, ro + stride)
    ro += stride
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[o + x - ch] : 0
      const bb = y > 0 ? out[o - stride + x] : 0
      const c = x >= ch && y > 0 ? out[o - stride + x - ch] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += bb
      else if (f === 3) v += (a + bb) >> 1
      else if (f === 4) {
        const pa = Math.abs(bb - c)
        const pb = Math.abs(a - c)
        const pc = Math.abs(a + bb - 2 * c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c
      }
      out[o + x] = v & 255
    }
    o += stride
  }
  const counts = new Map()
  for (let i = 0; i < w * h; i++) {
    const r = out[i * 4],
      g = out[i * 4 + 1],
      bl = out[i * 4 + 2],
      a = out[i * 4 + 3]
    if (a < 250) continue
    const k = (r << 16) | (g << 8) | bl
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const [best, n] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0] ?? [0, 0]
  const hex =
    "#" +
    [(best >> 16) & 255, (best >> 8) & 255, best & 255]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  return { hex, n, total: w * h }
}

const ink = dominantInk(iconPath)
// The light-mode brand accent. Exact, because the source is a flat fill.
check(ink !== null, "icon.png is RGBA and decodable")
check(
  ink && ink.hex === "#CA2626",
  `icon.png ink is the brand crimson #CA2626${ink ? ` (found ${ink.hex})` : ""}`,
)
check(
  ink && ink.n / ink.total > 0.2,
  `the monogram is actually present (${ink ? ((ink.n / ink.total) * 100).toFixed(1) : 0}% opaque)`,
)

// ── 2. the seed IIFE must be present in the built prescript ────────────────────
console.log("\nSeed script shipped")
const prescripts = readdirSync(join(brain, "public")).filter((f) => /^prescript.*\.js$/.test(f))
const prescript = prescripts.map((f) => readFileSync(join(brain, "public", f), "utf8")).join("\n")
check(prescripts.length > 0, `prescript.js found (${prescripts.join(", ") || "none"})`)
// esbuild minifies, so match tolerantly: `setItem("theme","dark")` in the build
// vs `setItem("theme", "dark")` in source.
const seedShipped = new RegExp(`setItem\\(\\s*"theme"\\s*,\\s*"${EXPECTED_DEFAULT}"\\s*\\)`).test(
  prescript,
)
check(seedShipped, "our seed IIFE reached the built prescript")

// ── 3. behaviour, in both execution orders ────────────────────────────────────
console.log("\nDefault-mode behaviour (both orders)")

const darkmodeDist = readFileSync(
  join(brain, "node_modules/@quartz-community/darkmode/dist/index.js"),
  "utf8",
)
const inline = darkmodeDist.match(/var darkmode_inline_default = '([\s\S]*?)';/)
if (!inline) throw new Error("could not extract the darkmode inline script")
const darkmodeScript = inline[1].replace(/\\n$/, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\")

const source = readFileSync(join(brain, "quartz", "default-color-mode.ts"), "utf8")
const declared = source.match(/const DEFAULT_MODE = "(\w+)"/)?.[1]
check(declared === EXPECTED_DEFAULT, `DEFAULT_MODE in source is "${EXPECTED_DEFAULT}"`)

const seedScript = `
(function () {
  try {
    if (localStorage.getItem("theme") === null) {
      localStorage.setItem("theme", "${declared}")
      document.documentElement.setAttribute("saved-theme", "${declared}")
    }
  } catch (e) {}
})();
`

function run(order, { storedTheme, osLight }) {
  const store = {}
  if (storedTheme !== undefined) store.theme = storedTheme
  const attrs = {}
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
  }
  const document = {
    documentElement: {
      setAttribute: (k, v) => {
        attrs[k] = v
      },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
    },
    body: { classList: { add() {}, remove() {} } },
    addEventListener() {},
    dispatchEvent() {},
    getElementsByClassName: () => [],
  }
  const matchMedia = (q) => ({
    matches: q.includes("light") ? !!osLight : !osLight,
    addEventListener() {},
  })
  const sandbox = { localStorage, document, matchMedia, CustomEvent: function () {} }
  sandbox.window = { matchMedia, addCleanup() {}, document }
  const ctx = vm.createContext(sandbox)
  for (const code of order) vm.runInContext(code, ctx)
  return attrs["saved-theme"]
}

const cases = [
  ["first visit, OS = LIGHT", { osLight: true }, EXPECTED_DEFAULT],
  ["first visit, OS = DARK", { osLight: false }, EXPECTED_DEFAULT],
  ["returning visitor chose LIGHT", { storedTheme: "light", osLight: false }, "light"],
  ["returning visitor chose DARK", { storedTheme: "dark", osLight: true }, "dark"],
]

for (const [label, opts, expected] of cases) {
  const shipped = run([darkmodeScript, seedScript], opts)
  const reversed = run([seedScript, darkmodeScript], opts)
  check(
    shipped === expected && reversed === expected && shipped === reversed,
    `${label.padEnd(30)} → ${String(shipped).padEnd(5)} (both orders, expected ${expected})`,
  )
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s): the build is not as intended.`)
  process.exit(1)
}
console.log(`\n✓ Default is "${EXPECTED_DEFAULT}", order-independent, toggle visible.`)
console.log(`✓ Layout, header, fonts, favicon, storefront palette and the S10 rename all hold.`)
