export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
      <div className="w-6 h-4 bg-border rounded" />
      <div className="flex-1 h-4 bg-border rounded" />
      <div className="w-20 h-4 bg-border rounded" />
      <div className="w-20 h-4 bg-border rounded" />
      <div className="w-20 h-4 bg-border rounded" />
      <div className="w-12 h-4 bg-border rounded" />
      <div className="w-24 h-6 bg-border rounded" />
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="w-full h-64 bg-card rounded-lg border border-border animate-pulse" />
  )
}
