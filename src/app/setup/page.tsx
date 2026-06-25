'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BACKFILL_OPTIONS = [
  { value: 0,   label: 'Start fresh',  desc: 'No historical data' },
  { value: 7,   label: '7 days',       desc: 'Last week' },
  { value: 30,  label: '30 days',      desc: 'Last month' },
  { value: 90,  label: '90 days',      desc: 'Last 3 months' },
  { value: 120, label: '120 days',     desc: 'Last 4 months' },
]

export default function SetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [syncDays, setSyncDays] = useState(90)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('saving')
    setError('')

    const res = await fetch('/api/garmin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, syncDays }),
    })

    if (!res.ok) {
      setError('Failed to save credentials')
      setState('error')
      return
    }

    // Trigger sync fire-and-forget then redirect immediately
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: syncDays === 0 ? 'incremental' : 'full' }),
    }).catch(() => {})

    router.push('/?syncing=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-card border border-border rounded-xl p-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-text-primary mb-6">Connect Garmin</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <input
              type="email"
              value={username}
              onChange={(e) => { setUsername(e.target.value); if (state === 'error') setState('idle') }}
              placeholder="you@example.com"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (state === 'error') setState('idle') }}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">Historical backfill</label>
            <div className="grid grid-cols-1 gap-1.5">
              {BACKFILL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    syncDays === opt.value
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border text-text-secondary hover:border-accent/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="syncDays"
                    value={opt.value}
                    checked={syncDays === opt.value}
                    onChange={() => setSyncDays(opt.value)}
                    className="accent-accent"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs text-text-secondary ml-auto">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {state === 'error' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-red-400">
              {error} — check your credentials at{' '}
              <a href="https://connect.garmin.com" target="_blank" rel="noreferrer" className="underline">
                connect.garmin.com
              </a>
              . Garmin may also require email verification for new sign-ins.
            </div>
          )}

          <button
            type="submit"
            disabled={state === 'saving'}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {state === 'saving' ? 'Connecting…' : 'Connect & start sync'}
          </button>

          <p className="text-text-secondary text-xs text-center">
            Same credentials as{' '}
            <a href="https://connect.garmin.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              connect.garmin.com
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
