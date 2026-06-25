import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { accounts: { where: { provider: 'google' } }, garminCred: true },
  })

  const account = user?.accounts[0]
  return NextResponse.json({
    email: session.user.email,
    sessionHasToken: !!session.access_token,
    accountExists: !!account,
    accountHasAccessToken: !!account?.access_token,
    accountHasRefreshToken: !!account?.refresh_token,
    tokenExpiresAt: account?.expires_at ?? null,
    tokenExpired: account?.expires_at ? Date.now() / 1000 > account.expires_at : null,
    garminCredExists: !!user?.garminCred,
    garminSyncDays: user?.garminCred?.syncDays ?? null,
  })
}
