import { google } from 'googleapis'
import { prisma } from './prisma'

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function extractBody(payload: NonNullable<ReturnType<typeof google.gmail>>['users']['messages'] extends { get: infer G } ? Awaited<ReturnType<G extends (...args: unknown[]) => infer R ? R : never>>['data']['payload'] : never): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = payload as any
  if (!p) return ''

  const parts: string[] = []

  function walk(node: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }) {
    if (node.mimeType === 'text/plain' && node.body?.data) {
      parts.push(Buffer.from(node.body.data, 'base64url').toString('utf-8'))
    } else if (node.mimeType === 'text/html' && node.body?.data) {
      parts.push(stripHtml(Buffer.from(node.body.data, 'base64url').toString('utf-8')))
    }
    if (node.parts) {
      for (const part of node.parts as typeof node[]) {
        walk(part)
      }
    }
  }

  walk(p)
  return parts.join('\n').trim()
}

export async function pullGeminiNotes(userId: string, accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: 'v1', auth })

  // Always look back 7 days — transcripts expire
  const after = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  const query = `(subject:"Gemini notes for" OR from:meet-recordings-noreply@google.com) after:${after}`

  let pageToken: string | undefined
  let matched = 0

  do {
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
    })

    for (const msg of list.data.messages ?? []) {
      if (!msg.id) continue

      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' })
      const headers = full.data.payload?.headers ?? []
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? ''
      const dateHeader = headers.find((h) => h.name === 'Date')?.value
      const emailDate = dateHeader ? new Date(dateHeader) : new Date()

      const body = extractBody(full.data.payload)
      if (!body) continue

      // Match to a MeetingSession by title proximity and ±2hr timestamp
      const titleFromSubject = subject.replace(/^Gemini notes for\s*/i, '').trim()
      const windowStart = new Date(emailDate.getTime() - 2 * 60 * 60 * 1000)
      const windowEnd = new Date(emailDate.getTime() + 2 * 60 * 60 * 1000)

      const meetings = await prisma.meetingSession.findMany({
        where: {
          userId,
          startTime: { gte: windowStart, lte: windowEnd },
        },
      })

      // Find best match by title similarity
      let bestMatch = meetings[0]
      if (meetings.length > 1 && titleFromSubject) {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
        const needle = norm(titleFromSubject)
        bestMatch =
          meetings.find((m) => norm(m.title).includes(needle) || needle.includes(norm(m.title))) ?? meetings[0]
      }

      if (bestMatch && !bestMatch.transcriptRaw) {
        await prisma.meetingSession.update({
          where: { id: bestMatch.id },
          data: { transcriptRaw: body },
        })
        matched++
      }
    }

    pageToken = list.data.nextPageToken ?? undefined
  } while (pageToken)

  return matched
}
