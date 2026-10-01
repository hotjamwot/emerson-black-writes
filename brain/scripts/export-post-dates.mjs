/**
 * S11 §11.3 — export post dates for the storefront.
 *
 * WHY A POST-BUILD SCRIPT AND NOT A QUARTZ PLUGIN
 * -----------------------------------------------
 * Upstream's `content-index` plugin builds `contentIndex.json` and then, on
 * purpose, runs `delete content2.date` before serialising it (verified in
 * `node_modules/@quartz-community/content-index/dist/index.js`). The dates are
 * NOT missing by accident — they are deliberately stripped, because shipping a
 * date per page bloats a payload most consumers only need for search.
 *
 * We need them anyway: the storefront's "From the Desk" section has to know
 * which posts are newest. Two options were considered:
 *
 *  a) Patch/wrap the upstream plugin. Rejected — it means a fork, or a plugin
 *     that monkey-patches `emit`, both of which break on the next upstream bump
 *     and are invisible until they do.
 *  b) A small post-build script that reads the *emitted* content and writes a
 *     separate, purpose-built file. Chosen: it adds a file rather than
 *     changing one, so if the upstream shape ever changes this script fails
 *     loudly instead of silently corrupting the index the Desk itself reads.
 *
 * WHAT IT READS, AND WHY NOT THE RENDERED HTML
 * --------------------------------------------
 * The obvious source is the `<time datetime="...">` element the post-dates
 * component already renders. **It is off by one day, and silently.**
 * Measured: frontmatter `date: 2025-02-14` renders as
 * `<time datetime="2025-02-13T21:00:00.000Z">Feb 14, 2025</time>` — Quartz
 * parses the date as UTC midnight, which in a timezone behind UTC is the
 * *previous* day, so the machine-readable attribute disagrees with the text
 * right next to it. Slicing the ISO to `[:10]` therefore reports every post one
 * day early, which would quietly mis-order the storefront's "latest" strip and
 * mis-date anything built on it. The rendered *text* is correct; the
 * attribute is not.
 *
 * So this reads the FRONTMATTER `date:` directly — the same value the page
 * displays, in the same timezone, with no UTC conversion in between. The
 * rendered `<time>` remains the thing a human sees; we simply do not let the
 * machine-readable twin override it.
 *
 * OUTPUT: `static/postDates.json` — { slug, date, title, description } per post,
 * newest first. Small and purpose-built, so the storefront fetch is cheap.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import { join, relative, sep, dirname } from "node:path"

const BRAIN = process.argv[2] || "."
const CONTENT = join(BRAIN, "content", "Newsletters")
const SITE = process.argv[3] || join(BRAIN, "public")

function mdFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) mdFiles(full, acc)
    else if (entry.endsWith(".md")) acc.push(full)
  }
  return acc
}

if (!statSync(CONTENT, { throwIfNoEntry: false })) {
  console.error(`ERROR: ${CONTENT} not found — pass the brain/ directory.`)
  process.exit(1)
}

/** Read a scalar out of the YAML frontmatter block. Handles `key: value`. */
function frontmatter(src, key) {
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!block) return undefined
  const line = block[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
  if (!line) return undefined
  return line[1].trim().replace(/^["']|["']$/g, "")
}

const posts = []
for (const file of mdFiles(CONTENT)) {
  const src = readFileSync(file, "utf8")
  const rel = relative(CONTENT, file).split(sep).join("/")
  if (/^index\.md$|^\d{4}\/index\.md$/.test(rel)) continue

  // frontmatter.date is the publication date the page displays. `created` is
  // written from it by the publish script and is the fallback if date is absent.
  const raw = frontmatter(src, "date") ?? frontmatter(src, "created")
  // Validate rather than trust: an unparseable date must not silently sort to
  // the top of a "newest posts" list.
  const iso = raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : undefined

  posts.push({
    slug: `newsletters/${rel.replace(/\.md$/, "")}`,
    date: iso,
    title: frontmatter(src, "title") ?? "",
    description: frontmatter(src, "description") ?? "",
  })
}

const withDates = posts.filter((p) => p.date)
const undated = posts.filter((p) => !p.date)

// Newest first. Ties broken by slug so the output is STABLE — two posts sharing
// a date must not swap places between builds, which would churn the file and
// make a real change hard to spot in a diff.
withDates.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1))

writeFileSync(join(SITE, "static", "postDates.json"), JSON.stringify(withDates, null, 2))

console.log(`postDates: ${withDates.length} posts with dates`)
if (undated.length) {
  // Not fatal — a missing date must not break a deploy — but it is exactly the
  // kind of silent gap that produced the misleading "Writing Abroad" link, so
  // it is reported loudly rather than swallowed.
  console.warn(`WARNING: ${undated.length} post(s) had no valid date and were skipped:`)
  for (const p of undated.slice(0, 5)) console.warn(`  ${p.slug}`)
  if (undated.length > 5) console.warn(`  …and ${undated.length - 5} more`)
}
console.log("newest 3:")
for (const p of withDates.slice(0, 3)) console.log(`  ${p.date}  ${p.title}`)