#!/usr/bin/env node
/**
 * Brand palette check — proves the Brain's accent chain really resolves to
 * crimson in the *built* output, instead of inheriting whatever hue the Obsidian
 * theme in use happens to declare.
 *
 *   cd brain && npx quartz build && node quartz/theme/verify-brand.mjs
 *
 * Why it exists: the accent is declared inside `@quartz-themes/core`'s own
 * cascade layer, which outranks Quartz's `quartz-base` layer — so the rendered
 * accent is decided by whichever declaration lands last inside the theme, wherever
 * our config points (`theme: emerson` → quartz/theme/emerson.ts). This script
 * reads the *winning* declaration of each brand variable, per mode, so a
 * regression — a reverted `theme:` value, a dropped `registerEmersonTheme()`
 * call, an upstream aspect emitted after `misc` — fails here rather than quietly
 * turning the site violet.
 *
 * Exit code 0 = brand palette intact. Exit code 1 = the output went off-brand.
 */
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const brain = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const staticDir = join(brain, "public", "static")
const OVERLAY_MARKER = "Emerson Black brand overlay"

/** The brand contract — the values quartz/theme/emerson.ts must produce. */
const EXPECTED = {
  light: {
    "--accent-h": "0",
    "--accent-s": "68.333%",
    "--accent-l": "47.059%",
    "--text-accent": "var(--color-accent)",
    "--color-purple": "#CA2626",
    "--color-pink": "#CA2626",
  },
  dark: {
    "--accent-h": "0",
    "--accent-s": "77.477%",
    "--accent-l": "56.471%",
    "--text-accent": "var(--color-accent)",
    "--color-purple": "#E63A3A",
    "--color-pink": "#E63A3A",
  },
}

/** The theme stylesheet is the emitted resource that opens a cascade layer. */
function findThemeStylesheet() {
  const candidates = readdirSync(staticDir).filter(
    (f) => f.startsWith("resource-style-") && f.endsWith(".css"),
  )
  return candidates
    .map((f) => join(staticDir, f))
    .find((f) => readFileSync(f, "utf-8").includes("@layer obsidian-theme"))
}

const SCOPES = {
  // Comments precede selectors in the emitted CSS (`/* aspect: base */`), so
  // match on containment rather than equality.
  light: (selector) => selector.includes(":root:root") && !selector.includes("saved-theme"),
  dark: (selector) => selector.includes('saved-theme="dark"'),
}

/** Last declaration of `name` in the block whose selector passes `scope`. */
function winningDeclaration(css, name, scope) {
  const blocks = /([^{}]*)\{([^}]*)\}/g
  const declaration = new RegExp(
    `(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*([^;]+);`,
  )
  let match
  let winner = null
  while ((match = blocks.exec(css)) !== null) {
    if (!scope(match[1].replace(/\s+/g, " ").trim())) continue
    const found = match[2].match(declaration)
    if (found) winner = found[1].trim()
  }
  return winner
}

const themePath = findThemeStylesheet()
if (!themePath) {
  console.error("✘ No theme stylesheet found in public/static — run `npx quartz build` first.")
  process.exit(1)
}
const css = readFileSync(themePath, "utf-8")
const overlayIndex = css.lastIndexOf(OVERLAY_MARKER)
const failures = []

console.log(`theme stylesheet: static/${themePath.split("/").pop()}`)

if (overlayIndex === -1) {
  failures.push("the brand overlay is missing from the theme CSS — is `theme: emerson` set?")
} else {
  // Nothing may re-declare the brand variables *after* our overlay, or the
  // overlay no longer has the final word in the layer.
  const tail = css.slice(overlayIndex + OVERLAY_MARKER.length)
  for (const name of Object.keys(EXPECTED.light)) {
    const later = tail.split(`${name}:`).length - 1
    if (later > 1) failures.push(`${name} is declared ${later} times inside/after the overlay`)
  }
}

for (const [mode, expectations] of Object.entries(EXPECTED)) {
  console.log(`\n── ${mode} ──────────────────────────────`)
  for (const [name, expected] of Object.entries(expectations)) {
    const actual = winningDeclaration(css, name, SCOPES[mode])
    const ok = actual === expected
    console.log(`  ${ok ? "✓" : "✘"} ${name.padEnd(16)} ${actual ?? "(missing)"}`)
    if (!ok) failures.push(`${mode} ${name}: expected ${expected}, got ${actual ?? "nothing"}`)
  }
}

if (failures.length > 0) {
  console.error(`\n✘ Brand palette is off-brand:\n  - ${failures.join("\n  - ")}`)
  console.error("\nSee quartz/theme/emerson.ts for how the accent is registered.")
  process.exit(1)
}
console.log("\n✓ Brand palette intact (light #CA2626 · dark #E63A3A).")
