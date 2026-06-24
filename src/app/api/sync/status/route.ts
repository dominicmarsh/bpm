import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getJob } from '@/lib/sync'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const syncId = req.nextUrl.searchParams.get('syncId')
  if (!syncId) return NextResponse.json({ error: 'Missing syncId' }, { status: 400 })

  const job = getJob(syncId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  return NextResponse.json({
    syncId: job.syncId,
    status: job.status,
    step: job.step,
    progress: job.progress,
    error: job.error,
  })
}
