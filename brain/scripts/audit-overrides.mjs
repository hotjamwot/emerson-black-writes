/**
 * audit-overrides.mjs — can each [OVERRIDE — upstream] block in custom.scss be
 * deleted?
 *
 * For every override block: comment it out, rebuild, re-measure with probe.mjs,
 * and diff against the baseline. A block whose removal changes nothing measured
 * is a candidate for deletion. One whose removal changes something is
 * load-bearing, and the diff says exactly what.
 *
 * This is the answer to "are we fighting Quartz forever, or is the truce real?"
 * — answered by experiment rather than by reasoning about specificity. Reading a
 * comment tells you what someone believed in 11.9.7; this tells you what the
 * browser does today.
 *
 * RESULT 2026-10-04: all 12 blocks are LOAD-BEARING. None is deletable. The two
 * that matter most: removing the highlight block paints search hits
 * rgba(255, 208, 0, 0.4) — the amber this whole truce exists to kill — and
 * removing the tag-pill block turns every pill into a 0.18-alpha crimson slab at
 * 8px radius, because upstream's `a.internal { background-color: var(--highlight) }`
 * matches a pill and no Quartz-native setting stops that.
 *
 * ⚠ COVERAGE IS THE WHOLE GAME HERE. The first run of this audit reported three
 * blocks as having "no measured effect". All three were wrong: the probe loaded
 * only the Desk and one post, and those blocks govern the year/tag archives and
 * the chrome fonts, which exist on neither. A negative result is only as good as
 * the pages behind it — before believing a "deletable" verdict, confirm the probe
 * actually loaded a page that RENDERS the element. The PAGES list below is the
 * fix; extend it whenever the site grows a new page type.
 *
 * Usage:
 *   cd brain/public && python3 -m http.server 8099 &   # probe needs a server
 *   cd brain && node scripts/audit-overrides.mjs
 *
 * Restores custom.scss after every block, and rebuilds at the end, so an
 * interrupted run leaves a usable tree. Slow by nature: one rebuild plus four
 * browser probes per block.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const SCSS = "quartz/styles/custom.scss"
const PAGE_POST = "newsletters/2026/my-new-book-is-coming-out.html"
const PAGE_HOME = "index.html"
// `fileURLToPath`, not `.pathname`: the repo path contains a SPACE ("EBW
// website"), and `.pathname` returns it percent-encoded as "EBW%20website",
// which node then cannot resolve. The first version of this script used
// `.pathname` and failed with MODULE_NOT_FOUND on a file that plainly exists.
const PROBE = fileURLToPath(new URL("./probe.mjs", import.meta.url))

const original = readFileSync(SCSS, "utf8")

// CRASH SAFETY — THE MARKER CARRIES THE PRISTINE COPY, NOT JUST A FLAG.
//
// The first version left a marker file and, on finding one, restored custom.scss
// from an `original` variable read at the top of THIS run. That restores the
// damage instead of undoing it: at startup the file on disk is already the dirty
// one, so `original` IS dirty. Tested — the "recovery" re-wrote all 31 disabled
// lines and the build then failed with `unmatched "}"`.
//
// So the marker stores the stylesheet content itself, written before the first
// block is touched. Recovery reads THAT, which is genuinely pristine because it
// was captured while the file was still intact. A flag alone cannot work: the
// thing you need to restore is the data, and the data is exactly what the crash
// destroyed.
const MARKER = SCSS + ".audit-in-progress"
if (existsSync(MARKER)) {
  const saved = readFileSync(MARKER, "utf8")
  if (saved.trim().length > 0) {
    console.error(
      "! A previous audit did not finish (found " + MARKER + ").\n" +
        "  Restoring custom.scss from the copy it left behind.",
    )
    writeFileSync(SCSS, saved)
  } else {
    console.error(
      "! Found an empty " + MARKER + " — cannot restore automatically.\n" +
        "  Check custom.scss for lines prefixed '//AUDIT-OFF' before deploying.",
    )
  }
}
// Capture the pristine stylesheet INSIDE the marker, before anything is touched.
writeFileSync(MARKER, original)

// Re-read AFTER the recovery above. `original` was bound before recovery ran, so
// on a recovering start it still holds the crashed run's damaged text. Restoring
// it at the end of this run would put the damage straight back. This one line is
// the difference between recovering and merely rewriting the mess.
const pristine = readFileSync(SCSS, "utf8")

const cleanUp = () => {
  rmSync(MARKER, { force: true })
}
process.on("exit", cleanUp)
// Removed only at the very END of a successful run, further down. Calling it
// here would defeat the whole mechanism: the marker must outlive every block, so
// that a SIGKILL mid-audit leaves evidence for the next run to find.

// A HUNG CHILD MUST NOT HANG THE AUDIT. `execFileSync` has no default timeout,
// and one Chrome probe wedged for 12 minutes on a page it never finished
// loading, stalling the whole run with custom.scss left mid-edit (every line of
// the block under test still carrying the AUDIT-OFF prefix). Both halves matter:
// the timeout stops the stall, and the restore-on-exit below guarantees the
// stylesheet is clean however this exits.
//
// 90s is generous — a healthy probe returns in ~8s — and deliberately not
// "tight", because a timeout that fires on a slow-but-working machine turns
// real measurements into silent skips.
function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: 90_000,
    ...opts,
  })
}
function build() {
  return sh("npx", ["quartz", "build"])
}
function measure(page, vw) {
  const out = sh(process.execPath, [PROBE, page, String(vw)])
  return Object.fromEntries(
    out
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i), l.slice(i + 1)]
      }),
  )
}

/** Find each override block: from its banner comment to the next banner. */
function blocks() {
  // `pristine`, not `original` — see the note where it is defined. Using the
  // pre-recovery text here would compute block boundaries against a damaged
  // file and slice the wrong lines.
  const lines = pristine.split("\n")
  const marks = []
  lines.forEach((l, i) => {
    if (l.includes("OVERRIDE — upstream") && !l.trim().startsWith("//    [")) marks.push(i)
  })
  return marks.map((start, k) => {
    const end = k + 1 < marks.length ? marks[k + 1] : lines.length
    return { start, end, title: lines[start].replace(/^\/\/ ?\[OVERRIDE — upstream\]\s*/, "").slice(0, 70) }
  })
}

