import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Nav } from '@/components/ui/Nav'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { garminCred: true },
  })

  if (!user) redirect('/login')

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>

        <SettingsClient
          hasCredentials={!!user.garminCred}
          lastSyncAt={user.garminCred?.lastSyncAt?.toISOString() ?? null}
          userEmail={user.email}
        />
      </main>
    </>
  )
}
