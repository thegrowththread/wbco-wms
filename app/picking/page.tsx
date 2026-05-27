import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  open:       { label: 'Open',       color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  in_progress:{ label: 'In Progress',color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  completed:  { label: 'Completed',  color: 'bg-green-900/50 text-green-300 border-green-700' },
  cancelled:  { label: 'Cancelled',  color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default async function PickingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  // Pickers only see their own sessions; admins see all
  let sessionQuery = supabase
    .from('pick_sessions')
    .select('id, name, status, assigned_to, started_at, completed_at, users!pick_sessions_assigned_to_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (profile?.role === 'picker') {
    sessionQuery = sessionQuery.eq('assigned_to', user.id).in('status', ['open', 'in_progress'])
  }

  const { data: sessions } = await sessionQuery

  const openCount = sessions?.filter(s => s.status === 'open').length ?? 0
  const inProgressCount = sessions?.filter(s => s.status === 'in_progress').length ?? 0

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Pick Sessions</h1>
          {profile?.role === 'admin' && (
            <Link
              href="/picking/new"
              className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors"
            >
              + New Session
            </Link>
          )}
        </div>

        {/* Summary */}
        <div className="flex gap-3">
          <span className="text-xs bg-blue-900/30 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-full">{openCount} open</span>
          <span className="text-xs bg-yellow-900/30 text-yellow-300 border border-yellow-800 px-2.5 py-1 rounded-full">{inProgressCount} in progress</span>
        </div>

        {/* Sessions */}
        <div className="space-y-3">
          {sessions?.map(session => {
            const s = SESSION_STATUS[session.status] ?? SESSION_STATUS['open']
            const assignedName = (session.users as any)?.name ?? '—'
            const canPick = session.status === 'open' || session.status === 'in_progress'
            return (
              <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white truncate">{session.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${s.color}`}>{s.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {profile?.role === 'admin' && `Assigned to: ${assignedName} · `}
                    {session.started_at
                      ? `Started ${new Date(session.started_at).toLocaleString()}`
                      : session.completed_at
                      ? `Completed ${new Date(session.completed_at).toLocaleString()}`
                      : 'Not started'}
                  </p>
                </div>
                <Link
                  href={`/picking/${session.id}`}
                  className={`shrink-0 text-sm px-4 py-2 rounded-lg border transition-colors ${
                    canPick
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                  }`}
                >
                  {canPick ? 'Pick →' : 'View'}
                </Link>
              </div>
            )
          })}
          {(!sessions || sessions.length === 0) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              <p className="text-sm">No pick sessions yet</p>
              {profile?.role === 'admin' && (
                <Link href="/picking/new" className="mt-3 inline-block text-blue-400 hover:text-blue-300 text-sm">
                  Create your first session →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
