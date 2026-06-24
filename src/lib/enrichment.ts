import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic()

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function inferMeetingType(title: string, attendeeCount: number): string {
  const t = title.toLowerCase()
  if (attendeeCount === 2) return '1:1'
  if (t.includes('all hands') || t.includes('all-hands') || attendeeCount > 20) return 'all-hands'
  if (t.includes('external') || t.includes('interview') || t.includes('vendor') || t.includes('client')) return 'external'
  if (attendeeCount <= 6) return 'team'
  return 'cross-functional'
}

async function computeBiometrics(userId: string, meetingId: string, startTime: Date, endTime: Date) {
  const readings = await prisma.biometricReading.findMany({
    where: { userId, timestamp: { gte: startTime, lte: endTime } },
    orderBy: { timestamp: 'asc' },
  })

  if (readings.length === 0) return null

  const hrs = readings.filter((r) => r.heartRate != null).map((r) => r.heartRate!)
  const stresses = readings.filter((r) => r.stressScore != null).map((r) => r.stressScore!)
  const bbs = readings.filter((r) => r.bodyBattery != null).map((r) => r.bodyBattery!)
  const hrvs = readings.filter((r) => r.hrv != null).map((r) => r.hrv!)

  // Baseline: 30 min before meeting
  const baselineStart = new Date(startTime.getTime() - 30 * 60 * 1000)
  const baselineReadings = await prisma.biometricReading.findMany({
    where: { userId, timestamp: { gte: baselineStart, lt: startTime }, heartRate: { not: null } },
  })

  let baselineHR: number
  if (baselineReadings.length >= 3) {
    baselineHR = median(baselineReadings.map((r) => r.heartRate!))
  } else {
    // Fallback: median HR for same hour-of-day across all data
    const hour = startTime.getHours()
    const hourReadings = await prisma.biometricReading.findMany({
      where: { userId, heartRate: { not: null } },
    })
    const sameHour = hourReadings.filter((r) => r.timestamp.getHours() === hour).map((r) => r.heartRate!)
    baselineHR = sameHour.length > 0 ? median(sameHour) : (hrs.length > 0 ? median(hrs) : 0)
  }

  const avgHR = hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null
  const bbFirst = bbs[0] ?? null
  const bbLast = bbs[bbs.length - 1] ?? null
  const hrvFirst = hrvs[0] ?? null
  const hrvLast = hrvs[hrvs.length - 1] ?? null

  return {
    meetingSessionId: meetingId,
    avgHR,
    peakHR: hrs.length > 0 ? Math.max(...hrs) : null,
    baselineHR,
    hrElevation: avgHR != null ? avgHR - baselineHR : null,
    avgStress: stresses.length > 0 ? stresses.reduce((a, b) => a + b, 0) / stresses.length : null,
    peakStress: stresses.length > 0 ? Math.max(...stresses) : null,
    avgBodyBattery: bbs.length > 0 ? bbs.reduce((a, b) => a + b, 0) / bbs.length : null,
    bodyBatteryDelta: bbFirst != null && bbLast != null ? bbLast - bbFirst : null,
    avgHrv: hrvs.length > 0 ? hrvs.reduce((a, b) => a + b, 0) / hrvs.length : null,
    hrvDelta: hrvFirst != null && hrvLast != null ? hrvLast - hrvFirst : null,
  }
}

interface AiEnrichment {
  topics: string[]
  sentiment: string
  meetingType: string
  stressIndicators: string[]
}

async function runAiEnrichment(title: string, attendees: string[], transcript: string): Promise<AiEnrichment> {
  const truncated = transcript.slice(0, 3000)
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are analysing a meeting transcript. Extract and return JSON only.
Meeting title: ${title}
Attendees: ${attendees.join(', ')}
Transcript: ${truncated}

Return JSON:
{
  "topics": string[],
  "sentiment": "positive" | "neutral" | "tense" | "conflicted",
  "meetingType": "1:1" | "team" | "cross-functional" | "all-hands" | "external" | "other",
  "stressIndicators": string[]
}`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return JSON.parse(jsonMatch[0]) as AiEnrichment
}

export async function runEnrichment(userId: string): Promise<number> {
  const unenriched = await prisma.meetingSession.findMany({
    where: { userId, enrichedAt: null },
    include: { biometrics: true },
  })

  let count = 0

  for (const meeting of unenriched) {
    try {
      // Step 1: biometrics
      const bio = await computeBiometrics(userId, meeting.id, meeting.startTime, meeting.endTime)
      if (bio) {
        await prisma.meetingBiometrics.upsert({
          where: { meetingSessionId: meeting.id },
          create: bio,
          update: bio,
        })
      }

      // Step 2: AI enrichment
      let aiResult: AiEnrichment | null = null
      if (meeting.transcriptRaw) {
        try {
          aiResult = await runAiEnrichment(meeting.title, meeting.attendeeEmails, meeting.transcriptRaw)
        } catch {
          // AI failure is non-fatal
        }
      }

      const meetingType =
        aiResult?.meetingType ?? inferMeetingType(meeting.title, meeting.attendeeEmails.length)

      await prisma.meetingSession.update({
        where: { id: meeting.id },
        data: {
          topics: aiResult?.topics ?? [],
          sentiment: aiResult?.sentiment ?? null,
          meetingType,
          stressIndicators: aiResult?.stressIndicators ?? [],
          enrichedAt: new Date(),
        },
      })

      // Step 3: people resolution
      for (const email of meeting.attendeeEmails) {
        const person = await prisma.person.upsert({
          where: { userId_email: { userId, email } },
          create: { userId, email, team: inferTeam(email) },
          update: {},
        })
        await prisma.meetingPerson.upsert({
          where: { meetingId_personId: { meetingId: meeting.id, personId: person.id } },
          create: { meetingId: meeting.id, personId: person.id },
          update: {},
        })
      }

      // Step 4: topic upsert
      for (const topicName of aiResult?.topics ?? []) {
        const normalised = topicName.toLowerCase().trim()
        const topic = await prisma.topic.upsert({
          where: { userId_name: { userId, name: normalised } },
          create: { userId, name: normalised },
          update: {},
        })
        await prisma.meetingTopic.upsert({
          where: { meetingId_topicId: { meetingId: meeting.id, topicId: topic.id } },
          create: { meetingId: meeting.id, topicId: topic.id },
          update: {},
        })
      }

      count++
    } catch {
      // Log but continue — one bad meeting shouldn't block the rest
    }
  }

  return count
}

function inferTeam(email: string): string | null {
  const [, domain] = email.split('@')
  if (!domain) return null
  const parts = domain.split('.')
  // subdomain like eng.company.com → "eng"
  if (parts.length > 2) return parts[0]
  return null
}
