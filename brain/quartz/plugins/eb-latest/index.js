import { h } from "preact"

/**
 * eb-latest — "Latest dispatches", at the TOP of the Desk. 12.7.
 *
 * WHY THIS EXISTS. The reader's own report: opening /desk/ and scrolling
 * straight past the topic cards to the year fold-outs, because what they
 * wanted was the newest writing and to work backwards from it. That is not a
 * quirk, it is the page disagreeing with the order people actually arrive
 * with. Both existing sections are THEMATIC — topic cards answer "what is this
 * about", the fold-outs answer "browse the archive" — so the one chronological
 * question had no answer on the page at all.
 *
 * THERE WAS ALREADY A "Latest dispatches" LIST, AND IT WAS INVISIBLE. Measured
 * in the built index.html before this change: `@quartz-community/recent-notes`
 * was enabled and rendering, but its markup sat at offset ~48465, INSIDE the
 * sidebar's graph container, after everything else on the page. So the site
 * already answered the question and the reader could not see the answer. This
 * component replaces that sidebar orphan with one that renders in the body, in
 * reading order, above the topic cards.
 *
 * FIVE, NOT THREE, AND NOT TWELVE. Three is what a sidebar panel can carry; a
 * body section has room for a second row, and "the last five" is the window a
 * fortnightly letter actually occupies. It is a constant because the honest
 * alternative is a number tuned by eye that nobody re-checks.
 *
 * WHY NOT A QUARTZ-NATIVE SHORTCUT. `recent-notes` cannot be placed in
 * `beforeBody` with a priority that puts it above tag-hub, and it drops the
 * `description` field entirely — a bare title list is what the reader was
 * already scrolling past on the fold-outs, and 11.9.11 fixed exactly that
 * complaint in the year rows. So the standfirst comes along here too.
 *
 * STANDFIRSTS ARE CLAMPED TO ONE LINE, unlike the cards' two. A row in a
 * dated list is a lookup surface: the reader is scanning for a subject, and
 * descriptions here run to a full sentence, which would triple the height of a
 * list meant to be skimmed. One line is enough to recognise a dispatch.
 *
 * NO COUNT AND NO "MORE" LINK. The fold-outs immediately below are the whole
 * archive and their own heading carries the honest total (11.9.11 — the old
 * "see 45 more" counted files, not dispatches). A number here would be a
 * second, competing total on the same page.
 *
 * LINK PREFIX and the index-only guard are the same constraints as ./tag-hub
 * and ./year-foldouts, for the same reasons: a plain-JS local plugin cannot
 * import quartz/util, so it emits "./" + slug and must render on the Desk and
 * nowhere else. verify-default-mode asserts both.
 *
 * Plain .js, no JSX, self-contained — see ./post-deck/index.js for why.
 */

const LIMIT = 5

const fmt = (d) => (d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short" }) : null)

function EbLatestComponent({ allFiles, fileData }) {
  // Same two guards as tag-hub / year-foldouts. The config's `condition:
  // is-index` is not a condition Quartz knows, and an unknown condition
  // resolves to undefined and is SILENTLY IGNORED — the slug check is what
  // actually holds the component to the Desk.
  if (fileData?.slug !== "index") return null
  if (!Array.isArray(allFiles) || allFiles.length === 0) return null

  // Real, published posts only. The Desk is not a post: its slug is "index",
  // which does not end in a slash, so a `!slug.endsWith("/")` filter does not
  // catch it — see the identical note in ./year-foldouts, where that omission
  // once listed the Desk inside its own archive as a 2023 dispatch.
  const posts = allFiles
    .filter((f) => f.frontmatter?.title)
    .filter((f) => f.frontmatter?.publish !== false)
    .filter((f) => f.slug && f.slug !== "index" && !f.slug.endsWith("/"))

  // A post with no date cannot be placed in a chronological list. Sorting it
  // first would be worse than omitting it — this is the "Writing Abroad" class
  // of bug the export script also reports loudly.
  const dated = posts.filter((p) => p.dates?.created)
  if (dated.length === 0) return null

  const newestFirst = (a, b) => {
    const at = a.dates.created.getTime()
    const bt = b.dates.created.getTime()
    // Tie-break on title so two posts sharing a date cannot swap places between
    // builds, which would churn the HTML for no reason.
    if (at !== bt) return bt - at
    return (a.frontmatter.title ?? "").localeCompare(b.frontmatter.title ?? "")
  }

  const shown = dated.sort(newestFirst).slice(0, LIMIT)

  return h(
    "section",
    { class: "eb-latest", "aria-label": "Latest dispatches" },
    h("h2", { class: "eb-latest__title" }, "Latest dispatches"),
    h(
      "ol",
      { class: "eb-latest__list" },
      shown.map((post) =>
        h(
          "li",
          { class: "eb-latest__item" },
          h(
            "time",
            { class: "eb-latest__date", datetime: post.dates.created.toISOString() },
            fmt(post.dates.created),
          ),
          h(
            "a",
            { class: "eb-latest__link internal", href: `./${post.slug}` },
            post.frontmatter.title,
          ),
          post.frontmatter.description
            ? h("p", { class: "eb-latest__desc" }, post.frontmatter.description)
            : null,
        ),
      ),
    ),
  )
}

function EbLatest() {
  return EbLatestComponent
}

export { EbLatest }
export default { components: { EbLatest } }