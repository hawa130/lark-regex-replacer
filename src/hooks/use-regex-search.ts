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
import { processItemsIdle } from "@/lib/idle"

interface SearchOptions {
  isRegex: boolean
  caseSensitive: boolean
  wholeWord: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocMiniAppType = any

/**
 * Find the match index nearest to the cursor in the given direction.
 * matches must be in document order.
 */
function findMatchIndexNearCursor(
  matches: MatchResult[],
  cursorBlockId: number,
  cursorOffset: number,
  blockOrder: Map<number, number>,
  direction: "forward" | "backward",
): number {
  if (matches.length === 0) return -1

  const cursorOrder = blockOrder.get(cursorBlockId) ?? -1

  if (direction === "forward") {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i]
      const mOrder = blockOrder.get(m.blockId) ?? -1
      if (mOrder > cursorOrder) return i
      if (mOrder === cursorOrder && m.index >= cursorOffset) return i
    }
    return 0 // wrap to first
  }

  // backward
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]
    const mOrder = blockOrder.get(m.blockId) ?? -1
    if (mOrder < cursorOrder) return i
    if (mOrder === cursorOrder && m.index < cursorOffset) return i
  }
  return matches.length - 1 // wrap to last
}

export function useRegexSearch(
  docMiniApp: DocMiniAppType,
  docRef: DocumentRef | null,
) {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastPatternRef = useRef("")
  const blockOrderRef = useRef<Map<number, number>>(new Map())
  const matchesRef = useRef<MatchResult[]>([])
  const abortRef = useRef<AbortController | null>(null)

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

  const selectMatch = useCallback(
    async (match: MatchResult) => {
      if (!docRef) return
      await docMiniApp.Selection.setSelection([
        {
          type: "text",
          ref: {
            docRef,
            blockId: match.blockId,
            range: [match.index, match.index + match.length],
          },
        },
      ]).catch(() => {
        // Fallback to scrollToBlock if setSelection fails
        const blockRef = docMiniApp.getBlockRefById(docRef, match.blockId)
        return docMiniApp.Viewport.scrollToBlock(blockRef).catch(() => {})
      })
    },
    [docMiniApp, docRef],
  )

  const getCursorPosition = useCallback(async (): Promise<{
    blockId: number
    offset: number
  } | null> => {
    if (!docRef) return null
    try {
      const selection = await docMiniApp.Selection.getSelection(docRef)
      if (selection && selection.length > 0) {
        const item = selection[0]
        return {
          blockId: item.blockId ?? item.ref?.blockId,
          offset: item.ref?.range?.[0] ?? 0,
        }
      }
    } catch {
      // Selection not available
    }
    return null
  }, [docMiniApp, docRef])

  const goToMatch = useCallback(
    async (index: number, allMatches?: MatchResult[]) => {
      const m = allMatches ?? matchesRef.current
      if (m.length === 0) return

      const wrappedIndex = ((index % m.length) + m.length) % m.length
      setCurrentIndex(wrappedIndex)

      await applyHighlights(m, wrappedIndex)
      await selectMatch(m[wrappedIndex])
    },
    [applyHighlights, selectMatch],
  )

  const search = useCallback(
    async (pattern: string, options: SearchOptions, preferIndex?: number) => {
      // Abort previous search
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      lastPatternRef.current = pattern
      setError(null)

      if (!pattern || !docRef) {
        setMatches([])
        matchesRef.current = []
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
        matchesRef.current = []
        setCurrentIndex(-1)
        return
      }

      setIsSearching(true)

      try {
        const rootBlock = await docMiniApp.Document.getRootBlock(docRef)
        const textBlocks = collectTextualBlocks(rootBlock)

        // Build block order map
        const orderMap = new Map<number, number>()
        textBlocks.forEach((block, i) => orderMap.set(block.id, i))
        blockOrderRef.current = orderMap

        // Process blocks in idle time
        const allMatches: MatchResult[] = []

        await processItemsIdle(
          textBlocks,
          (block) => {
            const rawText = getRawTextFromBlock(docMiniApp, block)
            if (!rawText) return

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
          },
          controller.signal,
        )

        setMatches(allMatches)
        matchesRef.current = allMatches

        if (allMatches.length === 0) {
          setCurrentIndex(-1)
          await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(docRef)
          return
        }

        // Determine initial index
        let initialIndex: number
        if (preferIndex !== undefined) {
          initialIndex = Math.min(preferIndex, allMatches.length - 1)
        } else {
          const cursor = await getCursorPosition()
          if (cursor) {
            initialIndex = findMatchIndexNearCursor(
              allMatches,
              cursor.blockId,
              cursor.offset,
              orderMap,
              "forward",
            )
          } else {
            initialIndex = 0
          }
        }

        await goToMatch(initialIndex, allMatches)
      } catch (e) {
        // Ignore abort errors
        if (e instanceof DOMException && e.name === "AbortError") return
        console.error("Search error:", e)
        setError("搜索出错")
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    },
    [docMiniApp, docRef, getCursorPosition, goToMatch],
  )

  const next = useCallback(async () => {
    const m = matchesRef.current
    if (m.length === 0) return

    const cursor = await getCursorPosition()
    if (cursor) {
      const idx = findMatchIndexNearCursor(
        m,
        cursor.blockId,
        cursor.offset + 1, // +1 to skip current position
        blockOrderRef.current,
        "forward",
      )
      await goToMatch(idx)
    } else {
      await goToMatch(currentIndex + 1)
    }
  }, [getCursorPosition, goToMatch, currentIndex])

  const prev = useCallback(async () => {
    const m = matchesRef.current
    if (m.length === 0) return

    const cursor = await getCursorPosition()
    if (cursor) {
      const idx = findMatchIndexNearCursor(
        m,
        cursor.blockId,
        cursor.offset,
        blockOrderRef.current,
        "backward",
      )
      await goToMatch(idx)
    } else {
      await goToMatch(currentIndex - 1)
    }
  }, [getCursorPosition, goToMatch, currentIndex])

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

        const resolvedReplacement = match.match.replace(regex, replacement)
        const before = rawText.slice(0, match.index)
        const after = rawText.slice(match.index + match.length)
        const newText = before + resolvedReplacement + after

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
        const blockIds = [...new Set(matches.map((m) => m.blockId))]

        for (const blockId of blockIds) {
          const blockRef = docMiniApp.getBlockRefById(docRef, blockId)
          const block = await docMiniApp.Block.getBlock(blockRef)
          if (!block.data?.text?.elements) continue

          const rawText = getRawTextFromBlock(docMiniApp, block)
          if (!rawText) continue

          const newText = rawText.replace(regex, replacement)

          const newElements = rebuildElements(block.data.text.elements, newText)
          await docMiniApp.Block.updateBlock(blockRef, {
            ...block.data,
            text: { elements: newElements },
          })
        }

        await docMiniApp.Block.TextualBlock.clearAllHighlightTexts(docRef)
        setMatches([])
        matchesRef.current = []
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

function rebuildElements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements: any[],
  newText: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (elements.length === 0) return elements

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
