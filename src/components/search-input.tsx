import { ALargeSmall, Regex, WholeWord } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SearchInputProps {
  pattern: string
  onPatternChange: (value: string) => void
  isRegex: boolean
  onIsRegexChange: (value: boolean) => void
  caseSensitive: boolean
  onCaseSensitiveChange: (value: boolean) => void
  wholeWord: boolean
  onWholeWordChange: (value: boolean) => void
  matchCount: number
  currentIndex: number
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function SearchInput({
  pattern,
  onPatternChange,
  isRegex,
  onIsRegexChange,
  caseSensitive,
  onCaseSensitiveChange,
  wholeWord,
  onWholeWordChange,
  matchCount,
  currentIndex,
  onKeyDown,
}: SearchInputProps) {
  const matchLabel =
    matchCount > 0
      ? `${currentIndex + 1}/${matchCount}`
      : pattern
        ? "无结果"
        : ""

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Input
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="查找..."
          className="h-8 pr-16 text-sm"
          autoFocus
        />
        {matchLabel && (
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
            {matchLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={isRegex}
                onPressedChange={onIsRegexChange}
                aria-label="正则表达式"
                className="p-0"
              >
                <Regex />
              </Toggle>
            }
          />
          <TooltipContent>正则表达式</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={caseSensitive}
                onPressedChange={onCaseSensitiveChange}
                aria-label="区分大小写"
                className="p-0"
              >
                <ALargeSmall />
              </Toggle>
            }
          />
          <TooltipContent>区分大小写</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                pressed={wholeWord}
                onPressedChange={onWholeWordChange}
                disabled={isRegex}
                aria-label="全字匹配"
                className="p-0"
              >
                <WholeWord />
              </Toggle>
            }
          />
          <TooltipContent>全字匹配</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
