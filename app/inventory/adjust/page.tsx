'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

const REASONS = [
  'Receiving / PO',
  'Cycle count correction',
  'Damaged / write-off',
  'Transfer between warehouses',
  'Return to stock',
  'Manual correction',
  'Other',
]

export default function AdjustInventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [warehouses, setWarehouses] = useState<{ code: string; name: string }[]>([])
  const [sku, setSku] = useState(searchParams.get('sku') ?? '')
  const [warehouseCode, setWarehouseCode] = useState('')
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/inventory'); return }
      setProfile(p)
      const { data: wh } = await supabase.from('warehouses').select('code, name').eq('is_active', true).order('code')
      setWarehouses(wh ?? [])
      if (wh && wh.length > 0) setWarehouseCode(wh[0].code)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!sku.trim()) { setError('SKU is required'); return }
    const qtyNum = parseInt(qty)
    if (isNaN(qtyNum) || qtyNum === 0) { setError('Quantity must be a non-zero number'); return }

    setLoading(true)
    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: sku.trim().toUpperCase(), warehouse_code: warehouseCode, quantity_change: qtyNum, reason, notes }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Adjustment failed')
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push(`/inventory/${encodeURIComponent(sku.trim().toUpperCase())}`), 1200)
    }
  }

  if (!profile) return null

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-lg space-y-5">
        <div>
          <a href="/inventory" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Inventory</a>
          <h1 className="text-xl font-semibold text-white">Adjust Inventory</h1>
        </div>

        {success ? (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-5 text-green-400 text-sm">
            ✅ Adjustment saved — redirecting…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <Field label="SKU">
              <input
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. RG123456"
                required
                className="input"
              />
            </Field>

            <Field label="Warehouse">
              <select
                value={warehouseCode}
                onChange={e => setWarehouseCode(e.target.value)}
                className="input"
                required
              >
                {warehouses.map(w => (
                  <option key={w.code} value={w.code}>{w.code} — {w.name}</option>
                ))}
              </select>
            </Field>

            <Field label="Quantity Change" hint="Use negative numbers to reduce stock (e.g. -5)">
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="+10 or -3"
                required
                className="input"
              />
            </Field>

            <Field label="Reason">
              <select value={reason} onChange={e => setReason(e.target.value)} className="input">
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <Field label="Notes (optional)">
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context"
                className="input"
              />
            </Field>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {loading ? 'Saving…' : 'Save Adjustment'}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-500 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
