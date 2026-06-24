import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Fallback ingest endpoint for the Python garminconnect script
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { userId, readings } = body as {
    userId: string
    readings: Array<{
      timestamp: string
      heartRate?: number
      stressScore?: number
      bodyBattery?: number
      hrv?: number
    }>
  }

  if (!userId || !Array.isArray(readings)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  await prisma.biometricReading.createMany({
    data: readings.map((r) => ({
      userId,
      timestamp: new Date(r.timestamp),
      heartRate: r.heartRate ?? null,
      stressScore: r.stressScore ?? null,
      bodyBattery: r.bodyBattery ?? null,
      hrv: r.hrv ?? null,
      source: 'garmin-python',
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ inserted: readings.length })
}
