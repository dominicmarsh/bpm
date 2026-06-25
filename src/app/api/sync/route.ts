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

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: { where: { provider: 'google' } } },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Prefer JWT access_token; fall back to the stored Account row (covers sessions
  // issued before the access_token was added to the JWT callback)
  let accessToken = session.access_token ?? user.accounts[0]?.access_token ?? null

  // If the stored token looks expired, try to refresh it now
  const account = user.accounts[0]
  if (account?.refresh_token) {
    const expiresAt = account.expires_at ?? 0
    if (!accessToken || Date.now() / 1000 > expiresAt - 60) {
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
          accessToken = refreshed.access_token
          // Persist refreshed token back to Account
          await prisma.account.update({
            where: { provider_providerAccountId: { provider: 'google', providerAccountId: account.providerAccountId } },
            data: {
              access_token: refreshed.access_token,
              expires_at: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600),
            },
          })
        }
      } catch { /* keep existing token */ }
    }
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token — please sign out and sign back in' }, { status: 400 })
  }

  // Run synchronously so Vercel keeps the lambda alive
  const results = { calendar: 0, gmail: 0, enriched: 0, garmin: 0, error: null as string | null }

  try { results.calendar = await pullCalendarEvents(user.id, accessToken, scope ?? 'incremental') } catch (e) { results.error = String(e) }
  try { results.gmail = await pullGeminiNotes(user.id, accessToken) } catch { /* non-fatal */ }
  try { results.enriched = await runEnrichment(user.id) } catch { /* non-fatal */ }
  try { results.garmin = await pullGarminData(user.id, scope ?? 'incremental') } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, ...results })
}
