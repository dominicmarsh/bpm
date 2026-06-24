'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'

interface TrendPoint {
  date: number
  hrElevation: number | null
  stress: number | null
  bbDelta: number | null
}

export function EntityDrilldownCharts({ trendData }: { trendData: TrendPoint[] }) {
  const scatter = trendData
    .filter((d) => d.hrElevation != null)
    .map((d) => ({ date: d.date, hrElevation: d.hrElevation! }))

  const stressDist = trendData
    .filter((d) => d.stress != null)
    .map((d, i) => ({ i, stress: d.stress! }))

  const bbDist = trendData
    .filter((d) => d.bbDelta != null)
    .map((d, i) => ({ i, bbDelta: d.bbDelta! }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* HR elevation trend */}
      <div className="bg-card border border-border rounded-xl p-5 md:col-span-3">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">HR Elevation Over Time</h3>
        <ResponsiveContainer width="100%" height={180}>
          <ScatterChart>
            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={['auto', 'auto']}
              tickFormatter={(v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="hrElevation"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(v: number) => [`+${v.toFixed(1)} bpm`, 'HR Elevation']}
              labelFormatter={(v: number) => new Date(v).toLocaleDateString('en-GB')}
            />
            <Scatter data={scatter} fill="#3b82f6" opacity={0.8} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Stress distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">Stress Distribution</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={stressDist}>
            <YAxis domain={[0, 100]} hide />
            <Bar dataKey="stress" fill="#f59e0b" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* BB delta distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">Battery Impact</h3>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={bbDist}>
            <YAxis hide />
            <Bar dataKey="bbDelta" radius={[2, 2, 0, 0]}>
              {bbDist.map((d, i) => (
                <rect key={i} fill={d.bbDelta < 0 ? '#f59e0b' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sentiment placeholder */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center">
        <p className="text-text-secondary text-sm">{trendData.length} data points</p>
      </div>
    </div>
  )
}
