'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LeaderboardRow } from '@/lib/leaderboard'

type SortKey = 'avgHrElevation' | 'avgStress' | 'avgBbDelta' | 'meetingCount'
type View = 'meetings' | 'people' | 'topics' | 'teams'

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
      className="text-right text-[11px] text-text-secondary uppercase tracking-widest font-medium px-6 py-3.5 cursor-pointer hover:text-text-primary transition-colors select-none"
    >
      {label}{sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  )

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr style={{ background: '#161616', borderBottom: '1px solid #2a2a2a' }}>
            <th className="text-left text-[11px] text-text-secondary uppercase tracking-widest font-medium pl-5 pr-2 py-3.5 w-12">#</th>
            <th className="text-left text-[11px] text-text-secondary uppercase tracking-widest font-medium px-4 py-3.5">Name</th>
            <ColHeader k="avgHrElevation" label="HR ↑" />
            <ColHeader k="meetingCount" label="Count" />
            {showExtra && <ColHeader k="avgStress" label="Stress" />}
            {showExtra && <ColHeader k="avgBbDelta" label="Battery" />}
            <th className="px-4 py-3.5 text-right">
              <button
                onClick={() => setShowExtra((v) => !v)}
                className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
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
                className="cursor-pointer group transition-colors"
                style={{ borderBottom: '1px solid #1e1e1e' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#161616')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Rank */}
                <td className="pl-5 pr-2 py-4 tabular-nums text-sm" style={{ color: '#444' }}>
                  {i + 1}
                </td>

                {/* Name */}
                <td className="px-4 py-4">
                  <span className="text-text-primary font-medium text-sm leading-snug">
                    {row.name}
                  </span>
                </td>

                {/* HR Elevation */}
                <td className="px-6 py-4 text-right tabular-nums">
                  {hasData ? (
                    <span className={`text-sm font-semibold ${high ? 'text-red-400' : mid ? 'text-amber-400' : 'text-green-400'}`}>
                      {elevation > 0 ? '+' : ''}{elevation.toFixed(1)}
                      <span className="text-text-secondary font-normal text-xs ml-1">bpm</span>
                    </span>
                  ) : (
                    <span style={{ color: '#333' }} className="text-sm">—</span>
                  )}
                </td>

                {/* Count */}
                <td className="px-6 py-4 text-right tabular-nums text-text-secondary text-sm">
                  {row.meetingCount}
                </td>

                {showExtra && (
                  <td className="px-6 py-4 text-right tabular-nums text-sm text-text-primary">
                    {row.avgStress != null ? row.avgStress.toFixed(0) : '—'}
                  </td>
                )}
                {showExtra && (
                  <td className={`px-6 py-4 text-right tabular-nums text-sm ${(row.avgBbDelta ?? 0) < -5 ? 'text-amber-400' : 'text-green-400'}`}>
                    {row.avgBbDelta != null ? (row.avgBbDelta > 0 ? '+' : '') + row.avgBbDelta.toFixed(0) : '—'}
                  </td>
                )}

                <td className="px-4 py-4" />
              </tr>
            )
          })}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center text-sm" style={{ color: '#444' }}>
                No data yet — hit Sync now
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
