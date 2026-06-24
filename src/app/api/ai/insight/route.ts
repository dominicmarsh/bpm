import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { metricType, value, meetingTitle, attendees, timeOfDay, sentiment, surrounding, stressIndicators } = body

  const context = [
    `Metric: ${metricType} = ${value}`,
    `Meeting: ${meetingTitle}`,
    `Time: ${timeOfDay}`,
    sentiment ? `Sentiment: ${sentiment}` : '',
    attendees?.length ? `Attendees: ${(attendees as string[]).slice(0, 5).join(', ')}` : '',
    surrounding?.length ? `Surrounding readings: ${(surrounding as number[]).join(', ')}` : '',
    stressIndicators?.length
      ? `Transcript stress signals: ${(stressIndicators as string[]).slice(0, 2).join(' | ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `${context}\n\nGive a sharp, dry 1-2 sentence insight about this data point. Be specific, not generic. No filler.`,
      },
    ],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}
