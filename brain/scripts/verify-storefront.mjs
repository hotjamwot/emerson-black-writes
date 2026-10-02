#!/usr/bin/env node
/**
 * verify-storefront.mjs — the storefront, measured AS RENDERED.
 *
 * WHY THIS EXISTS
 * Three visual regressions shipped in the S11 §11.3c rehaul (I10) because every
 * check read the *source* — the stylesheet, the HTML — and none read the page.
 * In all three cases the CSS was correct as written; the rendered box was wrong.
 * `grep -c bleed index.html` returning 0 would have caught the broken hero in
 * one second, and NO source-level check can see a cover whose *box* has the
 * wrong shape (the file was 1280×2048, exactly 5:8, and the box was not).
 *
 * So this reads the built page in a real browser. Two tiers:
 *
 *   1. STATIC — source assertions, always fatal. Comments are stripped before
 *      matching: a check a comment can break is not a check (I9).
 *   2. RENDERED — geometry out of headless Chrome's own layout, at three
 *      viewport widths. Fatal when it runs. If Chrome is not installed it says
 *      so loudly and skips, because "cannot measure here" is not evidence of a
 *      regression — whereas "measured, and wrong" is, and that aborts.
 *
 * Usage:  node brain/scripts/verify-storefront.mjs [siteDir]   (default: repo root)
 * In CI:  node brain/scripts/verify-storefront.mjs _site
 */
import { execFile } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, join, normalize, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const siteRoot = resolve(process.argv[2] ?? repoRoot)

