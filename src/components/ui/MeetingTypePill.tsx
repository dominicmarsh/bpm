export function MeetingTypePill({ type }: { type: string | null }) {
  if (!type) return null
  return (
    <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent capitalize">
      {type.replace(/-/g, ' ')}
    </span>
  )
}
