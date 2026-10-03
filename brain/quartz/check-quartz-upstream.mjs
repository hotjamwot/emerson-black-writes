#!/usr/bin/env node
/**
 * check-quartz-upstream.mjs — is there a newer Quartz than the one we forked?
 *
 *   cd brain && node quartz/check-quartz-upstream.mjs
 *
 * Deliberately NOT part of verify-default-mode.mjs. That suite runs on every
 * build and in CI; a check that needs the network fails on a train and teaches
 * people to ignore the suite. This one answers a question asked once a year, or
 * once immediately before an upgrade, and it is allowed to be slow.
 *
 * It only READS. It never fetches into brain/quartz, never touches the working
 * tree, and never writes anything. Upgrading is a human decision following the
 * `//ebw.upgradeDay` procedure in brain/package.json.
 *
 * Exit 0 = we are on the latest tag. Exit 1 = upstream has moved. Exit 2 =
 * could not reach GitHub (offline, rate-limited) — NOT a failure to act on, and
 * deliberately distinguishable from exit 1 so a flaky network is never mistaken
 * for "you are out of date".
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const brain = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const prov = JSON.parse(readFileSync(join(brain, "package.json"), "utf8"))["//ebw"]

if (!prov?.upstream) {
  console.error("✗ no //ebw.upstream recorded in brain/package.json — nothing to compare against")
  process.exit(1)
}

let tags
try {
  const out = execFileSync(
    "git",
    ["ls-remote", "--tags", "--refs", prov.upstream],
    { encoding: "utf8", timeout: 30000 },
  )
  tags = out
    .split("\n")
    .map((l) => l.match(/refs\/tags\/v?([\d.]+)$/)?.[1])
    .filter(Boolean)
} catch (err) {
  console.error(`✗ could not reach ${prov.upstream} (offline, or git is missing).`)
  console.error("  This is NOT an 'you are out of date' signal — try again with network.")
  console.error(`  ${err.message.split("\n")[0]}`)
  process.exit(2)
}

// Compare numerically, not as strings: "10.0.0" < "9.0.0" lexicographically, and
// a site that silently sorts its own version wrong will one day decide it does
// not need a security fix.
const parse = (v) => v.split(".").map(Number)
const cmp = (a, b) => {
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const newest = tags.sort(cmp).at(-1)
const ours = prov.upstreamRef.replace(/^v/, "")

console.log(`recorded: ${prov.upstreamRef} (${prov.upstreamCommit.slice(0, 12)}…, forked ${prov.forkedOn})`)
console.log(`latest:   v${newest}`)
console.log(`known tags: ${tags.join(", ")}`)

if (cmp(ours, newest) >= 0) {
  console.log(`\n✓ Up to date. Nothing to do.`)
  process.exit(0)
}

console.log(`\n⚠ Upstream is on v${newest}; we forked from v${ours}.`)
console.log("  Read the //ebw.upgradeDay procedure in brain/package.json and decide deliberately.")
console.log("  Do NOT let a tool run `npm update` here — core is vendored, so nothing would happen anyway.")
process.exit(1)