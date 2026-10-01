import { loadTheme, registerTheme, type ThemeData, type ThemeMeta } from "@quartz-themes/core"

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Emerson Black — the Brain's own Quartz theme
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Why this file exists
 * --------------------
 * `@quartz-themes/core` writes the Obsidian theme CSS into its **own top-level
 * cascade layer** (`@layer obsidian-theme`) in a stylesheet that loads *after*
 * Quartz's `@layer quartz-base`. Layer order beats specificity, so the theme's
 * `base` aspect — which declares `--accent-h: 258`, Obsidian violet — wins over
 * the palette in `quartz.config.yaml`. Everything downstream (`--color-accent`,
 * `--secondary`, `--link-color`, `--tag-color`, checkboxes, graph nodes, search
 * highlights) resolves from that chain, and our `custom.scss` tokens only
 * *reference* `var(--secondary)` — so they faithfully inherited the violet, no
 * matter what we wrote in config or in custom CSS.
 *
 * The fix is ownership, not escalation: rather than out-shouting the theme from
 * outside its layer, we *become* the theme. We take `@quartz-themes/default`,
 * append one brand block to the aspect that is emitted last (`misc`, see
 * ASPECT_ORDER in @quartz-themes/core), and register the result as `emerson`
 * (see `quartz.config.yaml` → `@quartz-themes/core` → `options.theme`).
 * Same selector as upstream, same layer, later in the cascade ⇒ our tokens win
 * by document order. No `!important`, no cascade archaeology, and the brand
 * colours are the *source* rather than a fight against the cascade.
 *
 * To change the accent, edit `ACCENT` below — links, hover tints, tags,
 * checkboxes, graph and callouts all follow, in both light and dark mode.
 */

/** The brand accent per mode — the crimson from the storefront lockup. */
const ACCENT = {
  light: "#CA2626",
  dark: "#E63A3A",
} as const

type Mode = keyof typeof ACCENT

/**
 * The brand trio, mirroring `quartz/styles/custom.scss` and the storefront's
 * `style.css`. Declared here as the *source* so the theme layer can resolve its
 * own font variables to the brand, rather than being overridden from outside.
 *
 * This is not a duplicate for convenience. `@quartz-themes/default` emits
 * `html[saved-theme="…"] body p { font-family: var(--font-interface) }` inside
 * `@layer obsidian-theme`, and `--font-interface` defaults to the Obsidian sans
 * stack. That rule targets `p` *directly*, so it beat our unlayered
 * `.markdown-preview-view` container rule — and because it only names `p`,
 * `ol li` kept the serif while every paragraph turned sans. Pinning
 * `--font-interface` / `--font-text` / `--font-default` in the theme's own
 * trailing aspect makes that rule emit Lora, which fixes every consumer at
 * once instead of patching the symptom.
 *
 * Keep these three stacks in step with custom.scss (`--eb-display` /
 * `--eb-serif` / `--eb-mono`) and style.css. Old faces are kept as fallbacks so
 * a blocked request degrades to the previous look rather than to Times.
 */
const FONTS = {
  display: '"Gabarito", "Century Gothic", "Avant Garde", Futura, system-ui, sans-serif',
  serif: '"Lora", Georgia, "Times New Roman", serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const

/**
 * The aspect @quartz-themes/core emits last (its `ASPECT_ORDER` ends at
 * `misc`). Appending there puts the overlay after every other declaration in
 * the theme layer at equal specificity.
 */
const TRAILING_ASPECT = "misc"

/**
 * Variables the overlay pins. If upstream ever renames or drops one of these,
 * the theme silently drifts back to Obsidian violet — so we prove they still
 * exist before trusting the overlay (see `assertAnchors`).
 */
const PINNED_VARIABLES = [
  "--accent-h",
  "--accent-s",
  "--accent-l",
  "--text-accent",
  "--color-purple",
  "--color-pink",
] as const

/**
 * `#RRGGBB` → HSL, precise enough that `hsl(h, s%, l%)` round-trips to the same
 * hex. Deriving it here (rather than hand-writing HSL) keeps each mode's accent
 * a single source of truth: no second copy to drift out of step.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2)
    } else {
      h = 60 * ((r - g) / delta + 4)
    }
  }
  if (h < 0) h += 360

  const round = (n: number) => Math.round(n * 1000) / 1000
  return { h: round(h), s: round(s * 100), l: round(l * 100) }
}

/** `#RRGGBB` → `r, g, b`, for the theme's `-rgb` companion variables. */
function hexToRgbTriplet(hex: string): string {
  const value = hex.replace("#", "")
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16))
  return `${r}, ${g}, ${b}`
}

