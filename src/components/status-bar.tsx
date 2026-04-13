interface StatusBarProps {
  error: string | null
  isSearching: boolean
}

export function StatusBar({ error, isSearching }: StatusBarProps) {
  if (error) {
    return <div className="text-destructive px-1 text-xs">{error}</div>
  }

  if (isSearching) {
    return <div className="text-muted-foreground px-1 text-xs">搜索中...</div>
  }

  return null
}
