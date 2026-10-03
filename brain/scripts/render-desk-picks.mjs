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
 * 12.7 — the "Start here" trio is GONE, replaced by #desk-topics, a topic strip
 * generated from the `tags` every post already carries. It was the last
 * hand-maintained list on the homepage, and the reader had already flagged the
 * Desk section as the thing that should change. Every one of those six cards
 * could rot silently: a renamed post leaves a link to nothing, and the deploy
 * guard that checks the URLs cannot tell a dead link from a live one.
 *
 * WHAT IT DOES NOT WRITE — the decision behind the strip's shape. The Desk's own
 * topic cards list FIVE posts per topic, and bringing that to the homepage was
 * considered and rejected: it puts 34 post titles above the signup and turns a
 * storefront into an index. The homepage already sells books, states the
 * premise, and collects emails; what it needs from the Desk is proof that a
 * person writes these things and a route to more. So the strip is one row —
 * topic name, post count, link — and the substance stays on /desk/.
 *
 * `news` is excluded by NAME here, matching tag-hub on the Desk. Excluding a tag
 * by string is an editorial choice, so it is a named constant and both halves of
 * the site say so, rather than one filtering it and the other not.
 *
 * It deliberately does NOT touch the hand-written "Start here" list — that list
 * no longer exists. See above.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs"
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

// 12.7 — the topic strip. Counts come from the tags in the SAME file the posts
// come from, so the strip cannot disagree with the archive: there is no second
// list to fall out of date.
//
// `news` is excluded by name, matching tag-hub on the Desk. Two places make the
// same editorial decision, so it is stated in both.
const EXCLUDED_TAGS = new Set(["news"])

const topicCounts = new Map()
for (const p of data) {
  for (const tag of p.tags ?? []) {
    if (EXCLUDED_TAGS.has(tag)) continue
    topicCounts.set(tag, (topicCounts.get(tag) ?? 0) + 1)
  }
}

// Busiest first, ties alphabetical — the same ordering tag-hub uses, so the
// homepage strip and the Desk's cards present the topics in the same order.
const topics = [...topicCounts.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)

if (topics.length === 0) {
  console.error(
    "ERROR: no tags found in postDates.json — the topic strip would render empty.",
  )
  console.error("       The tag export in export-post-dates.mjs is the suspect.")
  process.exit(1)
}

const topicCards = topics
  .map(
    ([tag, n]) =>
      `                <a class="desk-topic" href="/desk/tags/${esc(tag)}"><span class="desk-topic__name">${esc(
        tag.replace(/-/g, " "),
      )}</span><span class="desk-topic__n">${n}</span></a>`,
  )
  .join("\n")

/** Replace one placeholder container, idempotently. */
function fillContainer(source, id, className, body) {
  return source.replace(
    new RegExp(`(<div class="${className}" id="${id}">)([\\s\\S]*?)(</div>)`),
    (_, open, existing, close) => {
      // ⚠️ IDEMPOTENCE, same reason as before: the deployed `_site/index.html`
      // is a COPY, the generator re-runs every deploy, and treating
      // "already rendered with this exact content" as success is what keeps a
      // no-op rebuild from failing the deploy.
      const already = existing.replace(/<!--[^]*?-->/g, "").trim()
      if (already === body.trim()) return `${open}${existing}${close}`
      return `${open}\n${body}\n            ${close}`
    },
  )
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

let out = fillContainer(html, "desk-latest", "desk-picks-grid", cards)

// 12.7 — the topic strip, rendered from the tags in the same file.
out = fillContainer(out, "desk-topics", "desk-topics-strip", topicCards)

out = out.replace(/\{\{DESK_COUNT\}\}/g, String(data.length))

// The placeholders exist to be replaced; if any survives, the section would
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
if (/id="desk-topics">\s*<\/div>/.test(out)) {
  console.error("ERROR: #desk-topics rendered empty.")
  process.exit(1)
}
if (!out.includes('id="desk-latest"')) {
  console.error("ERROR: #desk-latest container not found in index.html.")
  process.exit(1)
}
if (!out.includes('id="desk-topics"')) {
  console.error("ERROR: #desk-topics container not found in index.html.")
  process.exit(1)
}

// 12.7 — every topic must link to a tag page that EXISTS in the built Desk.
// The old guard counted links that matched a URL SHAPE, which cannot tell a
// live page from a dead one — a renamed tag would have passed it. This one
// resolves each href against the built output.
const tagPages = new Set(
  readdirSync(join(SITE, "tags"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, "")),
)
const deadTopics = topics
  .map(([tag]) => tag)
  .filter((tag) => !tagPages.has(tag))
if (deadTopics.length) {
  console.error(
    `ERROR: topic strip links to ${deadTopics.length} tag page(s) that do not exist: ${deadTopics.join(", ")}`,
  )
  process.exit(1)
}

writeFileSync(INDEX, out)
console.log(`desk-picks: rendered ${picks.length} latest + ${data.length} total`)
for (const p of picks) console.log(`  ${p.date}  ${p.title}`)
console.log(`desk-topics: rendered ${topics.length} topics`)
for (const [tag, n] of topics) console.log(`  ${n}  ${tag}`)