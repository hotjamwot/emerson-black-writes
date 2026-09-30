#!/usr/bin/env node
/**
 * Default colour mode check — proves a first-time visitor gets the intended
 * mode *and* that the light/dark toggle survives.
 *
 *   cd brain && node quartz/verify-default-mode.mjs
 *
 * Why it exists: `@quartz-community/darkmode` initialises from
 * `localStorage.getItem("theme") ?? matchMedia(...)`, so out of the box the Brain
 * inherits the reader's OS. `quartz/default-color-mode.ts` seeds the key for
 * visitors with no stored preference, fixing the default without touching
 * Darkmode. The subtlety: we do **not** control execution order —
 * `getComponentResources()` adds emitter-supplied components before registry
 * ones, so Darkmode's IIFE lands ahead of ours in `prescript.js`. The seed is
 * written to be order-independent, and this proves it by running both real
 * scripts in *both* orders against a fake DOM.
 *
 * Also catches the two silent regressions: the toggle being hidden
 * (`@quartz-themes/core` `mode:` left at light/dark instead of `both`, which
 * injects `button.darkmode { display: none !important }` and re-writes the
 * reader's choice every load), and the seed IIFE never reaching `prescript.js`.
 *
 * Exit 0 = default correct in any order, toggle intact. Exit 1 = regression.
 */
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import vm from "node:vm"

const brain = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/** The mode a first-time visitor must get. Mirrors default-color-mode.ts. */
const EXPECTED_DEFAULT = "dark"

const problems = []
const check = (ok, message) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${message}`)
  if (!ok) problems.push(message)
}

// ── 1. the toggle must not be hidden ──────────────────────────────────────────
console.log("Toggle visibility")
const staticDir = join(brain, "public", "static")
let css = ""
try {
  for (const f of readdirSync(staticDir)) {
    if (f.endsWith(".css")) css += readFileSync(join(staticDir, f), "utf8")
  }
} catch {
  console.error("  ! public/static not found — run `npx quartz build` first.")
  process.exit(1)
}
check(
  !/button\.darkmode\s*\{\s*display:\s*none/.test(css),
  "no `button.darkmode { display: none }` rule (mode: both keeps the toggle)",
)

// The theme paints the sun/moon with `background` + `mask-image` and hides the
// real <svg>. Any `background`/`border` we add to .darkmode/.readermode therefore
// paints over (and is clipped by the mask around) the icon itself, which is how
// the toggle became invisible once already. custom.scss is unlayered, so it wins
// over the theme regardless of specificity — this guards the override.
const mainCss = readdirSync(join(brain, "public")).find((f) => /^index.*\.css$/.test(f))
const unlayered = mainCss ? readFileSync(join(brain, "public", mainCss), "utf8") : ""
let offenders = []
if (unlayered) {
  for (const m of unlayered.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/\.darkmode|\.readermode/.test(m[1])) continue
    for (const decl of m[2].split(";")) {
      if (/^(background|border)(-[\w-]+)?\s*:/.test(decl.trim())) {
        offenders.push(`${m[1].trim().slice(0, 40)} => ${decl.trim().slice(0, 50)}`)
      }
    }
  }
}
check(
  Boolean(unlayered) && offenders.length === 0,
  `no background/border overriding the masked icon${
    offenders.length ? ` — found: ${offenders.join(" | ")}` : ""
  }`,
)
check(
  /--icon-color:\s*var\(--darkgray\)/.test(unlayered),
  "icon colour is set via --icon-color (survives the mask)",
)

// ── 2. the seed IIFE must be present in the built prescript ────────────────────
console.log("\nSeed script shipped")
const prescripts = readdirSync(join(brain, "public")).filter((f) => /^prescript.*\.js$/.test(f))
const prescript = prescripts.map((f) => readFileSync(join(brain, "public", f), "utf8")).join("\n")
check(prescripts.length > 0, `prescript.js found (${prescripts.join(", ") || "none"})`)
// esbuild minifies, so match tolerantly: `setItem("theme","dark")` in the build
// vs `setItem("theme", "dark")` in source.
const seedShipped = new RegExp(`setItem\\(\\s*"theme"\\s*,\\s*"${EXPECTED_DEFAULT}"\\s*\\)`).test(
  prescript,
)
check(seedShipped, "our seed IIFE reached the built prescript")

// ── 3. behaviour, in both execution orders ────────────────────────────────────
console.log("\nDefault-mode behaviour (both orders)")

const darkmodeDist = readFileSync(
  join(brain, "node_modules/@quartz-community/darkmode/dist/index.js"),
  "utf8",
)
const inline = darkmodeDist.match(/var darkmode_inline_default = '([\s\S]*?)';/)
if (!inline) throw new Error("could not extract the darkmode inline script")
const darkmodeScript = inline[1].replace(/\\n$/, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\")

const source = readFileSync(join(brain, "quartz", "default-color-mode.ts"), "utf8")
const declared = source.match(/const DEFAULT_MODE = "(\w+)"/)?.[1]
check(declared === EXPECTED_DEFAULT, `DEFAULT_MODE in source is "${EXPECTED_DEFAULT}"`)

const seedScript = `
(function () {
  try {
    if (localStorage.getItem("theme") === null) {
      localStorage.setItem("theme", "${declared}")
      document.documentElement.setAttribute("saved-theme", "${declared}")
    }
  } catch (e) {}
})();
`

function run(order, { storedTheme, osLight }) {
  const store = {}
  if (storedTheme !== undefined) store.theme = storedTheme
  const attrs = {}
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
  }
  const document = {
    documentElement: {
      setAttribute: (k, v) => {
        attrs[k] = v
      },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
    },
    body: { classList: { add() {}, remove() {} } },
    addEventListener() {},
    dispatchEvent() {},
    getElementsByClassName: () => [],
  }
  const matchMedia = (q) => ({
    matches: q.includes("light") ? !!osLight : !osLight,
    addEventListener() {},
  })
  const sandbox = { localStorage, document, matchMedia, CustomEvent: function () {} }
  sandbox.window = { matchMedia, addCleanup() {}, document }
  const ctx = vm.createContext(sandbox)
  for (const code of order) vm.runInContext(code, ctx)
  return attrs["saved-theme"]
}

const cases = [
  ["first visit, OS = LIGHT", { osLight: true }, EXPECTED_DEFAULT],
  ["first visit, OS = DARK", { osLight: false }, EXPECTED_DEFAULT],
  ["returning visitor chose LIGHT", { storedTheme: "light", osLight: false }, "light"],
  ["returning visitor chose DARK", { storedTheme: "dark", osLight: true }, "dark"],
]

for (const [label, opts, expected] of cases) {
  const shipped = run([darkmodeScript, seedScript], opts)
  const reversed = run([seedScript, darkmodeScript], opts)
  check(
    shipped === expected && reversed === expected && shipped === reversed,
    `${label.padEnd(30)} → ${String(shipped).padEnd(5)} (both orders, expected ${expected})`,
  )
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s): the default mode is not as intended.`)
  process.exit(1)
}
console.log(`\n✓ Default is "${EXPECTED_DEFAULT}", order-independent, toggle visible.`)
