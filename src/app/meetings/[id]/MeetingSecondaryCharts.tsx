'use client'

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import type { MeetingBiometrics } from '@prisma/client'

interface Props {
  data: { elapsed: number; hr: number | null; stress: number | null }[]
  bio: MeetingBiometrics | null
}

export function MeetingSecondaryCharts({ data, bio }: Props) {
  const bbData = bio?.avgBodyBattery != null
    ? [
        { name: 'Before', value: (bio.avgBodyBattery ?? 0) - (bio.bodyBatteryDelta ?? 0) / 2 },
        { name: 'After', value: (bio.avgBodyBattery ?? 0) + (bio.bodyBatteryDelta ?? 0) / 2 },
      ]
    : []

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stress area chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">Stress</h3>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data}>
            <XAxis dataKey="elapsed" tickFormatter={(v) => `${v}m`} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Area type="monotone" dataKey="stress" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Body battery */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">Body Battery</h3>
        {bbData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={bbData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} hide />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bbData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-sm mt-2">
              <span className={`tabular-nums font-semibold ${(bio?.bodyBatteryDelta ?? 0) < 0 ? 'text-stress' : 'text-positive'}`}>
                {bio?.bodyBatteryDelta != null && bio.bodyBatteryDelta > 0 ? '+' : ''}{bio?.bodyBatteryDelta ?? '—'}
              </span>
              <span className="text-text-secondary text-xs ml-1">delta</span>
            </p>
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-text-secondary text-sm">No data</div>
        )}
      </div>

      {/* HRV */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider mb-4">HRV</h3>
        <div className="h-32 flex items-center justify-center text-text-secondary text-sm">
          {bio?.avgHrv != null ? (
            <div className="text-center">
              <p className="text-3xl font-bold text-positive tabular-nums">{bio.avgHrv.toFixed(1)}</p>
              <p className="text-xs text-text-secondary mt-1">avg ms</p>
            </div>
          ) : 'No HRV data'}
        </div>
      </div>
    </div>
  )
}
