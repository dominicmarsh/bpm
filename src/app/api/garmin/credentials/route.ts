import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveGarminCredentials } from '@/lib/garmin'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username, password, syncDays } = await req.json()
  if (!username || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await saveGarminCredentials(user.id, username, password, syncDays ?? 90)
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { garminCred: true },
  })

  return NextResponse.json({
    hasCredentials: !!user?.garminCred,
    lastSyncAt: user?.garminCred?.lastSyncAt ?? null,
  })
}
