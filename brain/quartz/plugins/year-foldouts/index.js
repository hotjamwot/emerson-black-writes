import { h } from "preact"

/**
 * year-foldouts — the Desk's other axis. 11.9.10.
 *
 * WHAT IT REPLACES. `/Newsletters/` was a page that did nothing but list four
 * years, and each of those years was a folder-page listing the posts inside it.
 * Five URLs to say one thing, and the top one was the only page in the site whose
 * entire content was a list of links to other pages. All of it is now here:
 * the topic cards above (11.9.5a) answer "what is this site about", and this
 * answers "what has he actually written", which is the question the year folders
 * were trying to answer badly.
 *
 * WHY <details> AND NOT A LIST. `<details>`/`<summary>` is a native disclosure
 * widget: it is keyboard operable, screen-reader labelled and themable with two
 * lines of CSS, and it works with no JavaScript at all. Building this as a
 * button + aria-expanded + a script would be strictly worse on all four counts
 * and would be another script to keep working after Quartz upgrades. The one
 * thing it cannot do is animate the open/close, which the CSS below does not
 * attempt either — a disclosure that slides is a disclosure that lies about
 * where its content is.
 *
 * ORDER WITHIN A YEAR is newest first, matching the tag cards and matching the
 * promise of the old `/Newsletters/` page ("newest first"). Years descend. The
 * newest year is `open` so the section does not read as an empty control: a
 * closed disclosure on a page that looks like a list is indistinguishable from a
 * broken one.
 *
 * TITLES ONLY — WHICH WAS WRONG, AND WAS FIXED ON BEING ASKED FOR. 11.9.11. This
 * component shipped with title and date and no standfirst, on the reasoning that
 * the tag cards above already carry descriptions so repeating all 49 would say
 * the same thing twice. That reasoning was sound about the CARDS and wrong about
 * the YEAR LIST: a card shows the five most recent posts in a topic, so it is a
 * way in, whereas this list IS the archive. A reader who opens 2023 to find one
 * specific dispatch was previously given forty-odd bare titles and had to open
 * each one to know what any of them were about — and the whole point of the
 * fold-out is that it is now open.
 *
 * So every row carries its standfirst too, clamped to one line by the CSS. Clamped
 * because descriptions here run to a full sentence: unclamped they would triple
 * the height of a list the reader opened to scan, which is the opposite of a
 * lookup table. The two-line clamp on the cards is 2 because a card is a preview;
 * one line here is enough to recognise a dispatch from its subject.
 *
 * ROW SHAPE changed with it. Date and text used to be siblings directly under the
 * <li>, which only works while the date is the only thing besides the title. With
 * a description the title has to hang off a block beside the date, or every row
 * becomes a full-width stack and the dates stop forming a column — and the dates
 * forming a column is the entire reason this is a by-YEAR list.
 *
 * LINK PREFIX and the index-only guard are the same constraints as ./tag-hub, for
 * the same reason: a plain-JS local plugin cannot import quartz/util (see the
 * loadability constraint in ./post-dates/index.js), so it emits "./" + slug and
 * must only ever render on the index. verify-default-mode asserts it appears on
 * the Desk and on no other page.
 */

const fmtDay = (d) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null)

function YearFoldoutsComponent({ allFiles, fileData }) {
  // Same two guards as tag-hub: the config's `condition: is-index` is not a
  // condition Quartz knows, and an unknown condition resolves to undefined and is
  // SILENTLY IGNORED. The slug check is what actually holds.
  if (fileData?.slug !== "index") return null
  if (!Array.isArray(allFiles) || allFiles.length === 0) return null

  // Only real posts, and only published ones — an unpublished draft must never
  // surface through the fold-outs even if it is still in `allFiles`.
  //
  // THE DESK IS NOT A POST, and the filter that says so has to be explicit.
  // `!slug.endsWith("/")` excludes FOLDER slugs and does nothing else; the Desk
  // itself has the slug "index", which does not end in a slash. The first version
  // of this listed the Desk inside its own archive as a 2023 post, and the row
  // count came out 50 against 49 real ones.
  //
  // tag-hub never noticed, and the reason is worth knowing: it groups by TAG, and
  // content/index.md has no tags, so the homepage silently dropped out on that
  // path. Two components, two filters, one of them wrong by accident.
  const posts = allFiles
    .filter((f) => f.frontmatter?.title)
    .filter((f) => f.frontmatter?.publish !== false)
    .filter((f) => f.slug && f.slug !== "index" && !f.slug.endsWith("/"))

  // A post with no date cannot be placed in a year, so it cannot appear in a
  // by-year list. It is dropped rather than bucketed into a fake year, which
  // would be a lie about when it was written.
  const dated = posts.filter((p) => p.dates?.created)
  if (dated.length === 0) return null

  const newestFirst = (a, b) => {
    const at = a.dates.created
    const bt = b.dates.created
    if (at.getTime() !== bt.getTime()) return bt.getTime() - at.getTime()
    return (a.frontmatter?.title ?? "").localeCompare(b.frontmatter?.title ?? "")
  }

  const byYear = new Map()
  for (const post of dated) {
    const year = String(post.dates.created.getFullYear())
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year).push(post)
  }

  // Descending by year. Map preserves insertion order, which is the order posts
  // were walked in, so this sort is load-bearing rather than cosmetic.
  const years = [...byYear.keys()].sort((a, b) => Number(b) - Number(a))

  return h(
    "section",
    { class: "eb-years", "aria-label": "All posts by year" },
    h(
      "h2",
      { class: "eb-years__heading", id: "everything-by-year" },
      h("span", null, "Everything, by year"),
      h("span", { class: "eb-years__total" }, `${dated.length} posts`),
    ),
    years.map((year, i) => {
      const group = byYear.get(year).sort(newestFirst)
      return h(
        "details",
        {
          class: "eb-years__fold",
          // The first section opens. See the header comment: a closed
          // disclosure on a page that reads as a list looks broken.
          open: i === 0 ? true : undefined,
        },
        h(
          "summary",
          { class: "eb-years__summary" },
          h("span", { class: "eb-years__year" }, year),
          h(
            "span",
            { class: "eb-years__n" },
            `${group.length} post${group.length === 1 ? "" : "s"}`,
          ),
        ),
        h(
          "ol",
          { class: "eb-years__list" },
          group.map((post) =>
            h(
              "li",
              { class: "eb-years__row" },
              h(
                "div",
                { class: "eb-years__meta" },
                h(
                  "time",
                  { class: "eb-years__date", datetime: post.dates.created.toISOString() },
                  fmtDay(post.dates.created),
                ),
              ),
              h(
                "div",
                { class: "eb-years__body" },
                h(
                  "a",
                  { class: "internal eb-years__link", href: `./${post.slug}` },
                  post.frontmatter.title,
                ),
                post.frontmatter.description
                  ? h("p", { class: "eb-years__desc" }, post.frontmatter.description)
                  : null,
              ),
            ),
          ),
        ),
      )
    }),
  )
}

function YearFoldouts() {
  return YearFoldoutsComponent
}

export { YearFoldouts }
export default { components: { YearFoldouts } }
