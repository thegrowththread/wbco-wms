import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

const CC_STATUS: Record<string, { label: string; color: string }> = {
  open:       { label: 'Open',       color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  in_progress:{ label: 'In Progress',color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  completed:  { label: 'Completed',  color: 'bg-green-900/50 text-green-300 border-green-700' },
}

export default async function CycleCountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: sessions } = await supabase
    .from('cycle_count_sessions')
    .select('id, name, warehouse_code, status, started_at, completed_at, users!cycle_count_sessions_created_by_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Cycle Counts</h1>
          <Link href="/cycle-counts/new" className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors">
            + New Count
          </Link>
        </div>

        <p className="text-sm text-gray-400">
          Cycle counts verify physical inventory against system records. Discrepancies are flagged for approval before adjusting quantities.
        </p>

        <div className="space-y-3">
          {sessions?.map(session => {
            const s = CC_STATUS[session.status] ?? CC_STATUS['open']
            return (
              <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white">{session.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Warehouse: {session.warehouse_code} · By: {(session.users as any)?.name ?? '—'}
                    {session.completed_at && ` · Completed ${new Date(session.completed_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Link href={`/cycle-counts/${session.id}`} className="shrink-0 text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
                  {session.status !== 'completed' ? 'Count →' : 'View'}
                </Link>
              </div>
            )
          })}
          {(!sessions || sessions.length === 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              <p className="text-sm">No cycle counts yet</p>
              <Link href="/cycle-counts/new" className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm">
                Start your first count →
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
