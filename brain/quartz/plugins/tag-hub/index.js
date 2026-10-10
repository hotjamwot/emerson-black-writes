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
 * NO "34 posts across 7 topics" LEDE. 11.9.11. It was removed because it was
 * wrong in a way nobody noticed: `totalShown` sums the FIVE-per-card cap, so it
 * said 34 — which is the number of posts the cards actually list — on a page that
 * is plainly the whole archive. The fold-out heading below says 49, and the page
 * was therefore announcing two different totals about itself. It was also the only
 * thing on the Desk telling you what the cards above it were, which is what a
 * section is for.
 *
 * NO COUNT CHIP. 12.1(d). `.eb-hub__n` printed the tag's FULL count (15, 9, 7…)
 * directly above a list capped at five, so the card announced a number its own
 * list contradicted. `.eb-hub__more` ("6 more on process") already carries the
 * honest remainder one line below, so the chip is deleted rather than corrected:
 * two numbers on one card is the bug, not the wrong one.
 *
 * A CARD IS A `<div>`, NOT AN `<article>` — 12.6. This one word was the sole
 * reason the site carried an override of Quartz's `.page article` rule. That
 * rule caps the reading column at 780px and centres it with
 * `margin-inline: auto`; both effects landed on these cards, because they were
 * articles. The visible symptom was the topic cards measuring 399-524px ragged
 * on equal grid tracks (F15), and the workaround was two declarations of
 * compensation — `:not(.eb-hub__card)` on the cap, and `margin-inline: 0` here
 * to undo the auto margins, since an auto-margined grid item refuses to stretch
 * into its track even with nothing capping it.
 *
 * Neither compensation is now needed. A `<div>` is simply not matched by
 * `.page article`, so the upstream rule applies to the reading column and to
 * nothing else, unmodified. The override is gone rather than merely narrowed.
 *
 * This is the §12.6 trade in one edit, and it is the shape every future
 * "upstream fights us" request should be tested against first: if the thing we
 * are fighting is a SELECTOR we chose to opt into, we can stop choosing it. The
 * semantics also improve — a card holding five links to other posts is a nav
 * group, not a self-contained composition, which is what `<article>` means.
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
const DEFAULT_TAG_ICON = [
  { element: "circle", attrs: { cx: 5, cy: 12, r: 2 } },
  { element: "circle", attrs: { cx: 12, cy: 5, r: 2 } },
  { element: "circle", attrs: { cx: 19, cy: 12, r: 2 } },
  { element: "circle", attrs: { cx: 12, cy: 19, r: 2 } },
  { element: "path", attrs: { d: "m7 11 3.5-4.5m3 0L17 11m0 2-3.5 4.5m-3 0L7 13" } },
]
const TAG_ICONS = {
  mindset: [
    { element: "circle", attrs: { cx: 12, cy: 12, r: 9 } },
    { element: "path", attrs: { d: "m15 9-2 4-4 2 2-4 4-2z" } },
  ],
  process: [
    { element: "path", attrs: { d: "M20 7h-5V2M4 17h5v5" } },
    { element: "path", attrs: { d: "M5.6 9A7 7 0 0 1 18 5l2 2M4 17l2 2a7 7 0 0 0 12.4-4" } },
  ],
  reading: [
    { element: "path", attrs: { d: "M12 7v14M3 18V5a1 1 0 0 1 1-1h3a5 5 0 0 1 5 5 5 5 0 0 1 5-5h3a1 1 0 0 1 1 1v13" } },
  ],
  systems: [
    { element: "path", attrs: { d: "m3 6 9-4 9 4-9 4-9-4zm0 6 9 4 9-4m-18 6 9 4 9-4" } },
  ],
  "craft-character": [
    { element: "path", attrs: { d: "M3 7s4-3 9-3 9 3 9 3v4a9 9 0 0 1-18 0V7z" } },
    { element: "path", attrs: { d: "M8 11h.01M16 11h.01M9 15c1.8 1.5 4.2 1.5 6 0" } },
  ],
  "craft-plot": [
    { element: "path", attrs: { d: "M5 5v7h7m7-7v7h-7m-7 0v7h14" } },
    { element: "circle", attrs: { cx: 5, cy: 5, r: 2 } },
    { element: "circle", attrs: { cx: 19, cy: 5, r: 2 } },
    { element: "circle", attrs: { cx: 19, cy: 19, r: 2 } },
  ],
  bookcraft: [
    { element: "path", attrs: { d: "M6 3h12v18l-6-4-6 4V3z" } },
    { element: "path", attrs: { d: "M9 8h6m-6 3h6" } },
  ],
  "sample-chapter": [
    { element: "path", attrs: { d: "M12 7v14M3 18V5a1 1 0 0 1 1-1h3a5 5 0 0 1 5 5 5 5 0 0 1 5-5h3a1 1 0 0 1 1 1v13" } },
    { element: "path", attrs: { d: "m15 15 2 2 4-4" } },
  ],
}

function renderTagIcon(tag) {
  const shapes = TAG_ICONS[tag] ?? DEFAULT_TAG_ICON
  return h(
    "svg",
    {
      class: "eb-hub__icon",
      width: 18,
      height: 18,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 1.75,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    shapes.map(({ element, attrs }, index) => h(element, { ...attrs, key: index })),
  )
}

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

  return h(
    "section",
    { class: "eb-hub", "aria-label": "Browse by topic" },
    tags.map((tag) => {
      const group = byTag.get(tag).sort(newestFirst)
      const shown = group.slice(0, PER_TAG)
      return h(
        // 12.6 — a `<div>`, not an `<article>`. See the header comment: the card
        // is a nav group, and `<article>` was also the sole reason this site had
        // to override `.page article` at all.
        "div",
        { class: "eb-hub__card" },
        h(
          "h3",
          { class: "eb-hub__tag" },
          h(
            "a",
            { class: "internal", href: `./tags/${tag}` },
            renderTagIcon(tag),
            tag.replace(/-/g, " "),
          ),
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
