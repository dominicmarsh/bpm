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
    <nav className="sticky top-0 z-10 backdrop-blur" style={{ borderBottom: '1px solid #1e1e1e', background: 'rgba(0,0,0,0.85)' }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="BPM" width={28} height={28} style={{ filter: 'drop-shadow(0 0 6px rgba(229,62,62,0.7))' }} />
          <span className="font-bold tracking-tight text-lg" style={{ color: '#ff4444', textShadow: '0 0 12px rgba(255,68,68,0.5)' }}>BPM</span>
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
