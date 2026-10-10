/**
 * §11.6 — book mention cards. Guards the SILENT failure modes, which matter more
 * than the happy path here.
 *
 * Why this file exists: the first version of the component shipped ZERO cards and
 * the build still reported success. Two separate causes, both invisible:
 *
 *   1. A component exported directly is treated by ComponentRegistry as a
 *      CONSTRUCTOR and called with `undefined`, so it returned null and was cached.
 *   2. `String(tree)` on a hast node is "[object Object]", so every match failed.
 *
 * Either bug produces a clean build and an empty site feature. A check that only
 * asserts "the card renders where it should" would have caught both — but only
 * after someone noticed the cards were missing by eye. These checks fail the
 * deploy instead.
 *
 * Usage: node brain/scripts/check-book-mentions.mjs _site
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { BOOKS, bookDoorHref } from "./books.mjs"

const site = process.argv[2] || "_site"
const problems = []
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`)
  if (!ok) problems.push(msg)
}

/** Every built HTML page, recursively. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (e.endsWith(".html")) out.push(p)
  }
  return out
}

const pages = walk(join(site, "desk"))
console.log(`§11.6 book mention cards — ${pages.length} pages under desk/`)

if (pages.length === 0) {
  console.error("FAIL: no built pages found; is this the assembled site root?")
  process.exit(1)
}

const withCard = []
const nonPosts = []
for (const p of pages) {
  const html = readFileSync(p, "utf8")
  const rel = p.replace(site + "/", "")
  const isPost = /newsletters\/\d{4}\//.test(rel)
  if (html.includes("eb-mentions")) {
    withCard.push(rel)
    // A card on the Desk or a tag page would be the slug guard failing.
    if (!isPost) nonPosts.push(rel)
  }
}

check(withCard.length > 0, `at least one post carries a card (found ${withCard.length})`)
check(
  nonPosts.length === 0,
  `no card on the Desk, a tag page, or a folder page${
    nonPosts.length ? ` — ${nonPosts.join(", ")}` : ""
  }`,
)

// Every card must name real books, in series order, and never link Amazon.
for (const rel of withCard) {
  const html = readFileSync(join(site, rel), "utf8")
  const block = (html.match(/<section class="eb-mentions"[\s\S]*?<\/section>/) || [])[0]
  if (!block) {
    check(false, `${rel}: has an eb-mentions class but no <section>`)
    continue
  }

  const labels = [...block.matchAll(/eb-mentions__label">(?:Book (\d+))?/g)].map((m) =>
    m[1] === undefined ? null : Number(m[1]),
  )
  const nums = labels.filter((n) => n !== null)
  const ascending = nums.every((n, i) => i === 0 || n > nums[i - 1])
  check(ascending && nums.length > 0, `${rel}: books in ascending series order (${nums.join(", ") || "none"})`)

  // The heading is the honesty guarantee — see the component's docblock. If it
  // ever claims a causal relationship the build cannot verify, fail here.
  check(
    block.includes("Mentioned in this post"),
    `${rel}: heading is the verifiable "Mentioned in this post"`,
  )

  // A sell inside a craft post breaks the thing that makes people read the author.
  check(!/amazon|amzn\.eu|a\.co/.test(block), `${rel}: no Amazon link inside the card`)

  const titleLinks = [
    ...block.matchAll(/class="eb-mentions__title-link" href="([^"]+)"[^>]*>([^<]+)</g),
  ]
  for (const [, href, title] of titleLinks) {
    const book = BOOKS.find((b) => b.title === title.trim())
    if (!book) {
      check(false, `${rel}: title link for unknown book "${title.trim()}"`)
      continue
    }
    check(
      href === bookDoorHref(book),
      `${rel}: "${book.title}" links to sample (${bookDoorHref(book)}), got ${href}`,
    )
  }

  // The covers. Each one must (a) exist as a file in the assembled site, and
  // (b) be a THUMBNAIL, not the 190 KB artwork.
  //
  // (b) is the interesting one. Nothing about a broken `src` is visible in a
  // build — a typo, or shipping `img/covers/` instead of `img/covers/thumbs/`,
  // produces valid HTML, a green build, and cards that are either blank or
  // silently cost a reader 190 KB per book to paint 60 pixels.
  const covers = [...block.matchAll(/eb-mentions__cover"[^>]*src="([^"]+)"/g)].map((m) => m[1])
  check(covers.length > 0, `${rel}: card carries a cover for each book (${covers.length})`)

  for (const src of covers) {
    const file = join(site, src.replace(/^\//, ""))
    check(existsSync(file), `${rel}: cover exists on disk — ${src}`)
    if (existsSync(file)) {
      const kb = statSync(file).size / 1024
      // 32 KB is generous against a ~6 KB thumbnail but nowhere near the 179 KB
      // artwork, so a thumbs/ -> covers/ regression fails loudly.
      check(kb < 32, `${rel}: ${src.split("/").pop()} is a thumbnail (${kb.toFixed(1)} KB)`)
    }
    // Absolute-from-root is load-bearing: pages are served from /desk/, so a
    // relative src would resolve to /desk/img/... and 404 on every card.
    check(src.startsWith("/img/"), `${rel}: cover src is absolute from root — ${src}`)
    check(
      !/<img[^>]+eb-mentions__cover[^>]*alt=""/.test(block),
      `${rel}: every cover has non-empty alt text`,
    )
  }
}

// A book must never be named with the wrong series number.
const canonical = new Map(BOOKS.map((b) => [b.title, b.number]))
for (const rel of withCard) {
  const html = readFileSync(join(site, rel), "utf8")
  const block = (html.match(/<section class="eb-mentions"[\s\S]*?<\/section>/) || [])[0]
  const pairs = [...block.matchAll(/eb-mentions__title-link"[^>]*>([^<]+)<\/a><span[^>]*>(?:Book (\d+))?/g)]
  for (const [, title, num] of pairs) {
    const expected = canonical.get(title.trim())
    if (expected === undefined) check(false, `${rel}: unknown book "${title.trim()}"`)
    else if (Number(num) !== expected) {
      check(false, `${rel}: "${title.trim()}" labelled Book ${num}, expected Book ${expected}`)
    }
  }
}
check(true, "every named book carries its canonical series number")

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} book-mention problem(s).`)
  process.exit(1)
}
console.log(`\nOK: ${withCard.length} posts carry a well-formed mention card.`)