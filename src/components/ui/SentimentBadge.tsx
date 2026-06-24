const COLOURS: Record<string, string> = {
  positive: 'bg-positive/20 text-positive',
  neutral: 'bg-border text-text-secondary',
  tense: 'bg-stress/20 text-stress',
  conflicted: 'bg-red-500/20 text-red-400',
}

export function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const cls = COLOURS[sentiment] ?? COLOURS.neutral
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {sentiment}
    </span>
  )
}