const problems = []
const check = (ok, message) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${message}`)
  if (!ok) problems.push(message)
}
const skip = (message) => console.log(`  ! ${message}`)

// ── tier 1: the source, with comments removed ─────────────────────────────────
// `/* ... */` is stripped before any pattern is matched. The first version of the
// rehaul audit grepped for `background-attachment: fixed` and matched the COMMENT
// explaining that the fix removed it — four false FAILs on a correct file, and a
// false FAIL trains you to ignore the audit (I9).
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "")
const stripHtml = (src) => src.replace(/<!--[\s\S]*?-->/g, "")

const cssPath = join(siteRoot, "style.css")
const htmlPath = join(siteRoot, "index.html")
if (!existsSync(cssPath) || !existsSync(htmlPath)) {
  console.error(`  ✗ ${cssPath} / ${htmlPath} not found — nothing to verify.`)
  process.exit(1)
}
const css = stripCss(readFileSync(cssPath, "utf8"))
const html = stripHtml(readFileSync(htmlPath, "utf8"))
const count = (src, re) => (src.match(re) ?? []).length

/** The declaration body of the FIRST rule whose selector is exactly `selector`. */
const ruleBody = (selector) => {
  const i = css.indexOf(selector + " {")
  if (i === -1) return null
  const close = css.indexOf("}", i)
  return close === -1 ? null : css.slice(i + selector.length + 1, close)
}

console.log("Source (comments stripped)")

// The full-bleed mechanism must exist in exactly ONE place. `.bleed` is the one
// helper; every other `100vw` is a section hand-rolling the escape hatch, which
// is how the hero ended up as the only section that did not bleed (I10 / 11.9.1).
const vwCount = count(css, /100vw/g)
check(vwCount === 1, `exactly one 100vw in the stylesheet (the .bleed helper) — found ${vwCount}`)

// Every full-bleed band carries the class, so `grep -c bleed index.html` can
// never return 0 again. `.hero` is the original defect.
const sectionHasBleed = (name) => new RegExp(`class="[^"]*\\b${name}\\b[^"]*\\bbleed\\b`).test(html)
for (const [name, label] of [
  ["hero", "hero"],
  ["series-hook", "series hook"],
  ["desk-picks", "Desk picks"],
  ["characters", "characters"],
]) {
  check(sectionHasBleed(name), `the ${label} section carries the bleed class`)
}

// Sections must not supply their own vertical rhythm on top of the container's:
// that is what made the page cramped (11.9.2) and it is the same mistake twice.
const mainContent = ruleBody(".main-content")
check(
  !!mainContent && /gap:\s*(calc\(|[^0]\S*)/.test(mainContent),
  `.main-content declares a non-zero gap (the section rhythm lives here, once)`,
)

// The prequel cover's ratio belongs on its BOX, exactly as .book-cover already
// does it. Put on the <img> instead and the image shrinks inside a column twice
// its width and reads as a strip — correct file, correct CSS, wrong box (11.9.3).
const prequelCover = ruleBody(".prequel-cover")
check(
  !!prequelCover && /aspect-ratio/.test(prequelCover),
  `.prequel-cover (the box) carries aspect-ratio, like .book-cover does`,
)

// A hard-coded half-shell cannot survive a change to --shell, and it silently
// collapses to 0 padding below ~1164px, where it was supposed to be widening.
check(!/550px/.test(css), `no hard-coded \`550px\` half-shell padding left in the CSS`)

// The one iOS Safari jank trap the rehaul removed must not come back.
check(!/background-attachment:\s*fixed/.test(css), "no `background-attachment: fixed` (the iOS repaint trap)")

// ── tier 2: the rendered page ─────────────────────────────────────────────────
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
]
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

/**
 * The probe document, served from memory (never written to disk).
 *
 * The real page loads in an <iframe>, which is not decoration: `contentDocument`
 * is only readable same-origin, and an iframe's width IS a viewport, so the
 * page's own media queries evaluate against it. `100vw` inside the iframe is the
 * iframe's width — which is why the full-bleed assertions can compare against
 * `innerWidth` honestly.
 */
const probeHtml = (w, h) => `<!doctype html><meta charset="utf-8"><title>pending</title>
<iframe id="f" src="/index.html" style="width:${w}px;height:${h}px;border:0"></iframe>
<script>
const f = document.getElementById("f")
f.onload = () => setTimeout(() => {
  let out = "PROBE TIMEOUT"
  try {
    const d = f.contentDocument, w = f.contentWindow
    const R = (sel) => {
      const e = d.querySelector(sel)
      if (!e) return null
      const r = e.getBoundingClientRect()
      return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]
    }
    out = JSON.stringify({
      vw: Math.round(w.innerWidth),
      scrollW: Math.round(d.documentElement.scrollWidth),
      hero: R(".hero"), books: R(".books"), hook: R(".series-hook"),
      start: R(".start-reading"), desk: R(".desk-picks"), chars: R(".characters"),
      about: R("#about"), cover: R(".prequel-cover"), coverImg: R(".prequel-cover img"),
    })
  } catch (e) { out = "PROBE ERROR: " + e.message }
  document.title = out
}, 1500)
<\/script>`

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1")
    if (url.pathname === "/__probe.html") {
      res.writeHead(200, { "content-type": MIME[".html"] })
      res.end(probeHtml(Number(url.searchParams.get("w")), Number(url.searchParams.get("h"))))
      return
    }
    const rel = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)
    const file = normalize(join(siteRoot, rel))
    if (!file.startsWith(siteRoot + sep) || !existsSync(file)) {
      res.writeHead(404).end("not found")
      return
    }
    res.writeHead(200, {
      "content-type": MIME[file.slice(file.lastIndexOf("."))] ?? "application/octet-stream",
    })
    res.end(readFileSync(file))
  })
  return new Promise((ok) =>
    server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })),
  )
}

const runChrome = (url) =>
  new Promise((res) =>
    execFile(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        // The CI runner is a container: /dev/shm is tiny there and Chrome's
        // default use of it is a classic crash. Harmless locally.
        "--disable-dev-shm-usage",
        "--virtual-time-budget=9000",
        "--dump-dom",
        url,
      ],
      { maxBuffer: 64 * 1024 * 1024 },
      (err, stdout) => res(stdout ?? ""),
    ),
  )

