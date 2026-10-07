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
// Sections skipped for want of a browser/server. Tracked so the closing summary
// can say so out loud: F18 was three dead checks sitting behind a green 173/173,
// invisible precisely because skipping is silent. A count that does not report
// its own omissions is a count you cannot trust.
const skipped = []
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

// §12.6 — the rest of the palette, and the fonts.
//
// Until now ONLY the accent was guarded, because the accent is the only value a
// human reliably notices drifting. The other six shared colours were copied by
// hand into style.css and nothing compared them: change `--gray` in
// quartz.config.yaml and the Desk's metadata grey moves while the storefront's
// muted text stays where it was, and the site quietly becomes two brands. That
// is the whole failure §12.6 exists to prevent, and it was unguarded.
//
// Read from quartz.config.yaml's `darkMode` block rather than hardcoded, so
// changing the brand palette in the one place that owns it keeps this honest
// with no edit here — the same reasoning as themeAccent above.
const darkModeBlock = /darkMode:\s*\n((?:\s{6,}[a-zA-Z]+:.*\n)+)/.exec(config)?.[1] ?? ""
const deskDark = Object.fromEntries(
  [...darkModeBlock.matchAll(/^\s+([a-zA-Z]+):\s*"?\s*(#[0-9A-Fa-f]{6})"?/gm)].map((m) => [
    m[1],
    m[2].toUpperCase(),
  ]),
)

// storefront token → the Desk token it must equal. Only the pairs where the two
// halves are genuinely the same colour appear here; the storefront's own
// `--border`/`--surface` alpha tokens have no Desk equivalent and are excluded
// rather than being given a pretend counterpart.
//
// `lightgray` and `darkgray` SWAP MEANING BETWEEN MODES, and that is the whole
// reason this table is written out rather than inferred. In lightMode,
// `lightgray` is the pale hairline (#A8B5C9) and `darkgray` is the near-black
// surface (#111F2E). In darkMode they are exchanged: `lightgray` becomes the
// dark surface (#111F2E) and `darkgray` becomes the pale one (#A8B5C9). The
// names describe the LIGHT theme and are meaningless in the dark one.
//
// Reading them "obviously" produces exactly the two false failures this check
// reported on its first run — `--bg-secondary` compared against `--darkgray`
// and `--text-secondary` against `--lightgray`, both wrong, both flagged as
// drift. Mapping by name is the trap; mapping by VALUE is the fix, and the
// table below is the corrected mapping.
const SHARED = [
  ["--bg-deep", "light", "page background"],
  ["--bg-secondary", "lightgray", "raised surface (darkMode lightgray)"],
  ["--text-primary", "dark", "body text"],
  ["--text-secondary", "darkgray", "secondary text (darkMode darkgray)"],
  ["--text-muted", "gray", "muted text"],
]

const drifted = []
for (const [storeToken, deskToken, role] of SHARED) {
  const store = new RegExp(`${storeToken}:\\s*(#[0-9A-Fa-f]{6})`).exec(storefrontCss)?.[1]
  const desk = deskDark[deskToken]
  if (!store || !desk) continue // nothing to compare; the coverage check below catches absence
  if (store.toUpperCase() !== desk) drifted.push(`${storeToken} ${store} ≠ --${deskToken} ${desk}`)
}
check(
  drifted.length === 0,
  `every shared colour matches the Desk's dark palette (${
    drifted.length ? drifted.join("; ") : `${SHARED.length}/${SHARED.length} in agreement`
  })`,
)

// Coverage, so the comparison above cannot pass by silently matching nothing.
// Without this, deleting a token from style.css makes the loop `continue` on
// every pair and the check reports a clean `5/5` while comparing zero values —
// the same "a guard that cannot fail" trap the contrast guards in §12.1a record.
const storeTokensDeclared = SHARED.filter(([t]) =>
  new RegExp(`${t}:\\s*#[0-9A-Fa-f]{6}`).test(storefrontCss),
).length
check(
  storeTokensDeclared === SHARED.length,
  `the storefront declares every token the palette check compares (${storeTokensDeclared}/${SHARED.length})`,
)
check(
  Object.keys(deskDark).length > 0,
  `the Desk's dark palette is readable from quartz.config.yaml (${Object.keys(deskDark).length} colours)`,
)

// Fonts are the other half of "one brand". The storefront comment claims the
// faces are shared with the Brain; that claim was never checked, and it is
// exactly the kind of comment that goes stale.
//
// Scoped to the CORE `typography:` block, not matched anywhere in the file. The
// config declares the faces TWICE — core at the top, and again in the
// `@quartz-community/quartz-fonts` plugin lower down — and a global regex over
// both finds the second block's empty `header:` and matches across the newline
// (because `\s` eats newlines), silently losing `code:` and reporting two faces
// on a site that configures three. Scope the read; do not widen the pattern.
//
// Captured by INDENTATION rather than by "every line that looks like a key",
// because this block has four comment lines inside it. A `key: value` line
// pattern stops at the first comment and captures an empty string, which is how
// the first version of this reported "Desk none" on a block that plainly says
// `body: Lora`.
const coreTypography = (() => {
  const lines = config.split("\n")
  const start = lines.findIndex((l) => /^\s+typography:\s*$/.test(l))
  if (start === -1) return ""
  const indent = lines[start].search(/\S/)
  const out = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") continue
    if (line.search(/\S/) <= indent) break // dedented out of the block
    out.push(line)
  }
  return out.join("\n")
})()
const deskFaces = [...coreTypography.matchAll(/^\s+(header|body|code):\s*(.+?)\s*$/gm)].map(
  (m) => m[2],
)
const storeFaces = ["--font-display", "--font-body", "--font-mono"]
  .map((t) => new RegExp(`${t}:\\s*"([^"]+)"`).exec(storefrontCss)?.[1])
  .filter(Boolean)
