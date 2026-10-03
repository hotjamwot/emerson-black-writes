/**
 * 12.7 — runs the deploy.yml guard block for the Desk section against an
 * assembled _site tree, so the CI logic is exercised locally.
 * Usage: node brain/scripts/check-desk-section.mjs _site
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const site = process.argv[2] || "_site"
const html = readFileSync(join(site, "index.html"), "utf8")
const fail = (m) => {
  console.error("FAIL: " + m)
  process.exit(1)
}

const strip = (html.match(/<div class="desk-topics-strip" id="desk-topics">([\s\S]*?)<\/div>/) || [])[1] || ""
const tags = [...strip.matchAll(/href="\/desk\/tags\/([^"]+)"/g)].map((m) => m[1])
console.log(`topics in strip: ${tags.length} (${tags.join(", ")})`)
if (tags.length < 3) fail(`only ${tags.length} topic links in the strip`)

const missing = tags.filter((t) => !existsSync(join(site, "desk", "tags", `${t}.html`)))
if (missing.length) fail(`tag page(s) that do not exist: ${missing.join(", ")}`)
console.log("every tag page exists")

const latestBlock = (html.match(/<div class="desk-picks-grid" id="desk-latest">([\s\S]*?)<\/div>/) || [])[1] || ""
const latest = [...latestBlock.matchAll(/class="desk-pick" href="([^"]+)"/g)].map((m) => m[1])
console.log(`latest picks: ${latest.length}`)
if (latest.length < 3) fail(`only ${latest.length} latest picks`)
const badLatest = latest.filter((h) => !/^\/desk\/newsletters\/\d{4}\//.test(h))
if (badLatest.length) fail(`latest picks not pointing at dated posts: ${badLatest.join(", ")}`)
console.log("every latest pick points at a dated post")

if (html.includes("{{DESK_COUNT}}")) fail("{{DESK_COUNT}} placeholder shipped")

// Comments are stripped before matching — the same rule verify-storefront
// applies, and for the same reason (I9): a check that a COMMENT can satisfy is
// not a check. The word "Start here" appears in index.html's own comment
// explaining that 12.7 removed it, and grepping the raw HTML reported that
// comment as the feature returning.
const htmlNoComments = html.replace(/<!--[\s\S]*?-->/g, "")
if (/Start here/.test(htmlNoComments)) {
  console.log("NOTE: 'Start here' is present in rendered markup (12.7 removed it)")
}

console.log("OK: desk section guards pass")