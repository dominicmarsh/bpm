import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pullCalendarEvents } from '@/lib/calendar'
import { pullGeminiNotes } from '@/lib/gmail'
import { runEnrichment } from '@/lib/enrichment'
import { pullGarminData } from '@/lib/garmin'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scope } = (await req.json()) as { scope?: 'full' | 'incremental' }
  if (!session.access_token) return NextResponse.json({ error: 'No access token' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Run synchronously — Vercel freezes the lambda after response is sent,
  // so fire-and-forget kills the work. Await everything here within the 60s window.
  const results = { calendar: 0, gmail: 0, enriched: 0, garmin: 0 }

  results.calendar = await pullCalendarEvents(user.id, session.access_token, scope ?? 'incremental').catch(() => 0)
  results.gmail = await pullGeminiNotes(user.id, session.access_token).catch(() => 0)
  results.enriched = await runEnrichment(user.id).catch(() => 0)
  // Garmin last — may be slow; incremental=2 days, full saves day-by-day so partial data persists
  results.garmin = await pullGarminData(user.id, scope ?? 'incremental').catch(() => 0)

  return NextResponse.json({ ok: true, ...results })
}
