import { Input } from "@/components/ui/input"

interface ReplaceInputProps {
  replacement: string
  onReplacementChange: (value: string) => void
}

export function ReplaceInput({
  replacement,
  onReplacementChange,
}: ReplaceInputProps) {
  return (
    <Input
      value={replacement}
      onChange={(e) => onReplacementChange(e.target.value)}
      placeholder="替换..."
      className="h-8 text-sm"
    />
  )
}
