import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Inventory snapshot stats
  const { data: summary } = await supabase
    .from('inventory_summary')
    .select('sku, on_hand, available, cost')

  const totalSkus = summary?.length ?? 0
  const totalUnits = summary?.reduce((s, r) => s + (r.on_hand ?? 0), 0) ?? 0
  const totalCostOnHand = summary?.reduce((s, r) => s + ((r.on_hand ?? 0) * Number(r.cost ?? 0)), 0) ?? 0
  const outOfStock = summary?.filter(r => (r.available ?? 0) <= 0).length ?? 0
  const lowStock = summary?.filter(r => (r.available ?? 0) > 0 && (r.available ?? 0) <= 5).length ?? 0

  // Recent pick sessions
  const { data: recentSessions } = await supabase
    .from('pick_sessions')
    .select('id, name, status, completed_at, users!pick_sessions_assigned_to_fkey(name)')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10)

  // Orders by status
  const { data: orderCounts } = await supabase
    .from('orders')
    .select('status')

  const byStatus = (orderCounts ?? []).reduce((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Top out-of-stock SKUs with pending demand
  const { data: outOfStockSkus } = await supabase
    .from('inventory_summary')
    .select('sku, title, on_hand, pending, available')
    .lte('available', 0)
    .gt('pending', 0)
    .order('pending', { ascending: false })
    .limit(10)

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-white">Reports</h1>

        {/* Inventory Snapshot */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Inventory Snapshot</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total SKUs" value={totalSkus.toLocaleString()} />
            <StatCard label="Units on Hand" value={totalUnits.toLocaleString()} />
            <StatCard label="Cost on Hand" value={`$${totalCostOnHand.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
            <StatCard label="Out of Stock" value={outOfStock.toLocaleString()} accent="red" />
            <StatCard label="Low Stock (≤5)" value={lowStock.toLocaleString()} accent="yellow" />
          </div>
          <div className="mt-2 flex gap-3">
            <Link href="/inventory?filter=out" className="text-xs text-blue-400 hover:text-blue-300">View out of stock →</Link>
            <Link href="/inventory?filter=low" className="text-xs text-blue-400 hover:text-blue-300">View low stock →</Link>
            <Link href="/reports/inventory-export" className="text-xs text-blue-400 hover:text-blue-300">Export CSV →</Link>
          </div>
        </section>

        {/* Orders by status */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Orders by Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(['received', 'picking', 'qc', 'shipped', 'cancelled'] as const).map(status => (
              <Link key={status} href={`/orders?status=${status}`} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors">
                <p className="text-xs text-gray-400 capitalize">{status}</p>
                <p className="text-2xl font-bold text-white mt-1">{(byStatus[status] ?? 0).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Out of stock with demand */}
        {outOfStockSkus && outOfStockSkus.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-400 mb-3">⚠️ Out of Stock — With Pending Orders</h2>
            <div className="bg-gray-900 border border-red-900/50 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium text-right">On Hand</th>
                    <th className="px-4 py-3 font-medium text-right">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockSkus.map(item => (
                    <tr key={item.sku} className="border-b border-gray-800/50">
                      <td className="px-4 py-2">
                        <Link href={`/inventory/${encodeURIComponent(item.sku)}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">{item.sku}</Link>
                      </td>
                      <td className="px-4 py-2 text-gray-300 max-w-xs truncate">{item.title}</td>
                      <td className="px-4 py-2 text-right text-red-400 font-medium">{item.on_hand}</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{item.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recent completed pick sessions */}
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3">Recent Pick Sessions</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Picker</th>
                  <th className="px-4 py-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions?.map(s => (
                  <tr key={s.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-2">
                      <Link href={`/picking/${s.id}`} className="text-blue-400 hover:text-blue-300">{s.name}</Link>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{(s.users as any)?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{s.completed_at ? new Date(s.completed_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {(!recentSessions || recentSessions.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No completed sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'yellow' }) {
  const vc = accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-white'
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${vc}`}>{value}</p>
    </div>
  )
}
