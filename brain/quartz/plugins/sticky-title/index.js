import { h } from "preact"

/**
 * sticky-title — the mobile reading header.
 *
 * 11.9.7e. HayJay's call: on a phone the sticky bar should be the NAV while the
 * reader is at the top of a post, and collapse to a SHRUNKEN TITLE of the post
 * once the title itself has scrolled away. Nothing else stays. Subscribe is in
 * the nav at rest and deliberately absent once reading — it is a conversion
 * prompt, not something to keep on screen the whole time you are reading.
 *
 * Why a component rather than CSS alone: the header bar and the article title
 * are in different parts of the DOM (`.page-header` sits inside `.center`,
 * above `<article>`), so there is no pure-CSS way to decide "has the title been
 * scrolled past". That needs a measurement.
 *
 * Fails safe: the title element is emitted but hidden by CSS, and the script
 * only adds a class. If the script never runs — JS off, or the class not
 * applied — the header simply stays as it is today. The reader never gets a
 * blank bar, because the title is a *sibling* of the nav and does not replace
 * it in the DOM; `display` swaps which one is visible.
 *
 * NOTE: plain .js, no JSX, no imports from `quartz/components`. See the
 * identical constraint note in ./post-dates/index.js — the loader symlinks a
 * local plugin and imports it at runtime, so it must load in Node as-is.
 */

function StickyTitleComponent({ fileData }) {
  const title = fileData?.frontmatter?.title
  // No title (the Desk index, 404) -> render nothing and let the CSS keep the
  // nav as the whole bar. An empty title element would still reserve the
  // compact height and leave a blank strip.
  if (!title) return null
  return h("span", { class: "eb-sticky-title" }, title)
}

/*
 * The scroll handler. Bounded to one frame via rAF, and torn down on SPA
 * navigation: this script is re-run on every client-side page change, so
 * without the cleanup handle each visit would leave another scroll listener
 * behind and the bar would get progressively laggier the longer the session ran.
 */
const stickyTitleScript = `
  if (window.__ebStickyTitleTeardown) window.__ebStickyTitleTeardown();

  (function () {
    var header = document.querySelector(".page > #quartz-body .page-header > header");
    if (!header) return;

    var h1 = document.querySelector("article h1");
    // No article title on this page: drop back to the plain nav.
    if (!h1) { header.classList.remove("eb-header--compact"); return; }

    var ticking = false;
    function update() {
      var h = header.getBoundingClientRect().height;
      var past = h1.getBoundingClientRect().bottom < h;
      header.classList.toggle("eb-header--compact", past);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.__ebStickyTitleTeardown = function () {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      header.classList.remove("eb-header--compact");
    };
  })();
`
StickyTitleComponent.afterDOMLoaded = stickyTitleScript

// A plugin-registered component is a constructor: Quartz calls it with the
// options and expects the component back. See ./post-dates/index.js.
function StickyTitle() {
  return StickyTitleComponent
}
StickyTitle.afterDOMLoaded = stickyTitleScript

export { StickyTitle }
export default { components: { StickyTitle } }