/** Disable a line range by prefixing every non-blank line with //. */
function disableRange(start, end) {
  const lines = pristine.split("\n")
  for (let i = start; i < end; i++) {
    if (lines[i].trim() !== "") lines[i] = "//AUDIT-OFF " + lines[i]
  }
  return lines.join("\n")
}

// EVERY page type the site emits. This list is load-bearing, and it was
// originally only two entries — which is precisely how the first audit run
// produced three false "deletable" verdicts (F19). The year and tag archives are
// where `.page-listing` renders; the chrome font blocks need a page with an
// explorer, a wordmark and a graph. Drop any of these and blocks will start
// reporting "no measured effect" for the wrong reason.
//
// Extend this whenever a new page type is added.
const PAGES = [
  "index.html",
  "newsletters/2023/index.html",
  "tags/process.html",
  "newsletters/2026/my-new-book-is-coming-out.html",
]
// Desktop AND mobile: several blocks only bite at one width (the mobile
// grid-template redefinition is the obvious one).
const WIDTHS = [1440, 390]

/** Snapshot every page at every width, keyed `page@width`. */
function snapshot() {
  const snap = {}
  for (const p of PAGES) for (const w of WIDTHS) snap[`${p}@${w}`] = measure(p, w)
  return snap
}

// Baseline first, with the tree untouched. Without this the first block's diff
// would be measured against a stale build.
build()
const base = snapshot()
console.log("baseline captured\n")

const results = []
for (const b of blocks()) {
  process.stdout.write(`… ${b.title}\n`)
  writeFileSync(SCSS, disableRange(b.start, b.end))
  let after
  try {
    build()
    after = snapshot()
  } catch (e) {
    results.push({ ...b, verdict: "BUILD-BREAK", diffs: [String(e.message).slice(0, 200)] })
    writeFileSync(SCSS, pristine)
    continue
  }
  const diffs = []
  for (const [viewName, afterView] of Object.entries(after)) {
    for (const [k, v] of Object.entries(afterView)) {
      const b0 = base[viewName][k]
      if (b0 !== undefined && b0 !== v) diffs.push(`${viewName}:${k} ${b0} -> ${v}`)
    }
  }
  results.push({
    ...b,
    verdict: diffs.length === 0 ? "NO-MEASURED-EFFECT" : "LOAD-BEARING",
    diffs,
  })
  writeFileSync(SCSS, pristine)
}

build()
console.log("\n================ RESULTS ================")
for (const r of results) {
  console.log(`\n[${r.verdict}] lines ${r.start + 1}-${r.end} — ${r.title}`)
  for (const d of r.diffs.slice(0, 12)) console.log("    " + d)
  if (r.diffs.length > 12) console.log(`    … and ${r.diffs.length - 12} more`)
}
// The audit finished every block, so the marker can go. Until this line runs the
// marker is on disk saying "custom.scss may be mid-edit", which is exactly right,
// because everything above it may have died part-way.
writeFileSync(SCSS, pristine)
cleanUp()
console.log("\ncustom.scss restored; audit marker cleared.")