check(
  deskFaces.length === 3 && storeFaces.length === 3,
  `both halves declare all three brand faces (Desk ${deskFaces.join("/") || "none"}, storefront ${storeFaces.length}/3)`,
)
check(
  storeFaces.length === 3 && storeFaces.every((f) => deskFaces.includes(f)),
  `the storefront and the Desk load the same typefaces (${storeFaces.join(", ") || "none"})`,
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
//
// 11.9.10 — "forward into the archive" used to mean `href="newsletters/"`. That
// page is gone, folded into the year sections at the foot of this same page, so
// the button now jumps to that section. The guard follows: it asserts the jump
// target EXISTS on the page, not just that some link was changed, so a stale
// anchor here would fail rather than scroll nowhere.
{
  const archiveAnchor = /id="everything-by-year"/.test(homeDoc)
  check(
    archiveAnchor,
    "the archive jump target actually exists on the landing page (no dead anchor)",
  )
  check(
    !/Browse the archive/.test(homeDoc) && !/Back to the main site/.test(homeDoc),
    "the Desk carries no body copy, no buttons and no link back",
  )
  // The check above only knows two specific strings. This one does not care what
  // anybody writes: it asserts the Desk's rendered markdown body is EMPTY.
  //
  // Tested by putting a plain sentence back into content/index.md. The string
  // guard above missed that sentence — it fired only by accident, because the
  // sentence quoted the button labels somewhere in its text. An assertion on the
  // body container itself cannot miss it, and it covers the buttons, the hint
  // line, and any prose nobody has written yet.
  //
  // `.markdown-preview-view` is the body container; it is empty exactly when the
  // page renders `<div class="markdown-preview-view markdown-rendered"></div>`.
  //
  // The first attempt sliced from `<article>` to `<section class="eb-hub">` and
  // got a zero-length string, because the hub renders BEFORE the article — both
  // are slotted `afterBody` but the hub sits at priority 10 and the article body
  // is emitted ahead of it. Anchoring on the container is stable regardless of
  // what order the slots resolve in.
  check(
    /<div class="markdown-preview-view markdown-rendered"><\/div>/.test(homeDoc),
    "the Desk's rendered body is empty (no prose, no buttons, no links)",
  )
  check(
    !/class="eb-post-dates"/.test(homeDoc),
    "the Desk states no publication date (an archive index is not a dispatch)",
  )
  // The standfirst survives: it is the only sentence that tells a search engine
  // what this page is, and it is the one piece of copy here doing real work.
  check(
    /class="eb-post-deck"/.test(homeDoc),
    "the Desk keeps its standfirst and its meta description",
  )
  // Whether every real post still shows its own Published date is asserted at the
  // end of this file, next to `builtPosts` — it is declared there, and a guard that
  // reaches forward into a later binding crashes the suite instead of failing it.

  // And the retired URL must not be linked from anywhere in the built site.
  // A link to a redirect stub still works, but it is a bounce through a page
  // that no longer exists, and nothing should be pointing at it.
  let staleArchiveLinks = 0
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name.endsWith(".html") && !p.includes(`${join("public", "newsletters")}`))
        if (/href="[^"]*ewsletters\/\$?"/.test(readFileSync(p, "utf-8"))) staleArchiveLinks++
    }
  }
  walk(join(brain, "public"))
  check(
    staleArchiveLinks === 0,
    `nothing in the built site still links to /newsletters/ (${staleArchiveLinks} found)`,
  )
}