const decode = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")

/** The measured geometry of the page at one viewport width. */
async function measure(port, w, h) {
  const dom = await runChrome(`http://127.0.0.1:${port}/__probe.html?w=${w}&h=${h}`)
  const m = /<title>([^<]*)<\/title>/.exec(dom)
  if (!m) return { error: "no <title> in the dumped DOM" }
  const raw = decode(m[1])
  try {
    return JSON.parse(raw)
  } catch {
    return { error: raw }
  }
}

if (!chrome) {
  skip("no Chrome/Chromium found — RENDERED checks skipped (source checks above still apply).")
  skip("Rendered geometry is the half that caught I10; install Chrome to run it locally.")
} else {
  const { server, port } = await serve()
  try {
    for (const [w, h] of [
      [1400, 900],
      [1100, 900],
      [390, 844],
    ]) {
      console.log(`Rendered at ${w}px`)
      const g = await measure(port, w, h)
      if (g.error) {
        check(false, `geometry probe at ${w}px — ${g.error}`)
        continue
      }
      const vw = g.vw

      // Full bleed: left edge at 0, right edge at the viewport width. 100vw
      // INCLUDES the scrollbar, so vw is exactly what a bleeding band spans.
      for (const [key, label] of [
        ["hero", "hero"],
        ["hook", "series hook"],
        ["desk", "Desk picks"],
        ["chars", "characters"],
      ]) {
        const r = g[key]
        check(
          r !== null && r[0] <= 1 && r[2] >= vw - 1,
          `${label} spans the full width (measured ${r ? `${r[0]}…${r[2]}` : "MISSING"} of ${vw})`,
        )
      }

      // No horizontal overflow. A 100vw band inside a padded, centred container
      // is exactly how this page goes wrong, and it is invisible on a Mac.
      check(g.scrollW <= vw + 1, `no horizontal overflow (scrollWidth ${g.scrollW} ≤ ${vw})`)

      // The prequel cover: the box is 5:8 (the files are 1280×2048) and the
      // image FILLS the box. The old rule capped the <img> at 280px inside a
      // 418px column, so it rendered as a strip.
      const box = g.cover
      const img = g.coverImg
      if (!box || !img) {
        check(false, `prequel cover box + image present`)
      } else {
        const [iw, ih] = [img[2] - img[0], img[3] - img[1]]
        const [bw, bh] = [box[2] - box[0], box[3] - box[1]]
        check(
          Math.abs(bw / bh - 0.625) <= 0.02,
          `prequel cover box is 5:8 (measured ${bw}×${bh} = ${(bw / bh).toFixed(3)})`,
        )
        check(
          Math.abs(iw / ih - 0.625) <= 0.02,
          `prequel cover IMAGE is 5:8 (measured ${iw}×${ih} = ${(iw / ih).toFixed(3)})`,
        )
        check(
          Math.abs(iw - bw) <= 1,
          `prequel cover image fills its box (img ${iw}px of ${bw}px)`,
        )
      }

      // Vertical rhythm, measured between the sections themselves — the number
      // the eye reads. The rehaul deleted .main-content's gap, so this was 0.
      if (w === 1400) {
        const order = ["hero", "books", "hook", "start", "desk", "chars", "about"]
        let min = Infinity
        for (let i = 1; i < order.length; i++) {
          const prev = g[order[i - 1]]
          const cur = g[order[i]]
          if (!prev || !cur) continue
          min = Math.min(min, cur[1] - prev[3])
        }
        check(min >= 64, `every section is ≥ 64px from the last (tightest gap measured ${min}px)`)
      }
    }
  } finally {
    server.close()
  }
}

console.log("")
if (problems.length) {
  console.error(`Storefront verification FAILED — ${problems.length} check(s):`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}
console.log("Storefront verification passed.")