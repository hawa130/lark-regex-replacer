import type { BlockSnapshot } from "@lark-opdev/block-docs-addon-api"

const TEXTUAL_BLOCK_TYPES: string[] = [
  "text",
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "heading7",
  "heading8",
  "heading9",
  "bullet",
  "ordered",
  "todo",
  "quote",
]

export interface MatchResult {
  blockId: number
  blockRef: { docRef: { docToken: string }; blockId: number }
  index: number
  length: number
  match: string
}

export function isTextualBlock(block: BlockSnapshot): boolean {
  return TEXTUAL_BLOCK_TYPES.includes(block.type as string)
}

/**
 * Collect all textual blocks from a document tree via DFS.
 */
export function collectTextualBlocks(root: BlockSnapshot): BlockSnapshot[] {
  const result: BlockSnapshot[] = []
  const stack: BlockSnapshot[] = [root]

  while (stack.length > 0) {
    const block = stack.pop()!
    if (isTextualBlock(block)) {
      result.push(block)
    }
    // Push children in reverse so first child is processed first
    for (let i = block.childSnapshots.length - 1; i >= 0; i--) {
      stack.push(block.childSnapshots[i])
    }
  }

  return result
}

/**
 * Build a RegExp from user input.
 * - In regex mode: compiles the pattern directly
 * - In plain mode: escapes special chars, optionally wraps with \b for whole word
 */
export function buildRegex(
  pattern: string,
  options: {
    isRegex: boolean
    caseSensitive: boolean
    wholeWord: boolean
  },
): RegExp | null {
  if (!pattern) return null

  let source = pattern
  if (!options.isRegex) {
    // Escape regex special chars for literal search
    source = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    if (options.wholeWord) {
      source = `\\b${source}\\b`
    }
  }

  const flags = options.caseSensitive ? "g" : "gi"

  try {
    return new RegExp(source, flags)
  } catch {
    return null
  }
}

/**
 * Find all regex matches in a text string.
 */
export function findMatches(
  text: string,
  regex: RegExp,
): { index: number; length: number; match: string }[] {
  const matches: { index: number; length: number; match: string }[] = []
  let m: RegExpExecArray | null

  // Reset lastIndex to ensure we start from the beginning
  regex.lastIndex = 0

  while ((m = regex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      length: m[0].length,
      match: m[0],
    })
    // Prevent infinite loop on zero-length matches
    if (m[0].length === 0) {
      regex.lastIndex++
    }
  }

  return matches
}
