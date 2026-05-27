'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/supabase/types'

interface Props { children: React.ReactNode; role: UserRole; name: string }

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞', roles: ['admin', 'picker'] as UserRole[] },
  { href: '/picking', label: 'Picking', icon: '📦', roles: ['admin', 'picker'] as UserRole[] },
  { href: '/inventory', label: 'Inventory', icon: '🗃', roles: ['admin', 'picker'] as UserRole[] },
  { href: '/orders', label: 'Orders', icon: '📋', roles: ['admin', 'picker'] as UserRole[] },
  { href: '/purchase-orders', label: 'POs', icon: '🛒', roles: ['admin'] as UserRole[] },
  { href: '/products', label: 'Products', icon: '🏷', roles: ['admin'] as UserRole[] },
  { href: '/cycle-counts', label: 'Cycle Count', icon: '🔢', roles: ['admin'] as UserRole[] },
  { href: '/reports', label: 'Reports', icon: '📊', roles: ['admin'] as UserRole[] },
  { href: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] as UserRole[] },
]

export default function AppLayout({ children, role, name }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  const NavList = () => (
    <ul className="space-y-1">
      {visibleNav.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <li key={item.href}>
            <Link href={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 p-4 shrink-0">
        <div className="mb-6">
          <h1 className="text-sm font-bold text-white tracking-wide">WBCO WMS</h1>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{role}</p>
        </div>
        <nav className="flex-1"><NavList /></nav>
        <div className="border-t border-gray-800 pt-3 mt-3">
          <p className="text-xs text-gray-400 truncate mb-2">{name}</p>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Sign out</button>
        </div>
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 h-14">
        <h1 className="text-sm font-bold">WBCO WMS</h1>
        <button onClick={() => setMobileOpen(v => !v)} className="text-gray-400 text-xl">{mobileOpen ? '✕' : '☰'}</button>
      </div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-gray-950/90" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 left-0 bottom-0 w-56 bg-gray-900 border-r border-gray-800 p-4" onClick={e => e.stopPropagation()}>
            <nav className="flex-1"><NavList /></nav>
            <div className="border-t border-gray-800 pt-3 mt-3">
              <p className="text-xs text-gray-400 truncate mb-2">{name}</p>
              <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-400">Sign out</button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
