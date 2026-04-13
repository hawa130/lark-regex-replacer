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
  onKeyDown,
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        value={pattern}
        onChange={(e) => onPatternChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="查找..."
        className="h-8 flex-1 text-sm"
        autoFocus
      />

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
