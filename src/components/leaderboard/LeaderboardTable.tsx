'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LeaderboardRow } from '@/lib/leaderboard'

type SortKey = 'avgHrElevation' | 'avgStress' | 'avgBbDelta' | 'meetingCount'
type View = 'meetings' | 'people' | 'topics' | 'teams'

function fmt(v: number | null, decimals = 1, suffix = ''): string {
  if (v == null) return '—'
  const sign = suffix && v > 0 ? '+' : ''
  return `${sign}${v.toFixed(decimals)}${suffix}`
}

interface Props {
  rows: LeaderboardRow[]
  view: View
}

export function LeaderboardTable({ rows, view }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('avgHrElevation')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [showExtra, setShowExtra] = useState(false)
  const router = useRouter()

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
    const bv = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function handleRowClick(row: LeaderboardRow) {
    const paths: Record<View, string> = {
      meetings: `/meetings/${row.id}`,
      people: `/people/${row.id}`,
      topics: `/topics/${row.id}`,
      teams: `/`,
    }
    router.push(paths[view])
  }

  const ColHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="text-right text-xs text-text-secondary uppercase tracking-widest font-medium px-6 py-4 cursor-pointer hover:text-text-primary transition-colors select-none"
    >
      {label}{sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  )

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs text-text-secondary uppercase tracking-widest font-medium pl-6 pr-2 py-4 w-10">#</th>
            <th className="text-left text-xs text-text-secondary uppercase tracking-widest font-medium px-4 py-4">Name</th>
            <ColHeader k="avgHrElevation" label="HR ↑" />
            <ColHeader k="meetingCount" label="Count" />
            {showExtra && <ColHeader k="avgStress" label="Stress" />}
            {showExtra && <ColHeader k="avgBbDelta" label="Battery" />}
            <th className="px-4 py-4 text-right">
              <button
                onClick={() => setShowExtra((v) => !v)}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                title={showExtra ? 'Hide extra columns' : 'Show stress & battery'}
              >
                {showExtra ? '← less' : 'more →'}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const elevation = row.avgHrElevation
            const hasData = elevation != null
            const high = hasData && elevation > 10
            const mid = hasData && elevation > 5

            return (
              <tr
                key={row.id}
                onClick={() => handleRowClick(row)}
                className="border-b border-border/40 hover:bg-white/[0.03] cursor-pointer transition-colors group"
              >
                <td className="pl-6 pr-2 py-4 text-text-secondary tabular-nums text-sm">{i + 1}</td>
                <td className="px-4 py-4">
                  <span className="text-text-primary font-medium text-sm group-hover:text-white transition-colors">
                    {row.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {hasData ? (
                    <span className={`text-sm font-semibold ${high ? 'text-red-400' : mid ? 'text-amber-400' : 'text-green-400'}`}>
                      {elevation > 0 ? '+' : ''}{elevation.toFixed(1)}
                      <span className="text-text-secondary font-normal text-xs ml-1">bpm</span>
                    </span>
                  ) : (
                    <span className="text-text-secondary text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-text-secondary text-sm">
                  {row.meetingCount}
                </td>
                {showExtra && (
                  <td className="px-6 py-4 text-right tabular-nums text-sm text-text-primary">
                    {fmt(row.avgStress, 0)}
                  </td>
                )}
                {showExtra && (
                  <td className={`px-6 py-4 text-right tabular-nums text-sm ${(row.avgBbDelta ?? 0) < -5 ? 'text-amber-400' : 'text-green-400'}`}>
                    {fmt(row.avgBbDelta, 0, '')}
                  </td>
                )}
                <td className="px-4 py-4" />
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center text-text-secondary text-sm">
                No data yet — hit Sync now to pull your calendar
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
