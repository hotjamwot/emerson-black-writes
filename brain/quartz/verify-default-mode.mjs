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
import zlib from "node:zlib"

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

// ── 2. the font pipeline must stay on-brand and non-duplicated ───────────────
console.log("\nFont pipeline (S6)")
const page = readFileSync(join(brain, "public", "index.html"), "utf8")
const sheets = [...page.matchAll(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]*)"/g)].map(
  (m) => decodeURIComponent(m[1].replace(/&amp;/g, "&")),
)

// Off-brand families: the plugin's hardcoded QUARTZ_DEFAULT_* set (Schibsted
// Grotesk / Source Sans Pro) and the pre-S6 faces (Jost / Source Serif 4).
// Any of these means a second emitter is still writing a stylesheet.
const OFF_BRAND = ["Schibsted Grotesk", "Source Sans Pro", "Jost", "Source Serif 4"]
const offBrandInSheets = OFF_BRAND.filter((f) => sheets.some((s) => s.includes(f)))
check(
  offBrandInSheets.length === 0,
  `no off-brand families in font links${offBrandInSheets.length ? ` — found: ${offBrandInSheets.join(", ")}` : ""}`,
)

// Two Google Fonts links are expected (Quartz core `theme.typography` and the
// quartz-fonts plugin each emit one and neither can be switched off), but both
// must request the same brand faces. A third would mean a new emitter appeared.
check(sheets.length <= 2, `at most 2 font stylesheets (got ${sheets.length})`)
const FAMILIES = ["Gabarito", "Lora", "IBM Plex Mono"]
const wrongFaces = sheets.filter((s) => !FAMILIES.every((f) => s.includes(f)))
check(
  wrongFaces.length === 0,
  `every font link requests Gabarito + Lora + IBM Plex Mono${wrongFaces.length ? `\n      off: ${wrongFaces.join("\n      off: ")}` : ""}`,
)

// `useThemeFonts: false` is what stops the plugin falling back to the theme's
// registry. Assert it in config too, so the intent survives a re-read.
const config = readFileSync(join(brain, "quartz.config.yaml"), "utf8")
check(/useThemeFonts:\s*false/.test(config), "quartz-fonts has `useThemeFonts: false`")
check(
  /header:\s*Gabarito[\s\S]*body:\s*Lora/.test(config),
  "core `theme.typography` is Gabarito + Lora",
)

// ── 3. the favicon must be the crimson monogram ──────────────────────────────
console.log("\nFavicon (S7)")
// Decompose the icon's own IHDR to confirm real dimensions without an image lib.
function pngSize(file) {
  const b = readFileSync(file)
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colourType: b[25] }
}
const iconPath = join(brain, "quartz", "static", "icon.png")
const icon = pngSize(iconPath)
check(icon.w === icon.h, `icon.png is square (${icon.w}x${icon.h})`)
check(
  icon.w >= 180,
  `icon.png is at least 180px (got ${icon.w}) — 16px tabs need a large source to downscale from`,
)
check(
  icon.colourType === 6,
  `icon.png keeps its alpha channel (colour type ${icon.colourType}, want 6/RGBA)`,
)

// The old default icon was a palette PNG (colour type 3) and 200px; a regression
// back to either is the most likely way this silently undoes.
const storefrontIcon = join(brain, "..", "img", "favicon.png")
const sIcon = pngSize(storefrontIcon)
check(
  sIcon.w === icon.w && sIcon.h === icon.h,
  `storefront favicon matches the Brain icon (${sIcon.w} vs ${icon.w})`,
)
check(
  readFileSync(iconPath).length < 20000,
  "icon.png is optimised (small file, not the 36 KB master)",
)

