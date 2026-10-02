import fs from "node:fs/promises"
import path from "node:path"

/**
 * archive-redirects — 11.9.10.
 *
 * The archive used to be five pages: `/newsletters/`, whose entire content was a
 * list of four year links, and `/newsletters/2023/` .. `/2026/`, each listing the
 * posts from that year. All five are now collapsible sections at the foot of the
 * Desk. This emitter puts a redirect at each of those five paths.
 *
 * WHY REDIRECT AND NOT DELETE. All five URLs are in the published sitemap and
 * `/newsletters/` is linked from the homepage's desk picks. Deleting them turns
 * every one into a 404 — the reader who arrived from a search result or an old
 * bookmark gets a dead end, and any equity those URLs carried is discarded. A
 * redirect costs five small files and keeps the links working.
 *
 * WHY AN EMITTER AND NOT static/. The first attempt put these under
 * `quartz/static/`, which looks right and is not: the static emitter copies that
 * directory to `<output>/static/`, so the files would have been published at
 * `/desk/static/newsletters/` — a path nothing links to and no reader would ever
 * reach. The build ran clean and the redirects existed and did nothing, which is
 * the quietest possible failure. verify-default-mode now asserts each redirect is
 * at its real path in `public/`, which is what caught it.
 *
 * WHY META REFRESH. This is a static host with no rewrite rules. A meta refresh
 * is the smallest thing that works everywhere, needs no server config, and the
 * `0` delay means no reader sees an intermediate page. The visible link in the
 * body is there for anyone whose browser blocks the automatic jump.
 *
 * `noindex` plus a `canonical` pointing at the Desk means these stubs do not
 * compete with `/desk/` in search results for the same content.
 *
 * WHERE THE TARGET COMES FROM. Read from `ctx.cfg.configuration.baseUrl` rather
 * than hardcoded, so if `baseUrl` is ever `emersonblackwrites.com/desk` -> something
 * else, the redirects follow it instead of quietly pointing somewhere old. The
 * only hardcoded part is the path below the base, which is this site's.
 */

const RETIRED = [
  "newsletters",
  "newsletters/2023",
  "newsletters/2024",
  "newsletters/2025",
  "newsletters/2026",
]

const TEMPLATE = ({ url, canonical }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Emerson's Desk</title>
    <!--
      11.9.10 — this URL was a page whose entire content was a list of links to
      other pages. The archive now lives as by-year fold-outs at the foot of the
      Desk, so this redirects there rather than 404ing: the URL is in the
      published sitemap and readers arrive at it from search results and
      bookmarks.
    -->
    <meta http-equiv="refresh" content="0; url=${url}" />
    <link rel="canonical" href="${canonical}" />
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <p>This archive has moved to <a href="${url}">the Desk</a>.</p>
  </body>
</html>
`

function ArchiveRedirects() {
  return {
    name: "ArchiveRedirects",
    async emit(ctx) {
      const baseUrl = ctx.cfg.configuration.baseUrl
      if (!baseUrl) {
        // Fail loudly. A silent no-op here means five URLs quietly 404 at deploy
        // time, which is the exact failure this plugin exists to prevent.
        console.warn("archive-redirects: no `baseUrl` set; redirects would point nowhere")
        return []
      }

      // `/desk` — no trailing slash, which is what baseUrl carries.
      const desk = `https://${baseUrl.replace(/\/$/, "")}/`
      const written = []

      for (const slug of RETIRED) {
        const file = path.join(ctx.argv.output, slug, "index.html")
        await fs.mkdir(path.dirname(file), { recursive: true })
        await fs.writeFile(file, TEMPLATE({ url: desk, canonical: desk }), "utf-8")
        written.push(file)
      }

      return written
    },
  }
}

export { ArchiveRedirects }
export default ArchiveRedirects
