import { h } from "preact"

/**
 * listing-descriptions — 11.9.5(b).
 *
 * THE BUG. Every post in `content/` has a `description:` in its frontmatter
 * (51/51). Quartz renders it into `<meta name="description">` via
 * `@quartz-community/description`, so the text is in every built page — and
 * nowhere on the page itself. A tag page listed fifteen posts as fifteen bare
 * titles: no way to tell "The Dangers of Overplotting" from "My new book is
 * coming out!" without clicking each one. /desk/ got descriptions in 11.9.5(a);
 * this is the same fix for the tag pages the Desk links to.
 *
 * WHY A REPLACEMENT RATHER THAN A PATCH. `@quartz-community/tag-page` compiles
 * its OWN copy of PageList into dist/ at install time, that copy renders
 * title/date/tags but NOT description, and it exposes no option to swap the list
 * component. The copy of PageList in ./quartz/components/PageList.tsx has no
 * importers at all. So there is nothing to configure and nothing to edit — and
 * editing node_modules is wiped by the next `install-plugins`.
 *
 * This plugin replaces `@quartz-community/tag-page` outright: same `match`,
 * same `generate`, same rendered shape, plus a description under every title.
 * tag-page is disabled in quartz.config.yaml.
 *
 * TWO ROUTES TRIED AND REJECTED FIRST, both of which LOOK correct:
 *
 * 1. `treeTransforms`. The dispatcher collects those from every page type and
 *    renderPage runs them over the page tree — but over `clone(componentData
 *    .tree)`, the MARKDOWN tree, BEFORE the layout renders. The `.page-listing`
 *    markup is produced by tag-page's component further down, so the transform
 *    ran, matched nothing, and reported success. It built clean with zero
 *    descriptions added.
 * 2. Taking over via `match` alone, at a priority above tag-page's 10. This is
 *    the trap worth recording: tag pages are VIRTUAL pages. Phase 1 has
 *    tag-page's `generate()` create them, Phase 3 then emits each with
 *    `resolveLayout(pt, ...)` for the page type that GENERATED it —
 *    `match` is never consulted for them. So the higher priority did nothing
 *    and the plugin body never rendered. Ownership of a virtual page comes from
 *    `generate()`, not `match()`.
 *
 * Because it is a replacement, it also has to carry tag-page's stylesheet,
 * which came from `TagContent.css` (listPage.scss + PageList.css). Reproduced
 * verbatim at the bottom — the `fit-content(8em) 3fr 1fr` grid is load-bearing,
 * and `.desc` is the `3fr` middle column, so the description lands under the
 * title in the same cell with no grid changes.
 *
 * Plain .js, no JSX, no imports from the build source. See ./post-dates/index.js
 * for why: the loader imports a local plugin as a *runtime* module through a
 * symlink, so it must be loadable by Node as-is and self-contained because a
 * relative import back into the build source would resolve through the symlink.
 */

/**
 * Port of `pathToRoot` from @quartz-community/utils, which cannot be imported
 * here for the reason above. Kept faithful on purpose — this decides whether
 * every link on the page resolves or 404s.
 *
 * Verified against the real implementation: pathToRoot("tags/process") === "..",
 * which is what upstream emitted in the pre-change build.
 */
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

/** Port of `simplifySlug`. "index" collapses to "", which is how `tags/index`
 *  reaches the all-tags branch below. */
function simplifySlug(fp) {
  const res = stripSlashes(fp.endsWith("index") ? fp.slice(0, -"index".length) : fp, true)
  return res.length === 0 ? "/" : res
}

/** Port of `resolveRelative` for the two-segment case this page needs. */
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

/** Port of `formatDate` from ./quartz/components/Date.tsx. */
function formatDate(d, locale = "en-US") {
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "2-digit" })
}

/** Port of `getDate`: the configured default date type. */
function getDate(file) {
  return file?.dates?.[file?.defaultDateType ?? "created"]
}

/** Port of `isListed` from tag-page. */
const isListed = (file) => file.unlisted !== true

