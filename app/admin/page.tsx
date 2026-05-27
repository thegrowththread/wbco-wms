import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: users }, { data: warehouses }, { data: filters }] = await Promise.all([
    supabase.from('users').select('id, name, email, role, created_at').order('name'),
    supabase.from('warehouses').select('*').order('code'),
    supabase.from('pick_session_filters').select('*').order('name'),
  ])

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-8">
        <h1 className="text-xl font-semibold text-white">Admin</h1>

        {/* Staff */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">Staff Accounts</h2>
            <Link href="/admin/users/new" className="text-xs text-blue-400 hover:text-blue-300">+ Add user</Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        u.role === 'admin'
                          ? 'bg-purple-900/50 text-purple-300 border-purple-700'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            To add a new staff member: create their account in{' '}
            <a href="https://supabase.com/dashboard/project/kxcbkmdeccmkiptcmowt/auth/users" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
              Supabase Auth
            </a>{' '}
            first, then their profile row will appear here automatically.
          </p>
        </section>

        {/* Warehouses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">Warehouses</h2>
            <Link href="/admin/warehouses/new" className="text-xs text-blue-400 hover:text-blue-300">+ Add warehouse</Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {warehouses?.map(w => (
                  <tr key={w.code} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-300">{w.code}</td>
                    <td className="px-4 py-3 text-gray-300">{w.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${w.is_active ? 'text-green-400' : 'text-gray-600'}`}>{w.is_active ? '●' : '○'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pick session filters */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400">Pick Session Filters</h2>
            <Link href="/admin/filters/new" className="text-xs text-blue-400 hover:text-blue-300">+ Add filter</Link>
          </div>
          <div className="space-y-2">
            {filters?.map(f => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">{f.name}</p>
                </div>
                <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                  {JSON.stringify(f.criteria, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">External Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Supabase Dashboard', href: 'https://supabase.com/dashboard/project/kxcbkmdeccmkiptcmowt' },
              { label: 'Supabase Auth Users', href: 'https://supabase.com/dashboard/project/kxcbkmdeccmkiptcmowt/auth/users' },
              { label: 'GitHub Repo', href: 'https://github.com/thegrowththread/wbco-wms' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
