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
  const now = new Date()
  const meetings = await prisma.meetingSession.findMany({
    where: { userId, startTime: { ...(since ? { gte: since } : {}), lte: now } },
    include: { biometrics: true },
    orderBy: { startTime: 'desc' },
  })

  // Group by normalised title (lowercase, strip trailing dates/numbers like "- 2026-06-25")
  const normalise = (t: string) =>
    t.toLowerCase()
      .replace(/\s*[-–]\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, '')
      .replace(/\s*#\d+$/, '')
      .trim()

  const groups = new Map<string, typeof meetings>()
  for (const m of meetings) {
    const key = normalise(m.title)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  return Array.from(groups.values())
    .map((group) => {
      const bios = group.map((m) => m.biometrics).filter((b): b is NonNullable<typeof b> => b != null)
      const elevations = bios.map((b) => b.hrElevation ?? 0)
      const stresses = bios.map((b) => b.avgStress ?? 0)
      const bbDeltas = bios.map((b) => b.bodyBatteryDelta ?? 0)
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

      return {
        id: group[0].id,
        name: group[0].title, // representative title (most recent)
        avgHrElevation: avg(elevations),
        avgStress: avg(stresses),
        avgBbDelta: avg(bbDeltas),
        meetingCount: group.length,
        sparkline: elevations.slice(0, 10),
      }
    })
    .sort((a, b) => (b.avgHrElevation ?? -999) - (a.avgHrElevation ?? -999))
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
          },
        },
      },
    },
  })

  return people
    .flatMap((person): LeaderboardRow[] => {
      const bios = person.meetings
        .filter((mp) => !since || mp.meeting.startTime >= since)
        .map((mp) => mp.meeting.biometrics)
        .filter((b): b is NonNullable<typeof b> => b != null)

      if (bios.length === 0) return []

      const elevations = bios.map((b) => b.hrElevation ?? 0)
      const stresses = bios.map((b) => b.avgStress ?? 0)
      const bbDeltas = bios.map((b) => b.bodyBatteryDelta ?? 0)

      return [{
        id: person.id,
        name: person.name ?? person.email,
        avgHrElevation: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        avgStress: stresses.reduce((a, b) => a + b, 0) / stresses.length,
        avgBbDelta: bbDeltas.reduce((a, b) => a + b, 0) / bbDeltas.length,
        meetingCount: bios.length,
        sparkline: elevations.slice(0, 10),
      }]
    })
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
          },
        },
      },
    },
  })

  return topics
    .flatMap((topic): LeaderboardRow[] => {
      const bios = topic.meetings
        .filter((mt) => !since || mt.meeting.startTime >= since)
        .map((mt) => mt.meeting.biometrics)
        .filter((b): b is NonNullable<typeof b> => b != null)

      if (bios.length === 0) return []

      const elevations = bios.map((b) => b.hrElevation ?? 0)
      const stresses = bios.map((b) => b.avgStress ?? 0)
      const bbDeltas = bios.map((b) => b.bodyBatteryDelta ?? 0)

      return [{
        id: topic.id,
        name: topic.name,
        avgHrElevation: elevations.reduce((a, b) => a + b, 0) / elevations.length,
        avgStress: stresses.reduce((a, b) => a + b, 0) / stresses.length,
        avgBbDelta: bbDeltas.reduce((a, b) => a + b, 0) / bbDeltas.length,
        meetingCount: bios.length,
        sparkline: elevations.slice(0, 10),
      }]
    })
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
