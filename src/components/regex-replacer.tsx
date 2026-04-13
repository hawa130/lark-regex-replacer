import { ChevronDown, ChevronUp } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDocMiniApp } from "@/hooks/use-doc-miniapp"
import { useRegexSearch } from "@/hooks/use-regex-search"

import { ReplaceInput } from "./replace-input"
import { SearchInput } from "./search-input"
import { StatusBar } from "./status-bar"

export function RegexReplacer() {
  const { docMiniApp, docRef, editable } = useDocMiniApp()
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

  const handlePatternChange = useCallback(
    (value: string) => {
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

  const hasMatches = matches.length > 0

  return (
    <TooltipProvider delay={300}>
      <div className="flex flex-col gap-2 p-3">
        <SearchInput
          pattern={pattern}
          onPatternChange={handlePatternChange}
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
          matchCount={matches.length}
          currentIndex={currentIndex}
          onKeyDown={handleKeyDown}
        />

        <ReplaceInput
          replacement={replacement}
          onReplacementChange={setReplacement}
        />

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={!hasMatches}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={!hasMatches}
          >
            <ChevronDown />
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={handleReplace}
            disabled={!editable || !hasMatches}
          >
            替换
          </Button>
          <Button
            variant="default"
            onClick={handleReplaceAll}
            disabled={!editable || !hasMatches}
          >
            全部替换
          </Button>
        </div>

        <StatusBar error={error} isSearching={isSearching} />
      </div>
    </TooltipProvider>
  )
}
