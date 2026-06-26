'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: { elapsed: number; hr: number | null; stress: number | null }[]
}

export function MeetingSecondaryCharts({ data }: Props) {
  const hasStress = data.some((d) => d.stress != null)
  if (!hasStress) return null

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Stress</h2>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <XAxis dataKey="elapsed" tickFormatter={(v) => `${v}m`} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v}`, 'Stress']}
            labelFormatter={(v) => `${v}m`}
          />
          <Area type="monotone" dataKey="stress" fill="#f59e0b" fillOpacity={0.25} stroke="#f59e0b" strokeWidth={2} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
