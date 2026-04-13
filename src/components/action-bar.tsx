import { ArrowDown, ArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"

interface ActionBarProps {
  matchLabel: string
  hasMatches: boolean
  editable: boolean
  onPrev: () => void
  onNext: () => void
  onReplace: () => void
  onReplaceAll: () => void
}

export function ActionBar({
  matchLabel,
  hasMatches,
  editable,
  onPrev,
  onNext,
  onReplace,
  onReplaceAll,
}: ActionBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {matchLabel && (
        <span className="text-muted-foreground text-xs">{matchLabel}</span>
      )}
      {hasMatches && (
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onPrev}>
            <ArrowUp />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ArrowDown />
          </Button>
        </div>
      )}
      <div className="flex-1" />
      <Button
        variant="outline"
        onClick={onReplace}
        disabled={!editable || !hasMatches}
      >
        替换
      </Button>
      <Button
        variant="default"
        onClick={onReplaceAll}
        disabled={!editable || !hasMatches}
      >
        全部替换
      </Button>
    </div>
  )
}
