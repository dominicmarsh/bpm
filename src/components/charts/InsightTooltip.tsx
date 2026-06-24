'use client'

import { useEffect, useRef, useState } from 'react'

interface InsightTooltipProps {
  visible: boolean
  x: number
  y: number
  payload: {
    metricType: string
    value: number
    meetingTitle: string
    attendees: string[]
    timeOfDay: string
    sentiment?: string
    surrounding: number[]
    stressIndicators: string[]
  }
}

export function InsightTooltip({ visible, x, y, payload }: InsightTooltipProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const prevPayload = useRef<string>('')

  useEffect(() => {
    if (!visible) {
      setText('')
      return
    }
    const key = JSON.stringify(payload)
    if (key === prevPayload.current) return
    prevPayload.current = key

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setText('')
    setLoading(true)

    fetch('/api/ai/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const reader = res.body?.getReader()
        if (!reader) return
        const dec = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          setText((t) => t + dec.decode(value))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ctrl.abort()
  }, [visible, payload])

  if (!visible) return null

  return (
    <div
      className="absolute z-50 max-w-xs bg-card border border-border rounded-lg p-3 shadow-xl text-sm text-text-primary pointer-events-none"
      style={{ left: x + 12, top: y - 20 }}
    >
      {loading && !text ? (
        <span className="text-text-secondary animate-pulse">Analysing…</span>
      ) : (
        <span>{text}</span>
      )}
    </div>
  )
}
