import { NextRequest, NextResponse } from 'next/server'
import { runSyncForAllUsers } from '@/lib/sync'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await runSyncForAllUsers('incremental')
  return NextResponse.json({ ok: true })
}
