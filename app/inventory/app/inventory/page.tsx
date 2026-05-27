import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
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
  const filter = params.filter ?? 'all'

  let dbQuery = supabase
    .from('inventory_summary')
    .select('sku, title, brand, classification, on_hand, pending, available')
    .order('sku')

  if (query) {
    dbQuery = dbQuery.or(`sku.ilike.%${query}%,title.ilike.%${query}%`)
  }

  if (filter === 'out') {
    dbQuery = dbQuery.lte('available', 0)
  } else if (filter === 'low') {
    dbQuery = dbQuery.gt('available', 0).lte('available', 5)
  }

  const { data: items } = await dbQuery.limit(200)

  const total = items?.length ?? 0
  const outOfStock = items?.filter(i => (i.available ?? 0) <= 0).length ?? 0
  const lowStock = items?.filter(i => (i.available ?? 0) > 0 && (i.available ?? 0) <= 5).length ?? 0

  return (
    <AppLayout role={profile?.role ?? 'picker'} name={profile?.name ?? ''}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Inventory</h1>
          {profile?.role === 'admin' && (
            <Link
              href="/inventory/adjust"
              className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Adjust
            </Link>
          )}
        </div>

        {/* Summary chips */}
        <div className="flex gap-3 flex-wrap">
          <Chip label={`${total} shown`} />
          <Chip label={`${outOfStock} out of stock`} color="red" />
          <Chip label={`${lowStock} low (≤5)`} color="yellow" />
        </div>

        {/* Search + Filter */}
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search SKU or title…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="filter"
            defaultValue={filter}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock (≤5)</option>
          </select>
          <button
            type="submit"
            className="bg-gray-700 hover:bg-gray-600 text-sm text-white px-4 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium text-right">On Hand</th>
                  <th className="px-4 py-3 font-medium text-right">Pending</th>
                  <th className="px-4 py-3 font-medium text-right">Available</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item, i) => {
                  const avail = item.available ?? 0
                  const availClass = avail <= 0
                    ? 'text-red-400 font-semibold'
                    : avail <= 5
                    ? 'text-yellow-400 font-semibold'
                    : 'text-white'
                  return (
                    <tr
                      key={item.sku}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/50'}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventory/${item.sku}`}
                          className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                        >
                          {item.sku}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{item.title}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{item.on_hand ?? 0}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.pending ?? 0}</td>
                      <td className={`px-4 py-3 text-right ${availClass}`}>{avail}</td>
                    </tr>
                  )
                })}
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {(items?.length ?? 0) >= 200 && (
          <p className="text-xs text-gray-500 text-center">Showing first 200 results — refine your search to see more</p>
        )}
      </div>
    </AppLayout>
  )
}

function Chip({ label, color }: { label: string; color?: 'red' | 'yellow' }) {
  const cls = color === 'red'
    ? 'bg-red-950 text-red-400 border-red-800'
    : color === 'yellow'
    ? 'bg-yellow-950 text-yellow-400 border-yellow-800'
    : 'bg-gray-800 text-gray-400 border-gray-700'
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${cls}`}>{label}</span>
  )
}
