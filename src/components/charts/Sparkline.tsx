'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return <div className="w-24 h-8 bg-border/30 rounded" />
  const points = data.map((v, i) => ({ i, v }))
  return (
    <ResponsiveContainer width={96} height={32}>
      <LineChart data={points}>
        <Line type="monotone" dataKey="v" stroke="#3b82f6" dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}
