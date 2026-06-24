import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LeaderboardClient } from './LeaderboardClient'
import {
  getMeetingsLeaderboard,
  getPeopleLeaderboard,
  getTopicsLeaderboard,
  getTeamsLeaderboard,
  type DateRange,
} from '@/lib/leaderboard'
import { Nav } from '@/components/ui/Nav'

export default async function HomePage({
  searchParams,
}: {
  searchParams: { view?: string; range?: string }
}) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { garminCred: true },
  })

  if (!user) redirect('/login')
  if (!user.garminCred) redirect('/setup')

  const view = (searchParams.view ?? 'meetings') as 'meetings' | 'people' | 'topics' | 'teams'
  const range = (searchParams.range ?? '30d') as DateRange

  const [meetings, people, topics, teams] = await Promise.all([
    getMeetingsLeaderboard(user.id, range),
    getPeopleLeaderboard(user.id, range),
    getTopicsLeaderboard(user.id, range),
    getTeamsLeaderboard(user.id, range),
  ])

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <LeaderboardClient
          initialView={view}
          initialRange={range}
          meetings={meetings}
          people={people}
          topics={topics}
          teams={teams}
        />
      </main>
    </>
  )
}
