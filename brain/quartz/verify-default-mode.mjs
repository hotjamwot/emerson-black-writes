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
import { execFile } from "node:child_process"
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createConnection } from "node:net"
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

// ── 4. the brand faces must actually RENDER (computed style, not source text) ─
// Regression guard for the "serif on lists but sans in paragraphs" bug (S6/§14).
//
// This section is a *computed-style* check on purpose. The previous version
// asserted on the text of the built CSS and stayed green through the entire
// period when paragraphs rendered sans: pinning `--font-interface` inside
// `@layer obsidian-theme` is genuinely correct and genuinely insufficient,
// because `@quartz-community/quartz-fonts` emits its own top-level
// `@layer quartz-fonts` in a *later* stylesheet. A later-declared layer is
// appended last, so it wins on order regardless of specificity — no static
// grep over one file can see a competing sibling layer. Only a real cascade
// evaluation can.
// ── 5. the two halves must not drift apart (S9) ──────────────────────────────
// The storefront and the Brain are separate files with separate palettes, and
// nothing but a human noticing a colour mismatch keeps them aligned. S9 realigned
// `--accent-red` on the storefront (it was still #E31C3D, a pinker red predating
// the Brain's palette), so assert the agreement here.
console.log("\nStorefront ↔ Brain brand agreement")
const storefrontCss = readFileSync(join(brain, "..", "style.css"), "utf8")
const emersonTheme = readFileSync(join(brain, "quartz", "theme", "emerson.ts"), "utf8")

// Parse the Brain's ACCENT map rather than hardcoding, so this keeps working if
// the brand colour is ever changed in emerson.ts (the single source of truth).
const themeAccent = Object.fromEntries(
  [...emersonTheme.matchAll(/(light|dark):\s*"(#[0-9A-Fa-f]{6})"/g)].map((m) => [m[1], m[2].toUpperCase()]),
)
const storeAccent = /--accent-red:\s*(#[0-9A-Fa-f]{6})/.exec(storefrontCss)?.[1].toUpperCase()
const storeBright = /--accent-red-bright:\s*(#[0-9A-Fa-f]{6})/.exec(storefrontCss)?.[1].toUpperCase()

check(!!themeAccent.dark && !!storeAccent, "both halves declare an accent")
check(
  storeAccent === themeAccent.dark,
  `storefront accent matches the Brain's dark accent (${storeAccent} vs ${themeAccent.dark})`,
)
// The storefront is dark-only — no prefers-color-scheme, no colour-scheme switch,
// no data-theme — so it must carry the DARK accent, not the light one. This is
// the assertion that stops someone "fixing" it to #CA2626 by eye.
check(
  storeAccent !== themeAccent.light,
  "storefront uses the dark accent (it has no light mode to sit against)",
)
check(
  !!storeBright && storeBright !== storeAccent,
  `storefront hover tint is distinct from the base accent (${storeBright})`,
)
check(
  !/#E31C3D|#FF3B4A/i.test(storefrontCss.replace(/Was #E31C3D[^\n]*/, "")),
  "the pre-S9 pinker accent is fully retired",
)

console.log("\nTypography (computed style — what the reader actually sees)")

// Cheap static companion to the browser check below: it documents the layer
// order that caused the bug, so the *reason* is visible in the output even
// when the browser probe is skipped. `quartz-fonts` must not end up declaring
// `--font-interface` in a layer that sorts after the one custom.scss escapes.
const layerSheets = readdirSync(staticDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ f, src: readFileSync(join(staticDir, f), "utf8") }))
const fontsLayer = layerSheets.find(({ src }) => src.includes("@layer quartz-fonts"))
check(
  !!fontsLayer && /--font-interface:\s*ui-sans-serif/.test(fontsLayer.src),
  "known cause still present: @layer quartz-fonts hardcodes a sans --font-interface",
)
const indexCss = join(brain, "public", readdirSync(join(brain, "public")).find((f) => /^index-.*\.css$/.test(f)))
const indexSrc = existsSync(indexCss) ? readFileSync(indexCss, "utf8") : ""
check(
  /:root\{--font-interface:var\(--eb-serif\)/.test(indexSrc),
  "custom.scss pins --font-interface unlayered (outranks every @layer)",
)

// Serve public/ so the probe page and the article share an origin (same-origin
// is required to read the iframe's document).
const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
]

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p
  return null
}

