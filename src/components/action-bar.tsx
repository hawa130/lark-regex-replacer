import { ArrowDown, ArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ActionBarProps {
  matchLabel: string
  hasMatches: boolean
  disabled: boolean
  onPrev: () => void
  onNext: () => void
  onReplace: () => void
  onReplaceAll: () => void
}

export function ActionBar({
  matchLabel,
  hasMatches,
  disabled,
  onPrev,
  onNext,
  onReplace,
  onReplaceAll,
}: ActionBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {hasMatches && (
        <div className="flex items-center">
          <Button variant="ghost" size="icon-sm" onClick={onPrev}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onNext}>
            <ArrowDown />
          </Button>
        </div>
      )}
      {matchLabel && (
        <span className="text-muted-foreground text-sm">{matchLabel}</span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onReplace}
          disabled={disabled || !hasMatches}
        >
          替换
        </Button>
        <Button
          variant="default"
          onClick={onReplaceAll}
          disabled={disabled || !hasMatches}
        >
          全部替换
        </Button>
      </div>
    </div>
  )
}
