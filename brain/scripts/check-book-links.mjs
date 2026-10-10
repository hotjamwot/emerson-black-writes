/**
 * §12.9 — book data and link checker.
 *
 * Its main job is catching the class of bug this section was created for: the
 * repo carried two contradictory sets of Amazon links (homepage short links vs
 * posts' own ASINs) and nobody could tell, because nothing compared them.
 *
 * What it checks:
 *   1. books.mjs is internally coherent (0..3, no duplicate numbers/ASINs/titles)
 *   2. the homepage's four books match books.mjs — TITLE, ORDER and BUY LINK
 *   3. no post links a book ASIN that disagrees with books.mjs
 *   4. every cover referenced actually exists
 *   5. every cover file in img/covers/ is actually used (orphan detection)
 *
 * (3) and (5) are the ones that would otherwise stay silent forever.
 *
 * Usage: node brain/scripts/check-book-links.mjs [repoRoot]
 */
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { BOOKS } from "./books.mjs"

const root = process.argv[2] || "."

/** `samplePath` `/desk/newsletters/2023/foo` → vault note path. */
function sampleNotePath(samplePath) {
  const rel = samplePath.replace(/^\/desk\//, "")
  const [, year, slug] = rel.split("/")
  return join(root, "brain", "content", "Newsletters", year, `${slug}.md`)
}
const problems = []
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`)
  if (!ok) problems.push(msg)
}

console.log("§12.9 book data")

// ---------------------------------------------------------------- 1. coherence
const nums = BOOKS.map((b) => b.number)
check(
  nums.join(",") === "0,1,2,3",
  `series numbers are 0,1,2,3 (found ${nums.join(",")})`,
)
check(new Set(BOOKS.map((b) => b.asin)).size === BOOKS.length, "no duplicate ASINs")
check(new Set(BOOKS.map((b) => b.title.toLowerCase())).size === BOOKS.length, "no duplicate titles")

// Exactly one book is free, and it must be Book 0 — the free novella is the
// start-here, and if `free` ever moved the homepage would offer a paid button
// on the wrong book or a signup link on a book that costs money.
const free = BOOKS.filter((b) => b.free)
check(free.length === 1 && free[0].number === 0, "exactly one free book, and it is Book 0")
check(free[0].url === null, "the free book has no buy URL")
for (const b of BOOKS.filter((x) => !x.free)) {
  check(!!b.url, `Book ${b.number} has a buy URL`)
}

// Short links, not bare ASINs — the geo-redirect property §12.9 depends on. A
// bare `amazon.com/dp/...` sends every reader to one storefront, which is the
// exact failure this file exists to prevent.
for (const b of BOOKS.filter((x) => x.url)) {
  check(
    /^https:\/\/(amzn\.eu|www\.amzn\.eu|a\.co|www\.a\.co)\/d\//.test(b.url),
    `Book ${b.number} uses a geo-redirecting short link (${b.url})`,
  )
  check(b.asin.length === 10 && b.asin.startsWith("B0"), `Book ${b.number} has a plausible ASIN`)
}
for (const b of BOOKS) {
  check(!!b.samplePath, `Book ${b.number} has a sample chapter path`)
  check(
    b.samplePath.startsWith("/desk/newsletters/"),
    `Book ${b.number} sample path is a Desk post (${b.samplePath})`,
  )
  check(existsSync(sampleNotePath(b.samplePath)), `Book ${b.number} sample note exists on disk`)
}
console.log(`  · ${BOOKS.length} books, ${BOOKS.filter((b) => b.url).length} with buy links`)
// ---------------------------------------------------------------- 2. homepage
const index = readFileSync(join(root, "index.html"), "utf8")
const section = (index.match(/<section id="books"[\s\S]*?<\/section>/) || [])[0]
check(!!section, "the homepage has a #books section")

if (section) {
  const onPage = [...section.matchAll(/<span>Book (\d+)<\/span>([^<]+)<\/h3>([\s\S]*?)(?=<div class="book"|$)/g)].map(
    (m) => ({ number: Number(m[1]), title: m[2].trim(), body: m[3] }),
  )
  check(onPage.length === BOOKS.length, `homepage shows ${BOOKS.length} books (found ${onPage.length})`)

  for (const book of BOOKS) {
    const shown = onPage.find((b) => b.number === book.number)
    if (!shown) {
      check(false, `Book ${book.number} is missing from the homepage`)
      continue
    }
    // The bug this section was born for: index.html said "A Rock Star Has
    // Exploded" where 17 posts and the author say "A Rockstar Has Exploded".
    check(shown.title === book.title, `Book ${book.number} title matches books.mjs ("${shown.title}")`)

    check(
      shown.body.includes(`href="${book.samplePath}"`),
      `Book ${book.number} links to sample chapter (${book.samplePath})`,
    )

    if (book.free) {
      check(/href="#start-reading"/.test(shown.body), `Book ${book.number} (free) links to the signup, not Amazon`)
    } else {
      const href = (shown.body.match(/href="([^"]+)"/g) || [])
        .map((h) => h.slice(6, -1))
        .find((u) => /^https?:/.test(u))
      check(href === book.url, `Book ${book.number} buy link matches books.mjs (${href})`)
    }
  }
}
// ---------------------------------------------------------------- 3. post ASINs
// The check that has never existed: a post linking an ASIN that disagrees with
// the canonical set. This is the silent-drift guard.
//
// Only ASINs a post links AS A BOOK WE SOLD are judged. Posts legitimately link
// other authors' books (T. Taylor's on Universal Fantasy, Fight Club, House of
// Leaves), and a naive "an unknown B0-ASIN must be wrong" rule flagged one of
// those on the first run.
//
// The first version required only that the post MENTION one of our titles, which
// was still not enough: a post can thank readers for downloading A Student Has
// Drowned and go on to link somebody else's book, which is exactly what
// whats-your-fantasy.md does. So the rule is a CONTRADICTION test -- the post
// links an ASIN that is not ours AND links one that is. That cannot be a false
// positive: a post linking your own book alongside a different book's ASIN is
// wrong either way.
const postsDir = join(root, "brain", "content")
let scanned = 0
const wrong = []
if (existsSync(postsDir)) {
  const canonical = new Set(BOOKS.map((b) => b.asin))
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        walk(p)
        continue
      }
      if (!e.name.endsWith(".md")) continue
      const asins = new Set(readFileSync(p, "utf8").match(/\bB0[A-Z0-9]{8}\b/g) ?? [])
      if (asins.size === 0) continue
      scanned++
      const ours = [...asins].filter((a) => canonical.has(a))
      if (ours.length === 0) continue // links only other people's books
      for (const a of asins) {
        if (!canonical.has(a)) wrong.push(`${p.replace(root + "/", "")}: ${a} alongside ${ours.join(", ")}`)
      }
    }
  }
  walk(postsDir)
}
check(
  wrong.length === 0,
  `no post links our book and a different ASIN together (${scanned} posts carry ASINs)` +
    (wrong.length ? ` -- ${wrong.join("; ")}` : ""),
)

// ---------------------------------------------------------------- 4/5. covers
const coverDir = join(root, "img", "covers")
const onDisk = new Set(
  existsSync(coverDir) ? readdirSync(coverDir).filter((f) => /\.(webp|png|jpg)$/i.test(f)) : [],
)
for (const b of BOOKS) check(onDisk.has(b.cover), `cover exists: ${b.cover}`)

const orphans = [...onDisk].filter((f) => !BOOKS.some((b) => b.cover === f))
check(orphans.length === 0, `no orphan cover files (${orphans.length ? orphans.join(", ") : "none"})`)

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} book-data problem(s).`)
  process.exit(1)
}
console.log("\nOK: book data is coherent, and the homepage and posts agree with it.")