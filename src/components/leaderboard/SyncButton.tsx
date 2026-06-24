'use client'

import { useState } from 'react'

export function SyncButton() {
  const [state, setState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)

  async function trigger() {
    setState('syncing')
    setProgress(0)

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'incremental' }),
    })

    if (!res.ok) { setState('error'); return }

    const { syncId } = await res.json()

    const poll = setInterval(async () => {
      const status = await fetch(`/api/sync/status?syncId=${syncId}`).then((r) => r.json())
      setProgress(status.progress ?? 0)
      if (status.status === 'done') { clearInterval(poll); setState('done') }
      if (status.status === 'error') { clearInterval(poll); setState('error') }
    }, 1500)
  }

  const labels = { idle: 'Sync now', syncing: `Syncing… ${progress}%`, done: 'Done', error: 'Error — retry' }

  return (
    <button
      onClick={trigger}
      disabled={state === 'syncing'}
      className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
    >
      {labels[state]}
    </button>
  )
}