// (d) The recent-posts list is generated, not typed — the property the
// hand-written doors and year cards did not have.
//
// 12.7: this was asserted against `@quartz-community/recent-notes`' markup
// (`class="recent-notes"` / `recent-li`). That component is now DISABLED and
// replaced by ./quartz/plugins/eb-latest, which renders in the body instead of
// the sidebar, so the assertion follows the new markup. The property being
// protected is unchanged: five posts, newest first, generated from the build.
const latestItems = (homeDoc.match(/class="eb-latest__item"/g) ?? []).length
check(
  /class="eb-latest"/.test(homeDoc) && latestItems === 5,
  `the landing page lists the newest 5 dispatches, generated (found ${latestItems})`,
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
// `newsletters/2023/index.html` used to be on this list, as a folder listing. It
// is not any more: 11.9.10 turned it into a redirect stub, so asserting anything
// about its markup is meaningless — and worse, reading it unconditionally threw
// ENOENT whenever the stub was absent, which killed the whole suite and hid the
// 60-odd checks that had not run yet.
//
// The homepage is deliberately NOT in this list. content/index.md carries its own
// description, so a standfirst there is correct and wanted. The first version of
// this check listed index.html and failed - the component was right and the
// assertion was wrong.
const descriptionless = [
  join(brain, "public", "404.html"),
  join(brain, "public", "tags", "process.html"),
  join(brain, "public", "tags", "index.html"),
]
check(
  descriptionless
    .filter((f) => existsSync(f))
    .every((f) => !/class="eb-post-deck"/.test(readFileSync(f, "utf-8"))),
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
//
// 11.9.11 — the floor is now `min(460px, 100%)`. The bare `minmax(460px, 1fr)`
// could not narrow below 460px, so on a phone it laid out a 460px track inside a
// ~360px container and overflowed the page sideways: the cards were too wide and
// the whole Desk scrolled horizontally. `min()` makes the floor adaptive.
//
// This guard checks the WHOLE expression, not just that "460px" appears. Asserting
// the substring would have passed against the broken version, because the broken
// version contains it too — the same near-miss selector that let the 11.9.7 image
// and sidebar guards pass while broken.
check(
  /\.eb-hub\{[^}]*minmax\(min\(460px,100%\),1fr\)/.test(hubCss),
  "the hub floor is adaptive (min(460px, 100%)) so it cannot overflow a phone",
)
check(
  !/minmax\(460px,1fr\)/.test(hubCss),
  "the hub has no hard 460px minimum a narrow screen cannot meet",
)

// ── 11.9.7 e/f/g: the three desktop sizing fixes ───────────────────────────
//
// Each of these was recorded as a symptom with a guess at the cause. Two of the
// three guesses were wrong, so each guard asserts the measured fact rather than
// the symptom's name.

// (e) The search field. The plan said "never resized after the sidebar change".
// Wrong: NO stylesheet in the project has ever given `.search-bar` a width, so
// it rendered at the browser default ~170px inside a `width: 65%` overlay.
check(
  /\.search-bar\{[^}]*width:100%/.test(hubCss),
  "the search field fills its overlay (it had no width rule at all)",
)

// (f) Post images. `img { max-width: 100% }` is not a size — it means "as wide
// as the column", and the column is 780px, so every image was a full-bleed slab.
// 11.11 adds the height half: a 40rem width cap leaves a 1070×1708 portrait
// ~1000px tall, so `max-height: 80vh` caps the tall dimension too. Both are
// asserted — a width-only regression would pass a width-only guard while
// portrait covers quietly went full-viewport again.
check(
  /\.page article img\{[^}]*max-width:40rem/.test(hubCss),
  "article images are capped at 40rem and centred (they were filling 780px)",
)
check(
  /\.page article img\{[^}]*max-height:80vh/.test(hubCss),
  "article images are capped at 80vh tall (portrait covers were ~1000px)",
)

// (f) THE GUARD THAT MATTERS, and the one this round of work exists for. The
// first version of the fix used `.page article .content img`. It compiled, it
// beat the base rule, and it matched 0 of the 186 images in the built posts —
// there is no `.content` wrapper in this project's article bodies. A selector
// that matches nothing looks exactly like a selector that works.
//
// So: count the real images, then require that the shipped rule could select
// them. A selector check alone would have passed forever.
{
  let imgsInArticle = 0
  for (const f of builtPosts) {
    const html = readFileSync(join(brain, "public", f), "utf-8")
    const a0 = html.indexOf("<article")
    const a1 = html.indexOf("</article>")
    if (a0 === -1 || a1 === -1) continue
    for (const m of html.slice(a0, a1).matchAll(/<img\b/g)) imgsInArticle++
  }
  check(
    imgsInArticle > 0,
    `built posts contain images to size (${imgsInArticle} found inside <article>)`,
  )
  // `.content` does not exist in these article bodies. If someone reintroduces
  // that wrapper the image cap would silently stop applying, so the class this
  // project actually uses is pinned here.
  const sampleHtml = readFileSync(join(brain, "public", builtPosts[0]), "utf-8")
  check(
    !/class="content"/.test(sampleHtml),
    "article bodies carry no `.content` wrapper (a selector assuming one is a trap)",
  )
  check(
    /markdown-preview-view/.test(sampleHtml),
    "article bodies use `.markdown-preview-view`, which is what to target",
  )
}

// (g) The left sidebar. §4b widened it to 420px while both panels were
// symmetric; with the right one reclaimed the track kept 420px and the archive
// tree got 356px of content.
// The built CSS is minified, so there is no space between the closing quote and
// the `/` of the track list. An earlier version of this regex expected one and
// failed against a rule that was demonstrably in the stylesheet.
//
// Then it failed the other way. A looser regex — `grid-sidebar-left grid-footer"/
// 320px auto` — matched TWO rules: this one and an unrelated breakpoint that
// carries a `grid-sidebar-right` column. So reverting this rule to 420px still
// passed, because the other one still said 320px. A guard that cannot tell the
// rule it means from a rule that merely looks like it is not a guard either.
//
// Hence the full three-row template with NO grid-sidebar-right, which is what
// makes this the single-sidebar desktop shell.
check(
  /grid-sidebar-left grid-header""grid-sidebar-left grid-center""grid-sidebar-left grid-footer"\/320px auto/.test(
    hubCss,
  ),
  "the desktop sidebar track is 320px, not the 420px §4b left behind",
)

// The reading measure must survive all three of these. The article column is
// capped at 780px and the image cap at 640px, so an image must never be able to
// out-measure its own column.
//
// 12.6: this regex used to tolerate a `:not(.eb-hub__card)` suffix, because that
// was the shape the override had taken — a base rule carved around our cards.
// The tolerance is REMOVED rather than left in place. A selector with an escape
// hatch in it is precisely the thing §12.6 agreed to stop doing, and a guard that
// permits it back is a guard that cannot catch its own regression. This now
// demands the plain, stock selector.
check(
  /\.page article\{[^}]*max-width:780px/.test(hubCss),
  "the article reading column still holds its 780px measure",
)

// ── 12.6: the hub cards must not be `<article>` ─────────────────────────────
//
// The whole F15 workaround existed because the topic cards were `<article>`,
// which put them inside Quartz's reading-column rule: capped at 780px AND
// un-stretched by `margin-inline: auto`, giving the 399-524px ragged range. The
// 12.6 fix was to stop opting in — tag-hub emits a `<div>` — so both
// compensations could be deleted rather than narrowed.
//
// Two guards, because either alone is half the check: the CSS could be reverted
// while the markup stays correct (visually fine, override silently back), or the
// markup could change while the CSS stays (cards visibly capped and ragged).
// Asserting the DOM and the stylesheet together is the only way to know the
// override is actually unnecessary rather than merely unused.
// Read here rather than reusing the `hubHtml` declared further down with the
// rest of the hub checks: a `const` cannot be used before its declaration, and
// hoisting the whole hub section upward would move that discussion away from
// where it belongs. One local read, named for what it is.
const deskHtml = readFileSync(join(brain, "public", "index.html"), "utf8")
check(
  !/<article class="eb-hub__card"/.test(deskHtml),
  "12.6: the hub cards are not <article> (which is what forced the reading-measure override)",
)
check(
  !/margin-inline:\s*0/.test(hubCard),
  "12.6: the compensating margin-inline:0 is gone from .eb-hub__card",
)
check(
  !/\.page article:not\(/.test(hubCss),
  "12.6: the reading-measure rule is stock, with no :not() escape hatch",
)

// ── 11.9.10: the by-year fold-outs, and the retirement of /newsletters/ ─────
//
// The archive used to be five pages. `/newsletters/` was a page whose entire
// content was a list of four year links; each year was a folder page listing the
// posts inside it. All of it is now collapsible sections on the Desk.

{
  // 1. The fold-outs exist, one per year, on the Desk — the year count is
  // derived from the built year folders, not hardcoded, so a new year of
  // posts cannot fail this guard.
  const builtYears = readdirSync(join(brain, "public", "newsletters"), {
    withFileTypes: true,
  })
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
  const folds = (homeDoc.match(/class="eb-years__fold"/g) ?? []).length
  check(folds === builtYears.length, `the Desk carries one year fold-out per year (found ${folds}, built ${builtYears.length})`)
  check(
    /<details class="eb-years__fold" open>/.test(homeDoc),
    "the newest year's fold-out is open by default (a closed one reads as broken)",
  )

  // 2. THE ONE THAT MATTERS: every post appears exactly once in the year list.
  // This is the whole point of the fold-outs — it is the complete archive, so a
  // post missing here is a post the site has quietly stopped offering. Counting
  // <li> rows against the posts we know build is the only check that catches it.
  const yearRows = (homeDoc.match(/class="eb-years__row"/g) ?? []).length
  check(
    yearRows === builtPosts.length,
    `the by-year list holds every post exactly once (${yearRows}/${builtPosts.length})`,
  )

  // 3. Every year row links somewhere real. A fold-out of 49 dead links is worse
  //    than the folder pages it replaced.
  const deadYearLinks = [...homeDoc.matchAll(/class="internal eb-years__link" href="\.\/([^"]+)"/g)]
    .map((m) => m[1])
    .filter((slug) => !existsSync(join(brain, "public", `${slug}.html`)))
  check(
    deadYearLinks.length === 0,
    `every fold-out row links to a real post${
      deadYearLinks.length ? ` (${deadYearLinks.length} dead: ${deadYearLinks.slice(0, 2)})` : ""
    }`,
  )

  // 4. The headings count what is actually there. This is the guard against the
  //    number drifting from the content, which is how "51 posts" became a lie
  //    twice in this project's history.
  check(
    new RegExp(`${builtPosts.length} posts</span>`).test(homeDoc),
    "the fold-out heading counts the real number of posts",
  )

  // 5. Descending years, checked in document order rather than trusted.
  const yearOrder = [...homeDoc.matchAll(/class="eb-years__year">(\d{4})</g)].map((m) => m[1])
  check(
    yearOrder.join(",") === [...yearOrder].sort((a, b) => b - a).join(","),
    `the fold-outs run newest year first (${yearOrder.join(", ") || "none found"})`,
  )

  // 6. 12.1(c) — the year folders are REAL pages again, not redirect stubs.
  // The Explorer builds its tree from the file tree, so it advertises
  // /newsletters/<year>/ as clickable folders; a redirect there is a bounce
  // through a page that no longer exists. year-archives emits the four pages.
  //
  // existsSync, not readFileSync — a missing file is a failed check, not a
  // crashed suite (see the original comment, kept because the lesson holds).
  const yearPaths = [
    "newsletters/2023",
    "newsletters/2024",
    "newsletters/2025",
    "newsletters/2026",
  ]
  const readYear = (p) => {
    const f = join(brain, "public", p, "index.html")
    return existsSync(f) ? readFileSync(f, "utf-8") : null
  }
  const missingYears = yearPaths.filter((p) => readYear(p) === null)
  check(
    missingYears.length === 0,
    `every year folder resolves to a real archive page (${
      missingYears.length ? `missing: ${missingYears.join(", ")}` : "all 4 present"
    })`,
  )
  const stillStubs = yearPaths.filter((p) => {
    const doc = readYear(p)
    return doc !== null && doc.includes('http-equiv="refresh"')
  })
  check(
    stillStubs.length === 0,
    `the year archives are pages, not redirect stubs${
      stillStubs.length ? ` (still stubs: ${stillStubs.join(", ")})` : ""
    }`,
  )
  // 6b. The top-level /newsletters/ stays a redirect: nothing links there but
  // old bookmarks and the sitemap do, and there is no year to show on it.
  const topStub = readYear("newsletters")
  check(
    topStub !== null && topStub.includes('http-equiv="refresh"'),
    "the retired top-level /newsletters/ still emits a redirect",
  )

  // 7. The top-level redirect points at the Desk, derived from baseUrl rather
  //    than a guess — and must NOT point at itself, which is what a copy-paste
  //    of the wrong slug would produce.
  //
  //    baseUrl is read out of the config rather than hardcoded here. If it ever
  //    changes the emitter follows it, and this guard has to follow it too, or it
  //    would be asserting against a value the site stopped using.
  const baseUrl = config.match(/^\s*baseUrl:\s*(\S+)/m)?.[1] ?? ""
  check(
    baseUrl === "emersonblackwrites.com/desk",
    "baseUrl is readable from the config for the redirect guard",
  )
  const topTo = topStub?.match(/http-equiv="refresh" content="0; url=([^"]+)"/)?.[1]
  check(
    !!topTo && topTo === `https://${baseUrl.replace(/\/$/, "")}/`,
    "the top-level /newsletters/ redirect points at the Desk",
  )

  // 7b. Each year page lists exactly its year's posts, newest first, each with
  // its standfirst — the same contract as the Desk fold-outs, which remain the
  // canonical archive. Counts are derived from the built posts, not hardcoded,
  // so a new year is caught either way.
  const yearOf = (f) => f.split("/")[1]
  const yearsOk = yearPaths.every((p) => {
    const year = p.split("/")[1]
    const doc = readYear(p)
    if (!doc) return false
    const want = builtPosts.filter((f) => yearOf(f) === year)
    const rows = (doc.match(/class="section-li"/g) ?? []).length
    const descs = (doc.match(/class="eb-listing-desc"/g) ?? []).length
    if (rows !== want.length || descs !== want.length) return false
    return want.every((f) => {
      const slug = f.replace(/\.html$/, "")
      return doc.includes(slug)
    })
  })
  check(
    yearsOk,
    "each year archive lists exactly its year's posts with standfirsts",
  )

  // 8. folder-page stays off. It is what regenerated the year folders, and a
  //    silently re-enabled plugin is the regression this whole change risks.
  check(
    /source: "@quartz-community\/folder-page"\s*\n\s*enabled: false/.test(config),
    "folder-page stays disabled (it is what regenerates the year folders)",
  )
  check(
    !existsSync(join(brain, "content", "Newsletters", "index.md")),
    "content/Newsletters/index.md stays deleted",
  )

  // 9. The posts themselves are untouched. The count is derived from the
  // build, not hardcoded — the vault republishes content/index.md and
  // content/Newsletters/index.md alongside the posts, and a fixed number
  // fails every time either returns. yearRows is block-local to guard 2, so
  // the row count is recomputed here rather than reached for.
  const postCount = builtPosts.length
  const yearRowCount = (homeDoc.match(/class="eb-years__row"/g) ?? []).length
  check(
    postCount > 0 && yearRowCount === postCount,
    `all ${postCount} posts still build after the archive was retired`,
  )

  // 10. NO PAGE STATES A COUNT IT CANNOT BACK UP. The recent-notes overflow line
  //     read `allFiles.length - limit`, and allFiles holds nine virtual tag pages
  //     plus content/index.md, so it said "See 53 more" and then "See 45 more"
  //     against 49 posts. There is no YAML option that expresses the one filter
  //     that would fix it, and a wrapper plugin supplying it silently removed the
  //     whole list from the page. So there is no overflow link at all rather than
  //     a wrong number, and the honest total is the fold-out heading's.
  //
  //     12.7: `recent-notes` is now disabled outright and eb-latest emits no
  //     count either, so the property holds for a second and stronger reason —
  //     there is no component left that COULD print one.
  check(!/See \d+ more/.test(homeDoc), "the Desk states no dispatch count it cannot verify")
  check(
    new RegExp(`>${builtPosts.length} posts</span>`).test(homeDoc),
    "the fold-out heading is the one place the archive states its size",
  )
  // And the list itself must still be there — the wrapper plugin took it away
  // silently, which is the failure this whole round is about. eb-latest has the
  // same exposure and a new way to lose it, so the count is asserted again.
  check(
    (homeDoc.match(/class="eb-latest__item"/g) ?? []).length === 5,
    "the Latest dispatches list still renders its five posts",
  )
  check(
    !/source: "\.\/quartz\/plugins\/latest-dispatches"/.test(config),
    "the failed recent-notes wrapper is not back in the config",
  )
  // 12.7 — the sidebar orphan must stay off. It was rendering, but ~30,000
  // characters after the cards it duplicated, inside the graph container: the
  // page answered "what is newest" in a place nobody reads. Re-enabling it would
  // put a second, invisible copy of this same list back on the Desk.
  check(
    /source: "@quartz-community\/recent-notes"[\s\S]{0,80}enabled: false/.test(config),
    "the sidebar recent-notes orphan stays disabled",
  )
  check(
    !/class="recent-notes"/.test(homeDoc),
    "no orphaned sidebar 'Latest dispatches' list is rendered anywhere",
  )

  // 11.9.11 — every post is recognisable without opening it.
  //
  // The cards already carried a standfirst and a date; the year rows carried a
  // date and nothing else, on the reasoning that a card already says it. That is
  // true of a preview and false of an index: a reader who opened 2023 to find one
  // dispatch got forty bare titles. Every year row now carries both.
  const yearDescs = (homeDoc.match(/class="eb-years__desc"/g) ?? []).length
  check(yearDescs === yearRows, `every year row carries its subtitle (${yearDescs}/${yearRows})`)
  // And the date is on both surfaces, not just one. `hubItems` is declared further
  // down this file, so it is counted here rather than reached for — same rule as
  // `builtPosts`: a guard that reaches forward crashes the suite instead of
  // failing it, and a crash tells you far less than a red line does.
  const hubDates = (homeDoc.match(/class="eb-hub__date"/g) ?? []).length
  const hubRowCount = (homeDoc.match(/class="eb-hub__item"/g) ?? []).length
  check(
    hubDates === hubRowCount,
    `every topic-card post shows its date (${hubDates}/${hubRowCount})`,
  )
  check(
    !/eb-hub__count/.test(homeDoc) && !/posts across \d+ topics/.test(homeDoc),
    "the Desk states no second, disagreeing total for itself",
  )
  // 11.9.11 — post-dates now returns null for slug "index", so the Desk shows no
  // "Published Jan 19, 2023". That guard is a slug check in a component used on
  // every page, so what matters is that it stopped at exactly one page.
  const postDateLines = builtPosts.filter((f) => {
    // `builtPosts` entries are "newsletters/<year>/<file>.html" — relative paths
    // that already end in the file. Joining an extra "/index.html" onto one of
    // those points at a path that does not exist, and existsSync swallows it, so
    // the count came back 0/49 and read as though post-dates had broken every post
    // on the site. It had not. The guard was reading a directory path for files
    // that are flat.
    const p = join(brain, "public", f)
    return existsSync(p) && /class="eb-post-dates"/.test(readFileSync(p, "utf-8"))
  })
  check(
    postDateLines.length === builtPosts.length,
    `every real post still shows its own Published date (${postDateLines.length}/${builtPosts.length})`,
  )
}

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

// 12.7 — eb-latest, the newest dispatches at the top of the Desk.
//
// The reader's own behaviour was the brief: they opened /desk/ and scrolled
// past the topic cards to the year fold-outs, because what they wanted was the
// newest writing. Both existing sections were thematic, so the one chronological
// question had no answer in the reading order.
//
// The list this guards already existed — `@quartz-community/recent-notes` was
// enabled and rendering — but at offset ~48465 in the built index, inside the
// sidebar's graph container. The page WAS answering the question, in the one
// place nobody scrolls. So the first two checks below are the ones that matter:
// the newest five must be in the BODY, and they must come before the cards.

// Document order, not just presence. `indexOf` compares character offsets, so
// this is a real assertion about reading order rather than about existence.
const iLatest = hubHtml.indexOf('class="eb-latest"')
const iHub = hubHtml.indexOf('class="eb-hub"')
const iYears = hubHtml.indexOf('class="eb-years"')
check(
  iLatest !== -1 && iHub !== -1 && iLatest < iHub && iHub < iYears,
  `the Desk leads with the newest dispatches, then topics, then years (offsets ${iLatest} < ${iHub} < ${iYears})`,
)

// AND in the body, not the sidebar. The old component's markup was also on this
// page and also said "Latest dispatches"; the difference is which element
// contains it, so this is asserted by the absence of the sidebar's own class.
check(
  !/class="recent-notes"/.test(hubHtml) && !/class="recent-li"/.test(hubHtml),
  "the newest-dispatches list is the body section, not a sidebar panel",
)

// Newest first, read from the rendered dates rather than trusted from the
// component's sort. The dates here are display strings ("Jun 2026"), so this
// checks the ORDER as a string comparison against the ISO in the attribute —
// which is why it compares `datetime`, not the text.
const latestDates = [...hubHtml.matchAll(/class="eb-latest__date" datetime="([^"]+)"/g)].map(
  (m) => m[1],
)
check(
  latestDates.length === 5 &&
    latestDates.join(",") === [...latestDates].sort().reverse().join(","),
  `the latest five are newest-first (${latestDates.map((d) => d.slice(0, 10)).join(", ")})`,
)

