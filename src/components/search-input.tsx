import { ALargeSmall, Regex, WholeWord } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupToggle,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SearchInputProps {
  pattern: string
  onPatternChange: (value: string) => void
  invalid: boolean
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
  invalid,
  isRegex,
  onIsRegexChange,
  caseSensitive,
  onCaseSensitiveChange,
  wholeWord,
  onWholeWordChange,
  onKeyDown,
}: SearchInputProps) {
  return (
    <InputGroup>
      <InputGroupInput
        value={pattern}
        onChange={(e) => onPatternChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="查找..."
        className="text-sm"
        aria-invalid={invalid}
        autoFocus
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupToggle
                pressed={isRegex}
                onPressedChange={onIsRegexChange}
                aria-label="正则表达式"
              >
                <Regex />
              </InputGroupToggle>
            }
          />
          <TooltipContent>正则表达式</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupToggle
                pressed={caseSensitive}
                onPressedChange={onCaseSensitiveChange}
                aria-label="区分大小写"
              >
                <ALargeSmall />
              </InputGroupToggle>
            }
          />
          <TooltipContent>区分大小写</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <InputGroupToggle
                pressed={wholeWord}
                onPressedChange={onWholeWordChange}
                disabled={isRegex}
                aria-label="全字匹配"
              >
                <WholeWord />
              </InputGroupToggle>
            }
          />
          <TooltipContent>全字匹配</TooltipContent>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  )
}
