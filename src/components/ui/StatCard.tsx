'use client'

interface StatCardProps {
  label: string
  value: string | number | null
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  highlight?: 'stress' | 'positive' | 'neutral'
}

export function StatCard({ label, value, unit, highlight = 'neutral' }: StatCardProps) {
  const colours = {
    stress: 'text-stress',
    positive: 'text-positive',
    neutral: 'text-text-primary',
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${colours[highlight]}`}>
        {value == null ? '—' : value}
        {unit && value != null && <span className="text-lg font-normal text-text-secondary ml-1">{unit}</span>}
      </p>
    </div>
  )
}
