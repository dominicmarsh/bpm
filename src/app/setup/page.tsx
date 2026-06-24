'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'syncing' | 'error'>('idle')
  const [syncId, setSyncId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')

    const credRes = await fetch('/api/garmin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!credRes.ok) {
      setError('Failed to save credentials')
      setState('error')
      return
    }

    setState('syncing')

    const syncRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: 'full' }),
    })

    if (!syncRes.ok) {
      setError('Failed to start sync')
      setState('error')
      return
    }

    const { syncId: id } = await syncRes.json()
    setSyncId(id)

    const poll = setInterval(async () => {
      const status = await fetch(`/api/sync/status?syncId=${id}`).then((r) => r.json())
      setProgress(status.progress ?? 0)
      if (status.status === 'done') {
        clearInterval(poll)
        router.push('/')
      }
      if (status.status === 'error') {
        clearInterval(poll)
        setError(status.error ?? 'Sync failed')
        setState('error')
      }
    }, 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-card border border-border rounded-xl p-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-1">Connect Garmin</h1>
        <p className="text-text-secondary text-sm mb-8">
          Your credentials are encrypted at rest using AES-256-GCM.
        </p>

        {state === 'syncing' ? (
          <div className="space-y-4">
            <p className="text-text-primary text-sm">
              Running initial 90-day backfill… {syncId ? `${progress}%` : ''}
            </p>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-text-secondary text-xs">
              This may take 2–3 minutes. You can leave this page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Garmin username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Garmin password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={state === 'saving'}
              className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {state === 'saving' ? 'Saving…' : 'Save & start sync'}
            </button>
          </form>
        )}

        <p className="text-text-secondary text-xs mt-6">
          See <code className="text-accent">GARMIN_SETUP.md</code> if the npm sync fails — a Python fallback is available.
        </p>
      </div>
    </div>
  )
}
