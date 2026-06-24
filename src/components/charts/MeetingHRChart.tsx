'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { InsightTooltip } from './InsightTooltip'

interface DataPoint {
  elapsed: number // minutes into meeting
  hr: number | null
  stress: number | null
}

interface MeetingHRChartProps {
  data: DataPoint[]
  baselineHR: number | null
  meetingTitle: string
  attendeeEmails: string[]
  startTime: Date
  sentiment?: string | null
  stressIndicators: string[]
}

export function MeetingHRChart({
  data,
  baselineHR,
  meetingTitle,
  attendeeEmails,
  startTime,
  sentiment,
  stressIndicators,
}: MeetingHRChartProps) {
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; point: DataPoint } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: { activePayload?: Array<{ payload: DataPoint }>; activeCoordinate?: { x: number; y: number } }) => {
      const point = e.activePayload?.[0]?.payload
      if (!point) return
      const rect = containerRef.current?.getBoundingClientRect()
      const x = (e.activeCoordinate?.x ?? 0) + (rect?.left ?? 0)
      const y = (e.activeCoordinate?.y ?? 0) + (rect?.top ?? 0)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setTooltip({ visible: true, x, y, point })
      }, 600)
    },
    []
  )

  const handleMouseLeave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTooltip(null)
  }, [])

  const surroundingFor = (idx: number) =>
    data.slice(Math.max(0, idx - 3), idx + 4).map((d) => d.hr ?? 0)

  const activeIdx = data.findIndex((d) => d === tooltip?.point)

  return (
    <div ref={containerRef} className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <XAxis
            dataKey="elapsed"
            tickFormatter={(v) => `${v}m`}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="hr"
            domain={['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={() => null} />
          {/* Stress as background fill */}
          <Area
            yAxisId="hr"
            dataKey="stress"
            fill="#f59e0b"
            fillOpacity={0.12}
            stroke="none"
          />
          {/* Baseline reference line */}
          {baselineHR != null && (
            <ReferenceLine
              yAxisId="hr"
              y={baselineHR}
              stroke="#6b7280"
              strokeDasharray="4 2"
              label={{ value: 'baseline', fill: '#6b7280', fontSize: 10 }}
            />
          )}
          {/* Actual HR */}
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {tooltip?.visible && (
        <InsightTooltip
          visible
          x={tooltip.x}
          y={tooltip.y}
          payload={{
            metricType: 'heart_rate',
            value: tooltip.point.hr ?? 0,
            meetingTitle,
            attendees: attendeeEmails,
            timeOfDay: new Date(startTime.getTime() + tooltip.point.elapsed * 60000).toLocaleTimeString(),
            sentiment: sentiment ?? undefined,
            surrounding: surroundingFor(activeIdx),
            stressIndicators,
          }}
        />
      )}
    </div>
  )
}
