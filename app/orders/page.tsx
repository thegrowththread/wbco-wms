import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:  { label: 'Received',  color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  picking:   { label: 'Picking',   color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  qc:        { label: 'QC',        color: 'bg-purple-900/50 text-purple-300 border-purple-700' },
  shipped:   { label: 'Shipped',   color: 'bg-green-900/50 text-green-300 border-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const query = params.q ?? ''
  const statusFilter = params.status ?? 'open'

  let dbQuery = supabase
    .from('orders')
    .select('id, order_number, customer_name, status, priority, received_at, shipped_at')
    .order('received_at', { ascending: false })
    .limit(200)

  if (statusFilter === 'open') {
    dbQuery = dbQuery.in('status', ['received', 'picking', 'qc'])
  } else if (statusFilter !== 'all') {
    dbQuery = dbQuery.eq('status', statusFilter)
  }

  if (query) {
    dbQuery = dbQuery.or(`order_number.ilike.%${query}%,customer_name.ilike.%${query}%`)
  }

  const { data: orders } = await dbQuery

  const counts = {
    received: orders?.filter(o => o.status === 'received').length ?? 0,
    picking: orders?.filter(o => o.status === 'picking').length ?? 0,
    qc: orders?.filter(o => o.status === 'qc').length ?? 0,
  }

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Orders</h1>
          <div className="flex gap-2 text-xs text-gray-400">
            <span className="bg-blue-900/30 text-blue-300 border border-blue-800 px-2 py-1 rounded">{counts.received} received</span>
            <span className="bg-yellow-900/30 text-yellow-300 border border-yellow-800 px-2 py-1 rounded">{counts.picking} picking</span>
            <span className="bg-purple-900/30 text-purple-300 border border-purple-800 px-2 py-1 rounded">{counts.qc} qc</span>
          </div>
        </div>

        {/* Search + Filter */}
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Order # or customer…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="open">Open</option>
            <option value="received">Received</option>
            <option value="picking">Picking</option>
            <option value="qc">QC</option>
            <option value="shipped">Shipped</option>
            <option value="all">All</option>
          </select>
          <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-sm text-white px-4 py-2 rounded-lg transition-colors">
            Search
          </button>
        </form>

        {/* Order list */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Order #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map(order => {
                  const s = STATUS_LABELS[order.status] ?? STATUS_LABELS['received']
                  return (
                    <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/orders/${order.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{order.customer_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {order.priority === 'rush' && (
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-red-900/50 text-red-300 border-red-700">RUSH</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {order.received_at ? new Date(order.received_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
                {(!orders || orders.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No orders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
