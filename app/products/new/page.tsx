'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [form, setForm] = useState({
    sku: '', title: '', brand: '', classification: '', primary_supplier: '',
    cost: '', retail_price: '', sale_price: '', barcode: '', is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/dashboard'); return }
      setProfile(p)
    }
    load()
  }, [])

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('products').insert({
      sku: form.sku.trim().toUpperCase(),
      title: form.title.trim(),
      brand: form.brand || null,
      classification: form.classification || null,
      primary_supplier: form.primary_supplier || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      barcode: form.barcode || null,
      is_active: form.is_active,
    })
    if (err) { setError(err.message); setSaving(false) }
    else router.push(`/products/${encodeURIComponent(form.sku.trim().toUpperCase())}`)
  }

  if (!profile) return null

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-2xl space-y-5">
        <div>
          <a href="/products" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Products</a>
          <h1 className="text-xl font-semibold text-white">New Product</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">SKU *</label>
              <input className="input font-mono" value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} required placeholder="e.g. RG123456" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Title *</label>
              <input className="input" value={form.title} onChange={e => set('title', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Brand</label>
              <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Classification</label>
              <input className="input" value={form.classification} onChange={e => set('classification', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Primary Supplier</label>
              <input className="input" value={form.primary_supplier} onChange={e => set('primary_supplier', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Cost ($)</label>
              <input className="input" type="number" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Retail Price ($)</label>
              <input className="input" type="number" step="0.01" value={form.retail_price} onChange={e => set('retail_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sale Price ($)</label>
              <input className="input" type="number" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Barcode</label>
              <input className="input font-mono text-xs" value={form.barcode} onChange={e => set('barcode', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Active product</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Create Product'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
