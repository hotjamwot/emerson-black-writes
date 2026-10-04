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

// 12.7(b) — the topic container is a bare <span id="desk-topics"> inside a
// hand-written sentence, so match on the id alone.
const span = (html.match(/<span id="desk-topics">([\s\S]*?)<\/span>/) || [])[1] || ""
const tags = [...span.matchAll(/href="\/desk\/tags\/([^"]+)"/g)].map((m) => m[1])
console.log(`topics in line: ${tags.length} (${tags.join(", ")})`)
if (tags.length < 3) fail(`only ${tags.length} topic links in the line`)

const missing = tags.filter((t) => !existsSync(join(site, "desk", "tags", `${t}.html`)))
if (missing.length) fail(`tag page(s) that do not exist: ${missing.join(", ")}`)
console.log("every tag page exists")

const latestBlock = (html.match(/<div class="desk-rows" id="desk-latest">([\s\S]*?)<\/div>\s*<p class="desk-topics-line">/) || [])[1] || ""
const latest = [...latestBlock.matchAll(/class="desk-row" href="([^"]+)"/g)].map((m) => m[1])
console.log(`latest rows: ${latest.length}`)
if (latest.length < 3) fail(`only ${latest.length} latest rows`)
const badLatest = latest.filter((h) => !/^\/desk\/newsletters\/\d{4}\//.test(h))
if (badLatest.length) fail(`latest rows not pointing at dated posts: ${badLatest.join(", ")}`)
console.log("every latest row points at a dated post")

// 12.7(b) — the rows carry standfirsts. This is the whole reason the cards were
// replaced: the persuasion was already written into the frontmatter, and a row
// without it is a bare title, which is the 11.9.11 complaint.
const descs = (latestBlock.match(/class="desk-row__desc"/g) ?? []).length
if (descs !== latest.length) fail(`${descs}/${latest.length} rows carry a standfirst`)

// And no card/pill markup may survive from the rejected designs.
if (/class="desk-pick"/.test(html)) fail("the old card treatment is still in the markup")
if (/class="desk-topic__n"/.test(html)) fail("the topic pills are still in the markup")

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

// The Books section is HAND-MAINTAINED BY DELIBERATE DECISION (§12.8), so this
// guard is deliberately the LIGHTEST one in the repo — not an automatic section.
//
// WHY IT STAYS MANUAL. The book metadata lives in an Obsidian vault
// (`~/Documents/Obsidian/Nexus/projects/Stormhouse/Books/See in Silverbridge`)
// which is not a git repository, so a build reading it would work on the
// author's machine and FAIL in CI. Every alternative was measured against how
// the author actually works: a committed `books.json` means returning to VSCode
// to re-run a script whenever a book moves; vendoring the files breaks the vault;
// pointing the build at the vault breaks CI outright. Editing four lines of HTML
// when an ASIN changes is the cheapest option available, and the cheapest option
// available is the one that gets maintained.
//
// WHAT THIS THEREFORE CHECKS — only what is cheap to check and expensive to get
// wrong:
//   1. the four released books, in ascending series order
//   2. exactly one buy link per book, and one "free" link for Book 0
//   3. every cover file actually EXISTS (a typo'd filename is invisible in review)
//
// It deliberately does NOT fetch the URLs. A network call on every deploy fails
// when Amazon rate-limits or the runner has no egress, and a deploy that fails for
// a reason the author cannot fix is worse than a stale ASIN.
const section = (html.match(/<section id="books"[\s\S]*?<\/section>/) || [])[0]
if (!section) fail("no #books section in index.html")

// One book = its `Book N` label, the title beside it, and everything up to the
// next book. Splitting on the next `class="book"` rather than counting closing
// divs keeps this working if a book's internal markup ever gains a wrapper —
// div-counting is the classic way a guard like this silently starts matching
// nothing, and then "0 books" is indistinguishable from "regex broke".
const entries = [...section.matchAll(/<span>Book (\d+)<\/span>([^<]+)<\/h3>([\s\S]*?)(?=<div class="book"|$)/g)].map(
  (m) => ({ label: `Book ${m[1]}`, n: Number(m[1]), title: m[2].trim(), body: m[3] }),
)
const list = entries

if (list.length !== 4) fail(`expected 4 released books, found ${list.length}`)
console.log(`books: ${list.length}`)
for (const b of list) console.log(`  ${b.label}: ${b.title}`)

// Ascending series order. Book 0 is the free novella; 1, 2, 3 follow.
const nums = list.map((b) => b.n)
if (nums.join(",") !== "0,1,2,3") fail(`books are not in series order: ${nums.join(",")}`)

const freeBooks = list.filter((b) => /href="#start-reading"/.test(b.body))
if (freeBooks.length !== 1) fail(`expected exactly 1 free-novella link, found ${freeBooks.length}`)
if (!/Book 0/.test(freeBooks[0].label)) fail("the free novella must be Book 0")

// Every paid book needs exactly one external link, and it must be an Amazon
// short link like the others — a bare product URL pasted by accident is the most
// likely edit mistake here.
for (const b of list) {
  if (b.label === "Book 0") continue
  const links = [...b.body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((u) => /^https?:/.test(u))
  if (links.length !== 1) fail(`${b.label} has ${links.length} buy links, expected 1`)
  if (!/^https:\/\/(www\.)?(amzn\.eu|a\.co)\/d\//.test(links[0])) {
    fail(`${b.label} buy link is not an Amazon short link: ${links[0]}`)
  }
}
console.log("every paid book has exactly one Amazon short link")

// Covers are the one thing that CANNOT be verified by eye in a diff — a typo'd
// filename renders as a broken image and nobody notices until it ships. Resolved
// relative to the rendered site root, not the repo root, so it works wherever the
// site happens to be served from.
const covers = [...section.matchAll(/src="img\/covers\/([^"]+)"/g)].map((m) => m[1])
if (covers.length !== 4) fail(`expected 4 covers, found ${covers.length}`)
for (const c of covers) {
  if (!existsSync(join(site, "img", "covers", c))) fail(`cover file missing: img/covers/${c}`)
}
console.log(`all ${covers.length} cover files exist`)

console.log("OK: books section guards pass")