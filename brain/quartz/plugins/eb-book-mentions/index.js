import { h } from "preact"
import { BOOKS_IN_ORDER } from "../../../scripts/books.mjs"

/**
 * eb-book-mentions — a "door" from a dispatch to the books. §11.6.
 *
 * WHY THIS EXISTS. The Desk and the books were two separate rooms with no door
 * between them: a reader could finish "How To Build a Human" and have no way to
 * reach the fiction it came from. This adds the door, at the end of the post,
 * for the 15 posts that already name a book.
 *
 * THE WORDING IS THE WHOLE DESIGN DECISION, and it is the author's. An earlier
 * proposal asserted that a post "demonstrated" a book, which is a claim about
 * causation that no machine can verify — most of the mentions are passing
 * ("thanks to everyone who downloaded A Student Has Drowned"), and attaching
 * "this book came out of this post" to those would have the site over-claiming
 * on the author's behalf. "Mentioned in this post" is a statement about the TEXT,
 * which is exactly true and exactly what we can assert. It is also the reason
 * this can be automated at all.
 *
 * WHY AN `afterBody` COMPONENT AND NOT A TRANSFORMER. Both are available in this
 * Quartz: `textTransform`/`markdownPlugins` see raw markdown, `afterBody`
 * components see the rendered tree. The transformer route was rejected because it
 * would have to inject raw HTML as a string, hand-rolling markup that the
 * renderer then re-escapes or reflows around. `afterBody` hands us a real DOM,
 * so the card is real elements with real links and the theme's own stylesheet can
 * style them like anything else. Working WITH Quartz, not around it.
 *
 * IT DOES NOT LINK AMAZON. The card links the SERIES (`/desk/` is the writing;
 * the books live on the homepage), because a hard sell inside a craft post breaks
 * the thing that makes people read the author. The book is NAMED and the path
 * EXISTS; the buying happens on the homepage where the buy links already are.
 * That also means this component needs no ASIN, and cannot drift from one.
 *
 * WHICH BOOKS. Matched from `../../../../scripts/books.mjs` — the same canonical
 * source the homepage and `check-book-links.mjs` use, so the card cannot name a
 * book the rest of the site contradicts. Matching is on the canonical title and
 * its known aliases only ("A Rock Star Has Exploded" as well as "Rockstar"),
 * because the site got that one wrong once already.
 *
 * ONLY ON REAL POSTS. The Desk itself, tag pages and folder pages have no title
 * mention to speak of and must never grow a card; the same slug guard as
 * eb-latest/tag-hub/year-foldouts applies, and for the same reason: the config's
 * `condition: is-index` is decorative, because Quartz does not know that
 * condition name and silently ignores it.
 *
 * Plain .js, no JSX — see ./eb-latest/index.js for the full rationale.
 */

const SERIES_URL = "/#books"

/** Only dispatched posts, and never the Desk / tag pages / folder pages. */
function isPost(fileData) {
  const slug = fileData?.slug
  if (!slug || slug === "index") return false
  // A trailing slash means a folder page. The Desk's own slug is "index" and is
  // caught above — without that, the Desk would list itself as a dispatch, which
  // is the exact bug year-foldouts once shipped.
  if (slug.endsWith("/")) return false
  if (slug.startsWith("tags/")) return false
  return Boolean(fileData?.frontmatter?.title)
}

/** Escape text for HTML. Titles are author-supplied. */
const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * Which of `books` are named in `haystack`.
 *
 * Series order, not order of appearance, so a card always reads 0 -> 1 -> 2.
 * Patterns come from books.mjs; they are authored to be case-insensitive and
 * tolerant of a dropped accent, because an author writing quickly may not
 * preserve one.
 */
function mentioned(haystack, books) {
  return books.filter((book) => book.match.some((p) => new RegExp(p, "i").test(haystack)))
}

// ⚠️ THE CONSTRUCTOR / COMPONENT SPLIT IS LOAD-BEARING, and getting it wrong
// fails SILENTLY rather than loudly.
//
// `ComponentRegistry.getAllComponents()` treats any registered `function` as a
// QuartzComponentConstructor and calls it with `undefined` (see instantiate() in
// quartz/components/registry.ts). A component exported DIRECTLY is therefore
// invoked once with no props, returns null, and gets cached — so the card never
// renders on any page, and the build still reports success. That is exactly what
// happened first: 18 calls, every one with `slug: undefined`, zero cards shipped.
//
// Exporting a zero-arg CONSTRUCTOR that returns the real component is the shape
// eb-latest, tag-hub and year-foldouts all use. Quartz calls the constructor,
// caches what it returns, and THAT is the component the frame renders with real
// props. The `= {}` default is belt-and-braces on top of that, not the mechanism.
/**
 * Plain text of a hast tree.
 *
 * ⚠️ `String(tree)` IS NOT THIS, and the difference is the whole bug. `tree` is a
 * hast NODE OBJECT, so `String(tree)` yields the literal "[object Object]" — every
 * match failed, every card silently vanished, and the build reported success.
 * That is why the first version shipped nothing at all.
 *
 * This is a vendored copy of `hast-util-to-string` (MIT, by the unified
 * collective), the same function `@quartz-community/description` bundles at the
 * top of its dist. Vendored rather than added to package.json because it is nine
 * lines, is already on disk transitively, and a new dependency is a larger
 * maintenance promise than the code it would supply.
 *
 * It reads `children`/`value` and nothing else, which means a title inside an
 * IMAGE ALT or a fenced CODE BLOCK still counts. That is a deliberate,
 * documented limitation rather than an oversight: alt text on the archive's own
 * book covers is rare, and handling it would mean walking properties we do not
 * otherwise care about.
 */
function treeText(node) {
  if (node == null) return ""
  if (Array.isArray(node)) return node.map(treeText).join("")
  if (typeof node !== "object") return String(node)
  if ("children" in node && Array.isArray(node.children)) return treeText(node.children)
  return "value" in node && typeof node.value === "string" ? node.value : ""
}

function EbBookMentionsComponent({ fileData, tree } = {}) {
  if (!isPost(fileData)) return null

  // The RENDERED text of the post — so a title inside a fenced code block or a
  // markdown link's URL is not mistaken for a mention in the prose.
  const text = treeText(tree)
  if (text.trim() === "") return null

  const found = mentioned(text, BOOKS_IN_ORDER)
  if (found.length === 0) return null

  return h(
    "section",
    { class: "eb-mentions", "aria-label": "Books mentioned in this post" },
    h("h2", { class: "eb-mentions__title" }, "Mentioned in this post"),
    h(
      "ul",
      { class: "eb-mentions__list" },
      found.map((book) =>
        h(
          "li",
          { class: "eb-mentions__item" },
          h("a", { class: "eb-mentions__title-link", href: SERIES_URL }, book.title),
          h("span", { class: "eb-mentions__label" }, `Book ${book.number}`),
          book.blurb ? h("p", { class: "eb-mentions__blurb" }, book.blurb) : null,
        ),
      ),
    ),
    h(
      "p",
      { class: "eb-mentions__more" },
      h("a", { class: "eb-mentions__more-link", href: SERIES_URL }, "Read the series →"),
    ),
  )
}

// The constructor Quartz actually registers — see the note above.
function EbBookMentions() {
  return EbBookMentionsComponent
}

export { EbBookMentions, EbBookMentionsComponent }
export default { components: { EbBookMentions } }