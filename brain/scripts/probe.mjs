/**
 * probe-lib.mjs — measure the Desk as a browser actually renders it.
 *
 * Usage:  node probe-lib.mjs <pageRelPath> [viewportWidth]
 * Prints one `key=value` per line. Used by the override audit to compare a
 * baseline build against a build with one override disabled, so "can this
 * override be deleted?" is answered by measurement, not by reading a comment
 * about specificity.
 *
 * Everything is COMPUTED style or measured geometry. No screenshots, no
 * eyeballing — `--screenshot` captures once produced byte-identical PNGs.
 */
import { execFileSync } from "node:child_process"
import { existsSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"

const CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]
const chrome = CANDIDATES.find((p) => existsSync(p))
if (!chrome) {
  console.error("CHROME_MISSING")
  process.exit(2)
}

const page = process.argv[2] ?? "index.html"
const vw = Number(process.argv[3] ?? 1440)
const probePath = join("public", "__audit_probe.html")
// The probe. Deliberately wide: it measures what the override sections claim to
// affect, so a deletion that changes any of them shows up as a diff.
const probe = `
const d = f.contentDocument
const px = (v) => Math.round(v)
const cs = (sel, prop) => { const e = d.querySelector(sel); return e ? getComputedStyle(e).getPropertyValue(prop).trim() : "MISSING" }
const box = (sel) => { const e = d.querySelector(sel); return e ? e.getBoundingClientRect() : null }

// --- shell geometry ---
const pg = d.querySelector(".page")
const header = d.querySelector(".page-header")
const sidebar = d.querySelector(".sidebar.left, .sidebar")
const article = d.querySelector(".page article")
const centre = d.querySelector(".center")
out.push("vw=" + d.documentElement.clientWidth)
out.push("scrollW=" + d.documentElement.scrollWidth)
out.push("overflow=" + (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1))
if (pg) out.push("pageCols=" + getComputedStyle(pg).gridTemplateColumns)
if (centre) out.push("centreW=" + px(centre.getBoundingClientRect().width))
if (article) { out.push("articleW=" + px(article.getBoundingClientRect().width)); out.push("articleMaxW=" + getComputedStyle(article).maxWidth) }
if (header) out.push("headerH=" + px(header.getBoundingClientRect().height))

// --- sidebar / panels ---
if (sidebar) { out.push("sideW=" + px(sidebar.getBoundingClientRect().width)); out.push("sideMinW=" + getComputedStyle(sidebar).minWidth) }
out.push("explorerLinks=" + d.querySelectorAll(".explorer a.nav-file-title").length)
out.push("explorerFont=" + cs(".explorer a.nav-file-title", "font-size"))
out.push("recentH3Font=" + cs(".recent-notes .desc h3", "font-family"))
out.push("graphH=" + px((box(".graph-outer")||{height:0}).height))
out.push("graphBorder=" + cs(".graph-container", "border-top-width"))

// --- typography ---
out.push("bodyFont=" + cs(".page p", "font-family"))
out.push("h1Font=" + cs("h1.article-title", "font-family"))
out.push("pFontSize=" + cs(".page p", "font-size"))
out.push("pLineHeight=" + cs(".page p", "line-height"))

// ── CHROME TYPEFACES AND CASE ───────────────────────────────────────────────
// font-SIZE alone is not enough to catch a font block. Two override blocks do
// nothing but change font-family or text-transform on chrome, and the probe
// that reported them as having "no measured effect" only ever read sizes —
// the exact coverage mistake F19 is about. The explorer size returned 13.76px
// both with and without the block, because the block never touched the size.
//
// (Backticks are avoided in this comment deliberately: the whole probe lives
// inside a JS template literal, and a backtick here terminates it — which is
// exactly the bug an earlier version of this file shipped with.)
//
// So read the properties these blocks actually set: the family, the case, and
// the tracking, on every piece of chrome the stylesheet names.
out.push("explorerLinkFF=" + cs(".explorer a.nav-file-title", "font-family"))
out.push("explorerFolderFF=" + cs(".explorer .folder-title", "font-family"))
out.push("explorerFolderTT=" + cs(".explorer .folder-title", "text-transform"))
out.push("searchFF=" + cs(".search-button", "font-family"))
out.push("pageTitleFF=" + cs(".page-title", "font-family"))
out.push("pageTitleTT=" + cs(".page-title", "text-transform"))
out.push("pageTitleLS=" + cs(".page-title", "letter-spacing"))
out.push("graphH3FF=" + cs(".graph h3", "font-family"))
out.push("backlinkFF=" + cs(".backlinks ul a", "font-family"))
out.push("recentLinkFF=" + cs(".recent-notes ul a", "font-family"))
out.push("breadcrumbFF=" + cs(".breadcrumb-element a", "font-family"))
out.push("pillFF=" + cs("ul.tags a.tag-link", "font-family"))

// ── THE LISTING GRID ────────────────────────────────────────────────────────
// .page-listing renders only on the year and tag archives. Probing the Desk
// for it returns ABSENT and reports "no effect" for a block that governs every
// archive page — the other half of the F19 mistake. Read it, and read the row
// grid whose template the block rewrites.
out.push("listingMT=" + cs(".page-listing", "margin-top"))
out.push("listingFirstFF=" + cs(".page-listing > p:first-child", "font-family"))
out.push("listingFirstTT=" + cs(".page-listing > p:first-child", "text-transform"))
out.push("listingFirstFS=" + cs(".page-listing > p:first-child", "font-size"))
out.push("sectionCols=" + cs(".page-listing li.section-li > .section", "grid-template-columns"))
out.push("sectionULPad=" + cs(".page-listing ul.section-ul", "padding-left"))
out.push("listingH3FS=" + cs(".page-listing .desc h3", "font-size"))
out.push("listingDescFS=" + cs(".page-listing .eb-listing-desc", "font-size"))
out.push("rows=" + String(d.querySelectorAll(".page-listing li.section-li").length))

// --- lists ---
const card = d.querySelector(".eb-hub__card")
if (card) { out.push("cardW=" + px(card.getBoundingClientRect().width)); out.push("cardRadius=" + getComputedStyle(card).borderRadius) }
out.push("hubCards=" + d.querySelectorAll(".eb-hub__card").length)
const li = d.querySelector(".page-listing li.section-li .section")
if (li) out.push("listingCols=" + getComputedStyle(li).gridTemplateColumns)
const pill = d.querySelector("ul.tags a.tag-link")
out.push("pillBg=" + (pill ? getComputedStyle(pill).backgroundColor : "NO PILL"))
out.push("pillRadius=" + (pill ? getComputedStyle(pill).borderRadius : "NO PILL"))

// --- tokens ---
const root = getComputedStyle(d.documentElement)
for (const t of ["--secondary","--tertiary","--highlight","--textHighlight"]) {
  out.push(t + "=" + root.getPropertyValue(t).trim())
}
out.push("selBg=" + cs("::selection", "background-color"))
out.push("hlBg=" + cs(".highlight", "background-color"))
out.push("thBg=" + cs(".text-highlight", "background-color"))
out.push("bodyBgImage=" + (getComputedStyle(d.body).backgroundImage === "none" ? "none" : "present"))
out.push("grainPresent=" + (getComputedStyle(d.body, "::after").content !== "none"))
out.push("focusOutline=" + cs(":focus-visible", "outline-color"))

// Classes the page may not contain still need measuring, so SYNTHESISE them
// rather than reporting MISSING. A page with no tag pills would otherwise
// score the pill override as "no change" and it would look deletable — which
// is precisely the false negative this audit exists to avoid.
const mk = (cls, tag) => { const e = d.createElement(tag || "span"); e.className = cls; e.textContent = "x"; d.body.appendChild(e); return e }
const pillEl = d.querySelector("ul.tags a.tag-link") || mk("internal tag-link", "a")
const hlEl = mk("highlight")
const thEl = mk("text-highlight")
const h1El = d.querySelector("h1,h2,h3") || mk("")
out.push("S_pillBg=" + getComputedStyle(pillEl).backgroundColor)
out.push("S_pillRadius=" + getComputedStyle(pillEl).borderRadius)
out.push("S_pillIsReal=" + (pillEl === d.querySelector("ul.tags a.tag-link") ? "real" : "synth"))
out.push("S_hlBg=" + getComputedStyle(hlEl).backgroundColor)
out.push("S_thBg=" + getComputedStyle(thEl).backgroundColor)
out.push("S_h1Font=" + getComputedStyle(h1El).fontFamily)
out.push("S_focusOutline=" + (() => { const e = mk(""); e.focus(); return getComputedStyle(e).outlineColor })())
`

writeFileSync(
  probePath,
  `<!doctype html><meta charset="utf-8"><title>pending</title>
<iframe id="f" src="${page}" style="width:${vw}px;height:1000px;border:0"></iframe>
<script>
const f = document.getElementById("f")
f.onload = () => setTimeout(() => {
  const out = []
  try { ${probe} } catch (e) { out.push("PROBE_ERROR=" + e.message) }
  document.title = out.join(" || ")
}, 1800)
<\/script>`,
)
try {
  const stdout = execFileSync(
    chrome,
    ["--headless=new","--disable-gpu","--no-sandbox",`--window-size=${vw},1200`,
     "--virtual-time-budget=9000","--dump-dom",
     "http://localhost:8099/__audit_probe.html"],
    { maxBuffer: 128 * 1024 * 1024 },
  ).toString()
  const m = /<title>([^<]*)<\/title>/.exec(stdout)
  for (const part of (m?.[1] ?? "PROBE_ERROR=no-title").split(" || ")) console.log(part)
} finally {
  rmSync(probePath, { force: true })
}