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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryGarminConnect(username: string, password: string, days: number): Promise<GarminReading[]> {
  // Dynamic import — garmin-connect may not exist in all envs
  const { GarminConnect } = await import('garmin-connect')
  const client = new GarminConnect({ username, password })
  await client.login(username, password)

  const readings: GarminReading[] = []
  const now = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    try {
      // Heart rate (1-min intervals)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hrData = await (client as any).getHeartRate(date)
      if (hrData?.heartRateValues) {
        for (const [ts, hr] of hrData.heartRateValues) {
          if (hr != null) {
            readings.push({ timestamp: new Date(ts), heartRate: hr })
          }
        }
      }

      // Stress
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stressData = await (client as any).getStressData(dateStr)
      if (stressData?.stressValuesArray) {
        for (const [ts, stress] of stressData.stressValuesArray) {
          if (stress != null && stress >= 0) {
            readings.push({ timestamp: new Date(ts), stressScore: stress })
          }
        }
      }

      // Body Battery
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bbData = await (client as any).getBodyBattery(dateStr)
      if (bbData?.[0]?.bodyBatteryValuesArray) {
        for (const [ts, bb] of bbData[0].bodyBatteryValuesArray) {
          if (bb != null) {
            readings.push({ timestamp: new Date(ts), bodyBattery: bb })
          }
        }
      }
    } catch {
      // Skip individual day errors — partial data is fine
    }
  }

  return readings
}

export async function pullGarminData(userId: string, scope: 'full' | 'incremental'): Promise<number> {
  const creds = await getGarminCredentials(userId)
  if (!creds) throw new Error('No Garmin credentials found')

  const storedDays = creds ? await prisma.garminCredential.findUnique({ where: { userId }, select: { syncDays: true } }).then(r => r?.syncDays ?? 90) : 90
  const days = scope === 'full' ? storedDays : 2

  let readings: GarminReading[] = []
  try {
    readings = await tryGarminConnect(creds.username, creds.password, days)
  } catch (err) {
    throw new Error(
      `Garmin sync failed: ${err instanceof Error ? err.message : String(err)}. ` +
        'See GARMIN_SETUP.md for the Python fallback option.'
    )
  }

  if (readings.length === 0) return 0

  // Batch upsert — Prisma doesn't support upsert on composite keys without unique,
  // so we delete+insert per userId+timestamp window
  const minTs = readings.reduce((a, b) => (a.timestamp < b.timestamp ? a : b)).timestamp
  const maxTs = readings.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp

  await prisma.biometricReading.deleteMany({
    where: { userId, timestamp: { gte: minTs, lte: maxTs } },
  })

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

  await prisma.garminCredential.update({
    where: { userId },
    data: { lastSyncAt: new Date() },
  })

  return readings.length
}
