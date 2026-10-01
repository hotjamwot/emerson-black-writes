/**
 * S11 §11.1 — generate sitemap.xml and robots.txt for the assembled _site.
 *
 * WHY THIS IS A SCRIPT AND NOT A COMMITTED FILE
 * ---------------------------------------------
 * The site has 49 posts plus tag pages, and that number changes every time a
 * post is published. A hand-written sitemap would silently rot — and "it is
 * still there, it must be fine" is exactly how the `writing-abroad` link text
 * and the vacuous yellow guard both went unnoticed. The sitemap is therefore
 * generated from the ACTUAL _site tree on every deploy, so it cannot disagree
 * with what was actually shipped.
 *
 * COVERED
 *   /                      storefront homepage
 *   /bio.html              author page
 *   /desk/                 Desk landing page
 *   /desk/newsletters/**   every published post
 *   /desk/tags/**          every tag page (real discovery surface)
 *
 * DELIBERATELY NOT COVERED
 *   /desk/newsletters/index.html and /desk/newsletters/<year>/index.html —
 *   thin folder pages that duplicate the archive. /desk/brain/ — a redirect.
 *
 * Runs AFTER Quartz is assembled into _site/desk/, so the file list is the
 * real file list.
 */

import { readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

const SITE = process.argv[2] || "_site"
const ORIGIN = "https://emersonblackwrites.com"

/** Every .html file under _site, as posix-style paths relative to _site. */
function htmlFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".DS_Store" || entry === "node_modules") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) htmlFiles(full, acc)
    else if (entry.endsWith(".html")) acc.push(relative(SITE, full).split(sep).join("/"))
  }
  return acc
}

const files = htmlFiles(SITE)

/**
 * Pages that must never be advertised to a crawler.
 *
 * ⚠️ ALL PATTERNS ARE LOWERCASE-INSENSITIVE, AND THAT IS LOAD-BEARING.
 * `new RegExp(..., "i")` is not cosmetic here. Quartz emits the folder as
 * `Newsletters/` on a case-SENSITIVE filesystem (Linux CI) and as
 * `newsletters/` on macOS, so the SAME pages arrive under different casing
 * depending on where the build ran. A lowercase-only pattern silently matched
 * on a Mac and stopped matching in CI, which is how the first fix shipped a
 * duplicate-laden sitemap and then made the deploy abort on its own guard.
 * Mirror `urlFor()`, which lowercases first: normalise, THEN match.
 */
const isThinFolderPage = (p) => {
  const l = p.toLowerCase()
  return /^desk\/newsletters\/(index\.html|\d{4}\/index\.html)$/.test(l) || l === "desk/brain/index.html"
}

const isErrorPage = (p) => {
  const l = p.toLowerCase()
  return /(^|\/)404\.html$/.test(l) || l === "desk/404/index.html"
}

/**
 * Map a built file to its public URL.
 *
 * Directory indexes become trailing-slash URLs (`/desk/tags/`), matching how
 * Quartz links to folders.
 *
 * Post and tag pages drop the `.html` suffix. Pages serves BOTH
 * `/desk/tags/process` and `/desk/tags/process.html`, but Quartz's own
 * internal links are extensionless (verified live), so the `.html` form would
 * advertise a second address for the same page and split crawl signals.
 *
 * NEWSPLETTER FOLDERS ARE LOWERCASED, and this matters more than it looks.
 * Quartz emits the directory as `Newsletters/` (capital N) because that is the
 * content folder's name, while every link it generates is lowercase
 * `newsletters/`. Pages serves either. A first version listed the capitalised
 * path too, and the live sitemap shipped **50 `Newsletters/` URLs alongside 49
 * `newsletters/` ones — every post listed twice**, with crawl signals split
 * across two addresses. We list only the lowercase form the site's own links
 * use.
 */
function urlFor(p) {
  const lowered = p.toLowerCase()
  if (lowered === "index.html") return "/"
  if (lowered.endsWith("/index.html")) return "/" + lowered.slice(0, -"index.html".length)
  return "/" + lowered.replace(/\.html$/, "")
}

// Newest first is not derivable from mtimes in CI, and `lastmod` is advisory
// to crawlers anyway — so we sort by URL for a STABLE, diff-friendly output
// rather than emitting a value that would churn every build.
const urls = files
  .filter((p) => !isThinFolderPage(p) && !isErrorPage(p))
  .map(urlFor)
  .filter((u) => u !== "/brain/")
  .sort()

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated on every deploy from the built _site tree. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n  </url>`).join("\n")}
</urlset>
`
// SELF-CHECK — run BEFORE writing, so a bad sitemap never reaches disk.
const dupes = urls.filter((u, i) => urls.indexOf(u) !== i)
if (dupes.length) {
  console.error(`ERROR: sitemap would contain duplicate URLs: ${[...new Set(dupes)].join(", ")}`)
  process.exit(1)
}
const uppercase = urls.filter((u) => /[A-Z]/.test(u))
if (uppercase.length) {
  console.error(`ERROR: sitemap would contain uppercase paths (Pages is case-insensitive, so these duplicate the lowercase URLs): ${uppercase[0]}`)
  process.exit(1)
}

writeFileSync(join(SITE, "sitemap.xml"), sitemap)

const robots = `# Emerson Black — ${ORIGIN}
# The whole site is public and worth indexing: the storefront sells the books,
# the Desk is 49 posts of writing that an agent or a reader should be able to
# find. Nothing is private here.
User-agent: *
Allow: /

Sitemap: ${ORIGIN}/sitemap.xml
`
writeFileSync(join(SITE, "robots.txt"), robots)

console.log(`sitemap: ${urls.length} URLs`)
console.log(`  storefront: ${urls.filter((u) => !u.startsWith("/desk/")).length}`)
console.log(`  posts:      ${urls.filter((u) => /^\/desk\/newsletters\/\d{4}\//.test(u)).length}`)
console.log(`  tag pages:  ${urls.filter((u) => u.startsWith("/desk/tags/")).length}`)
console.log("wrote sitemap.xml and robots.txt")