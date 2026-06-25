import Image from 'next/image'
import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-card border border-border rounded-xl p-10 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="BPM" width={72} height={72} className="drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">BPM</h1>
        <p className="text-text-secondary text-sm mb-8">
          Biometric meeting intelligence
        </p>
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/' })
          }}
        >
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-accent hover:bg-accent/90 text-white font-medium text-sm transition-colors"
          >
            Continue with Google
          </button>
        </form>
        <p className="text-text-secondary text-xs mt-6">
          Requires Google Calendar &amp; Gmail access
        </p>
      </div>
    </div>
  )
}
