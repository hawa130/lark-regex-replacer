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

  const applyHighlights = useCallback(
    async (allMatches: MatchResult[], activeIndex: number) => {
      if (!docRef) return

      await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(docRef).catch(
        () => {},
      )

      if (allMatches.length === 0) return

      const highlightRefs = allMatches.map((m, i) => ({
        ...m.blockRef,
        range: [m.index, m.index + m.length] as [number, number],
        style: { color: i === activeIndex ? "R500" : "Y500" },
      }))

      await docMiniApp.Block.TextualBlock.highlightTexts(highlightRefs).catch(
        () => {},
      )
    },
    [docMiniApp, docRef],
  )

  const search = useCallback(
    async (pattern: string, options: SearchOptions, preferIndex?: number) => {
      lastPatternRef.current = pattern
      setError(null)

      if (!pattern || !docRef) {
        setMatches([])
        setCurrentIndex(-1)
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
        const rootBlock = await docMiniApp.Document.getRootBlock(docRef)
        const textBlocks = collectTextualBlocks(rootBlock)

        const allMatches: MatchResult[] = []

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
          }
        }

        let initialIndex = allMatches.length > 0 ? 0 : -1
        if (preferIndex !== undefined && allMatches.length > 0) {
          initialIndex = Math.min(preferIndex, allMatches.length - 1)
        }
        setMatches(allMatches)
        setCurrentIndex(initialIndex)

        await applyHighlights(allMatches, initialIndex)

        // Scroll to the current match
        if (initialIndex >= 0) {
          const match = allMatches[initialIndex]
          const blockRef = docMiniApp.getBlockRefById(docRef, match.blockId)
          await docMiniApp.Viewport.scrollToBlock(blockRef).catch(() => {})
        }
      } catch (e) {
        console.error("Search error:", e)
        setError("搜索出错")
      } finally {
        setIsSearching(false)
      }
    },
    [docMiniApp, docRef, applyHighlights],
  )

  const goToMatch = useCallback(
    async (index: number) => {
      if (matches.length === 0 || !docRef) return

      const wrappedIndex =
        ((index % matches.length) + matches.length) % matches.length
      setCurrentIndex(wrappedIndex)

      await applyHighlights(matches, wrappedIndex)

      const match = matches[wrappedIndex]
      const blockRef = docMiniApp.getBlockRefById(docRef, match.blockId)
      await docMiniApp.Viewport.scrollToBlock(blockRef).catch(() => {})
    },
    [docMiniApp, docRef, matches, applyHighlights],
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

        const rawText = getRawTextFromBlock(docMiniApp, block)
        if (!rawText) return

        // Resolve $1/$& etc. by running replace on just the matched substring
        const resolvedReplacement = match.match.replace(regex, replacement)
        const before = rawText.slice(0, match.index)
        const after = rawText.slice(match.index + match.length)
        const newText = before + resolvedReplacement + after

        // Update the block with replaced text (simple single-run approach)
        const newElements = rebuildElements(block.data.text.elements, newText)
        await docMiniApp.Block.updateBlock(blockRef, {
          ...block.data,
          text: { elements: newElements },
        })

        // Re-run search, keeping the same index so it points to the next match
        await search(pattern, options, currentIndex)
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
        // Collect unique block IDs
        const blockIds = [...new Set(matches.map((m) => m.blockId))]

        // Replace in each block
        for (const blockId of blockIds) {
          const blockRef = docMiniApp.getBlockRefById(docRef, blockId)
          const block = await docMiniApp.Block.getBlock(blockRef)
          if (!block.data?.text?.elements) continue

          const rawText = getRawTextFromBlock(docMiniApp, block)
          if (!rawText) continue

          // String.replace with a global regex natively resolves $1/$& etc.
          const newText = rawText.replace(regex, replacement)

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
