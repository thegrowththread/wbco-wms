import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:  { label: 'Received',  color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  picking:   { label: 'Picking',   color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  qc:        { label: 'QC',        color: 'bg-purple-900/50 text-purple-300 border-purple-700' },
  shipped:   { label: 'Shipped',   color: 'bg-green-900/50 text-green-300 border-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const { id } = await params

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id).order('sku'),
  ])

  if (!order) notFound()

  const s = STATUS_LABELS[order.status] ?? STATUS_LABELS['received']
  const totalItems = items?.reduce((sum, i) => sum + i.quantity_ordered, 0) ?? 0
  const totalPicked = items?.reduce((sum, i) => sum + i.quantity_picked, 0) ?? 0

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <Link href="/orders" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Orders</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">Order #{order.order_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${s.color}`}>{s.label}</span>
            {order.priority === 'rush' && (
              <span className="text-xs px-2.5 py-1 rounded-full border bg-red-900/50 text-red-300 border-red-700">RUSH</span>
            )}
          </div>
        </div>

        {/* Progress */}
        {order.status !== 'shipped' && order.status !== 'cancelled' && totalItems > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Pick progress</span>
              <span>{totalPicked} / {totalItems} units</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${totalItems > 0 ? Math.round((totalPicked / totalItems) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Order Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Detail label="Customer" value={order.customer_name} />
            <Detail label="Email" value={order.customer_email} />
            <Detail label="Shopify Order ID" value={order.shopify_order_id} mono />
            <Detail label="ShipStation ID" value={order.shipstation_order_id} mono />
            <Detail label="Received" value={order.received_at ? new Date(order.received_at).toLocaleString() : '—'} />
            <Detail label="Shipped" value={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : '—'} />
            {order.notes && <div className="col-span-2"><Detail label="Notes" value={order.notes} /></div>}
          </dl>
        </div>

        {/* Line items */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="text-sm font-medium text-gray-400">Line Items ({items?.length ?? 0})</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Ordered</th>
                <th className="px-4 py-3 font-medium text-right">Picked</th>
              </tr>
            </thead>
            <tbody>
              {items?.map(item => {
                const done = item.quantity_picked >= item.quantity_ordered
                return (
                  <tr key={item.id} className={`border-b border-gray-800/50 ${done ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${encodeURIComponent(item.sku)}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">
                        {item.sku}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{item.title ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.location_hint ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-white">{item.quantity_ordered}</td>
                    <td className={`px-4 py-3 text-right font-medium ${done ? 'text-green-400' : 'text-yellow-400'}`}>
                      {item.quantity_picked}
                      {done && ' ✓'}
                    </td>
                  </tr>
                )
              })}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}

function Detail({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd className={`text-gray-200 mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '—'}</dd>
    </div>
  )
}
