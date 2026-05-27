'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

interface LineItem {
  sku: string
  title: string
  quantity_ordered: number
  unit_cost: number | null
}

const SUPPLIERS = ['Craig Bachman', 'D Stevens', 'RG Ribbon', 'Other']

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [supplier, setSupplier] = useState(SUPPLIERS[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ sku: '', title: '', quantity_ordered: 1, unit_cost: null }])
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

  function setLine(index: number, key: keyof LineItem, val: string | number | null) {
    setLines(ls => ls.map((l, i) => i === index ? { ...l, [key]: val } : l))
  }

  function addLine() {
    setLines(ls => [...ls, { sku: '', title: '', quantity_ordered: 1, unit_cost: null }])
  }

  function removeLine(index: number) {
    setLines(ls => ls.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validLines = lines.filter(l => l.sku.trim())
    if (validLines.length === 0) { setError('Add at least one line item'); return }
    setSaving(true)
    setError('')

    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supplier, expected_date: expectedDate || null, notes: notes || null, items: validLines }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create PO'); setSaving(false) }
    else router.push(`/purchase-orders/${data.po_id}`)
  }

  if (!profile) return null

  const total = lines.reduce((sum, l) => sum + (l.quantity_ordered * (l.unit_cost ?? 0)), 0)

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-3xl space-y-5">
        <div>
          <a href="/purchase-orders" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Purchase Orders</a>
          <h1 className="text-xl font-semibold text-white">New Purchase Order</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PO Header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-400">Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Supplier</label>
                <select className="input" value={supplier} onChange={e => setSupplier(e.target.value)}>
                  {SUPPLIERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Expected Date</label>
                <input type="date" className="input" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-400">Line Items</h2>
              <button type="button" onClick={addLine} className="text-xs text-blue-400 hover:text-blue-300">+ Add line</button>
            </div>
            <div className="divide-y divide-gray-800/50">
              {lines.map((line, i) => (
                <div key={i} className="px-4 py-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">SKU</label>}
                    <input
                      className="input font-mono text-xs"
                      value={line.sku}
                      onChange={e => setLine(i, 'sku', e.target.value.toUpperCase())}
                      placeholder="RG123456"
                    />
                  </div>
                  <div className="col-span-5">
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">Description</label>}
                    <input className="input" value={line.title} onChange={e => setLine(i, 'title', e.target.value)} placeholder="Product title" />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">Qty</label>}
                    <input type="number" min="1" className="input text-center" value={line.quantity_ordered} onChange={e => setLine(i, 'quantity_ordered', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <label className="block text-xs text-gray-500 mb-1">Cost</label>}
                    <input type="number" step="0.01" className="input" value={line.unit_cost ?? ''} onChange={e => setLine(i, 'unit_cost', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-800 flex justify-end">
              <p className="text-sm text-gray-400">Total: <span className="text-white font-medium">${total.toFixed(2)}</span></p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Create Purchase Order'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
