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

/** `/desk/newsletters/index.html` and the per-year folders are thin archives. */
const isThinFolderPage = (p) =>
  /^desk\/newsletters\/(index\.html|\d{4}\/index\.html)$/.test(p) || p === "desk/brain/index.html"

/**
 * Map a built file to its public URL.
 *
 * Directory indexes become trailing-slash URLs (`/desk/tags/`), matching how
 * Quartz links to folders.
 *
 * Post and tag pages drop the `.html` suffix. This matters: GitHub Pages serves
 * BOTH `/desk/tags/process` and `/desk/tags/process.html`, but Quartz's own
 * internal links are extensionless (verified: `<a href="../../newsletters/2024/
 * writing-abroad">`). Emitting the `.html` form in the sitemap would advertise
 * a second URL for the same page, splitting crawl signals across two addresses.
 * Follow the same form the site's own links already use.
 */
function urlFor(p) {
  if (p === "index.html") return "/"
  if (p.endsWith("/index.html")) return "/" + p.slice(0, -"index.html".length)
  return "/" + p.replace(/\.html$/, "")
}

// Newest first is not derivable from mtimes in CI, and `lastmod` is advisory
// to crawlers anyway — so we sort by URL for a STABLE, diff-friendly output
// rather than emitting a value that would churn every build.
const urls = files
  .filter((p) => !isThinFolderPage(p))
  .map(urlFor)
  .filter((u) => u !== "/brain/")
  .sort()

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated on every deploy from the built _site tree. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${ORIGIN}${u}</loc>\n  </url>`).join("\n")}
</urlset>
`
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