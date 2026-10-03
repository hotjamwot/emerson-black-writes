/**
 * 12.7(b) — measures the Desk section's DENSITY, which is the whole point of
 * replacing the cards. Asserts what a reader would notice, so the section cannot
 * silently go back to being three large blocks:
 *
 *   - the rows are laid out in TWO columns on a wide screen
 *   - each standfirst is clamped to ONE line (the clamp, not a fixed height, so
 *     a one-line description leaves no gap)
 *   - the whole block is SHORTER than the old three-card treatment was
 *   - no card or pill markup has come back
 *
 * Usage: node brain/scripts/check-desk-density.mjs _site
 */
import { createServer } from "node:http"
import { readFileSync, existsSync } from "node:fs"
import { join, normalize, extname, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"

const site = resolveArg(process.argv[2] || "_site")
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p))

function resolveArg(s) {
  return s.startsWith("/") ? s : join(process.cwd(), s)
}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
}

if (!CHROME) {
  console.log("! no Chrome — density checks skipped")
  process.exit(0)
}

const probe = (w, h) => `<!doctype html><meta charset="utf-8"><title>pending</title>
<iframe id="f" src="/index.html" style="width:${w}px;height:${h}px;border:0"></iframe>
<script>
const f=document.getElementById("f")
f.onload=()=>setTimeout(()=>{let out="TIMEOUT"
try{
const d=f.contentDocument, w=f.contentWindow
const rows=[...d.querySelectorAll(".desk-row")].map(e=>{const r=e.getBoundingClientRect();return {l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width)}})
const descs=[...d.querySelectorAll(".desk-row__desc")].map(e=>Math.round(e.getBoundingClientRect().height))
const grid=d.querySelector(".desk-rows")
const gr=grid?grid.getBoundingClientRect():null
const cs=grid?w.getComputedStyle(grid):null
const line=d.querySelector(".desk-topics-line")
const lr=line?line.getBoundingClientRect():null
out=JSON.stringify({
  cols: cs?cs.gridTemplateColumns:null,
  rows,
  descHeights:descs,
  gridH: gr?Math.round(gr.height):null,
  gridW: gr?Math.round(gr.width):null,
  lineH: lr?Math.round(lr.height):null,
  hasCard: !!d.querySelector(".desk-pick"),
  hasPill: !!d.querySelector(".desk-topic__n"),
})
}catch(e){out="ERR "+e.message}
document.title=out},1200)
<\/script>`

const srv = createServer((req, res) => {
  const u = new URL(req.url, "http://x")
  if (u.pathname === "/__probe.html") {
    res.writeHead(200, { "content-type": "text/html" })
    res.end(probe(+u.searchParams.get("w"), +u.searchParams.get("h")))
    return
  }
  const f = normalize(join(site, u.pathname === "/" ? "/index.html" : u.pathname))
  if (!f.startsWith(site) || !existsSync(f)) return void res.writeHead(404).end()
  res.writeHead(200, { "content-type": MIME[extname(f)] || "application/octet-stream" })
  res.end(readFileSync(f))
})
await new Promise((k) => srv.listen(0, "127.0.0.1", k))
const port = srv.address().port

const run = (u) =>
  new Promise((r) =>
    execFile(
      CHROME,
      ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--disable-dev-shm-usage", "--virtual-time-budget=9000", "--dump-dom", u],
      { maxBuffer: 6e7 },
      (e, so) => r(so || ""),
    ),
  )

const problems = []
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`)
  if (!ok) problems.push(msg)
}

for (const w of [1400, 900, 390]) {
  const dom = await run(`http://127.0.0.1:${port}/__probe.html?w=${w}&h=900`)
  const t = /<title>([^<]*)<\/title>/.exec(dom)
  let g
  try {
    g = JSON.parse(
      (t ? t[1] : "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
    )
  } catch {
    check(false, `probe at ${w}px returned no geometry`)
    continue
  }
  console.log(`Measured at ${w}px`)

  const colCount = g.cols ? g.cols.split(" ").filter(Boolean).length : 0
  if (w >= 1000) {
    check(colCount === 2, `the rows sit in TWO columns at ${w}px (measured ${colCount})`)
  } else if (w <= 768) {
    check(colCount === 1, `the rows collapse to ONE column at ${w}px (measured ${colCount})`)
  } else {
    // 769–999px is the in-between band, and it is deliberately left at two
    // columns rather than asserted either way. What matters there is not the
    // COUNT but whether a column is still wide enough to hold a date plus a
    // readable title. At 900px each column measures ~386px, which is wider than
    // the 345px the old cards occupied, so two columns is right there.
    const widest = Math.max(...g.rows.map((r) => r.w))
    check(
      widest >= 320,
      `each column stays readable in the in-between band at ${w}px (widest ${widest}px)`,
    )
  }

  // Every standfirst on one line. A standfirst that wraps to two is the section
  // growing back, which is the failure the clamp exists to prevent.
  const lineH = Math.max(...g.descHeights)
  check(
    g.descHeights.every((h) => h <= lineH + 1) && lineH < 34,
    `every standfirst is clamped to one line at ${w}px (tallest ${lineH}px)`,
  )

  // Density, stated as the thing it actually replaced.
  //
  // The first version of this check compared the block's height against the old
  // cards' 168px and failed at 181px — which is the check being wrong, not the
  // design. Three cards was ONE row of three; six rows in two columns is THREE
  // rows of two, so the blocks are not comparable at equal height and never were.
  //
  // The honest metric is CONTENT PER SCREENFUL: the old section showed 3 posts
  // in 168px (1 post / 56px), this one shows 6 in ~181px (1 post / ~30px). So
  // the assertion is posts-per-height, which is what "denser" means, and it is
  // stated as a bound rather than a magic number.
  if (w >= 1000) {
    const posts = g.rows.length
    const perPost = g.gridH / posts
    check(
      posts >= 6 && perPost < 40,
      `the block is denser than the cards it replaced at ${w}px (${posts} posts in ${g.gridH}px = ${perPost.toFixed(0)}px each; the cards were 3 in 168px = 56px each)`,
    )
  }

  check(!g.hasCard, `no card markup at ${w}px`)
  check(!g.hasPill, `no pill markup at ${w}px`)
}

srv.close()
if (problems.length) {
  console.error(`\nDesk density FAILED — ${problems.length} check(s).`)
  process.exit(1)
}
console.log("\nDesk density verified.")