import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

interface ReplaceInputProps {
  replacement: string
  onReplacementChange: (value: string) => void
  preview: string
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

function truncateMiddle(text: string, maxGraphemes: number): string {
  const segments = [...segmenter.segment(text)]
  if (segments.length <= maxGraphemes) return text
  const half = Math.floor((maxGraphemes - 1) / 2)
  const head = segments
    .slice(0, half)
    .map((s) => s.segment)
    .join("")
  const tail = segments
    .slice(-half)
    .map((s) => s.segment)
    .join("")
  return head + "…" + tail
}

export function ReplaceInput({
  replacement,
  onReplacementChange,
  preview,
}: ReplaceInputProps) {
  return (
    <InputGroup>
      <InputGroupInput
        value={replacement}
        onChange={(e) => onReplacementChange(e.target.value)}
        placeholder="替换..."
        className="text-sm"
      />
      {preview && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>
            <span className="text-xs" title={preview}>
              {truncateMiddle(preview, 12)}
            </span>
          </InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
