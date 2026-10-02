import { h } from "preact"

/**
 * tag-hub — the Desk's front door.
 *
 * 11.9.5(a). /desk/ stays (it holds the archive and is the sitemap/backlink
 * target), but the listing it inherited from `folder-page` is unusable as a hub:
 * it shows bare titles, and on /newsletters/ it does not even list posts — only
 * YEAR FOLDERS (2023, 2024, 2025).
 *
 * The `description` field that makes a post worth clicking already exists on all
 * 50 published posts. It was never rendered, because `@quartz-community/
 * folder-page` and `tag-page` each compile their own copy of PageList into
 * dist/ and that copy drops the field. They expose no option to swap the list
 * component, so the hub is built here instead of being patched in.
 *
 * ONE CARD PER TAG, FIVE MOST RECENT POSTS IN EACH. `news` is excluded by name:
 * award announcements date badly and pull a craft archive toward being a
 * newswire. Excluding a tag by string is a deliberate editorial choice, so it is
 * a named constant, not a filter buried in the sort.
 *
 * LINK PREFIX: this component is placed on the Desk index ONLY, and emits
 * "./" + slug. Quartz's own PageList resolves links properly with
 * resolveRelative(); a plain-JS local plugin cannot import from quartz/util
 * (see the loadability constraint in ./post-dates/index.js). verify-default-mode
 * asserts the hub appears on the index and nowhere else, so moving it will fail
 * the suite rather than quietly emit 404s.
 */

const PER_TAG = 5
const EXCLUDED_TAGS = new Set(["news"])

const fmt = (d) => (d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short" }) : null)

function TagHubComponent({ allFiles, cfg, fileData }) {
  // Self-guard, and the reason this component is safe to ship.
  //
  // The config also says `condition: is-index`, but an unrecognised condition
  // name resolves to undefined and is SILENTLY IGNORED — with `index` (which
  // did not exist) the hub rendered on every page of every page type and
  // nothing reported an error. Belt and braces: this check depends on nothing
  // but the props. verify-default-mode asserts the hub is on the index and on
  // no other page.
  if (fileData?.slug !== "index") return null
  if (!Array.isArray(allFiles) || allFiles.length === 0) return null

  // Only real posts, and only published ones — an unpublished draft must never
  // surface through the hub even if it is still in `allFiles`.
  //
  // `.filter((f) => f.slug !== "index")` is the Desk excluding itself, and it is
  // needed here too even though it looked unnecessary: `!slug.endsWith("/")`
  // excludes folder slugs and nothing else, and "index" is not a folder. The hub
  // never showed the fault because content/index.md has no TAGS, so the homepage
  // dropped out of `byTag` instead. year-foldouts groups by year, which no
  // filter happened to catch, so it listed the Desk inside its own archive.
  const posts = allFiles
    .filter((f) => f.frontmatter?.title)
    .filter((f) => f.frontmatter?.publish !== false)
    .filter((f) => f.slug && f.slug !== "index" && !f.slug.endsWith("/"))

  const byTag = new Map()
  for (const post of posts) {
    const tags = post.frontmatter?.tags ?? []
    for (const tag of tags) {
      if (EXCLUDED_TAGS.has(tag)) continue
      if (!byTag.has(tag)) byTag.set(tag, [])
      byTag.get(tag).push(post)
    }
  }
  if (byTag.size === 0) return null

  const newestFirst = (a, b) => {
    const at = a.dates?.created ?? a.dates?.modified
    const bt = b.dates?.created ?? b.dates?.modified
    if (at && bt && at.getTime() !== bt.getTime()) return bt.getTime() - at.getTime()
    return (b.frontmatter?.title ?? "").localeCompare(a.frontmatter?.title ?? "")
  }

  // Busiest tags first: that ordering is what makes the page read as a map of
  // where the writing actually spends its time.
  const tags = [...byTag.keys()].sort((a, b) => {
    const d = byTag.get(b).length - byTag.get(a).length
    return d !== 0 ? d : a.localeCompare(b)
  })

  const totalShown = tags.reduce((n, t) => n + Math.min(byTag.get(t).length, PER_TAG), 0)

  return h(
    "section",
    { class: "eb-hub", "aria-label": "Browse by topic" },
    h("p", { class: "eb-hub__count" }, `${totalShown} posts across ${tags.length} topics`),
    tags.map((tag) => {
      const group = byTag.get(tag).sort(newestFirst)
      const shown = group.slice(0, PER_TAG)
      return h(
        "article",
        { class: "eb-hub__card" },
        h(
          "h3",
          { class: "eb-hub__tag" },
          h("a", { class: "internal", href: `./tags/${tag}` }, tag.replace(/-/g, " ")),
          h("span", { class: "eb-hub__n" }, String(group.length)),
        ),
        h(
          "ul",
          { class: "eb-hub__list" },
          shown.map((post) =>
            h(
              "li",
              { class: "eb-hub__item" },
              h(
                "a",
                { class: "eb-hub__link internal", href: `./${post.slug}` },
                h("span", { class: "eb-hub__title" }, post.frontmatter.title),
              ),
              post.frontmatter.description
                ? h("p", { class: "eb-hub__desc" }, post.frontmatter.description)
                : null,
              post.dates?.created
                ? h(
                    "time",
                    { class: "eb-hub__date", datetime: post.dates.created.toISOString() },
                    fmt(post.dates.created),
                  )
                : null,
            ),
          ),
        ),
        group.length > PER_TAG
          ? h(
              "p",
              { class: "eb-hub__more" },
              h(
                "a",
                { class: "internal", href: `./tags/${tag}` },
                `${group.length - PER_TAG} more on ${tag.replace(/-/g, " ")}`,
              ),
            )
          : null,
      )
    }),
  )
}

function TagHub() {
  return TagHubComponent
}

export { TagHub }
export default { components: { TagHub } }
