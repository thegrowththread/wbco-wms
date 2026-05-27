import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; active?: string }>
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
  const query = params.q ?? ''
  const brandFilter = params.brand ?? ''
  const activeFilter = params.active ?? 'true'

  let dbQuery = supabase
    .from('products')
    .select('sku, title, brand, classification, primary_supplier, cost, retail_price, is_active')
    .order('sku')
    .limit(300)

  if (query) dbQuery = dbQuery.or(`sku.ilike.%${query}%,title.ilike.%${query}%`)
  if (brandFilter) dbQuery = dbQuery.eq('brand', brandFilter)
  if (activeFilter === 'true') dbQuery = dbQuery.eq('is_active', true)
  if (activeFilter === 'false') dbQuery = dbQuery.eq('is_active', false)

  const { data: products } = await dbQuery

  // Get unique brands for filter
  const { data: brands } = await supabase
    .from('products')
    .select('brand')
    .not('brand', 'is', null)
    .order('brand')

  const uniqueBrands = [...new Set(brands?.map(b => b.brand).filter(Boolean))]

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Products</h1>
          <Link
            href="/products/new"
            className="bg-blue-600 hover:bg-blue-700 text-sm text-white px-4 py-2 rounded-lg transition-colors"
          >
            + New Product
          </Link>
        </div>

        {/* Filters */}
        <form method="GET" className="flex gap-2 flex-wrap">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search SKU or title…"
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select name="brand" defaultValue={brandFilter} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">All brands</option>
            {uniqueBrands.map(b => <option key={b} value={b!}>{b}</option>)}
          </select>
          <select name="active" defaultValue={activeFilter} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
            <option value="all">All</option>
          </select>
          <button type="submit" className="bg-gray-700 hover:bg-gray-600 text-sm text-white px-4 py-2 rounded-lg transition-colors">
            Search
          </button>
        </form>

        <p className="text-xs text-gray-500">{products?.length ?? 0} products</p>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium text-right">Cost</th>
                  <th className="px-4 py-3 font-medium text-right">Retail</th>
                  <th className="px-4 py-3 font-medium text-center">Active</th>
                </tr>
              </thead>
              <tbody>
                {products?.map(p => (
                  <tr key={p.sku} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/products/${encodeURIComponent(p.sku)}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">
                        {p.sku}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.brand ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{p.primary_supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">{p.cost ? `$${Number(p.cost).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs">{p.retail_price ? `$${Number(p.retail_price).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs ${p.is_active ? 'text-green-400' : 'text-gray-600'}`}>
                        {p.is_active ? '●' : '○'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!products || products.length === 0) && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
