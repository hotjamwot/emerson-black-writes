import { h } from "preact"

/**
 * wordmark — the Desk's site identity.
 *
 * 11.9.6 + 11.9.8. Replaces `@quartz-community/page-title` (which has no
 * options and links to `pathToRoot`, i.e. back into /desk/). This renders the
 * storefront's two-line stacked mark — "Emerson Black" over "Seen in
 * Silverbridge" — and links to `/`, so both halves behave identically.
 *
 * Same loadability constraints as quartz/plugins/post-dates: plain .js, no
 * JSX, no imports from `quartz/components` (runtime dynamic import through a
 * symlink — must be loadable by Node as-is; `h` stands in for JSX).
 */

function WordmarkComponent({ displayClass }) {
  const cls = ["page-title", "eb-wordmark", displayClass].filter(Boolean).join(" ")
  return h(
    "h2",
    { class: cls },
    h(
      "a",
      { href: "/", "aria-label": "Emerson Black — home" },
      h("span", { class: "eb-wordmark-name" }, "Emerson Black"),
      h("span", { class: "eb-wordmark-series", "aria-hidden": "true" }, "Seen in Silverbridge"),
    ),
  )
}

function Wordmark() {
  return WordmarkComponent
}

export { Wordmark }
export default { components: { Wordmark } }
