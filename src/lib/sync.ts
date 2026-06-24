import { prisma } from './prisma'
import { pullGarminData } from './garmin'
import { pullCalendarEvents } from './calendar'
import { pullGeminiNotes } from './gmail'
import { runEnrichment } from './enrichment'

export type SyncStatus = 'pending' | 'running' | 'done' | 'error'

export interface SyncJob {
  syncId: string
  userId: string
  status: SyncStatus
  step: string
  progress: number
  error?: string
  startedAt: Date
}

// In-memory store — enough for single-user personal app
const jobs = new Map<string, SyncJob>()

function newJob(userId: string): SyncJob {
  const syncId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const job: SyncJob = { syncId, userId, status: 'pending', step: 'queued', progress: 0, startedAt: new Date() }
  jobs.set(syncId, job)
  return job
}

export function getJob(syncId: string): SyncJob | null {
  return jobs.get(syncId) ?? null
}

export async function runSync(
  userId: string,
  scope: 'full' | 'incremental',
  accessToken: string
): Promise<SyncJob> {
  const job = newJob(userId)

  // Fire-and-forget — caller gets the job reference immediately
  ;(async () => {
    try {
      job.status = 'running'

      job.step = 'garmin'
      job.progress = 10
      await pullGarminData(userId, scope).catch(() => {
        // Garmin failure is non-blocking — continue with calendar/gmail
      })

      job.step = 'calendar'
      job.progress = 35
      await pullCalendarEvents(userId, accessToken, scope)

      job.step = 'gmail'
      job.progress = 55
      await pullGeminiNotes(userId, accessToken)

      job.step = 'enrichment'
      job.progress = 75
      await runEnrichment(userId)

      job.step = 'done'
      job.progress = 100
      job.status = 'done'
    } catch (err) {
      job.status = 'error'
      job.error = err instanceof Error ? err.message : String(err)
    }
  })()

  return job
}

export async function runSyncForAllUsers(scope: 'full' | 'incremental') {
  const users = await prisma.user.findMany({
    where: { garminCred: { isNot: null } },
    include: { accounts: { where: { provider: 'google' } } },
  })

  for (const user of users) {
    const accessToken = user.accounts[0]?.access_token
    if (!accessToken) continue
    await runSync(user.id, scope, accessToken)
  }
}
