/**
 * S11 §11.3b — render the storefront's "Latest" desk picks.
 *
 * WHY A BUILD-TIME RENDER AND NOT JAVASCRIPT
 * ------------------------------------------
 * The obvious implementation is a `fetch('/desk/static/postDates.json')` on
 * page load. That would make the storefront's newest content depend on
 * JavaScript, and it would be the FIRST script on a page that currently ships
 * none — a dependency, a request, and a visible reflow, bought for a list of
 * three links.
 *
 * Rendering at deploy time produces the same HTML every reader gets, in the
 * first paint, with zero JS. It also cannot fail at runtime: if this script
 * errors, the deploy fails loudly instead of a visitor seeing an empty box.
 *
 * WHAT IT WRITES
 * Two placeholders in `index.html`:
 *   #desk-latest   -> the three newest posts, newest first
 *   {{DESK_COUNT}} -> the total number of published posts
 *
 * It deliberately does NOT touch the hand-written "Start here" list. Those three
 * are an editorial choice, not a computed one — see §11.3b in the plan.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const BRAIN = process.argv[2] || "."
const SITE = process.argv[3] || join(BRAIN, "public")
const INDEX = process.argv[4] || "index.html"

const data = JSON.parse(readFileSync(join(SITE, "static", "postDates.json"), "utf8"))
const html = readFileSync(INDEX, "utf8")

/** Escape text for HTML. Titles and descriptions are author-supplied. */
const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const monthYear = (iso) => {
  const [y, m] = iso.split("-")
  return `${MONTHS[Number(m) - 1]} ${y}`
}

const LATEST = 3
const picks = data.slice(0, LATEST)

if (picks.length < LATEST) {
  console.error(`ERROR: expected at least ${LATEST} dated posts, found ${picks.length}.`)
  process.exit(1)
}

const cards = picks
  .map(
    (p) => `                <a class="desk-pick" href="/desk/${esc(p.slug)}">
                    <span class="desk-pick-date">${esc(monthYear(p.date))}</span>
                    <span class="desk-pick-title">${esc(p.title)}</span>
                    <span class="desk-pick-desc">${esc(p.description)}</span>
                </a>`,
  )
  .join("\n")

let out = html.replace(
  /(<div class="desk-picks-grid" id="desk-latest">)([\s\S]*?)(<\/div>)/,
  (_, open, body, close) => {
    // ⚠️ IDEMPOTENCE. The deployed `_site/index.html` is a COPY of this file,
    // but the generator is re-run on every deploy, and a previous run's cards
    // are already in the source. The regex would then match the previous run's
    // markup and replace it — which is fine — EXCEPT that the "nothing changed"
    // guard below would then see an unchanged file and abort, failing the whole
    // deploy on a no-op rebuild. So we treat "already rendered with this exact
    // content" as success rather than as an error.
    const already = body.replace(/<!--[^]*?-->/g, "").trim()
    if (already === cards.trim()) {
      console.log("desk-picks: already up to date; nothing to render.")
      process.exit(0)
    }
    return `${open}\n${cards}\n            ${close}`
  },
)

out = out.replace(/\{\{DESK_COUNT\}\}/g, String(data.length))

// The placeholders exist to be replaced; if either survives, the section would
// ship with literal "{{DESK_COUNT}}" text or an empty box, so fail the deploy
// rather than publish a visibly broken page.
if (out.includes("{{DESK_COUNT}}")) {
  console.error("ERROR: {{DESK_COUNT}} placeholder still present after render.")
  process.exit(1)
}
if (/id="desk-latest">\s*<\/div>/.test(out)) {
  console.error("ERROR: #desk-latest rendered empty.")
  process.exit(1)
}
if (!out.includes('id="desk-latest"')) {
  console.error("ERROR: #desk-latest container not found in index.html.")
  process.exit(1)
}

writeFileSync(INDEX, out)
console.log(`desk-picks: rendered ${picks.length} latest + ${data.length} total`)
for (const p of picks) console.log(`  ${p.date}  ${p.title}`)