'use client'

import { useRouter } from 'next/navigation'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { SyncButton } from '@/components/leaderboard/SyncButton'
import type { LeaderboardRow, DateRange } from '@/lib/leaderboard'

const VIEWS = ['meetings', 'people', 'topics', 'teams'] as const
type View = typeof VIEWS[number]
const RANGES: { label: string; value: DateRange }[] = [
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
]

interface Props {
  initialView: View
  initialRange: DateRange
  meetings: LeaderboardRow[]
  people: LeaderboardRow[]
  topics: LeaderboardRow[]
  teams: LeaderboardRow[]
}

export function LeaderboardClient({ initialView, initialRange, meetings, people, topics, teams }: Props) {
  const router = useRouter()

  function setView(v: View) { router.push(`/?view=${v}&range=${initialRange}`) }
  function setRange(r: DateRange) { router.push(`/?view=${initialView}&range=${r}`) }

  const data = { meetings, people, topics, teams }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Leaderboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-card border border-border rounded-lg p-0.5 gap-0.5">
            {RANGES.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  initialRange === value
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <SyncButton />
        </div>
      </div>

      <div className="flex border-b border-border gap-8">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`pb-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              initialView === v
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <LeaderboardTable rows={data[initialView]} view={initialView} />
    </div>
  )
}
