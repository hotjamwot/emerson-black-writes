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
 * 12.7(b) — two containers in `index.html`, both filled from the same
 * postDates.json so neither can fall out of date with the archive:
 *   #desk-latest   -> the six newest dispatches as dense rows
 *   #desk-topics   -> every topic as ONE line of links
 *   {{DESK_COUNT}} -> the total number of published posts
 *
 * 12.7 — the "Start here" trio is GONE, replaced by #desk-topics. It was the last
 * hand-maintained list on the homepage, and the reader had already flagged the
 * Desk section as the thing that should change. Every one of those six cards
 * could rot silently: a renamed post leaves a link to nothing, and the deploy
 * guard that checks the URLs could not tell a dead link from a live one.
 *
 * SHAPE — why rows and not cards, and why one line and not pills. Both were
 * tried and both were rejected on first render, and the reasons are recorded at
 * the constants below (`LATEST`, `topicSentence`) rather than here.
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

// SIX, not three. Density is the whole point: three cards out of forty-nine
// posts showed three, and each shouted equally, so nothing led. Six rows in two
// columns show twice as much at a third of the height. A MINIMUM in the deploy
// guard rather than an exact count, so writing a post never means editing a
// number in a workflow file — the upkeep this whole change exists to remove.
const LATEST = 6
const picks = data.slice(0, LATEST)

if (picks.length < 3) {
  console.error(`ERROR: expected at least 3 dated posts, found ${picks.length}.`)
  process.exit(1)
}

// 12.7(b) — the section's two halves, and why they are shaped differently.
//
// SIX DENSE ROWS, NOT THREE CARDS. The first attempt used the old card
// treatment and was rejected as "large and clunky", and the diagnosis was not
// padding — it was DENSITY. Three cards out of forty-nine posts means you see
// three, and each shouts equally, so nothing leads. A card that says everything
// says nothing. Six rows in two columns show twice as much at a third of the
// height, and the standfirsts — already written as hooks ("Or: how I wrote a
// truly terrible first draft") — do the pulling. No new copy is written here;
// the persuasion was already in the frontmatter.
//
// THE ROW SHAPE IS THE DESK'S, DELIBERATELY. `/desk/` now leads with
// `.eb-latest`: a fixed date column, title, one-line standfirst. Using the same
// shape upstairs means the homepage stops DESCRIBING the archive and starts BEING
// a window onto it, which is the integration the reader asked for. It also means
// one clamp rule and one date-column width, not two.
//
// TOPICS BECOME A SENTENCE, NOT PILLS. The first attempt rendered seven chips
// reading "process 15". Measured, they were not broken — but they do not invite a
// click, and the reason is that they answer no question: a bare label plus a
// number is a database row, not an invitation. They were also a second competing
// block directly beneath a list, which is the same mistake the cards made.
//
// An earlier idea was to head each group with a hand-written line ("Writing can
// be hard. It's important to keep a strong mindset") and list posts under it.
// REJECTED, and the reason is maintenance rather than taste: that is one written
// sentence PER TOPIC, forever — the same category of upkeep as the curated trio
// this change deleted, and the same thing that rots silently. What is available
// for free is the topic name, and a line of names costs one row instead of a
// competing block.
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

// A sentence, not pills. No counts: a number next to a word on a storefront is
// trivia, and it was the half of the chip that read as "database row".
const topicSentence = topics
  .map(([tag]) => `<a href="/desk/tags/${esc(tag)}">${esc(tag.replace(/-/g, " "))}</a>`)
  .join(" · ")

/**
 * Replace one placeholder container by its `id`, idempotently.
 *
 * Matches on the id alone rather than on `class` + `id`: 12.7(b) changed the
 * topic container from a `<div class="desk-topics-strip" id="desk-topics">` to a
 * bare `<span id="desk-topics">` sitting inside a hand-written sentence, so the
 * class is no longer a reliable part of the pattern. Requiring the class would
 * have made the script silently render nothing.
 */
function fillContainer(source, id, body) {
  return source.replace(
    new RegExp(`(<(\\w+)[^>]*\\bid="${id}"[^>]*>)([\\s\\S]*?)(</\\2>)`),
    (_, open, _tag, existing, close) => {
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

// The rows. `.desk-row` mirrors `.eb-latest__item` on the Desk: a fixed date
// column, then a block holding title + standfirst, so the dates form a column
// and the titles align down the page. `<time datetime>` carries the machine
// value, matching the Desk's rows, and it is the ISO straight from the
// frontmatter — never a re-parsed display string.
const ROWS = picks
  .map(
    (p) => `<a class="desk-row" href="/desk/${esc(p.slug)}">
                        <time class="desk-row__date" datetime="${esc(p.date)}">${esc(monthYear(p.date))}</time>
                        <span class="desk-row__body">
                            <span class="desk-row__title">${esc(p.title)}</span>
                            ${p.description ? `<span class="desk-row__desc">${esc(p.description)}</span>` : ""}
                        </span>
                    </a>`,
  )
  .join("\n")

let out = fillContainer(html, "desk-latest", ROWS)

// 12.7(b) — the topic sentence, rendered from the tags in the same file.
out = fillContainer(out, "desk-topics", topicSentence)

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
console.log(`desk-rows: rendered ${picks.length} latest + ${data.length} total`)
for (const p of picks) console.log(`  ${p.date}  ${p.title}`)
console.log(`desk-topics: rendered ${topics.length} topics into one line`)
for (const [tag, n] of topics) console.log(`  ${n}  ${tag}`)