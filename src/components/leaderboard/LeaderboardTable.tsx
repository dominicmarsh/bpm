'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Sparkline } from '@/components/charts/Sparkline'
import type { LeaderboardRow } from '@/lib/leaderboard'

type SortKey = 'avgHrElevation' | 'avgStress' | 'avgBbDelta' | 'meetingCount'
type View = 'meetings' | 'people' | 'topics' | 'teams'

function fmt(v: number | null, decimals = 1): string {
  if (v == null) return '—'
  return v.toFixed(decimals)
}

interface LeaderboardTableProps {
  rows: LeaderboardRow[]
  view: View
}

export function LeaderboardTable({ rows, view }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('avgHrElevation')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const router = useRouter()

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? 0
    const bv = b[sortKey] ?? 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
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

  const col = (key: SortKey, label: string) => (
    <th
      className="text-left text-xs text-text-secondary uppercase tracking-wider font-medium px-4 py-3 cursor-pointer hover:text-text-primary transition-colors"
      onClick={() => handleSort(key)}
    >
      {label} {sortKey === key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr>
            <th className="text-left text-xs text-text-secondary uppercase tracking-wider font-medium px-4 py-3 w-10">#</th>
            <th className="text-left text-xs text-text-secondary uppercase tracking-wider font-medium px-4 py-3">Name</th>
            {col('avgHrElevation', 'HR Elevation')}
            {col('avgStress', 'Stress')}
            {col('avgBbDelta', 'Battery Impact')}
            {col('meetingCount', 'Meetings')}
            <th className="text-left text-xs text-text-secondary uppercase tracking-wider font-medium px-4 py-3">Trend</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-b border-border/50 hover:bg-border/20 cursor-pointer transition-colors"
                onClick={() => handleRowClick(row)}
              >
                <td className="px-4 py-3 text-text-secondary tabular-nums text-sm">{i + 1}</td>
                <td className="px-4 py-3 text-text-primary font-medium text-sm">{row.name}</td>
                <td className={`px-4 py-3 tabular-nums text-sm font-semibold ${(row.avgHrElevation ?? 0) > 10 ? 'text-stress' : 'text-text-primary'}`}>
                  {fmt(row.avgHrElevation)} <span className="text-text-secondary font-normal">bpm</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-sm text-text-primary">
                  {fmt(row.avgStress, 0)}
                </td>
                <td className={`px-4 py-3 tabular-nums text-sm ${(row.avgBbDelta ?? 0) < -5 ? 'text-stress' : 'text-positive'}`}>
                  {row.avgBbDelta != null && row.avgBbDelta > 0 ? '+' : ''}{fmt(row.avgBbDelta, 0)}
                </td>
                <td className="px-4 py-3 tabular-nums text-sm text-text-secondary">{row.meetingCount}</td>
                <td className="px-4 py-3">
                  <Sparkline data={row.sparkline} />
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-text-secondary text-sm">
                No data yet — complete setup to start syncing
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
