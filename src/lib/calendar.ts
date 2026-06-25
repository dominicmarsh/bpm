import { google } from 'googleapis'
import { prisma } from './prisma'

export async function pullCalendarEvents(userId: string, accessToken: string, scope: 'full' | 'incremental') {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const calendar = google.calendar({ version: 'v3', auth })

  const daysBack = scope === 'full' ? 90 : 7
  const timeMin = new Date()
  timeMin.setDate(timeMin.getDate() - daysBack)

  let pageToken: string | undefined
  let stored = 0

  do {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: new Date().toISOString(), // no future events
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    })

    const events = res.data.items ?? []

    for (const event of events) {
      if (!event.id || !event.summary) continue
      if (!event.start?.dateTime || !event.end?.dateTime) continue // all-day
      if (event.status === 'cancelled') continue

      const startTime = new Date(event.start.dateTime)
      const endTime = new Date(event.end.dateTime)
      const durationMs = endTime.getTime() - startTime.getTime()
      if (durationMs < 5 * 60 * 1000) continue // under 5 min

      // Skip if user declined
      const selfAttendee = event.attendees?.find((a) => a.self)
      if (selfAttendee?.responseStatus === 'declined') continue

      const attendeeEmails = (event.attendees ?? [])
        .map((a) => a.email)
        .filter((e): e is string => !!e)

      await prisma.meetingSession.upsert({
        where: { userId_calendarEventId: { userId, calendarEventId: event.id } },
        create: {
          userId,
          calendarEventId: event.id,
          title: event.summary,
          startTime,
          endTime,
          attendeeEmails,
          topics: [],
          stressIndicators: [],
        },
        update: {
          title: event.summary,
          startTime,
          endTime,
          attendeeEmails,
        },
      })
      stored++
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return stored
}
