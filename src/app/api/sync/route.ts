import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pullCalendarEvents } from '@/lib/calendar'
import { pullGeminiNotes } from '@/lib/gmail'
import { runEnrichment } from '@/lib/enrichment'
import { pullGarminData } from '@/lib/garmin'

export const maxDuration = 60

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

async function getAccessToken(userId: string, sessionToken?: string): Promise<string | null> {
  let token = sessionToken ?? null

  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } })
  if (!account) return token

  const expiresAt = account.expires_at ?? 0
  const needsRefresh = !token || Date.now() / 1000 > expiresAt - 60

  if (needsRefresh && account.refresh_token) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
        }),
      })
      const refreshed = await res.json()
      if (refreshed.access_token) {
        token = refreshed.access_token
        await prisma.account.update({
          where: { provider_providerAccountId: { provider: 'google', providerAccountId: account.providerAccountId } },
          data: {
            access_token: refreshed.access_token,
            expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
          },
        })
      }
    } catch { /* keep existing */ }
  } else if (!token && account.access_token) {
    token = account.access_token
  }

  return token
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scope } = (await req.json()) as { scope?: 'full' | 'incremental' }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const accessToken = await getAccessToken(user.id, session.access_token)
  if (!accessToken) return NextResponse.json({ error: 'No access token — sign out and back in' }, { status: 400 })

  const results = { calendar: 0, gmail: 0, enriched: 0, garmin: 0 }

  // Calendar + Garmin run in parallel — they're independent, saves ~15-30s
  const [calResult, garminResult] = await Promise.allSettled([
    withTimeout(pullCalendarEvents(user.id, accessToken, scope ?? 'incremental'), 25000),
    withTimeout(pullGarminData(user.id, scope ?? 'incremental'), 30000),
  ])
  results.calendar = calResult.status === 'fulfilled' ? calResult.value : 0
  results.garmin = garminResult.status === 'fulfilled' ? garminResult.value : 0

  // Gmail + enrich run after (enrich needs calendar meetings to exist)
  results.gmail = await withTimeout(pullGeminiNotes(user.id, accessToken), 10000).catch(() => 0)
  results.enriched = await withTimeout(runEnrichment(user.id), 15000).catch(() => 0)

  return NextResponse.json({ ok: true, ...results })
}
