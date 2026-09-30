import { componentRegistry } from "./components/registry"
import type { QuartzComponent } from "./components/types"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Emerson Black — default colour mode
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Why this file exists
 * --------------------
 * HayJay's call (2026-09-29): the Brain should open **dark** for a first-time
 * visitor, and the light/dark toggle must stay visible. Stock Quartz can't give
 * us both:
 *
 *   - `@quartz-community/darkmode` initialises with
 *     `localStorage.getItem("theme") ?? matchMedia("(prefers-color-scheme: light)")`,
 *     so a fresh browser simply inherits the OS setting.
 *   - `@quartz-themes/core` `mode: light|dark` *would* force a default, but
 *     `composeCSS` treats any `mode !== "both"` as single-mode and additionally
 *     injects `button.darkmode { display: none !important }` plus a
 *     `beforeDOMReady` script that re-writes `saved-theme` **and**
 *     `localStorage.theme` on every page load. That deletes the toggle and
 *     stamps over the reader's own choice permanently — strictly worse than the
 *     annoyance it fixes. Rejected.
 *
 * The fix
 * -------
 * Seed the storage key *before* Darkmode's own script reads it, and only when
 * the reader has no stored preference.
 *
 * Ordering can't be relied on: `getComponentResources()` adds emitter-supplied
 * components to its set *before* registry ones, so Darkmode's IIFE lands ahead
 * of ours in `prescript.js` no matter how early we register. Both scripts are
 * synchronous in `<head>`, so instead of depending on who runs first we make
 * the outcome order-independent — on a first visit we write **both** the
 * storage key and the `saved-theme` attribute, so whichever script runs last
 * leaves the same result. (Darkmode applies the body class from that attribute
 * on its `render` event, so it picks up our value too.) No flash of the wrong
 * theme, and a reader who has toggled keeps their choice.
 *
 * Registered from `quartz.ts` rather than as a packaged plugin: the component
 * registry is a module singleton and `getComponentResources()` reads from it
 * directly, so a bare component object is all that is needed.
 */

/** The mode a first-time visitor gets. Dark matches the storefront. */
const DEFAULT_MODE = "dark"

const seedDefaultMode = `
(function () {
  try {
    if (localStorage.getItem("theme") === null) {
      localStorage.setItem("theme", "${DEFAULT_MODE}")
      document.documentElement.setAttribute("saved-theme", "${DEFAULT_MODE}")
    }
  } catch (e) {
    /* private mode / storage disabled — fall through to the OS preference */
  }
})();
`.trim()

// NOTE: this must be a plain object, **not** a function. `getAllComponents()`
// branches on `typeof component === "function"` and, for functions, calls it as
// a constructor; a render function invoked with no props throws, and a factory
// returning `null` is falsy — either way the component is silently dropped and
// its `beforeDOMLoaded` never reaches `prescript.js`. A non-function component
// is taken as-is. It is never rendered (it appears in no layout); it exists
// only so `getComponentResources()` picks up its script.
const DefaultColorMode = {
  displayName: "EmersonDefaultColorMode",
  beforeDOMLoaded: seedDefaultMode,
} as unknown as QuartzComponent

export function registerDefaultColorMode(): void {
  componentRegistry.register("EmersonDefaultColorMode", DefaultColorMode, "emerson-local")
}