// Every one of them is a real post, so the list cannot rot into 404s.
const latestHrefs = [...hubHtml.matchAll(/eb-latest__link internal" href="([^"]+)"/g)].map((m) => m[1])
check(
  latestHrefs.length === 5 && latestHrefs.every((x) => x.startsWith("./newsletters/")),
  `all ${latestHrefs.length} latest links point at real newsletter posts`,
)

// Standfirsts, because 11.9.11's rule is that every post is recognisable
// without opening it — and `recent-notes` dropped `description`, which is one of
// the two reasons it was replaced rather than restyled.
const latestDescs = (hubHtml.match(/class="eb-latest__desc"/g) ?? []).length
check(
  latestDescs === 5,
  `every latest dispatch carries its standfirst (${latestDescs}/5)`,
)

// On the Desk and nowhere else. Same exposure tag-hub and year-foldouts have:
// the config's `condition: is-index` is a name Quartz does not know, so the
// component's own slug guard is the only thing holding it to one page.
let latestElsewhere = 0
{
  const walkLatest = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== "static") walkLatest(p)
      } else if (entry.name.endsWith(".html") && p !== join(brain, "public", "index.html")) {
        if (/class="eb-latest"/.test(readFileSync(p, "utf-8"))) latestElsewhere++
      }
    }
  }
  walkLatest(join(brain, "public"))
}
check(
  latestElsewhere === 0,
  `eb-latest renders on the Desk and on no other page (${latestElsewhere} others)`,
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
  skipped.push("computed-style + header geometry + wordmark (need Chrome and a server)")
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
    // S10/11.9.6: the header renders the stacked wordmark. The anchor keeps an
    // aria-label as the accessible name because the series line is aria-hidden,
    // so textContent alone cannot prove the name survived — measure both spans
    // and read the label.
    const wmLink = d.querySelector(".page-header .page-title a")
    out.push("mark=" + (wmLink ? getComputedStyle(wmLink, "::before").content : "ABSENT"))
    out.push("wmName=" + (wmLink ? wmLink.textContent.trim() : "ABSENT"))
    out.push("wmAria=" + (wmLink ? wmLink.getAttribute("aria-label") : "ABSENT"))
    // HEIGHT, not width. The anchor is display:flex with flex-direction:column,
    // so align-items:stretch makes BOTH spans exactly as wide as the anchor —
    // a width probe returns the same number twice whatever is inside it, and
    // would report two painted lines for a stack of empty ones. Height is what
    // actually distinguishes a rendered line from a collapsed one at
    // font-size:0, and the two lines carry different font sizes (1.15rem vs
    // 0.6rem) so their heights genuinely differ.
    out.push(
      "wmNameH=" +
        (wmLink
          ? Math.round(wmLink.querySelector(".eb-wordmark-name")?.getBoundingClientRect().height ?? -1)
          : -1),
    )
    out.push(
      "wmSeriesH=" +
        (wmLink
          ? Math.round(wmLink.querySelector(".eb-wordmark-series")?.getBoundingClientRect().height ?? -1)
          : -1),
    )
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

  // ── S10: the wordmark ────────────────────────────────────────────────────
  // 11.9.6 RETIRED the "EBW" trick and these checks were left behind asserting
  // it. They had been failing since that commit and nothing noticed, because the
  // browser-based checks only run when `public/` is being served — in a plain
  // `npx quartz build` they are skipped, so a permanently red section was
  // indistinguishable from a passing one. This is the sixth instance of the
  // pattern in 9.2: a guard that outlives the thing it guarded.
  //
  // What 11.9.6 shipped instead: the Wordmark plugin renders two real spans,
  // `.eb-wordmark-name` ("Emerson Black") and `.eb-wordmark-series` ("Seen in
  // Silverbridge"), stacked. No painted `::before`, no `font-size: 0`, and the
  // accessible name is a real aria-label rather than collapsed text.
  //
  // These assert the CURRENT contract. The property 11.9.6 was reaching for — a
  // short mark on screen with the real site name available to assistive tech —
  // is satisfied by the stacked mark without any of the fragile collapse
  // machinery, and that is worth protecting.
  check(
    hf("mark") === "none" || hf("mark") === "ABSENT",
    `the wordmark paints no ::before twin (got ${hf("mark") ?? "n/a"}) — 11.9.6 retired the EBW trick`,
  )
  check(
    hf("wmName") === "Emerson BlackSeen in Silverbridge",
    `the header wordmark renders the real stacked name, not a collapsed string (got: ${hf("wmName") ?? "n/a"})`,
  )
  // The series line is aria-hidden, so the accessible name is carried entirely
  // by the anchor's aria-label. Assert it directly — textContent alone cannot
  // show whether it survived, which is the half of the old guard that mattered.
  check(
    hf("wmAria") === "Emerson Black — home",
    `the wordmark link keeps a full accessible name (got: ${hf("wmAria") ?? "n/a"})`,
  )
  // Both lines must actually be visible. The failure the old version risked — a
  // mark painting while the real name is hidden at font-size 0 — is only
  // detectable by measuring both spans.
  check(
    Number(hf("wmNameH") ?? -1) > 0 && Number(hf("wmSeriesH") ?? -1) > 0,
    `both wordmark lines are painted (${hf("wmNameH") ?? "n/a"}px / ${hf("wmSeriesH") ?? "n/a"}px tall)`,
  )
  check(Number(hf("wmW") ?? -1) > 0, `the painted mark has real width (got: ${hf("wmW") ?? "n/a"}px)`)
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

// ── §12.1(a) metadata contrast, and F1–F4 dead-code guards ───────────────────
// A contrast bug produced a "the dates are missing" report (§12.1a / F16):
// presence checks cannot see contrast. So these compute WCAG ratios from the
// BUILT stylesheet — the old `--lightgray` on the hub card measured 1.82:1,
// below the 4.5:1 AA floor, which is why the dates read as absent. The guard
// resolves the real token values, rebuilds the card surface from the actual
// `color-mix()`, and fails if any Desk metadata drops under AA.
console.log("\nDesk metadata contrast + cruft (§12.1a, F1–F4)")

const cssText = unlayered || ""
const declsIn = (block) => {
  const out = {}
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) out[m[1]] = m[2].trim()
  return out
}
// Light: every attribute-less `:root{…}` (custom.scss is appended last, so the
// last declaration of a token wins). Dark: `:root[saved-theme=dark]{…}`.
const lightVars = {}
for (const m of cssText.matchAll(/:root\s*\{([^}]*)\}/g)) Object.assign(lightVars, declsIn(m[1]))
const darkVars = {}
for (const m of cssText.matchAll(/:root\[saved-theme=["']?dark["']?\]\s*\{([^}]*)\}/g))
  Object.assign(darkVars, declsIn(m[1]))

const toRgb = (v) => {
  if (!v) return null
  v = v.trim()
  const h = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v)
  if (h) {
    const c = [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16))
    return [...c, h[2] === undefined ? 1 : parseInt(h[2], 16) / 255]
  }
  const r = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/i.exec(v)
  return r ? [+r[1], +r[2], +r[3], r[4] === undefined ? 1 : +r[4]] : null
}
const lin = (c) => {
  c /= 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
const wcag = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]))
// color-mix(in srgb, A p%, B): premultiplied average; alpha = p·aA + (1-p)·aB
const mix = (a, b, p) => {
  const q = 1 - p
  const alpha = p * a[3] + q * b[3]
  return [...[0, 1, 2].map((i) => (p * a[3] * a[i] + q * b[3] * b[i]) / alpha), alpha]
}