/** True when something is already listening on the probe origin's port. */
function isPortUp(base) {
  const { hostname, port } = new URL(base)
  return new Promise((res) => {
    const s = createConnection({ host: hostname, port: Number(port) })
    const done = (ok) => {
      s.destroy()
      res(ok)
    }
    s.on("connect", () => done(true))
    s.on("error", () => done(false))
    setTimeout(() => done(false), 500)
  })
}

const execFileSyncAsync = (cmd, args) =>
  new Promise((res) => {
    execFile(cmd, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => res({ stdout: stdout ?? "" }))
  })

/**
 * Evaluate a probe function inside a real browser against one built page and
 * return whatever it wrote to `document.title`.
 *
 * The page is loaded in an iframe from a tiny generated probe document so that
 * `contentDocument` is readable; computed styles are then read from the live
 * cascade. `virtual-time-budget` lets the webfonts and scripts settle without
 * us needing a display.
 */
async function computedInBrowser(pageRelPath, probeBody) {
  const chrome = findChrome()
  if (!chrome) return null
  const probePath = join(brain, "public", "__verify_probe.html")
  writeFileSync(
    probePath,
    `<!doctype html><meta charset="utf-8"><title>pending</title>
<iframe id="f" src="${pageRelPath}" style="width:1400px;height:900px"></iframe>
<script>
const f = document.getElementById("f")
f.onload = () => setTimeout(() => {
  const out = []
  try { ${probeBody} } catch (e) { out.push("PROBE ERROR: " + e.message) }
  document.title = out.join(" || ")
}, 1800)
<\/script>`,
  )
  try {
    const { stdout } = await execFileSyncAsync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--virtual-time-budget=9000",
      "--dump-dom",
      `${PROBE_BASE}/__verify_probe.html`,
    ])
    const m = /<title>([^<]*)<\/title>/.exec(stdout)
    return m ? m[1] : null
  } finally {
    rmSync(probePath, { force: true })
  }
}

const PROBE_BASE = process.env.EB_VERIFY_BASE ?? "http://localhost:8099"

