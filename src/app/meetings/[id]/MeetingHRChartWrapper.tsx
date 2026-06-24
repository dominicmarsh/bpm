'use client'

import { MeetingHRChart } from '@/components/charts/MeetingHRChart'

interface Props {
  chartData: { elapsed: number; hr: number | null; stress: number | null }[]
  baselineHR: number | null
  meetingTitle: string
  attendeeEmails: string[]
  startTime: string
  sentiment: string | null
  stressIndicators: string[]
}

export function MeetingHRChartWrapper({ chartData, baselineHR, meetingTitle, attendeeEmails, startTime, sentiment, stressIndicators }: Props) {
  return (
    <MeetingHRChart
      data={chartData}
      baselineHR={baselineHR}
      meetingTitle={meetingTitle}
      attendeeEmails={attendeeEmails}
      startTime={new Date(startTime)}
      sentiment={sentiment}
      stressIndicators={stressIndicators}
    />
  )
}
