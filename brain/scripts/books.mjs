/**
 * §12.9 — CANONICAL BOOK DATA. The single source of truth for which book is
 * which, what it is called, and where it is sold.
 *
 * WHY THIS FILE EXISTS. Before it, the repo carried TWO contradictory sets of
 * Amazon links: the homepage's short links in `index.html`, and 18 posts linking
 * books directly. Resolving the short links proved they pointed at:
 *
 *   Book 1  amzn.eu/d/2hPym9v  ->  B0BTML7L86   posts agreed   OK
 *   Book 2  amzn.eu/d/7QcaE4n  ->  B0CJ5Z85S4   posts said 7Vg6bSy  MISMATCH
 *   Book 3  a.co/d/0bxUbDmW    ->  B0GY5YH83F   posts agreed   OK
 *
 * `B0CJ5Z85S4` looked like a stray ASIN belonging to no book; it is Book 2.
 *
 * WHY `url` IS THE SHORT LINK AND NOT THE ASIN. Proven, not assumed: the short
 * links GEO-REDIRECT. Resolving them landed Book 1 on amazon.co.uk and Book 3 on
 * amazon.com — the reader's own storefront. A bare `amazon.com/dp/...` cannot do
 * that, and would send a Swedish or Japanese reader to the US store. The author
 * asked for country-redirecting behaviour, so the short link is the correct
 * value, and `asin` exists purely for diagnostics: ASINs are a stable identity
 * while short links are opaque, so it is what the link checker compares against.
 *
 * `aliases` is why the matcher can be trusted. The site spelled Book 1 "A Rock
 * STAR Has Exploded" while 17 posts spelled it "Rockstar"; the author confirmed
 * **Rockstar** is correct, so index.html was wrong (fixed in the same commit).
 * Rather than hardcoding that one mistake, every spelling a post might
 * legitimately use is listed here, so a future title change is a one-line edit
 * to this file instead of a hunt through 49 posts.
 *
 * `match` patterns are matched case-insensitively. They are deliberately LOOSE
 * about punctuation — "Fiance" and "Fiancé" must both match, since an author
 * writing fast may not preserve the accent — but never so loose that an
 * unrelated word can match.
 *
 * MAINTENANCE. Edit this file when a book is published (add an entry) or
 * re-released under a new ASIN (update `url` + `asin`). Nothing else. There is
 * no step to run — it is imported at build time — and no post ever needs editing
 * to gain or lose a mention card. That is the §12.8 rule applied: this data is
 * ALREADY COMMITTED, so generating from it is free.
 */

/** @type {Book[]} */
export const BOOKS = [
  {
    number: 0,
    title: "A Student Has Drowned",
    asin: "B0C2NPQDVM",
    // Free: there is nothing to buy, so the homepage button is
    // `href="#start-reading"` (the email signup) rather than an Amazon link.
    url: null,
    aliases: ["Student Has Drowned"],
    match: ["student has drowned"],
    cover: "cover_student_has_drowned.webp",
    blurb:
      "The prequel novella, and the easiest place to start. A drowned student, a rowing club with too many secrets, and a paper that should have folded years ago.",
    free: true,
    latest: false,
  },
  {
    number: 1,
    // "Rockstar", ONE word. The site previously said "Rock Star" and was wrong:
    // 17 posts and the author agree on this spelling.
    title: "A Rockstar Has Exploded",
    asin: "B0BTML7L86",
    url: "https://amzn.eu/d/2hPym9v",
    aliases: ["A Rock Star Has Exploded", "Rock Star Has Exploded"],
    match: ["rockstar has exploded", "rock star has exploded"],
    cover: "cover_rockstar_has_exploded.webp",
    blurb:
      "Luce and Huds pick up their first accidental murder case: a Swedish rock star who detonates in his own hotel suite.",
    free: false,
    latest: false,
  },
  {
    number: 2,
    title: "An Actress Is Missing",
    // B0CJ5Z85S4 — verified by resolving amzn.eu/d/7QcaE4n. Two 2023 posts already
    // used this ASIN; the 7Vg6bSy short link that appeared to contradict it was a
    // DIFFERENT short link to the same book, not a different book.
    asin: "B0CJ5Z85S4",
    url: "https://amzn.eu/d/7QcaE4n",
    aliases: ["Actress Is Missing"],
    match: ["actress is missing"],
    cover: "cover_actress_is_missing.webp",
    blurb:
      "The whole team returns. Stella Winston-Frazer has gone missing, and the people who want her found are not the people who want her safe.",
    free: false,
    latest: false,
  },
  {
    number: 3,
    title: "A Fiancé Has Flatlined",
    asin: "B0GY5YH83F",
    url: "https://a.co/d/0bxUbDmW",
    // The accent is optional when matching: "Fiance" must not silently fail to
    // match its own book because an accent was dropped.
    aliases: ["A Fiance Has Flatlined", "Fiance Has Flatlined"],
    match: ["fianc(?:e|é) has flatlined"],
    cover: "cover_fiance_has_flatlined.webp",
    blurb:
      "The Silverbridge Arrows goalkeeper is found dead at Luce's engagement party. The Seen team take the case.",
    free: false,
    latest: true,
  },
]

/** Books in series order — the array is authored in order and asserted to be. */
export const BOOKS_IN_ORDER = [...BOOKS].sort((a, b) => a.number - b.number)

/**
 * Which books a body of text mentions.
 *
 * Returns matches in SERIES order, not in the order they appear in the text, so
 * the card always reads 0 -> 1 -> 2 -> 3 rather than jumping about.
 *
 * The caller passes text that has ALREADY had frontmatter, code blocks and image
 * alt text stripped. Doing that here instead would be slower and would drift from
 * the caller's rules — most importantly, alt text is not a mention.
 *
 * @param {string} stripped post body, frontmatter/code/alt already removed
 * @returns {Book[]}
 */
export function findMentionedBooks(stripped) {
  const haystack = " " + stripped.toLowerCase() + " "
  return BOOKS_IN_ORDER.filter((book) => book.match.some((p) => new RegExp(p, "i").test(haystack)))
}

/** "Book 0", "Book 3" — the series label shown next to a title. */
export const bookLabel = (book) => `Book ${book.number}`