// The card surface is read from the real `.eb-hub__card` background expression,
// so a change to the mix is caught rather than silently invalidating the check.
const cardRule = /\.eb-hub__card\s*\{([^}]*)\}/.exec(cssText)
const cardMix =
  cardRule &&
  /color-mix\(in srgb, var\((--[\w-]+)\)\s*([\d.]+)%, var\((--[\w-]+)\)\)/.exec(cardRule[1])

const AA = 4.5
for (const [mode, vars] of [["light", lightVars], ["dark", darkVars]]) {
  const meta = toRgb(vars["--eb-meta"])
  const base = toRgb(vars["--light"])
  check(Boolean(meta && base), `${mode}: --eb-meta and --light resolve from the built CSS`)
  if (!meta || !base) continue
  let surface = null
  if (cardMix) {
    const b = toRgb(vars[cardMix[1]])
    const t = toRgb(vars[cardMix[3]])
    if (b && t) surface = over(mix(b, t, parseFloat(cardMix[2]) / 100), base)
  }
  if (surface) {
    check(
      wcag(meta, surface) >= AA,
      `${mode}: --eb-meta on the hub card ≥ ${AA}:1 (${wcag(meta, surface).toFixed(2)}:1)`,
    )
  }
  check(
    wcag(meta, base) >= AA,
    `${mode}: --eb-meta on the page background ≥ ${AA}:1 (${wcag(meta, base).toFixed(2)}:1)`,
  )
  const descRule = /\.eb-hub__desc\s*\{([^}]*)\}/.exec(cssText)
  const descColor = descRule && /color:\s*var\((--[\w-]+)\)/.exec(descRule[1])
  const descOpacity = descRule && /opacity:\s*([\d.]+)/.exec(descRule[1])
  const fg = descColor && toRgb(vars[descColor[1]])
  if (surface && fg) {
    const op = descOpacity ? parseFloat(descOpacity[1]) : 1
    const blended = [...over([fg[0], fg[1], fg[2], op], surface), 1]
    check(
      wcag(blended, surface) >= AA,
      `${mode}: .eb-hub__desc (${descColor[1]} @ ${op}) on the card ≥ ${AA}:1 (${wcag(blended, surface).toFixed(2)}:1)`,
    )
  }
}
// Ownership: the metadata must actually draw from the AA token, so a future
// refactor cannot quietly revert it to the decorative `--lightgray`.
for (const sel of [".eb-hub__date", ".eb-years__total", ".eb-years__n", ".eb-years__date"]) {
  const rule = new RegExp(`\\${sel}\\s*\\{([^}]*)\\}`).exec(cssText)
  check(
    Boolean(rule) && /color:\s*var\(--eb-meta\)/.test(rule[1]),
    `${sel} draws its colour from --eb-meta`,
  )
}

