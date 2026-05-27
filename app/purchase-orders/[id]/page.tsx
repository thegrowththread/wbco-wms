import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import ReceivePOButton from './ReceivePOButton'

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-800 text-gray-400 border-gray-700' },
  sent:      { label: 'Sent',      color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  partial:   { label: 'Partial',   color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  received:  { label: 'Received',  color: 'bg-green-900/50 text-green-300 border-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-800 text-gray-400 border-gray-700' },
}

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const [{ data: po }, { data: items }] = await Promise.all([
    supabase.from('purchase_orders').select('*, users!purchase_orders_created_by_fkey(name)').eq('id', id).single(),
    supabase.from('purchase_order_items').select('*').eq('po_id', id).order('sku'),
  ])

  if (!po) notFound()

  const s = PO_STATUS[po.status] ?? PO_STATUS['draft']
  const totalOrdered = items?.reduce((sum, i) => sum + i.quantity_ordered * (i.unit_cost ?? 0), 0) ?? 0
  const canReceive = ['sent', 'partial'].includes(po.status)

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-5">
        <div>
          <Link href="/purchase-orders" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Purchase Orders</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">{po.po_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full border ${s.color}`}>{s.label}</span>
          </div>
        </div>

        {/* PO details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-gray-500 text-xs">Supplier</dt><dd className="text-gray-200 mt-0.5">{po.supplier}</dd></div>
            <div><dt className="text-gray-500 text-xs">Expected Date</dt><dd className="text-gray-200 mt-0.5">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Created By</dt><dd className="text-gray-200 mt-0.5">{(po.users as any)?.name ?? '—'}</dd></div>
            <div><dt className="text-gray-500 text-xs">Created</dt><dd className="text-gray-200 mt-0.5">{new Date(po.created_at).toLocaleDateString()}</dd></div>
            {po.notes && <div className="col-span-2"><dt className="text-gray-500 text-xs">Notes</dt><dd className="text-gray-200 mt-0.5">{po.notes}</dd></div>}
          </dl>
        </div>

        {/* Line items */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Line Items ({items?.length ?? 0})</h2>
            {canReceive && <ReceivePOButton poId={id} items={items ?? []} />}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Ordered</th>
                <th className="px-4 py-3 font-medium text-right">Received</th>
                <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map(item => {
                const done = item.quantity_received >= item.quantity_ordered
                return (
                  <tr key={item.id} className={`border-b border-gray-800/50 ${done ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/${encodeURIComponent(item.sku)}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">{item.sku}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{item.title ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-white">{item.quantity_ordered}</td>
                    <td className={`px-4 py-3 text-right font-medium ${done ? 'text-green-400' : item.quantity_received > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {item.quantity_received}{done && ' ✓'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{item.unit_cost ? `$${Number(item.unit_cost).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{item.unit_cost ? `$${(item.quantity_ordered * Number(item.unit_cost)).toFixed(2)}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-800">
                <td colSpan={5} className="px-4 py-3 text-right text-sm text-gray-400">PO Total</td>
                <td className="px-4 py-3 text-right text-white font-medium">${totalOrdered.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
