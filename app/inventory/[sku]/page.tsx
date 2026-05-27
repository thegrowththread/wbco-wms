import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function InventorySkuPage({
  params,
}: {
  params: Promise<{ sku: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const { sku } = await params
  const decodedSku = decodeURIComponent(sku)

  const [{ data: product }, { data: summary }, { data: locations }, { data: adjustments }] = await Promise.all([
    supabase.from('products').select('*').eq('sku', decodedSku).single(),
    supabase.from('inventory_summary').select('*').eq('sku', decodedSku).single(),
    supabase.from('inventory').select('*, warehouses(name)').eq('sku', decodedSku).order('warehouse_code'),
    supabase.from('inventory_adjustments')
      .select('*, users(name)')
      .eq('sku', decodedSku)
      .order('adjusted_at', { ascending: false })
      .limit(20),
  ])

  if (!product) notFound()

  const isAdmin = profile?.role === 'admin'

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/inventory" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">
              ← Inventory
            </Link>
            <h1 className="text-xl font-semibold text-white">{product.title}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{product.sku}</p>
          </div>
          {isAdmin && (
            <Link
              href={`/inventory/adjust?sku=${encodeURIComponent(decodedSku)}`}
              className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              Adjust Qty
            </Link>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400">On Hand</p>
            <p className="text-2xl font-bold text-white mt-1">{summary?.on_hand ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{summary?.pending ?? 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-400">Available</p>
            <p className={`text-2xl font-bold mt-1 ${(summary?.available ?? 0) <= 0 ? 'text-red-400' : 'text-white'}`}>
              {summary?.available ?? 0}
            </p>
          </div>
        </div>

        {/* Product details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Product Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Detail label="Brand" value={product.brand} />
            <Detail label="Classification" value={product.classification} />
            <Detail label="Supplier" value={product.primary_supplier} />
            <Detail label="Barcode" value={product.barcode} mono />
            {isAdmin && <Detail label="Cost" value={product.cost ? `$${Number(product.cost).toFixed(2)}` : '—'} />}
            {isAdmin && <Detail label="Retail Price" value={product.retail_price ? `$${Number(product.retail_price).toFixed(2)}` : '—'} />}
            <Detail label="Active" value={product.is_active ? 'Yes' : 'No'} />
          </dl>
        </div>

        {/* By location */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-3">By Warehouse</h2>
          {locations && locations.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="pb-2 font-medium">Warehouse</th>
                  <th className="pb-2 font-medium text-right">Qty on Hand</th>
                  <th className="pb-2 font-medium text-right text-xs text-gray-500">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc.warehouse_code} className="border-b border-gray-800/50">
                    <td className="py-2 text-gray-300">
                      <span className="font-mono text-xs text-gray-400 mr-2">{loc.warehouse_code}</span>
                      {(loc.warehouses as any)?.name}
                    </td>
                    <td className="py-2 text-right text-white font-medium">{loc.quantity_on_hand}</td>
                    <td className="py-2 text-right text-xs text-gray-500">
                      {loc.updated_at ? new Date(loc.updated_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No inventory records found</p>
          )}
        </div>

        {/* Adjustment history */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Adjustment History</h2>
          {adjustments && adjustments.length > 0 ? (
            <div className="space-y-2">
              {adjustments.map(adj => (
                <div key={adj.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-800/50">
                  <div>
                    <span className={`font-medium mr-2 ${adj.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                    </span>
                    <span className="text-gray-400">{adj.reason}</span>
                    {adj.notes && <span className="text-gray-500 ml-2">· {adj.notes}</span>}
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{(adj.users as any)?.name ?? '—'}</div>
                    <div>{new Date(adj.adjusted_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No adjustments recorded</p>
          )}
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
