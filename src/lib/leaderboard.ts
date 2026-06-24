import { prisma } from './prisma'

export type DateRange = '30d' | '90d' | 'all'

function sinceDate(range: DateRange): Date | undefined {
  if (range === 'all') return undefined
  const d = new Date()
  d.setDate(d.getDate() - (range === '30d' ? 30 : 90))
  return d
}

export interface LeaderboardRow {
  id: string
  name: string
  avgHrElevation: number | null
  avgStress: number | null
  avgBbDelta: number | null
  meetingCount: number
  // last N hr elevations for sparkline
  sparkline: number[]
}

export async function getMeetingsLeaderboard(userId: string, range: DateRange): Promise<LeaderboardRow[]> {
  const since = sinceDate(range)
  const meetings = await prisma.meetingSession.findMany({
    where: { userId, ...(since ? { startTime: { gte: since } } : {}) },
    include: { biometrics: true },
    orderBy: { startTime: 'desc' },
  })

  return meetings
    .filter((m) => m.biometrics)
    .map((m) => ({
      id: m.id,
      name: m.title,
      avgHrElevation: m.biometrics!.hrElevation,
      avgStress: m.biometrics!.avgStress,
      avgBbDelta: m.biometrics!.bodyBatteryDelta,
      meetingCount: 1,
      sparkline: [m.biometrics!.hrElevation ?? 0],
    }))
    .sort((a, b) => (b.avgHrElevation ?? 0) - (a.avgHrElevation ?? 0))
}

export async function getPeopleLeaderboard(userId: string, range: DateRange): Promise<LeaderboardRow[]> {
  const since = sinceDate(range)
  const people = await prisma.person.findMany({
    where: { userId },
    include: {
      meetings: {
        include: {
          meeting: {
            include: { biometrics: true },
            where: since ? { startTime: { gte: since } } : {},
          },
        },
      },
    },
  })

  return people
    .map((person) => {
      const bios = person.meetings
        .map((mp) => mp.meeting.biometrics)
        .filter((b): b is NonNullable<typeof b> => b != null)

      if (bios.length === 0) return null

      const elevations = bios.map((b) => b.hrElevation ?? 0)
      const stresses = bios.map((b) => b.avgStress ?? 0)
      const bbDeltas = bios.map((b) => b.bodyBatteryDelta ?? 0)

      return {
        id: person.id,
        name: person.name ?? person.email,
        avgHrElevation: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        avgStress: stresses.reduce((a, b) => a + b, 0) / stresses.length,
        avgBbDelta: bbDeltas.reduce((a, b) => a + b, 0) / bbDeltas.length,
        meetingCount: bios.length,
        sparkline: elevations.slice(0, 10),
      }
    })
    .filter((r): r is LeaderboardRow => r != null)
    .sort((a, b) => (b.avgHrElevation ?? 0) - (a.avgHrElevation ?? 0))
}

export async function getTopicsLeaderboard(userId: string, range: DateRange): Promise<LeaderboardRow[]> {
  const since = sinceDate(range)
  const topics = await prisma.topic.findMany({
    where: { userId },
    include: {
      meetings: {
        include: {
          meeting: {
            include: { biometrics: true },
            where: since ? { startTime: { gte: since } } : {},
          },
        },
      },
    },
  })

  return topics
    .map((topic) => {
      const bios = topic.meetings
        .map((mt) => mt.meeting.biometrics)
        .filter((b): b is NonNullable<typeof b> => b != null)

      if (bios.length === 0) return null

      const elevations = bios.map((b) => b.hrElevation ?? 0)
      const stresses = bios.map((b) => b.avgStress ?? 0)
      const bbDeltas = bios.map((b) => b.bodyBatteryDelta ?? 0)

      return {
        id: topic.id,
        name: topic.name,
        avgHrElevation: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        avgStress: stresses.reduce((a, b) => a + b, 0) / stresses.length,
        avgBbDelta: bbDeltas.reduce((a, b) => a + b, 0) / bbDeltas.length,
        meetingCount: bios.length,
        sparkline: elevations.slice(0, 10),
      }
    })
    .filter((r): r is LeaderboardRow => r != null)
    .sort((a, b) => (b.avgHrElevation ?? 0) - (a.avgHrElevation ?? 0))
}

export async function getTeamsLeaderboard(userId: string, range: DateRange): Promise<LeaderboardRow[]> {
  const people = await getPeopleLeaderboard(userId, range)

  const allPeople = await prisma.person.findMany({ where: { userId } })
  const teamMap = new Map<string, string>()
  for (const p of allPeople) {
    if (p.team) teamMap.set(p.id, p.team)
  }

  const byTeam = new Map<string, LeaderboardRow[]>()
  for (const row of people) {
    const team = teamMap.get(row.id) ?? 'Unknown'
    if (!byTeam.has(team)) byTeam.set(team, [])
    byTeam.get(team)!.push(row)
  }

  return Array.from(byTeam.entries())
    .map(([team, rows]) => {
      const avgHrElevation = rows.reduce((a, b) => a + (b.avgHrElevation ?? 0), 0) / rows.length
      return {
        id: team,
        name: team,
        avgHrElevation,
        avgStress: rows.reduce((a, b) => a + (b.avgStress ?? 0), 0) / rows.length,
        avgBbDelta: rows.reduce((a, b) => a + (b.avgBbDelta ?? 0), 0) / rows.length,
        meetingCount: rows.reduce((a, b) => a + b.meetingCount, 0),
        sparkline: rows.flatMap((r) => r.sparkline).slice(0, 10),
      }
    })
    .sort((a, b) => (b.avgHrElevation ?? 0) - (a.avgHrElevation ?? 0))
}
