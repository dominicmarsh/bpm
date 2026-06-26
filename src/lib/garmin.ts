import crypto from 'crypto'
import { prisma } from './prisma'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const hex = process.env.GARMIN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('GARMIN_ENCRYPTION_KEY must be a 32-byte hex string')
  return Buffer.from(hex, 'hex')
}

function encrypt(text: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    encrypted: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: iv.toString('hex'),
  }
}

function decrypt(encryptedB64: string, ivHex: string): string {
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const buf = Buffer.from(encryptedB64, 'base64')
  const tag = buf.subarray(buf.length - 16)
  const encrypted = buf.subarray(0, buf.length - 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export async function saveGarminCredentials(userId: string, username: string, password: string, syncDays = 90) {
  const { encrypted: encryptedUsername, iv: ivU } = encrypt(username)
  const { encrypted: encryptedPassword } = encrypt(password)
  await prisma.garminCredential.upsert({
    where: { userId },
    create: { userId, encryptedUsername, encryptedPassword, iv: ivU, syncDays },
    update: { encryptedUsername, encryptedPassword, iv: ivU, syncDays },
  })
}

export async function getGarminCredentials(userId: string): Promise<{ username: string; password: string } | null> {
  const cred = await prisma.garminCredential.findUnique({ where: { userId } })
  if (!cred) return null
  return {
    username: decrypt(cred.encryptedUsername, cred.iv),
    password: decrypt(cred.encryptedPassword, cred.iv),
  }
}

export interface GarminReading {
  timestamp: Date
  heartRate?: number
  stressScore?: number
  bodyBattery?: number
  hrv?: number
}

const GC_API = 'https://connectapi.garmin.com'

// Syncs one day and saves immediately so partial data survives a timeout
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncDay(client: any, userId: string, date: Date): Promise<number> {
  const dateStr = date.toISOString().split('T')[0]
  const readings: GarminReading[] = []

  try {
    const hrData = await client.getHeartRate(date)
    if (hrData?.heartRateValues) {
      for (const [ts, hr] of hrData.heartRateValues) {
        if (hr != null) readings.push({ timestamp: new Date(ts), heartRate: hr })
      }
    }
  } catch { /* skip */ }

  try {
    // getStressData not in garmin-connect types — use raw client.get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stressData = await client.get(`${GC_API}/wellness-service/wellness/dailyStress/${dateStr}`) as any
    if (stressData?.stressValuesArray) {
      for (const [ts, stress] of stressData.stressValuesArray) {
        if (stress != null && stress >= 0) readings.push({ timestamp: new Date(ts), stressScore: stress })
      }
    }
  } catch { /* skip */ }

  try {
    // getBodyBattery not in garmin-connect types — use raw client.get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bbData = await client.get(`${GC_API}/wellness-service/wellness/bodyBattery/events`, { params: { startDate: dateStr, endDate: dateStr } }) as any
    if (bbData?.[0]?.bodyBatteryValuesArray) {
      for (const [ts, bb] of bbData[0].bodyBatteryValuesArray) {
        if (bb != null) readings.push({ timestamp: new Date(ts), bodyBattery: bb })
      }
    }
  } catch { /* skip */ }

  if (readings.length === 0) return 0

  // Save immediately — don't accumulate
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
  await prisma.biometricReading.deleteMany({ where: { userId, timestamp: { gte: dayStart, lte: dayEnd } } })
  await prisma.biometricReading.createMany({
    data: readings.map((r) => ({
      userId,
      timestamp: r.timestamp,
      heartRate: r.heartRate ?? null,
      stressScore: r.stressScore ?? null,
      bodyBattery: r.bodyBattery ?? null,
      hrv: r.hrv ?? null,
    })),
  })
  return readings.length
}

export async function pullGarminData(userId: string, scope: 'full' | 'incremental'): Promise<number> {
  const creds = await getGarminCredentials(userId)
  if (!creds) throw new Error('No Garmin credentials found')

  const storedDays = await prisma.garminCredential
    .findUnique({ where: { userId }, select: { syncDays: true } })
    .then(r => r?.syncDays ?? 90)
  const days = scope === 'full' ? storedDays : 2

  const { GarminConnect } = await import('garmin-connect')
  const client = new GarminConnect({ username: creds.username, password: creds.password })
  try {
    await client.login(creds.username, creds.password)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Garmin login failed: ${msg} — visit connect.garmin.com to clear any MFA prompt, then retry`)
  }

  const now = new Date()
  let total = 0
  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    total += await syncDay(client, userId, date)
  }

  if (total > 0) {
    await prisma.garminCredential.update({ where: { userId }, data: { lastSyncAt: new Date() } })
  }
  return total
}