// F1 — assert ABSENCE of the pruned landing kit (§9: a presence check cannot
// tell "pruned" from "regrown"), and §12.1(d)'s count chip must not return.
const ORPHANS = [
  "eb-hero", "eb-kicker", "eb-hero-title", "eb-hero-lede", "eb-section",
  "eb-section-title", "eb-grid", "eb-card", "eb-card-kicker", "eb-card-title",
  "eb-card-text", "eb-count", "eb-cta", "eb-trail", "eb-year", "eb-actions",
  "eb-btn", "eb-fine",
]
const survivors = ORPHANS.filter((c) => new RegExp(`\\.${c}(?![\\w-])`).test(cssText))
check(
  survivors.length === 0,
  `F1: no orphaned landing-kit class survives the prune${survivors.length ? ` — found ${survivors.join(", ")}` : ""}`,
)
check(
  !/eb-hub__n\b/.test(homeDoc) && !/eb-hub__n\b/.test(cssText),
  "12.1(d): the topic cards carry no second, contradicting count",
)
for (const p of ["canvas-page", "bases-page", "obsidian-plugin-excalidraw"]) {
  const block = new RegExp(`source:\\s*"@quartz-community/${p}"\\s*\\n\\s*enabled:\\s*(\\w+)`).exec(
    config,
  )
  check(Boolean(block) && block[1] === "false", `F2–F4: ${p} stays disabled (no matching input)`)
}
// ── §12.6: the override inventory must not go stale ─────────────────────────
//
// Every [OVERRIDE — upstream] block in custom.scss carries a MEASURED line
// saying what breaks if it is deleted, produced by disabling each block,
// rebuilding and re-measuring in Chrome (2026-10-04). All 13 proved load-
// bearing; the pill and highlight ones are the reason the truce exists at all.
//
// These checks cannot re-run that experiment — it needs a browser and thirteen
// rebuilds — so they assert the INVENTORY is intact rather than that it is
// still true. What they buy is the failure that actually happens: someone adds
// a new override, or deletes a measured line, and nobody notices the file is
// quietly no longer self-documenting.
//
// The measured values themselves go stale on a Quartz upgrade, and nothing here
// can detect that. It is recorded as a known limit rather than papered over: the
// upgrade-day procedure in package.json's `//ebw` block is where the audit gets
// re-run.
console.log("\nOverride inventory (§12.6)")
// The SOURCE stylesheet, not the built bundle: the banners and measured lines
// are comments, and comments do not survive compilation. Reading public/*.css
// would find none of them and this check would pass for the wrong reason —
// the same mistake the highlight guard made when it grepped index.html.
const customCss = readFileSync(join(brain, "quartz", "styles", "custom.scss"), "utf8")
const overrideBlocks = customCss.split("\n").filter((l) => l.includes("OVERRIDE — upstream"))
const measuredLines = customCss.split("\n").filter((l) => l.includes("MEASURED 2026-10-04"))
// The header block that documents the audit also contains the string, so it is
// not a block. Count banners that are NOT inside the header comment.
const realBanners = overrideBlocks.filter((l) => !l.includes("[OVERRIDE — upstream]  Restyles"))
check(
  realBanners.length > 0,
  `custom.scss still carries override banners (${realBanners.length} found)`,
)
check(
  measuredLines.length === realBanners.length,
  `every override block carries a measured verdict (${measuredLines.length}/${realBanners.length})`,
)
check(
  /All \d+ are LOAD-BEARING/.test(customCss),
  "the stylesheet header records that the audit found nothing deletable",
)
// The two that the whole truce rests on, named so their loss is loud.
//
// Matched on fragments that survive being wrapped across comment lines: the
// first version searched for "0.18-alpha crimson slab" as one string and failed,
// because that phrase is split over two lines in the header. A guard that
// asserts on reflowed prose will break the next time someone edits a comment,
// so match the short anchors instead.
for (const [needle, what] of [
  ["rgba(255, 208, 0", "the amber search-highlight the highlight override prevents"],
  ["0.18-alpha", "the tag-pill slab the pill override prevents"],
]) {
  check(customCss.includes(needle), `the header still warns about ${what}`)
}

