import { h } from "preact"

/**
 * post-dates — the Desk's post header.
 *
 * S10 / D18 (plan §22.3). Renders `Published <date> • Updated <date>` plus a
 * "Recently updated" pill. Two deliberate decisions:
 *
 * 1. The pill is computed on the CLIENT, not baked at build time. A build-time
 *    flag is frozen until the next publish, so on 2026-12-29 it would still be
 *    claiming every post in the archive was recently updated. A few lines of JS
 *    reading the `modified` date against `Date.now()` cannot go stale. The pill
 *    ships `hidden` and the script below reveals it only when the post really
 *    was revised inside the window — so a reader without JS simply sees no pill,
 *    which is the safe failure.
 *
 * 2. It is NOT a real tag. A stored `recently-updated` tag would mix system
 *    state into the editorial tag taxonomy (§25) and would need rebuilding every
 *    time it expired. Derive it; store nothing.
 *
 * The dates are plain `<time>` elements, so they are correct with JS disabled.
 *
 * NOTE: plain .js, no JSX, no imports from `quartz/components`. The loader
 * symlinks a local plugin into `.quartz/plugins/` and imports it as a *runtime*
 * module (a computed dynamic import, which the bundler cannot follow), so it must
 * be loadable by Node as-is: pre-compiled JavaScript, and self-contained because
 * a relative import back into the build source would resolve through the
 * symlink. `h` (hyperscript) stands in for JSX for the same reason.
 */

const RECENT_WINDOW_DAYS = 90

const isoDay = (d) => d.toISOString().slice(0, 10)

const fmt = (d) =>
  d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })

// The actual renderer, receiving Quartz's per-page props.
function PostDatesComponent({ fileData }) {
  // AN INDEX IS NOT A DISPATCH. 11.9.11.
  //
  // content/index.md is the Desk — an archive index, not a post — and "Published
  // Jan 19, 2023" above it is a claim about a page that was not published that
  // day. It appeared there only because the frontmatter has to carry a date for
  // recent-notes to sort against (see the comment in content/index.md).
  //
  // The guard is on the slug, not on a missing date, because the date is exactly
  // what is present. Every other index-style page in this site is a real folder
  // index and none of them are listed in the sitemap, so "index" is the only one
  // that reaches a reader at all.
  if (fileData?.slug === "index") return null

  const created = fileData?.dates?.created
  const modified = fileData?.dates?.modified ?? created
  if (!created) return null

  const sameDay = modified != null && isoDay(created) === isoDay(modified)
  const line = [
    h("span", { class: "eb-post-dates__label" }, "Published"),
    " ",
    h("time", { datetime: created.toISOString() }, fmt(created)),
  ]

  if (!sameDay && modified != null) {
    line.push(
      h("span", { class: "eb-post-dates__sep", "aria-hidden": "true" }),
      h("span", { class: "eb-post-dates__label" }, "Updated"),
      " ",
      h(
        "time",
        { class: "eb-post-dates__updated", datetime: modified.toISOString() },
        fmt(modified),
      ),
      h(
        "span",
        {
          class: "eb-recently-updated",
          "data-eb-recently-updated": "",
          "data-modified": isoDay(modified),
          hidden: true,
        },
        "Recently updated",
      ),
    )
  }

  return h("div", { class: "eb-post-dates" }, h("span", { class: "eb-post-dates__line" }, line))
}

// A plugin-registered component is a *constructor*: Quartz calls it with the
// plugin's options and expects the component back. (Exporting a bare component
// here is what made it blow up on `Cannot destructure 'fileData' of undefined`.)
// Reveal the pill when the post was genuinely revised within the window. Bounded
// on both sides: a clock skew or a typo'd future date must not light it up.
//
// Attached to BOTH the constructor and the component it returns. The resource
// emitter may read `afterDOMLoaded` off either one (the registry holds the
// constructor; the layout walks the instantiated component). Attaching it to
// only the constructor shipped nothing — the pill was in the markup but the
// script that reveals it was silently missing, which is exactly the kind of
// half-working feature the guard is for.
const revealScript = `
  document.querySelectorAll("[data-eb-recently-updated]").forEach((el) => {
    const iso = el.getAttribute("data-modified");
    if (!iso) return;
    const days = (Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000;
    if (days >= 0 && days < ${RECENT_WINDOW_DAYS}) el.removeAttribute("hidden");
  });
`
PostDatesComponent.afterDOMLoaded = revealScript

function PostDates() {
  return PostDatesComponent
}
PostDates.afterDOMLoaded = revealScript

export { PostDates }
export default { components: { PostDates } }