// ── 4. the body serif must survive the theme layer ───────────────────────────
// Regression guard for the "serif on lists but sans in paragraphs" bug. The
// theme emits `html[saved-theme="…"] body p { font-family: var(--font-interface) }`
// in @layer obsidian-theme, which outranks our unlayered container rule because
// it matches `p` directly. The fix is to pin the font variables in the theme's
// own trailing aspect, so assert they are actually pinned there.
console.log("\nTypography (body serif vs the theme layer)")
// Reuse the `css` blob already accumulated from public/static above rather than
// re-reading the directory.
check(
  /html\[saved-theme=["'][a-z]+["']\]\s*body\s+p\s*\{[^}]*font-family\s*:\s*var\(--font-interface\)/.test(
    css,
  ),
  "upstream theme still emits the `body p` font rule (guard premise is current)",
)
check(
  /--font-interface:\s*"?Lora/.test(css),
  "theme pins --font-interface to Lora, so `body p` renders in the brand serif",
)
// Upstream still *declares* a sans --font-interface-obsidian, and that
// declaration must stay. What matters is that our brand value is declared LAST
// within the theme's own stylesheet, so it is the one that wins inside
// @layer obsidian-theme.
//
// The ordering is only meaningful WITHIN one stylesheet: `css` above
// concatenates several files, and the @quartz-fonts layer is a *sibling* layer
// whose position in that concatenation says nothing about cascade order. So
// scope this to the single file carrying the obsidian-theme layer.
const themeSheet = readdirSync(staticDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ f, src: readFileSync(join(staticDir, f), "utf8") }))
  .find(({ src }) => src.includes("@layer obsidian-theme"))
check(!!themeSheet, "found the stylesheet carrying @layer obsidian-theme")
const themeDecls = themeSheet
  ? [...themeSheet.src.matchAll(/--font-interface:\s*([^;]+);/g)].map((m) => m[1].trim())
  : []
const loraAt = themeDecls.findIndex((v) => v.startsWith('"Lora"'))
check(loraAt !== -1, "theme pins --font-interface to the brand serif")
check(
  loraAt !== -1 && !themeDecls.slice(loraAt + 1).some((v) => v.includes("ui-sans-serif")),
  "within the theme layer, no sans --font-interface is declared after ours",
)
check(
  /--font-monospace:\s*"?IBM Plex Mono/.test(css),
  "theme pins --font-monospace to IBM Plex Mono",
)

// The branding folder also ships `EBW icon.png`, which is the SAME monogram in
// magenta #E6007E. Swapping in the wrong master is the easiest mistake here and
// dimension checks cannot catch it, so decode the ink and assert the crimson.
function dominantInk(file) {
  const b = readFileSync(file)
  let p = 8
  let w, h, ct
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const t = b.toString("ascii", p + 4, p + 8)
    if (t === "IHDR") {
      w = b.readUInt32BE(p + 8)
      h = b.readUInt32BE(p + 12)
      ct = b[p + 17]
    }
    if (t === "IDAT") idat.push(b.subarray(p + 8, p + 8 + len))
    if (t === "IEND") break
    p += 12 + len
  }
  if (ct !== 6) return null
  const ch = 4
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let o = 0
  let ro = 0
  for (let y = 0; y < h; y++) {
    const f = raw[ro++]
    const line = raw.subarray(ro, ro + stride)
    ro += stride
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[o + x - ch] : 0
      const bb = y > 0 ? out[o - stride + x] : 0
      const c = x >= ch && y > 0 ? out[o - stride + x - ch] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += bb
      else if (f === 3) v += (a + bb) >> 1
      else if (f === 4) {
        const pa = Math.abs(bb - c)
        const pb = Math.abs(a - c)
        const pc = Math.abs(a + bb - 2 * c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c
      }
      out[o + x] = v & 255
    }
    o += stride
  }
  const counts = new Map()
  for (let i = 0; i < w * h; i++) {
    const r = out[i * 4],
      g = out[i * 4 + 1],
      bl = out[i * 4 + 2],
      a = out[i * 4 + 3]
    if (a < 250) continue
    const k = (r << 16) | (g << 8) | bl
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const [best, n] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0] ?? [0, 0]
  const hex =
    "#" +
    [(best >> 16) & 255, (best >> 8) & 255, best & 255]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  return { hex, n, total: w * h }
}

const ink = dominantInk(iconPath)
// The light-mode brand accent. Exact, because the source is a flat fill.
check(ink !== null, "icon.png is RGBA and decodable")
check(
  ink && ink.hex === "#CA2626",
  `icon.png ink is the brand crimson #CA2626${ink ? ` (found ${ink.hex})` : ""}`,
)
check(
  ink && ink.n / ink.total > 0.2,
  `the monogram is actually present (${ink ? ((ink.n / ink.total) * 100).toFixed(1) : 0}% opaque)`,
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
