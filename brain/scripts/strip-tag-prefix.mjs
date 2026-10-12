/**
 * Strip the vault-side `newsletters/` tag prefix at publish time (§12.11).
 *
 * The vault tags posts `newsletters/mindset`, `newsletters/process`, … so
 * Obsidian nests everything under one parent and the tag list stays tiny.
 * The site keeps the bare topic names (`mindset`, `process`, …) — same cards,
 * same `/desk/tags/<topic>` URLs, no `newsletters` hierarchy leaking into
 * Quartz (whose `getAllSegmentPrefixes` would otherwise mint a `newsletters`
 * tag page plus a `newsletters/<topic>` page per topic).
 *
 * WHY HERE AND NOT IN QUARTZ. Quartz has no tag-alias option, and a
 * build-time transformer would have to touch every tag consumer at once
 * (tag-hub, listing-descriptions, year-archives, export-post-dates,
 * render-desk-picks, verify-default-mode). Stripping once in the publish flow
 * keeps `brain/` building exactly as it does today.
 *
 * SCOPE: frontmatter `tags:` ONLY — inline `[a, b]`, block-list `- a`, and
 * single-scalar `tags: a` forms, quoted or unquoted. Body `#hashtags` and
 * `description:`/`title:` text are never touched. Idempotent: bare tags pass
 * through unchanged, so re-running is a no-op. A bare `newsletters` tag with
 * no `/` suffix is left alone (stripping it would mint an empty tag).
 *
 * Usage: node brain/scripts/strip-tag-prefix.mjs <contentNewslettersDir>
 *   Exits 0 always (never breaks a publish); reports files changed + tags stripped.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import { join } from "node:path"

const DIR = process.argv[2]
if (!DIR) {
  console.error("ERROR: pass the mirrored Newsletters directory.")
  process.exit(1)
}
if (!statSync(DIR, { throwIfNoEntry: false })) {
  console.error(`ERROR: ${DIR} not found.`)
  process.exit(1)
}

const PREFIX_RE = /^(['"]?)newsletters\/(.+?)\1$/

function stripOne(raw) {
  const m = raw.match(PREFIX_RE)
  if (!m) return { tag: raw, stripped: false }
  const inner = m[2]
  if (!inner) return { tag: raw, stripped: false }
  const quote = m[1] || ""
  return { tag: `${quote}${inner}${quote}`, stripped: true }
}

function stripFrontmatter(src) {
  const block = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!block) return { out: src, stripped: 0 }
  let fm = block[1]
  let stripped = 0

  // 1. Inline form: tags: [a, b] (also `tags: []` — no-op).
  fm = fm.replace(/^tags:\s*\[(.*)\]\s*$/m, (line, inner) => {
    const parts = inner
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => {
        const r = stripOne(t)
        if (r.stripped) stripped += 1
        return r.tag
      })
    return `tags: [${parts.join(", ")}]`
  })

  // 2. Single-scalar form: tags: newsletters/mindset
  fm = fm.replace(/^tags:\s*(\S.*)\s*$/m, (line, val) => {
    if (val.startsWith("[")) return line // already handled above
    const r = stripOne(val.trim())
    if (r.stripped) {
      stripped += 1
      return `tags: ${r.tag}`
    }
    return line
  })

  // 3. Block-list form:
  //      tags:
  //        - newsletters/mindset
  //        - process
  fm = fm.replace(/^tags:\s*\r?\n((?:\s*-\s*.+\r?\n?)+)/m, (whole, list) => {
    const out = list
      .split("\n")
      .map((l) => {
        if (!l.trim()) return l
        const m = l.match(/^(\s*-\s*)(.+?)\s*$/)
        if (!m) return l
        const r = stripOne(m[2].trim())
        if (r.stripped) {
          stripped += 1
          return `${m[1]}${r.tag}`
        }
        return l
      })
      .join("\n")
    return `tags:\n${out}`
  })

  return { out: src.slice(0, block.index) + "---\n" + fm + "\n---" + src.slice(block.index + block[0].length), stripped }
}

function mdFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) mdFiles(full, acc)
    else if (entry.endsWith(".md")) acc.push(full)
  }
  return acc
}

let filesChanged = 0
let tagsStripped = 0
for (const file of mdFiles(DIR)) {
  const src = readFileSync(file, "utf8")
  const { out, stripped } = stripFrontmatter(src)
  if (stripped > 0 && out !== src) {
    writeFileSync(file, out)
    filesChanged += 1
    tagsStripped += stripped
  }
}
console.log(`strip-tag-prefix: ${tagsStripped} tag(s) stripped across ${filesChanged} file(s)`)
