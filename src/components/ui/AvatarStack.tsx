export function AvatarStack({ emails, max = 5 }: { emails: string[]; max?: number }) {
  const shown = emails.slice(0, max)
  const remainder = emails.length - shown.length

  return (
    <div className="flex -space-x-2">
      {shown.map((email) => (
        <div
          key={email}
          title={email}
          className="w-7 h-7 rounded-full bg-accent/20 border-2 border-bg flex items-center justify-center text-xs text-accent font-medium"
        >
          {email[0].toUpperCase()}
        </div>
      ))}
      {remainder > 0 && (
        <div className="w-7 h-7 rounded-full bg-border border-2 border-bg flex items-center justify-center text-xs text-text-secondary">
          +{remainder}
        </div>
      )}
    </div>
  )
}
