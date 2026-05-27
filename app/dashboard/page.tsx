import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const { data: stats } = await supabase
    .from('inventory_summary')
    .select('sku, on_hand, available')

  const totalSkus = stats?.length ?? 0
  const totalUnits = stats?.reduce((sum, r) => sum + (r.on_hand ?? 0), 0) ?? 0
  const lowStock = stats?.filter(r => (r.available ?? 0) <= 0).length ?? 0

  const { data: openOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact' })
    .in('status', ['received', 'picking'])

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-white">
          Good to see you, {profile?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total SKUs" value={totalSkus.toLocaleString()} />
          <StatCard label="Units on Hand" value={totalUnits.toLocaleString()} />
          <StatCard label="Out of Stock" value={lowStock.toLocaleString()} accent="red" />
          <StatCard label="Open Orders" value={(openOrders?.length ?? 0).toLocaleString()} accent="yellow" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <QuickAction href="/picking/new" label="Start Pick Session" />
            <QuickAction href="/inventory" label="View Inventory" />
            <QuickAction href="/orders" label="Orders" />
            {profile?.role === 'admin' && (
              <>
                <QuickAction href="/purchase-orders" label="Purchase Orders" />
                <QuickAction href="/reports" label="Reports" />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'yellow' }) {
  const valueClass = accent === 'red' ? 'text-red-400' : accent === 'yellow' ? 'text-yellow-400' : 'text-white'
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="bg-gray-800 hover:bg-gray-700 text-sm text-white px-4 py-2 rounded-lg transition-colors border border-gray-700">
      {label}
    </a>
  )
}
