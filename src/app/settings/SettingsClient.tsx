'use client'

import { useState } from 'react'
import { SyncButton } from '@/components/leaderboard/SyncButton'

interface Props {
  hasCredentials: boolean
  lastSyncAt: string | null
  userEmail: string
}

export function SettingsClient({ hasCredentials, lastSyncAt, userEmail }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function saveCredentials(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')

    const res = await fetch('/api/garmin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setUsername('')
      setPassword('')
    } else {
      setError('Failed to save credentials')
    }
  }

  return (
    <div className="space-y-6">
      {/* Account */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-text-primary mb-4">Account</h2>
        <p className="text-text-secondary text-sm">{userEmail}</p>
      </div>

      {/* Garmin */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-primary">Garmin Connect</h2>
          {hasCredentials && (
            <span className="text-xs text-positive bg-positive/15 px-2 py-0.5 rounded-full">Connected</span>
          )}
        </div>
        {lastSyncAt && (
          <p className="text-text-secondary text-xs">
            Last synced: {new Date(lastSyncAt).toLocaleString('en-GB')}
          </p>
        )}
        <form onSubmit={saveCredentials} className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={hasCredentials ? '(unchanged)' : ''}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasCredentials ? '(unchanged)' : ''}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {saved && <p className="text-positive text-xs">Saved.</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Update credentials'}
          </button>
        </form>
      </div>

      {/* Sync */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-medium text-text-primary">Manual sync</h2>
        <p className="text-text-secondary text-xs">
          Syncs the last 2 days. Daily sync runs automatically at 09:00 UTC.
        </p>
        <SyncButton />
      </div>

      {/* Garmin setup note */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-medium text-text-primary mb-2">Garmin sync issues?</h2>
        <p className="text-text-secondary text-xs">
          If the Garmin npm sync fails (API changes are common), see{' '}
          <code className="text-accent">GARMIN_SETUP.md</code> in the repo for the Python{' '}
          <code className="text-accent">garminconnect</code> fallback script.
        </p>
      </div>
    </div>
  )
}
