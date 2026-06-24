import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runSync } from '@/lib/sync'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scope } = (await req.json()) as { scope?: 'full' | 'incremental' }
  if (!session.access_token) return NextResponse.json({ error: 'No access token' }, { status: 400 })

  const { prisma } = await import('@/lib/prisma')
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const job = await runSync(user.id, scope ?? 'incremental', session.access_token)
  return NextResponse.json({ syncId: job.syncId, estimatedMinutes: scope === 'full' ? 3 : 1 })
}
