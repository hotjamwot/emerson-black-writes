import { QuartzComponentProps } from "../../components/types"

export type ConditionPredicate = (props: QuartzComponentProps) => boolean

const builtinConditions: Record<string, ConditionPredicate> = {
  // Paired deliberately: `not-index` existed but the positive form did not, so
  // `condition: index` resolved to undefined and was SILENTLY IGNORED — the
  // hub rendered on every page of every page type and nothing reported an
  // error anywhere. Tag-hub needs the positive form (see the config note on
  // its "./" + slug links); verify-default-mode proves the pairing holds.
  "is-index": (props) => props.fileData.slug === "index",
  "not-index": (props) => props.fileData.slug !== "index",
  "has-tags": (props) => {
    const tags = props.fileData.frontmatter?.tags
    return Array.isArray(tags) && tags.length > 0
  },
  "has-backlinks": (props) => {
    const backlinks = (props.fileData as Record<string, unknown>).backlinks
    return Array.isArray(backlinks) && backlinks.length > 0
  },
  "has-toc": (props) => {
    const toc = (props.fileData as Record<string, unknown>).toc
    return Array.isArray(toc) && toc.length > 0
  },
}

const customConditions = new Map<string, ConditionPredicate>()

export function registerCondition(name: string, predicate: ConditionPredicate): void {
  customConditions.set(name, predicate)
}

export function getCondition(name: string): ConditionPredicate | undefined {
  return customConditions.get(name) ?? builtinConditions[name]
}

export function getAllConditionNames(): string[] {
  return [...Object.keys(builtinConditions), ...customConditions.keys()]
}
