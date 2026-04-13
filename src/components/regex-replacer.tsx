import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { useDocMiniApp } from "@/hooks/use-doc-miniapp"
import { useRegexSearch } from "@/hooks/use-regex-search"
import { buildRegex } from "@/lib/block-text"

import { ActionBar } from "./action-bar"
import { ReplaceInput } from "./replace-input"
import { SearchInput } from "./search-input"

export function RegexReplacer() {
  const { docMiniApp, docRef, editable, onDocumentChange } = useDocMiniApp()
  const {
    matches,
    currentIndex,
    isSearching,
    error,
    search,
    next,
    prev,
    replaceCurrent,
    replaceAll,
  } = useRegexSearch(docMiniApp, docRef)

  const [pattern, setPattern] = useState("")
  const [replacement, setReplacement] = useState("")
  const [isRegex, setIsRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const options = useMemo(
    () => ({ isRegex, caseSensitive, wholeWord }),
    [isRegex, caseSensitive, wholeWord],
  )

  const triggerSearch = useCallback(
    (newPattern: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        search(newPattern, { isRegex, caseSensitive, wholeWord })
      }, 300)
    },
    [search, isRegex, caseSensitive, wholeWord],
  )

  // Re-search when document content changes
  const patternRef = useRef(pattern)

  useEffect(() => {
    return onDocumentChange(() => {
      if (patternRef.current) {
        triggerSearch(patternRef.current)
      }
    })
  }, [onDocumentChange, triggerSearch])

  const handlePatternChange = useCallback(
    (value: string) => {
      patternRef.current = value
      setPattern(value)
      triggerSearch(value)
    },
    [triggerSearch],
  )

  const handleOptionChange = useCallback(
    (setter: (v: boolean) => void, newValue: boolean, optionKey: string) => {
      setter(newValue)
      const opts = { isRegex, caseSensitive, wholeWord, [optionKey]: newValue }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      search(pattern, opts)
    },
    [search, pattern, isRegex, caseSensitive, wholeWord],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        if (e.shiftKey) {
          prev()
        } else {
          next()
        }
      }
    },
    [next, prev],
  )

  const handleReplace = useCallback(() => {
    replaceCurrent(replacement, pattern, options)
  }, [replaceCurrent, replacement, pattern, options])

  const handleReplaceAll = useCallback(() => {
    replaceAll(replacement, pattern, options)
  }, [replaceAll, replacement, pattern, options])

  const matchLabel = error
    ? error
    : matches.length > 0
      ? `${currentIndex + 1}/${matches.length}`
      : pattern
        ? "无结果"
        : ""

  // Only show preview when replacement uses $ patterns (e.g. $1, $&)
  const hasSubstitution = /\$[0-9&`']/.test(replacement)

  const replacePreview = useMemo(() => {
    if (!hasSubstitution) return ""
    if (currentIndex < 0 || currentIndex >= matches.length) return ""
    const match = matches[currentIndex]
    const regex = buildRegex(pattern, options)
    if (!regex) return ""
    return match.match.replace(regex, replacement)
  }, [hasSubstitution, currentIndex, matches, replacement, pattern, options])

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-col gap-3 p-4 pt-0">
        <SearchInput
          pattern={pattern}
          onPatternChange={handlePatternChange}
          invalid={!!error}
          isRegex={isRegex}
          onIsRegexChange={(v) => handleOptionChange(setIsRegex, v, "isRegex")}
          caseSensitive={caseSensitive}
          onCaseSensitiveChange={(v) =>
            handleOptionChange(setCaseSensitive, v, "caseSensitive")
          }
          wholeWord={wholeWord}
          onWholeWordChange={(v) =>
            handleOptionChange(setWholeWord, v, "wholeWord")
          }
          onKeyDown={handleKeyDown}
        />

        <ReplaceInput
          replacement={replacement}
          onReplacementChange={setReplacement}
          preview={replacePreview}
        />

        <ActionBar
          matchLabel={matchLabel}
          hasMatches={matches.length > 0}
          disabled={!editable || isSearching}
          onPrev={prev}
          onNext={next}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
        />

      </div>
    </TooltipProvider>
  )
}
