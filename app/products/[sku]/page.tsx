'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

interface ProductRow {
  sku: string
  title: string
  brand: string | null
  classification: string | null
  primary_supplier: string | null
  cost: number | null
  retail_price: number | null
  sale_price: number | null
  barcode: string | null
  is_active: boolean
}

export default function ProductDetailPage() {
  const router = useRouter()
  const { sku } = useParams<{ sku: string }>()
  const supabase = createClient()
  const decodedSku = decodeURIComponent(sku)

  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [product, setProduct] = useState<ProductRow | null>(null)
  const [form, setForm] = useState<Partial<ProductRow>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/dashboard'); return }
      setProfile(p)

      const { data: prod } = await supabase.from('products').select('*').eq('sku', decodedSku).single()
      if (!prod) { router.push('/products'); return }
      setProduct(prod)
      setForm(prod)
    }
    load()
  }, [])

  function set(key: keyof ProductRow, val: string | boolean | number | null) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('products')
      .update({
        title: form.title,
        brand: form.brand || null,
        classification: form.classification || null,
        primary_supplier: form.primary_supplier || null,
        cost: form.cost ?? null,
        retail_price: form.retail_price ?? null,
        sale_price: form.sale_price ?? null,
        barcode: form.barcode || null,
        is_active: form.is_active,
      })
      .eq('sku', decodedSku)
    if (err) { setError(err.message); setSaving(false) }
    else { setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 2000) }
  }

  if (!profile || !product) return null

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-2xl space-y-5">
        <div>
          <a href="/products" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Products</a>
          <h1 className="text-xl font-semibold text-white">{product.title}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{product.sku}</p>
        </div>

        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Edit Product</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Title" className="col-span-2">
              <input className="input" value={form.title ?? ''} onChange={e => set('title', e.target.value)} required />
            </Field>
            <Field label="Brand">
              <input className="input" value={form.brand ?? ''} onChange={e => set('brand', e.target.value)} />
            </Field>
            <Field label="Classification">
              <input className="input" value={form.classification ?? ''} onChange={e => set('classification', e.target.value)} />
            </Field>
            <Field label="Primary Supplier" className="col-span-2">
              <input className="input" value={form.primary_supplier ?? ''} onChange={e => set('primary_supplier', e.target.value)} />
            </Field>
            <Field label="Cost ($)">
              <input className="input" type="number" step="0.01" value={form.cost ?? ''} onChange={e => set('cost', e.target.value ? parseFloat(e.target.value) : null)} />
            </Field>
            <Field label="Retail Price ($)">
              <input className="input" type="number" step="0.01" value={form.retail_price ?? ''} onChange={e => set('retail_price', e.target.value ? parseFloat(e.target.value) : null)} />
            </Field>
            <Field label="Sale Price ($)">
              <input className="input" type="number" step="0.01" value={form.sale_price ?? ''} onChange={e => set('sale_price', e.target.value ? parseFloat(e.target.value) : null)} />
            </Field>
            <Field label="Barcode">
              <input className="input font-mono text-xs" value={form.barcode ?? ''} onChange={e => set('barcode', e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-300">Active product</span>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
            <a href={`/inventory/${encodeURIComponent(decodedSku)}`} className="text-sm text-gray-400 hover:text-white px-5 py-2 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
              View Inventory
            </a>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
