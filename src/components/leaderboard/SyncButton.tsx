'use client'

import { useState, useEffect, useRef } from 'react'

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function trigger() {
    setState('syncing')
    setElapsed(0)

    // Tick elapsed seconds while waiting
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'incremental' }),
    })

    clearInterval(timerRef.current)

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      setErrorMsg(body?.error ?? `HTTP ${res.status}`)
      setState('error')
      return
    }

    // Surface any partial errors without blocking reload
    if (body?.error) setErrorMsg(body.error)

    window.location.reload()
  }

  if (state === 'syncing') {
    return (
      <button disabled className="px-4 py-2 rounded-lg text-sm font-medium bg-accent/60 text-white flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
        Syncing… {elapsed}s
      </button>
    )
  }

  if (state === 'error') {
    return (
      <button onClick={() => { setState('idle'); setErrorMsg('') }} title={errorMsg} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
        Error — retry {errorMsg && '(hover)'}
      </button>
    )
  }

  return (
    <button onClick={trigger} className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors">
      Sync now
    </button>
  )
}