if (!findChrome() || !(await isPortUp(PROBE_BASE))) {
  console.log(
    `  ! skipping computed-style check — need Chrome and a server on ${PROBE_BASE}.\n` +
      `    Serve it with:  cd brain/public && python3 -m http.server 8099`,
  )
} else {
  const probe = await computedInBrowser(
    "newsletters/2023/5-lessons-i-learned-writing-my-first-book.html",
    `
    const d = f.contentDocument
    const ff = (sel) => { const e = d.querySelector(sel); return e ? getComputedStyle(e).fontFamily : "MISSING" }
    out.push("p=" + ff("article p"))
    out.push("li=" + ff("article li"))
    out.push("h1=" + ff("h1.article-title"))
    out.push("explorer=" + ff(".explorer a.nav-file-title.tree-item-self"))
    out.push("toc=" + ff(".toc .toc-content a"))
    out.push("breadcrumb=" + ff(".breadcrumb-element"))
  `,
  )
  const field = (name) => {
    const hit = (probe ?? "").split(" || ").find((s) => s.startsWith(name + "="))
    return hit ? hit.slice(name.length + 1) : null
  }
  const isSerif = (v) => !!v && /^"?Lora"?/.test(v.trim())
  const isDisplay = (v) => !!v && /^"?Gabarito"?/.test(v.trim())

  check(field("p") !== null, `computed-style probe ran (${probe ? "browser ok" : "no output"})`)
  check(
    isSerif(field("p")),
    `body paragraphs render in Lora (got: ${field("p") ?? "n/a"})`,
  )
  check(isSerif(field("li")), `list items render in Lora (got: ${field("li") ?? "n/a"})`)
  check(
    isDisplay(field("h1")),
    `article titles render in Gabarito (got: ${field("h1") ?? "n/a"})`,
  )
  // The serif variable is inherited by the theme's UI, so the chrome must be
  // pinned to the display face explicitly or the whole sidebar turns to Lora.
  for (const [name, label] of [
    ["explorer", "explorer links"],
    ["toc", "table-of-contents links"],
    ["breadcrumb", "breadcrumbs"],
  ]) {
    check(
      isDisplay(field(name)),
      `${label} stay on the display face (got: ${field(name) ?? "n/a"})`,
    )
  }

  // ── S4 + S1: no empty right sidebar, and a held reading measure ────────────
  // Both are computed-layout facts, so both need the browser; a static grep of
  // the stylesheet would happily pass while the page overflows, which is exactly
  // what happened while developing this (see the comments in custom.scss §4).
  //
  // The assertion that matters most is `chars`. The default frame ALWAYS renders
  // `<div class="right sidebar">`, even with `right: []`, and it stayed a live
  // 320px grid track — a third of the shell spent on an empty box. Collapsing it
  // widened the centre, which then had to be re-capped, and the number that
  // actually governs readability is characters per line, not pixels. Assert the
  // 45–90 band rather than an exact width: it fails for a missing column, for a
  // regressed cap, and for a future font change that re-measures differently.
  const lay = await computedInBrowser(
    "newsletters/2023/5-lessons-i-learned-writing-my-first-book.html",
    `
    const d = f.contentDocument
    const rs = d.querySelector(".sidebar.right")
    const bd = d.querySelector("#quartz-body")
    out.push("rightKids=" + (rs ? rs.children.length : -1))
    out.push("rightDisplay=" + (rs ? getComputedStyle(rs).display : "absent"))
    out.push("cols=" + (bd ? getComputedStyle(bd).gridTemplateColumns : "?"))
    const p = d.querySelector("article p")
    if (p) {
      const st = getComputedStyle(p)
      const probe = d.createElement("div")
      probe.style.cssText = "position:absolute;visibility:hidden;width:10ch"
      probe.style.font = st.font
      d.body.append(probe)
      const perCh = probe.getBoundingClientRect().width / 10
      probe.remove()
      out.push("paraW=" + Math.round(p.getBoundingClientRect().width))
      out.push("chars=" + Math.round(p.getBoundingClientRect().width / perCh))
    }
    out.push("overflow=" + (d.documentElement.scrollWidth > d.documentElement.clientWidth))
  `,
  )
  const lf = (name) => {
    const hit = (lay ?? "").split(" || ").find((s) => s.startsWith(name + "="))
    return hit ? hit.slice(name.length + 1) : null
  }
  check(lf("rightKids") === "0", `right sidebar renders no phantom column (kids: ${lf("rightKids") ?? "n/a"})`)
  check(lf("rightDisplay") === "none", `empty right sidebar is display:none (got: ${lf("rightDisplay") ?? "n/a"})`)
  const chars = Number(lf("chars"))
  // Assert the TRACK COUNT, not just the empty/hidden state. Reverting the grid
  // rule to `:not(:empty)` leaves the sidebar `display:none` via its own rule and
  // the measure at 67 chars — every other check still passes, while the layout is
  // in fact the old 3-track one. That regression was caught only by counting
  // tracks, which is why this check exists and why `chars` alone was not enough.
  const trackCount = lf("cols")
    ? lf("cols").trim().split(/\s+/).length
    : null
  check(
    trackCount === 2,
    `shell collapses to 2 grid tracks, not 3 (got: ${trackCount ?? "n/a"} — "${lf("cols") ?? "?"}")`,
  )
  check(
    lf("chars") !== null && chars >= 45 && chars <= 90,
    `reading measure holds 45-90 chars/line (got: ${lf("chars") ?? "n/a"})`,
  )
  check(lf("overflow") === "false", `no horizontal overflow at 1920px (got: ${lf("overflow") ?? "n/a"})`)
}

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
