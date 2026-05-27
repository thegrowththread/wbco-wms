'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

export default function NewCycleCountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [warehouses, setWarehouses] = useState<{ code: string; name: string }[]>([])
  const [name, setName] = useState('')
  const [warehouseCode, setWarehouseCode] = useState('')
  const [skuList, setSkuList] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/dashboard'); return }
      setProfile(p)
      const { data: wh } = await supabase.from('warehouses').select('code, name').eq('is_active', true).order('code')
      setWarehouses(wh ?? [])
      if (wh && wh.length > 0) setWarehouseCode(wh[0].code)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const skus = skuList.split(/[\n,]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
    const res = await fetch('/api/cycle-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || `Cycle Count — ${warehouseCode} — ${new Date().toLocaleDateString()}`,
        warehouse_code: warehouseCode,
        skus: skus.length > 0 ? skus : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false) }
    else router.push(`/cycle-counts/${data.session_id}`)
  }

  if (!profile) return null

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-lg space-y-5">
        <div>
          <a href="/cycle-counts" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Cycle Counts</a>
          <h1 className="text-xl font-semibold text-white">New Cycle Count</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Count Name (optional)</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`Cycle Count — ${warehouseCode} — ${new Date().toLocaleDateString()}`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Warehouse</label>
            <select className="input" value={warehouseCode} onChange={e => setWarehouseCode(e.target.value)} required>
              {warehouses.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">SKUs to Count (optional — leave blank for full warehouse)</label>
            <textarea
              className="input h-28 resize-y font-mono text-xs"
              value={skuList}
              onChange={e => setSkuList(e.target.value)}
              placeholder={"RG123456\nRG789012\n(one per line, or comma-separated)"}
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to include all SKUs with inventory in this warehouse</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {saving ? 'Creating…' : 'Start Cycle Count'}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
