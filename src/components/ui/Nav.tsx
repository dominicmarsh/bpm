'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Leaderboard' },
  { href: '/settings', label: 'Settings' },
]

export function Nav() {
  const path = usePathname()
  return (
    <nav className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="BPM" width={24} height={24} className="opacity-70" />
          <span className="text-text-primary font-bold tracking-tight text-lg">BPM</span>
        </Link>
        <div className="flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm ${
                path === l.href ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary transition-colors'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
