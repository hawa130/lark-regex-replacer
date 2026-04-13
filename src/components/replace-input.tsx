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
            <span className="max-w-24 truncate text-xs" title={preview}>
              {preview}
            </span>
          </InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}