// ── §12.6: Quartz provenance, so an upgrade is diffable ─────────────────────
//
// Quartz core is VENDORED here — brain/quartz is upstream's own source tree,
// edited in place — so there is no dependency to pin and `npm update` cannot
// move it. An upgrade is a manual copy of upstream's files over ours, which
// means the only thing standing between "upgrade" and "silent divergence" is a
// record of what we forked from. brain/package.json's `//ebw` block carries it.
//
// These checks are deliberately OFFLINE and structural. They assert the record
// is present, internally consistent, and shaped like a real commit — NOT that
// the commit still exists upstream, because a verify suite that needs the
// network fails on a plane and teaches people to ignore it. The upstream check
// is a separate, opt-in command (below) that you run once a year or before an
// upgrade.
console.log("\nQuartz provenance (§12.6)")
const pkg = JSON.parse(readFileSync(join(brain, "package.json"), "utf8"))
const prov = pkg["//ebw"]
check(
  !!prov && !!prov.upstream && !!prov.upstreamRef && !!prov.upstreamCommit,
  `brain/package.json records which Quartz we forked from (${prov?.upstreamRef ?? "no //ebw block"})`,
)
check(
  prov?.upstreamCommit === (prov?.upstreamCommit ?? "").toLowerCase() &&
    /^[0-9a-f]{40}$/.test(prov?.upstreamCommit ?? ""),
  `the recorded commit is a full 40-char SHA, not an abbreviation (${(prov?.upstreamCommit ?? "").slice(0, 12)}…)`,
)
// version and upstreamRef must agree. These drift apart the moment someone
// bumps one and not the other, and the resulting record is worse than none:
// it looks authoritative and is wrong.
check(
  !!prov && prov.upstreamRef === `v${pkg.version}`,
  `package version and upstreamRef agree (${pkg.version} vs ${prov?.upstreamRef ?? "—"})`,
)
check(
  Array.isArray(prov?.upgradeDay) && prov.upgradeDay.length >= 4,
  `the record carries an upgrade-day procedure (${prov?.upgradeDay?.length ?? 0} steps)`,
)
// The two replacement plugins are the stated fragile pair; the procedure must
// actually name them, or it is a checklist that misses the whole point.
const step3 = (prov?.upgradeDay ?? []).join(" ")
check(
  /listing-descriptions/.test(step3) && /year-archives/.test(step3),
  "the upgrade procedure names both replacement plugins as the first thing to check",
)

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s): the build is not as intended.`)
  process.exit(1)
}
console.log(`\n✓ Default is "${EXPECTED_DEFAULT}", order-independent, toggle visible.`)
console.log(`✓ Layout, header, fonts, favicon, storefront palette and the S10 rename all hold.`)
// The omissions, stated in the summary rather than only mid-scroll. F18's three
// dead checks were invisible because a skip prints one line in the middle of the
// output and still reports a clean total; a reader who only sees the last two
// lines has been told everything passed. This cannot be skimmed past.
if (skipped.length) {
  console.log(
    `\n! ${skipped.length} section(s) NOT CHECKED — ${skipped.join("; ")}.\n` +
      `  The pass above is real but INCOMPLETE. Serve public/ and re-run for a full verdict.`,
  )
}
