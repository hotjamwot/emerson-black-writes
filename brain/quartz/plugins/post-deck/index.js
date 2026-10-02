import { h } from "preact"

/**
 * post-deck — the standfirst under a post's title. 11.9.5(c).
 *
 * The gap this fills. Every post has a `description:` in its frontmatter, and
 * until now the only places it appeared were the listings — /desk/ (11.9.5a),
 * /tags/<x>/ (11.9.5b), and `<meta name="description">` in the head. Open an
 * actual post and the header went straight from the title to the dates to the
 * topic pills, with the one piece of text that says what the piece is about
 * never rendered. It was in the built file the whole time, just never in the body.
 *
 * Order matters, and the config fixes it: article-title (10) → post-deck (15) →
 * post-dates (25) → tag-list (30). The deck is the sentence that sets up the
 * post, so it belongs directly under the title and above the metadata. Putting
 * it after the dates would read as a footnote.
 *
 * IT IS NOT THE SAME TEXT AS THE META DESCRIPTION, and that is deliberate. The
 * meta description is written for a search result and link preview; the deck is
 * read in place, under a title the reader can already see. Here they are the
 * same string because that is all there is — but the two are rendered from
 * different fields' worth of intent, so they can diverge later without this
 * component needing to change.
 *
 * IT RENDERS NOTHING on pages with no description, rather than an empty box.
 * That is the whole guard: a standalone page, a 404 or a folder listing has no
 * standfirst, and a component that emits `<p></p>` to say so leaves a gap under
 * the title that only shows up as "something is oddly spaced here".
 *
 * Plain .js, no JSX, no imports. See ./post-dates/index.js for why: the loader
 * imports a local plugin as a runtime module through a symlink, so it must be
 * loadable by Node as-is and self-contained.
 */

function PostDeckComponent({ fileData }) {
  // Self-guard. Nothing in the props promises a description exists — every post
  // has one today, but folder listings, 404 and standalone pages do not, and a
  // future post with the field omitted must not leave a hole in the header.
  const description = fileData?.description ?? fileData?.frontmatter?.description
  if (typeof description !== "string") return null
  const text = description.trim()
  if (text.length === 0) return null

  return h("p", { class: "eb-post-deck" }, text)
}

function PostDeck() {
  return PostDeckComponent
}

export { PostDeck }
export default { components: { PostDeck } }
