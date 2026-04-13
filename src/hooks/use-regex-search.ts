import type {
  BlockSnapshot,
  DocumentRef,
} from "@lark-opdev/block-docs-addon-api"
import { useCallback, useRef, useState } from "react"

import {
  buildRegex,
  collectTextualBlocks,
  findMatches,
  type MatchResult,
} from "@/lib/block-text"

interface SearchOptions {
  isRegex: boolean
  caseSensitive: boolean
  wholeWord: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocMiniAppType = any

export function useRegexSearch(
  docMiniApp: DocMiniAppType,
  docRef: DocumentRef | null,
) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastPatternRef = useRef("")

  const search = useCallback(
    async (pattern: string, options: SearchOptions) => {
      lastPatternRef.current = pattern
      setError(null)

      if (!pattern || !docRef) {
        setMatches([])
        setCurrentIndex(-1)
        // Clear highlights when search is cleared
        if (docRef) {
          await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(
            docRef,
          ).catch(() => {})
        }
        return
      }

      const regex = buildRegex(pattern, options)
      if (!regex) {
        setError("无效的正则表达式")
        setMatches([])
        setCurrentIndex(-1)
        return
      }

      setIsSearching(true)

      try {
        // Clear previous highlights
        await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(docRef)

        // Get document tree and collect textual blocks
        const rootBlock = await docMiniApp.Document.getRootBlock(docRef)
        const textBlocks = collectTextualBlocks(rootBlock)

        // Search each block
        const allMatches: MatchResult[] = []
        const highlightRefs: {
          docRef: { docToken: string }
          blockId: number
          range: [number, number]
          style: { color: string }
        }[] = []

        for (const block of textBlocks) {
          const rawText = getRawTextFromBlock(docMiniApp, block)
          if (!rawText) continue

          const blockMatches = findMatches(rawText, regex)

          for (const m of blockMatches) {
            allMatches.push({
              blockId: block.id,
              blockRef: block.ref,
              index: m.index,
              length: m.length,
              match: m.match,
            })

            highlightRefs.push({
              ...block.ref,
              range: [m.index, m.index + m.length],
              style: { color: "Y500" },
            })
          }
        }

        setMatches(allMatches)
        setCurrentIndex(allMatches.length > 0 ? 0 : -1)

        // Highlight all matches
        if (highlightRefs.length > 0) {
          await docMiniApp.Block.TextualBlock.highlightTexts(
            highlightRefs,
          ).catch(() => {})
        }
      } catch (e) {
        console.error("Search error:", e)
        setError("搜索出错")
      } finally {
        setIsSearching(false)
      }
    },
    [docMiniApp, docRef],
  )

  const goToMatch = useCallback(
    async (index: number) => {
      if (matches.length === 0 || !docRef) return

      const wrappedIndex =
        ((index % matches.length) + matches.length) % matches.length
      setCurrentIndex(wrappedIndex)

      const match = matches[wrappedIndex]
      const blockRef = docMiniApp.getBlockRefById(docRef, match.blockId)
      await docMiniApp.Viewport.scrollToBlock(blockRef).catch(() => {})
    },
    [docMiniApp, docRef, matches],
  )

  const next = useCallback(() => {
    goToMatch(currentIndex + 1)
  }, [currentIndex, goToMatch])

  const prev = useCallback(() => {
    goToMatch(currentIndex - 1)
  }, [currentIndex, goToMatch])

  const replaceCurrent = useCallback(
    async (replacement: string, pattern: string, options: SearchOptions) => {
      if (currentIndex < 0 || currentIndex >= matches.length || !docRef) return

      const match = matches[currentIndex]
      const blockRef = docMiniApp.getBlockRefById(docRef, match.blockId)

      try {
        const block = await docMiniApp.Block.getBlock(blockRef)
        const regex = buildRegex(pattern, options)
        if (!regex || !block.data?.text?.elements) return

        // Rebuild text, apply replacement only for the current match
        const rawText = getRawTextFromBlock(docMiniApp, block)
        if (!rawText) return

        const before = rawText.slice(0, match.index)
        const after = rawText.slice(match.index + match.length)
        const newText = before + replacement + after

        // Update the block with replaced text (simple single-run approach)
        const newElements = rebuildElements(block.data.text.elements, newText)
        await docMiniApp.Block.updateBlock(blockRef, {
          ...block.data,
          text: { elements: newElements },
        })

        // Re-run search to update matches
        await search(pattern, options)
      } catch (e) {
        console.error("Replace error:", e)
      }
    },
    [currentIndex, docMiniApp, docRef, matches, search],
  )

  const replaceAll = useCallback(
    async (replacement: string, pattern: string, options: SearchOptions) => {
      if (matches.length === 0 || !docRef) return

      const regex = buildRegex(pattern, options)
      if (!regex) return

      try {
        // Group matches by block
        const matchesByBlock = new Map<number, MatchResult[]>()
        for (const m of matches) {
          const existing = matchesByBlock.get(m.blockId) ?? []
          existing.push(m)
          matchesByBlock.set(m.blockId, existing)
        }

        // Replace in each block
        for (const [blockId, blockMatches] of matchesByBlock) {
          const blockRef = docMiniApp.getBlockRefById(docRef, blockId)
          const block = await docMiniApp.Block.getBlock(blockRef)
          if (!block.data?.text?.elements) continue

          const rawText = getRawTextFromBlock(docMiniApp, block)
          if (!rawText) continue

          // Apply all replacements (from end to start to preserve offsets)
          let newText = rawText
          const sorted = [...blockMatches].sort((a, b) => b.index - a.index)
          for (const m of sorted) {
            newText =
              newText.slice(0, m.index) +
              replacement +
              newText.slice(m.index + m.length)
          }

          const newElements = rebuildElements(block.data.text.elements, newText)
          await docMiniApp.Block.updateBlock(blockRef, {
            ...block.data,
            text: { elements: newElements },
          })
        }

        // Clear highlights and reset
        await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(docRef)
        setMatches([])
        setCurrentIndex(-1)
      } catch (e) {
        console.error("Replace all error:", e)
      }
    },
    [docMiniApp, docRef, matches],
  )

  return {
    matches,
    currentIndex,
    isSearching,
    error,
    search,
    next,
    prev,
    replaceCurrent,
    replaceAll,
  }
}

/**
 * Extract raw text from a block using the appropriate API.
 */
function getRawTextFromBlock(
  docMiniApp: DocMiniAppType,
  block: BlockSnapshot,
): string | null {
  try {
    if (block.type === "text") {
      return docMiniApp.Block.TextBlock.getRawText(block.data)
    }
    return docMiniApp.Block.TextualBlock.getRawText(block.data)
  } catch {
    return null
  }
}

/**
 * Rebuild text elements preserving the style of the first element.
 * This is a simplified approach -- for complex multi-styled blocks,
 * a more sophisticated element-splitting algorithm would be needed.
 */
function rebuildElements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  newText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (elements.length === 0) return elements

  // Preserve the style of the first text_run
  const firstStyle = elements[0]?.text_run?.style ?? {}

  return [
    {
      text_run: {
        content: newText,
        style: firstStyle,
      },
    },
  ]
}
