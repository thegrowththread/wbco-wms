import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-800 text-gray-400 border-gray-700' },
  sent:      { label: 'Sent',      color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  partial:   { label: 'Partial',   color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  received:  { label: 'Received',  color: 'bg-green-900/50 text-green-300 border-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const statusFilter = params.status ?? 'open'

  let dbQuery = supabase
    .from('purchase_orders')
    .select('id, po_number, supplier, status, expected_date, created_at, users!purchase_orders_created_by_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter === 'open') {
    dbQuery = dbQuery.in('status', ['draft', 'sent', 'partial'])
  } else if (statusFilter !== 'all') {
    dbQuery = dbQuery.eq('status', statusFilter)
  }

  const { data: pos } = await dbQuery

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Purchase Orders</h1>
          <Link href="/purchase-orders/new" className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors">
            + New PO
          </Link>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2">
          {['open', 'received', 'all'].map(s => (
            <a
              key={s}
              href={`?status=${s}`}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s}
            </a>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">PO #</th>
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Created By</th>
              </tr>
            </thead>
            <tbody>
              {pos?.map(po => {
                const s = PO_STATUS[po.status] ?? PO_STATUS['draft']
                return (
                  <tr key={po.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/purchase-orders/${po.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{po.supplier}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{(po.users as any)?.name ?? '—'}</td>
                  </tr>
                )
              })}
              {(!pos || pos.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No purchase orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