/** Port of `getAllSegmentPrefixes`; stops a nested tag like `craft/plot` losing entries. */
function getAllSegmentPrefixes(prefix) {
  const segs = prefix.split("/")
  const results = []
  for (let i = 0; i < segs.length; i++) results.push(segs.slice(0, i + 1).join("/"))
  return results
}

/** Latest first, ties broken by title — upstream `byDateAndAlphabetical`. */
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

/** Every listed file carrying `tag`, newest first. */
function allPagesWithTag(allFiles, tag) {
  return (allFiles ?? [])
    .filter(isListed)
    .filter((file) => (file.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes).includes(tag))
    .sort(byDateAndAlphabetical)
}

// Upstream default (TagContent's `defaultOptions.numPages`), applied to the
// all-tags index only. The per-tag pages pass no limit.
const NUM_PAGES = 10

// en-US strings, copied from tag-page's i18n so the wording does not shift.
const i18n = {
  tagIndex: "Tag Index",
  itemsUnderTag: (n) => (n === 1 ? "1 item with this tag." : `${n} items with this tag.`),
  showingFirst: (n) => `Showing first ${n} tags.`,
  totalTags: (n) => `Found ${n} total tags.`,
}

/** One listing entry. Upstream PageList's `<li>` shape, plus the description. */
function ListEntry({ file, currentSlug, locale }) {
  const tags = file.frontmatter?.tags ?? []
  const description = file.frontmatter?.description
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
        // The whole point. Wrapper name matches the hub's `eb-hub__desc` so
        // /desk/ and /tags/<x>/ read as one product.
        description ? h("p", { class: "eb-listing-desc" }, description) : null,
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

/** The `ul.section-ul` block. */
function PageList({ pages, currentSlug, locale, limit }) {
  const shown = limit ? pages.slice(0, limit) : pages
  return h(
    "ul",
    { class: "section-ul" },
    shown.map((file) => h(ListEntry, { key: file.slug, file, currentSlug, locale })),
  )
}

/**
 * The empty `<article>` block every listing page carries.
 *
 * It is reproduced rather than dropped for two reasons: it is where a tag page's
 * own markdown would render, and it is the element Quartz's SPA popover and
 * transclusion logic expect to find.
 *
 * ON THAT MARKDOWN: every tag page here is a VIRTUAL page — `generate()` builds
 * them from the frontmatter tags, and there is no `content/tags/` directory.
 * Virtual pages get `defaultProcessedContent`, whose tree is empty, so upstream
 * renders `hastRoot.children.length === 0 ? fd.description : htmlToJsx(...)` and,
 * with no description on a virtual page, an EMPTY div. Reproduced as empty. If
 * someone later adds a real `content/tags/process.md` this would silently drop
 * its body, so the build warns and verify-default-mode asserts it has not
 * happened.
 */
function ArticleBlock({ tree, fileData }) {
  const isEmpty = !Array.isArray(tree?.children) || tree.children.length === 0
  if (!isEmpty) {
    console.warn(
      `  [listing-descriptions] /${fileData?.slug} has non-empty markdown content, which ` +
        `this body does not render. Delete that content/tags/*.md or extend this plugin ` +
        `before publishing the page.`,
    )
  }
  return h(
    "article",
    { class: (fileData?.frontmatter?.cssclasses ?? []).join(" ") },
    h("div", { class: "markdown-preview-view markdown-rendered" }),
  )
}

/** `/tags/index` — every tag, with its most recent posts under each. */
function TagIndexBody({ tree, fileData, allFiles, cfg }) {
  const slug = fileData.slug
  const locale = cfg?.locale ?? "en-US"
  const listed = (allFiles ?? []).filter(isListed)

  const tags = [
    ...new Set(listed.flatMap((d) => d.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes)),
  ].sort((a, b) => a.localeCompare(b))

  return h(
    "div",
    { class: "popover-hint" },
    h(ArticleBlock, { tree, fileData }),
    h("p", null, i18n.totalTags(tags.length)),
    h(
      "div",
      null,
      tags.map((t) => {
        const pages = allPagesWithTag(listed, t)
        return h(
          "div",
          { key: t },
          h(
            "h2",
            null,
            h("a", { class: "internal tag-link", href: resolveRelative(slug, `tags/${t}`) }, t),
          ),
          h(
            "div",
            { class: "page-listing" },
            h(
              "p",
              null,
              i18n.itemsUnderTag(pages.length),
              pages.length > NUM_PAGES ? " " : null,
              pages.length > NUM_PAGES ? h("span", null, i18n.showingFirst(NUM_PAGES)) : null,
            ),
            h(PageList, { pages, currentSlug: slug, locale, limit: NUM_PAGES }),
          ),
        )
      }),
    ),
  )
}

/** `/tags/<x>/` — the posts carrying one tag, newest first. */
function TagListingBody({ tag, tree, fileData, allFiles, cfg }) {
  const slug = fileData.slug
  const locale = cfg?.locale ?? "en-US"
  const pages = allPagesWithTag(allFiles, tag)

  return h(
    "div",
    { class: "popover-hint" },
    h(ArticleBlock, { tree, fileData }),
    h(
      "div",
      { class: "page-listing" },
      h("p", null, i18n.itemsUnderTag(pages.length)),
      h("div", null, h(PageList, { pages, currentSlug: slug, locale })),
    ),
  )
}

/**
 * The page body. Picks a branch the same way tag-page does: `simplifySlug` turns
 * `tags/index` into "/", which is the all-tags index; anything else is a single
 * tag. A real `content/tags/<x>.md` that already exists is skipped by
 * `generate()` and reaches here through `match` as an ordinary content page.
 */
function ListingBody(props) {
  const { fileData } = props
  const slug = fileData?.slug

  // Self-guard. tag-page throws on a non-tag page; returning null is the
  // fail-safe direction, and `match` below means it should never fire.
  if (!(slug?.startsWith("tags/") || slug === "tags")) return null

  const tag = simplifySlug(String(slug).slice("tags/".length))
  if (tag === "/") return h(TagIndexBody, props)
  return h(TagListingBody, { ...props, tag })
}

// tag-page's `TagContent.css`, verbatim: concatenateResources(listPage.scss,
// PageList.css). Reproduced because tag-page is disabled and this is now the
// only source of these rules — the grid in particular.
ListingBody.css = `ul.section-ul {
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

.popover .section {
  grid-template-columns: fit-content(8em) 1fr !important;
}
.popover .section > .tags {
  display: none;
}

.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}`

// --- the page-type plugin itself -------------------------------------------

/**
 * `generate()` is what actually claims these pages — see the header comment on
 * why `match` and priority do not. Ported from tag-page: one virtual page per
 * tag found in the frontmatter, plus the "index" pseudo-tag that becomes
 * /tags/index, skipping any that already exist as real content.
 */
function generate({ content }) {
  const allFiles = content.map((c) => c[1].data).filter((d) => isListed(d))
  const tags = new Set(
    allFiles.flatMap((data) => data.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes),
  )
  tags.add("index")

  const existing = new Set()
  for (const [, file] of content) {
    const slug = file.data?.slug
    if (slug && slug.startsWith("tags/")) existing.add(slug)
  }

  const virtualPages = []
  for (const tag of tags) {
    const slug = `tags/${tag}`
    if (existing.has(slug)) continue
    virtualPages.push({
      slug,
      title: tag === "index" ? i18n.tagIndex : tag,
      data: {},
    })
  }
  return virtualPages
}

/**
 * `body` is a CONSTRUCTOR: the dispatcher calls `pt.body(undefined)` and uses the
 * result as the page's component.
 */
function ListingDescriptions() {
  return {
    name: "ListingDescriptions",
    priority: 10,
    match: ({ slug }) => slug?.startsWith("tags/") || slug === "tags",
    generate,
    layout: "unused",
    body: () => ListingBody,
  }
}

export { ListingDescriptions }
export default { ListingDescriptions }
