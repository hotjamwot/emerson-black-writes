import { h } from "preact"

/** Port of `pathToRoot` — see ../listing-descriptions/index.js. */
function pathToRoot(slug) {
  let rootPath = slug
    .split("/")
    .filter((x) => x !== "")
    .slice(0, -1)
    .map(() => "..")
    .join("/")
  if (rootPath.length === 0) rootPath = "."
  return rootPath
}

const stripSlashes = (p, strict = false) =>
  strict ? (p.startsWith("/") && p.endsWith("/") ? p.slice(1, -1) : p) : p.replace(/^\/+|\/+$/g, "")

function simplifySlug(fp) {
  const res = stripSlashes(fp.endsWith("index") ? fp.slice(0, -"index".length) : fp, true)
  return res.length === 0 ? "/" : res
}

function resolveRelative(current, target) {
  const first = pathToRoot(current)
  const last = simplifySlug(target)
  let joined = [first, last]
    .filter((s) => s !== "" && s !== "/")
    .map((s) => stripSlashes(s))
    .join("/")
  if (first.startsWith("/")) joined = "/" + joined
  if (last.endsWith("/")) joined += "/"
  return joined
}

function formatDate(d, locale = "en-US") {
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "2-digit" })
}

function getDate(file) {
  return file?.dates?.[file?.defaultDateType ?? "created"]
}

const isListed = (file) => file.unlisted !== true

function byDateAndAlphabetical(f1, f2) {
  const d1 = getDate(f1)
  const d2 = getDate(f2)
  if (d1 && d2) {
    const diff = d2.getTime() - d1.getTime()
    if (diff !== 0) return diff
  } else if (d1 && !d2) {
    return -1
  } else if (!d1 && d2) {
    return 1
  }
  return (f1.frontmatter?.title ?? "").localeCompare(f2.frontmatter?.title ?? "")
}

function allPagesInYear(allFiles, year) {
  return (allFiles ?? [])
    .filter(isListed)
    .filter((f) => f.slug && f.slug.startsWith(`newsletters/${year}/`))
    .filter((f) => f.slug !== `newsletters/${year}` && !f.slug.endsWith("/"))
    .filter((f) => f.dates?.[f?.defaultDateType ?? "created"])
    .sort(byDateAndAlphabetical)
}

function ListEntry({ file, currentSlug, locale }) {
  const tags = file.frontmatter?.tags ?? []
  const desc = file.frontmatter?.description
  const date = getDate(file)
  return h(
    "li",
    { class: "section-li" },
    h(
      "div",
      { class: "section" },
      h(
        "p",
        { class: "meta" },
        date ? h("time", { datetime: date.toISOString() }, formatDate(date, locale)) : null,
      ),
      h(
        "div",
        { class: "desc" },
        h(
          "h3",
          null,
          h(
            "a",
            { href: resolveRelative(currentSlug, file.slug), class: "internal internal-link" },
            file.frontmatter?.title,
          ),
        ),
        desc ? h("p", { class: "eb-listing-desc" }, desc) : null,
      ),
      h(
        "ul",
        { class: "tags" },
        tags.map((tag) =>
          h(
            "li",
            null,
            h(
              "a",
              { class: "internal tag-link", href: resolveRelative(currentSlug, `tags/${tag}`) },
              tag,
            ),
          ),
        ),
      ),
    ),
  )
}

function YearBody(props) {
  const { fileData, allFiles, cfg } = props
  const slug = fileData?.slug ?? ""
  const locale = cfg?.locale ?? "en-US"
  const year = slug.split("/")[1] ?? ""
  const pages = allPagesInYear(allFiles, year)
  return h(
    "div",
    { class: "popover-hint" },
    h("article", null, h("div", { class: "markdown-preview-view markdown-rendered" })),
    h(
      "div",
      { class: "page-listing" },
      h("p", null, pages.length === 1 ? "1 dispatch." : `${pages.length} dispatches.`),
      h(
        "div",
        null,
        h(
          "ul",
          { class: "section-ul" },
          pages.map((file) => h(ListEntry, { key: file.slug, file, currentSlug: slug, locale })),
        ),
      ),
    ),
  )
}

YearBody.css = `ul.section-ul {
  list-style: none;
  margin-top: 2em;
  padding-left: 0;
}
li.section-li {
  margin-bottom: 1em;
}
li.section-li > .section {
  display: grid;
  grid-template-columns: fit-content(8em) 3fr 1fr;
}
@media all and (max-width: 600px) {
  li.section-li > .section > .tags {
    display: none;
  }
}
li.section-li > .section > .desc > h3 > a {
  background-color: transparent;
}
li.section-li > .section .meta {
  margin: 0 1em 0 0;
  opacity: 0.6;
}
.section h3 {
  margin: 0;
}
.section > .tags {
  margin: 0;
}`

function generate({ content }) {
  // Years from SLUGS, not dates. generate() runs before the created-modified
  // transformer computes fileData.dates, so dates are undefined here — but the
  // vault mirrors years as folders (newsletters/2024/...), which is exactly
  // the grouping this page offers. Bodies filter by these same slugs, so the
  // two cannot disagree.
  const years = new Set()
  for (const [, file] of content) {
    const slug = file.data?.slug ?? ""
    const m = /^newsletters\/(\d{4})\//.exec(slug)
    if (m) years.add(m[1])
  }
  const existing = new Set()
  for (const [, file] of content) {
    const slug = file.data?.slug
    if (slug && slug.startsWith("newsletters/")) existing.add(slug)
  }
  const virtualPages = []
  for (const year of years) {
    // Trailing /index: folder-page emits folder listings at `<folder>/index`,
    // which is the URL the Explorer's folder-link points at. A bare
    // `newsletters/2024` slug emits `newsletters/2024.html` instead — a real
    // page at a URL nothing links to, while the folder URL stays a redirect.
    const slug = `newsletters/${year}/index`
    if (existing.has(slug)) continue
    virtualPages.push({ slug, title: year, data: {} })
  }
  return virtualPages
}

function YearArchives() {
  return {
    name: "YearArchives",
    priority: 10,
    match: ({ slug }) => /^newsletters\/\d{4}(\/index)?$/.test(slug ?? ""),
    generate,
    layout: "year",
    body: () => YearBody,
  }
}

export { YearArchives }
export default { YearArchives }

