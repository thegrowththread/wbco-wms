'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

interface PickItem {
  id: string
  sku: string
  title: string | null
  quantity_required: number
  quantity_picked: number
  warehouse_code: string | null
  location_hint: string | null
  is_complete: boolean
  order_id: string
  order_number?: string
}

interface SessionData {
  id: string
  name: string
  status: string
  assigned_to: string
}

export default function PickSessionPage() {
  const router = useRouter()
  const { id: sessionId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; role: UserRole; id: string } | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [items, setItems] = useState<PickItem[]>([])
  const [activeItem, setActiveItem] = useState<PickItem | null>(null)
  const [pickedQty, setPickedQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  const loadSession = useCallback(async () => {
    const { data: sess } = await supabase
      .from('pick_sessions')
      .select('id, name, status, assigned_to')
      .eq('id', sessionId)
      .single()
    setSession(sess)

    const { data: rawItems } = await supabase
      .from('pick_session_items')
      .select('id, sku, title, quantity_required, quantity_picked, warehouse_code, location_hint, is_complete, order_id')
      .eq('session_id', sessionId)
      .order('is_complete')
      .order('warehouse_code')
      .order('sku')

    // Attach order numbers
    if (rawItems && rawItems.length > 0) {
      const orderIds = [...new Set(rawItems.map(i => i.order_id))]
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds)
      const orderMap = Object.fromEntries((orders ?? []).map(o => [o.id, o.order_number]))
      setItems(rawItems.map(i => ({ ...i, order_number: orderMap[i.order_id] })))
    } else {
      setItems([])
    }
  }, [sessionId])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('id, name, role').eq('id', user.id).single()
      setProfile({ ...p, id: user.id })
      await loadSession()
    }
    init()
  }, [loadSession])

  function openItem(item: PickItem) {
    setActiveItem(item)
    setPickedQty(String(item.quantity_required - item.quantity_picked))
    setError('')
  }

  async function submitPick() {
    if (!activeItem) return
    const qty = parseInt(pickedQty)
    if (isNaN(qty) || qty < 0) { setError('Enter a valid quantity'); return }
    setSaving(true)
    setError('')

    const res = await fetch(`/api/pick-sessions/${sessionId}/items/${activeItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity_picked: qty }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false) }
    else {
      setSaving(false)
      setActiveItem(null)
      await loadSession()
    }
  }

  async function completeSession() {
    setCompleting(true)
    const res = await fetch(`/api/pick-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    if (res.ok) router.push('/picking')
    else { setCompleting(false) }
  }

  if (!profile || !session) return null

  const pendingItems = items.filter(i => !i.is_complete)
  const doneItems = items.filter(i => i.is_complete)
  const allDone = pendingItems.length === 0 && items.length > 0
  const progress = items.length > 0 ? Math.round((doneItems.length / items.length) * 100) : 0

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="space-y-4 max-w-xl mx-auto">
        {/* Header */}
        <div>
          <a href="/picking" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Pick Sessions</a>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-white">{session.name}</h1>
            <span className="text-xs text-gray-400">{doneItems.length}/{items.length} done</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Complete session button */}
        {allDone && session.status !== 'completed' && (
          <button
            onClick={completeSession}
            disabled={completing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors"
          >
            {completing ? 'Completing…' : '✅ Complete Session'}
          </button>
        )}

        {session.status === 'completed' && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-green-400 text-sm text-center">
            ✅ Session completed
          </div>
        )}

        {/* Pick item modal */}
        {activeItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-mono">{activeItem.sku}</p>
                <p className="text-base font-medium text-white mt-1">{activeItem.title}</p>
              </div>
              {activeItem.location_hint && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg px-3 py-2">
                  <p className="text-xs text-yellow-400">📍 {activeItem.warehouse_code} — {activeItem.location_hint}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Quantity picked (need {activeItem.quantity_required - activeItem.quantity_picked})
                </label>
                <input
                  type="number"
                  min="0"
                  max={activeItem.quantity_required}
                  value={pickedQty}
                  onChange={e => setPickedQty(e.target.value)}
                  className="input text-2xl text-center font-bold"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setActiveItem(null)} className="flex-1 text-sm text-gray-400 border border-gray-700 rounded-lg py-2.5 hover:border-gray-500">
                  Cancel
                </button>
                <button
                  onClick={submitPick}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5"
                >
                  {saving ? 'Saving…' : 'Confirm Pick'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-medium text-white">To Pick ({pendingItems.length})</h2>
            </div>
            <div className="divide-y divide-gray-800/50">
              {pendingItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => openItem(item)}
                  disabled={session.status === 'completed'}
                  className="w-full text-left px-4 py-3.5 hover:bg-gray-800/60 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                      <p className="text-sm text-white mt-0.5 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Order #{item.order_number}
                        {item.location_hint && ` · ${item.warehouse_code}: ${item.location_hint}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-white">{item.quantity_required}</p>
                      <p className="text-xs text-gray-500">needed</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Done items */}
        {doneItems.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden opacity-60">
            <div className="px-4 py-3 border-b border-gray-800/50">
              <h2 className="text-sm font-medium text-gray-500">Picked ({doneItems.length})</h2>
            </div>
            <div className="divide-y divide-gray-800/30">
              {doneItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-green-400 text-sm">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                    <p className="text-sm text-gray-400 truncate">{item.title}</p>
                  </div>
                  <p className="text-sm text-green-400 font-medium">{item.quantity_picked}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
