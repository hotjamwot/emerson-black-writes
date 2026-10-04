#!/usr/bin/env node
/**
 * Card thumbnails — tiny covers for the §11.6 mention cards.
 *
 * WHY THIS EXISTS. `img/covers/*.webp` are the ARTWORK: 1600x2560, 179-224 KB
 * each. Dropping one into a card that is 56px wide would download a quarter of a
 * megabyte to paint a thumbnail — 15 posts x 2 books x ~190 KB is ~5.7 MB of image
 * weight added to a page made of text, for pictures nobody can read at that size.
 * The homepage gets away with the full files because it shows them at 500px; the
 * cards cannot.
 *
 * SO: real thumbnails, generated once and committed. 240px on the long edge is
 * ~2x a 120px card on a 2x display — retina-sharp without waste. They land in
 * `img/covers/thumbs/` and are ~4-7 KB, so the whole set is under 25 KB.
 *
 * COMMITTED, NOT BUILT AT DEPLOY TIME, deliberately. Generating them in CI would
 * mean the deployed bytes depend on which libvips the runner happens to have, and
 * a re-run could quietly produce different files. These are assets; they belong in
 * version control alongside the artwork they come from.
 *
 * SHARP is Quartz's own image dependency, already installed in brain/node_modules,
 * so this adds nothing to the project's dependency tree. (macOS `sips` can READ
 * webp but cannot WRITE it — `Error 13: Can't write format: org.webmproject.webp` —
 * which is why this is not a two-line sips command.)
 *
 * Usage: node brain/scripts/make-cover-thumbs.mjs
 */
import { mkdirSync, existsSync, statSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const sharp = require("../../brain/node_modules/sharp")

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..")
const SRC = join(repo, "img/covers")
const OUT = join(SRC, "thumbs")

// Long edge. Cards render the cover at ~120px CSS, so 240 is a clean 2x.
const SIZE = 240
const QUALITY = 72

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const covers = ["cover_student_has_drowned", "cover_rockstar_has_exploded", "cover_actress_is_missing", "cover_fiance_has_flatlined"]

let changed = 0
for (const name of covers) {
  const src = join(SRC, `${name}.webp`)
  if (!existsSync(src)) {
    console.error(`FAIL: missing source cover ${name}.webp`)
    process.exit(1)
  }
  const out = join(OUT, `${name}.webp`)
  const buf = await sharp(src)
    .resize({ width: SIZE, height: SIZE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()
  writeFileSync(out, buf)

  const meta = await sharp(out).metadata()
  const kb = (statSync(out).size / 1024).toFixed(1)
  const saved = (100 - (statSync(out).size / statSync(src).size) * 100).toFixed(0)
  console.log(`  ${basename(out)}  ${meta.width}x${meta.height}  ${kb} KB  (${saved}% smaller than source)`)
  changed++
}

console.log(`\nOK: ${changed} cover thumbnails at ${SIZE}px in img/covers/thumbs/.`)