import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/components/ui/Nav'
import { StatCard } from '@/components/ui/StatCard'
import { EntityDrilldownCharts } from '@/components/charts/EntityDrilldownCharts'
import Link from 'next/link'

export default async function TopicPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect('/login')

  const topic = await prisma.topic.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      meetings: {
        include: { meeting: { include: { biometrics: true } } },
      },
    },
  })

  if (!topic) notFound()

  const meetings = topic.meetings.map((mt) => mt.meeting).filter((m) => m.biometrics)
  const bios = meetings.map((m) => m.biometrics!)

  const avgHrElevation = bios.length ? bios.reduce((a, b) => a + (b.hrElevation ?? 0), 0) / bios.length : null
  const avgStress = bios.length ? bios.reduce((a, b) => a + (b.avgStress ?? 0), 0) / bios.length : null
  const avgBbDelta = bios.length ? bios.reduce((a, b) => a + (b.bodyBatteryDelta ?? 0), 0) / bios.length : null

  const trendData = meetings.map((m) => ({
    date: m.startTime.getTime(),
    hrElevation: m.biometrics?.hrElevation ?? null,
    stress: m.biometrics?.avgStress ?? null,
    bbDelta: m.biometrics?.bodyBatteryDelta ?? null,
  }))

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <Link href="/" className="text-text-secondary text-sm hover:text-text-primary">← Leaderboard</Link>
          <h1 className="text-2xl font-bold text-text-primary mt-2 capitalize">{topic.name}</h1>
          <p className="text-text-secondary text-sm">{meetings.length} meetings</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Avg HR Elevation" value={avgHrElevation != null ? `+${avgHrElevation.toFixed(1)}` : null} unit="bpm" highlight={avgHrElevation != null && avgHrElevation > 10 ? 'stress' : 'neutral'} />
          <StatCard label="Avg Stress" value={avgStress?.toFixed(1) ?? null} />
          <StatCard label="Avg Battery Impact" value={avgBbDelta?.toFixed(0) ?? null} highlight={avgBbDelta != null && avgBbDelta < -5 ? 'stress' : 'positive'} />
          <StatCard label="Appearances" value={meetings.length} />
        </div>

        <EntityDrilldownCharts trendData={trendData} />

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left text-xs text-text-secondary px-4 py-3 uppercase tracking-wider">Meeting</th>
                <th className="text-left text-xs text-text-secondary px-4 py-3 uppercase tracking-wider">Date</th>
                <th className="text-left text-xs text-text-secondary px-4 py-3 uppercase tracking-wider">HR Elev.</th>
                <th className="text-left text-xs text-text-secondary px-4 py-3 uppercase tracking-wider">Stress</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/meetings/${m.id}`} className="text-text-primary text-sm hover:text-accent">{m.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-sm tabular-nums">
                    {m.startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-stress">
                    {m.biometrics?.hrElevation != null ? `+${m.biometrics.hrElevation.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-text-primary">
                    {m.biometrics?.avgStress?.toFixed(0) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
