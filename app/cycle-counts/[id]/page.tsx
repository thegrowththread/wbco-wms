'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

interface CCItem {
  id: string
  sku: string
  expected_qty: number
  counted_qty: number | null
  variance: number | null
  is_approved: boolean
}

interface CCSession {
  id: string
  name: string
  warehouse_code: string
  status: string
}

export default function CycleCountSessionPage() {
  const router = useRouter()
  const { id: sessionId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; role: UserRole } | null>(null)
  const [session, setSession] = useState<CCSession | null>(null)
  const [items, setItems] = useState<CCItem[]>([])
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)

  const load = useCallback(async () => {
    const [{ data: sess }, { data: itms }] = await Promise.all([
      supabase.from('cycle_count_sessions').select('*').eq('id', sessionId).single(),
      supabase.from('cycle_count_items').select('*').eq('session_id', sessionId).order('sku'),
    ])
    setSession(sess)
    setItems(itms ?? [])
    setCounts(Object.fromEntries((itms ?? []).map(i => [i.id, i.counted_qty !== null ? String(i.counted_qty) : ''])))
  }, [sessionId])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/dashboard'); return }
      setProfile(p)
      await load()
    }
    init()
  }, [load])

  async function saveCounts() {
    setSaving(true)
    const updates = items.map(item => ({
      id: item.id,
      counted_qty: counts[item.id] !== '' ? parseInt(counts[item.id]) : null,
      variance: counts[item.id] !== '' ? parseInt(counts[item.id]) - item.expected_qty : null,
    }))
    for (const u of updates) {
      if (u.counted_qty !== null) {
        await supabase.from('cycle_count_items').update({ counted_qty: u.counted_qty, variance: u.variance }).eq('id', u.id)
      }
    }
    await load()
    setSaving(false)
  }

  async function approveAll() {
    const discrepancies = items.filter(i => i.variance !== null && i.variance !== 0 && !i.is_approved)
    for (const item of discrepancies) {
      await supabase.from('cycle_count_items').update({ is_approved: true }).eq('id', item.id)
      // Adjust inventory
      await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: item.sku,
          warehouse_code: session?.warehouse_code,
          quantity_change: item.variance,
          reason: 'Cycle count correction',
          notes: `Cycle count: ${session?.name}`,
        }),
      })
    }
    await load()
  }

  async function completeSession() {
    setCompleting(true)
    await supabase.from('cycle_count_sessions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', sessionId)
    router.push('/cycle-counts')
  }

  if (!profile || !session) return null

  const counted = items.filter(i => i.counted_qty !== null).length
  const discrepancies = items.filter(i => i.variance !== null && i.variance !== 0)
  const allCounted = counted === items.length

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-5">
        <div>
          <a href="/cycle-counts" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Cycle Counts</a>
          <h1 className="text-xl font-semibold text-white">{session.name}</h1>
          <p className="text-xs text-gray-400 mt-1">Warehouse: {session.warehouse_code} · {counted}/{items.length} counted</p>
        </div>

        {/* Progress */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${items.length > 0 ? (counted / items.length) * 100 : 0}%` }} />
        </div>

        {/* Summary stats */}
        {allCounted && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total SKUs" value={String(items.length)} />
            <Stat label="Discrepancies" value={String(discrepancies.length)} accent={discrepancies.length > 0 ? 'red' : undefined} />
            <Stat label="Match" value={`${items.length > 0 ? Math.round(((items.length - discrepancies.length) / items.length) * 100) : 100}%`} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={saveCounts} disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save Counts'}
          </button>
          {discrepancies.length > 0 && discrepancies.some(d => !d.is_approved) && (
            <button onClick={approveAll} className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              Approve & Apply All ({discrepancies.filter(d => !d.is_approved).length})
            </button>
          )}
          {allCounted && session.status !== 'completed' && (
            <button onClick={completeSession} disabled={completing} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {completing ? 'Completing…' : '✅ Complete Count'}
            </button>
          )}
        </div>

        {/* Count table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">System Qty</th>
                <th className="px-4 py-3 font-medium text-right">Counted</th>
                <th className="px-4 py-3 font-medium text-right">Variance</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const countVal = counts[item.id] ?? ''
                const variance = countVal !== '' ? parseInt(countVal) - item.expected_qty : null
                const hasDiscrepancy = variance !== null && variance !== 0
                return (
                  <tr key={item.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-2">
                      <a href={`/inventory/${encodeURIComponent(item.sku)}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs">{item.sku}</a>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-300">{item.expected_qty}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={countVal}
                        onChange={e => setCounts(c => ({ ...c, [item.id]: e.target.value }))}
                        disabled={session.status === 'completed'}
                        className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                    <td className={`px-4 py-2 text-right font-medium ${hasDiscrepancy ? (variance! > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                      {variance !== null ? (variance > 0 ? `+${variance}` : String(variance)) : '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-xs">
                      {item.is_approved ? (
                        <span className="text-green-400">✓ Applied</span>
                      ) : hasDiscrepancy ? (
                        <span className="text-yellow-400">⚠ Diff</span>
                      ) : variance === 0 ? (
                        <span className="text-gray-500">Match</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'red' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent === 'red' ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
