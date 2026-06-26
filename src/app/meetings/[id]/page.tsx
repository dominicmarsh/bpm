import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/components/ui/Nav'
import { StatCard } from '@/components/ui/StatCard'
import { SentimentBadge } from '@/components/ui/SentimentBadge'
import { MeetingTypePill } from '@/components/ui/MeetingTypePill'
import { AvatarStack } from '@/components/ui/AvatarStack'
import { MeetingHRChartWrapper } from './MeetingHRChartWrapper'
import { MeetingSecondaryCharts } from './MeetingSecondaryCharts'
import Link from 'next/link'

function fmt(v: number | null, d = 1) {
  return v == null ? '—' : v.toFixed(d)
}

function duration(start: Date, end: Date) {
  const m = Math.round((end.getTime() - start.getTime()) / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

export default async function MeetingPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect('/login')

  const meeting = await prisma.meetingSession.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      biometrics: true,
      people: { include: { person: true } },
      topicLinks: { include: { topic: true } },
    },
  })

  if (!meeting) notFound()

  // Raw biometric readings during the meeting
  const readings = await prisma.biometricReading.findMany({
    where: { userId: user.id, timestamp: { gte: meeting.startTime, lte: meeting.endTime } },
    orderBy: { timestamp: 'asc' },
  })

  const chartData = readings.map((r) => ({
    elapsed: Math.round((r.timestamp.getTime() - meeting.startTime.getTime()) / 60000),
    hr: r.heartRate ?? null,
    stress: r.stressScore ?? null,
  }))

  // "Others like this" — same topics or attendees
  const others = await prisma.meetingSession.findMany({
    where: {
      userId: user.id,
      id: { not: meeting.id },
      OR: [
        { attendeeEmails: { hasSome: meeting.attendeeEmails } },
        { topics: { hasSome: meeting.topics } },
      ],
    },
    include: { biometrics: true },
    take: 3,
    orderBy: { startTime: 'desc' },
  })

  const bio = meeting.biometrics

  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-text-primary">{meeting.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-text-secondary text-sm">
                  {meeting.startTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-text-secondary text-sm">·</span>
                <span className="text-text-secondary text-sm">{duration(meeting.startTime, meeting.endTime)}</span>
                <SentimentBadge sentiment={meeting.sentiment} />
                <MeetingTypePill type={meeting.meetingType} />
              </div>
            </div>
            <AvatarStack emails={meeting.attendeeEmails} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="HR Elevation"
            value={bio?.hrElevation != null ? `+${fmt(bio.hrElevation)}` : null}
            unit="bpm"
            highlight={bio?.hrElevation != null && bio.hrElevation > 10 ? 'stress' : 'neutral'}
          />
          <StatCard
            label="Peak Stress"
            value={bio?.peakStress ?? null}
            highlight={bio?.peakStress != null && bio.peakStress > 60 ? 'stress' : 'neutral'}
          />
          <StatCard label="Duration" value={duration(meeting.startTime, meeting.endTime)} />
        </div>

        {/* Main HR chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Heart Rate</h2>
          <MeetingHRChartWrapper
            chartData={chartData}
            baselineHR={bio?.baselineHR ?? null}
            meetingTitle={meeting.title}
            attendeeEmails={meeting.attendeeEmails}
            startTime={meeting.startTime.toISOString()}
            sentiment={meeting.sentiment}
            stressIndicators={meeting.stressIndicators}
          />
        </div>

        {/* Secondary charts */}
        <MeetingSecondaryCharts data={chartData} />

        {/* Meeting Intelligence */}
        {meeting.transcriptRaw && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Meeting Intelligence</h2>
            {meeting.topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {meeting.topics.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium capitalize">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {meeting.stressIndicators.length > 0 && (
              <div className="space-y-2">
                {meeting.stressIndicators.slice(0, 3).map((s, i) => (
                  <blockquote key={i} className="border-l-2 border-stress pl-3 text-sm text-text-secondary italic">
                    {s}
                  </blockquote>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Sentiment:</span>
              <SentimentBadge sentiment={meeting.sentiment} />
            </div>
          </div>
        )}

        {/* Others like this */}
        {others.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Others like this</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {others.map((m) => (
                <Link key={m.id} href={`/meetings/${m.id}`}>
                  <div className="bg-card border border-border rounded-lg p-4 hover:border-accent/50 transition-colors cursor-pointer">
                    <p className="text-text-primary text-sm font-medium truncate">{m.title}</p>
                    <p className="text-text-secondary text-xs mt-1">
                      {m.startTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {m.biometrics?.hrElevation != null && (
                        <span className="ml-2 text-stress">+{m.biometrics.hrElevation.toFixed(1)} bpm</span>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