/** The brand block appended to the theme's trailing aspect. */
function brandOverlay(mode: Mode): string {
  const accent = ACCENT[mode]
  const { h, s, l } = hexToHsl(accent)
  const rgb = hexToRgbTriplet(accent)
  const scope = mode === "dark" ? ':root:root[saved-theme="dark"]' : ":root:root"

  return `/* ── Emerson Black brand overlay ──────────────────────────────────────────
   Generated by quartz/theme/emerson.ts — edit the tokens there, not here.
   Appended last inside the theme layer, so these values win by document order. */
${scope} {
  /* Accent chain. --color-accent / -1 / -2 and everything derived from them
     (links, tags, checkboxes, graph nodes, search highlights, blockquote rules)
     recompute from these three values. */
  --accent-h: ${h};
  --accent-s: ${s}%;
  --accent-l: ${l}%;
  /* Dark mode reads --text-accent from the lifted --color-accent-1 tint; pin it
     back to the true accent so links match the storefront token exactly. Hover
     still uses --color-accent-2, which stays a brighter crimson. */
  --text-accent: var(--color-accent);
  /* S10 · --tertiary owned. Quartz's base stylesheet reads this variable in
     three places: ::selection (a 60% wash), the search-hit .highlight
     background, and a:hover (color: var(--tertiary)) behind a 0.2s color
     transition. Upstream Obsidian declares --tertiary as a yellow-amber, and
     the overlay never pinned it — so the site showed an orange-yellow selection
     and search highlight (unreadable under the crimson tag pills) and every
     link/button faded to amber on hover (the "jarring flicker"). One variable,
     three symptoms, so it is fixed once here rather than patched per-symptom.
     Collapsing it onto the accent makes selection and hover read as brand. */
  --tertiary: var(--color-accent);
  /* S10 · --textHighlight owned — the LAST unpinned palette slot. Same failure
     as --tertiary above: the Obsidian base ships this as a bright yellow
     (#fff23688 light / #b3aa0288 dark) and the overlay never pinned it. It is
     consumed by .text-highlight{background-color: var(--textHighlight)}, so a
     highlighted run — or a tag pill sitting inside one — wore a yellow slab.
     F11. Collapsing it onto the accent finishes the palette: with --accent,
     --secondary, --tertiary and --textHighlight all owned, no upstream hue can
     reach the reading room. */
  --textHighlight: color-mix(in srgb, var(--color-accent) 22%, transparent);
  /* Palette slots that can surface as Obsidian violet / magenta (code tokens,
     canvas, sync avatars, the "example" callout). Collapsed onto the brand
     accent so no off-brand hue can leak into the reading room. */
  --color-purple: ${accent};
  --color-purple-rgb: ${rgb};
  --color-pink: ${accent};
  --color-pink-rgb: ${rgb};

  /* Typography (S6). The theme layer's own "body p { font-family:
     var(--font-interface) }" resolves through these, so pinning them here makes
     the theme emit the brand faces directly. --font-default-obsidian is left
     alone: it is the upstream fallback, and anything that still reads it will
     now chain through the brand --font-default set just above it. */
  --font-default: ${FONTS.serif};
  --font-text: ${FONTS.serif};
  --font-interface: ${FONTS.serif};
  --font-monospace-default: ${FONTS.mono};
  --font-monospace: ${FONTS.mono};
  --bodyFont: ${FONTS.serif};
  --headerFont: ${FONTS.display};
  --titleFont: ${FONTS.display};
  --codeFont: ${FONTS.mono};
}`
}

/** Throw at build time — loudly — if upstream stopped declaring what we pin. */
function assertAnchors(data: ThemeData): void {
  for (const mode of ["light", "dark"] as const) {
    const base = data[mode].base ?? ""
    const missing = PINNED_VARIABLES.filter((name) => !base.includes(`${name}:`))
    if (missing.length > 0) {
      throw new Error(
        `[emerson] Theme overlay is stale: "@quartz-themes/default" no longer declares ` +
          `${missing.join(", ")} in its "${mode}" base aspect. Update PINNED_VARIABLES ` +
          `and brandOverlay() in quartz/theme/emerson.ts — without this the Brain ` +
          `silently reverts to Obsidian violet.`,
      )
    }
    if (data[mode][TRAILING_ASPECT] === undefined) {
      throw new Error(
        `[emerson] "@quartz-themes/default" no longer emits a "${TRAILING_ASPECT}" aspect ` +
          `for ${mode} mode. Pick the new last aspect from ASPECT_ORDER and update ` +
          `TRAILING_ASPECT in quartz/theme/emerson.ts.`,
      )
    }
  }
}

/**
 * Registers the `emerson` theme: `@quartz-themes/default` plus the brand
 * overlay. Must run before the theme pipeline resolves a theme id, which is why
 * `quartz.ts` calls it ahead of `loadQuartzConfig()`.
 */
export function registerEmersonTheme(): void {
  const base = loadTheme("default")
  const data: ThemeData = { ...base, dark: { ...base.dark }, light: { ...base.light } }

  assertAnchors(data)

  for (const mode of ["light", "dark"] as const) {
    const trailing = data[mode][TRAILING_ASPECT] ?? ""
    data[mode][TRAILING_ASPECT] = `${trailing}\n\n${brandOverlay(mode)}`
  }

  const meta: ThemeMeta = { ...base.meta, name: "emerson" }
  registerTheme("emerson", meta, data)
}
