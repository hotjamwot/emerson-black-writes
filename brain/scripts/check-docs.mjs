/**
 * Docs hygiene — keeps the 2026-10-04 split honest.
 *
 * WHY THIS EXISTS. The plan doc was 614 lines and had stopped meaning what its own
 * header claimed: it promised "§12 is the only section with work in it" while §12
 * held twenty `✅` marks and was 55% of the file. A reader — or a later LLM — who
 * trusted the header would read shipped work as a backlog. §11.7 had already been
 * proposed twice that way.
 *
 * The split fixed it by moving the history out, but a split rots the same way the
 * original did: someone finishes an item and leaves the `✅` in place, and §12 starts
 * lying again. This makes that fail the deploy instead.
 *
 * The rule this enforces is the whole point of the split: **the open file contains
 * only open work.**
 *
 * Usage: node brain/scripts/check-docs.mjs
 */
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..")
const problems = []
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`)
  if (!ok) problems.push(msg)
}

console.log("§ docs — the plan/architecture/lessons split")

const DOCS = {
  agents: "AGENTS.md",
  readme: "README.md",
  plan: "docs/TODO.md",
  architecture: "docs/ARCHITECTURE.md",
  lessons: "docs/LESSONS.md",
  shipped: "docs/SHIPPED.md",
}

for (const [name, rel] of Object.entries(DOCS)) {
  check(existsSync(join(repo, rel)), `${rel} exists`)
}
if (problems.length) {
  console.error("\nFAIL — a doc is missing; the split is incomplete.")
  process.exit(1)
}

const read = (k) => readFileSync(join(repo, DOCS[k]), "utf8")
const plan = read("plan")

// THE load-bearing assertion. A `✅`, a strikethrough, or the word "SHIPPED" inside
// an actual open item means a finished thing is sitting in the backlog. The prose
// that *explains* the split is allowed to mention them, so check the Open items
// section specifically rather than the whole file.
const openSection = plan.split("## Open items")[1] ?? ""
const items = openSection
  .split("\n")
  .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("- **"))
  .join("\n")

check(items.trim().length > 0, "the plan still lists open items (not emptied by mistake)")
check(!items.includes("✅"), "no ✅ in any open item — finished work belongs in SHIPPED.md")
check(!/~~.*~~/.test(items), "no struck-through item left in the open list")
check(
  !/\bSHIPPED\b/.test(items),
  "no open item claims something is SHIPPED — move it to SHIPPED.md",
)

// A plan that has shrunk to nothing usually means the split ate it.
check(
  plan.split("\n").length > 15,
  `the plan has substance (${plan.split("\n").length} lines, not gutted)`,
)

// AGENTS.md is the entry point; if it goes missing the whole point of the split is
// lost, and agents silently fall back to reading whatever they find.
const agents = read("agents")
for (const must of ["docs/ARCHITECTURE.md", "docs/LESSONS.md", "docs/SHIPPED.md", "docs/TODO.md"]) {
  check(agents.includes(must), `AGENTS.md points readers at ${must}`)
}
check(/build|verify/i.test(agents), "AGENTS.md says how to build and verify")

// LESSONS.md was moved verbatim. If it has lost its distinctive rules, the split
// damaged the most valuable document in the repo.
//
// NOTE: "Verify before building" is deliberately checked against SHIPPED.md, not
// here. It was written as the lesson from §11.7, which was proposed twice because a
// plan line was read without opening the page — so it lives in the §12.3 record.
const lessons = read("lessons")
for (const rule of [
  "A guard that cannot fail is worse than no guard",
  "Assert absences, not presences",
  "Presence in the DOM is not visibility",
  "Standing rules",
]) {
  check(lessons.includes(rule), `LESSONS.md retains "${rule}"`)
}
check(
  /an item on a plan is a claim about the site/i.test(read("shipped")),
  'SHIPPED.md retains "an item on a plan is a claim about the site" (§11.7)',
)

if (problems.length) {
  console.error(`\nFAIL — ${problems.length} docs problem(s).`)
  process.exit(1)
}
console.log("\nOK: docs are split, and the open plan holds only open work.")