'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/layout/AppLayout'
import type { UserRole } from '@/lib/supabase/types'

interface SavedFilter {
  id: string
  name: string
  criteria: Record<string, unknown>
}

interface PickerUser {
  id: string
  name: string
}

interface ReadyOrder {
  id: string
  order_number: string
  customer_name: string | null
  item_count: number
}

export default function NewPickSessionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; role: UserRole; id: string } | null>(null)
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [pickers, setPickers] = useState<PickerUser[]>([])
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([])
  const [selectedFilter, setSelectedFilter] = useState('')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [assignTo, setAssignTo] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('users').select('id, name, role').eq('id', user.id).single()
      if (p?.role !== 'admin') { router.push('/picking'); return }
      setProfile({ ...p, id: user.id })
      setAssignTo(user.id)

      const [{ data: f }, { data: u }] = await Promise.all([
        supabase.from('pick_session_filters').select('*').order('name'),
        supabase.from('users').select('id, name').order('name'),
      ])
      setFilters(f ?? [])
      setPickers(u ?? [])
    }
    load()
  }, [])

  async function loadReadyOrders() {
    setLoadingOrders(true)
    const { data } = await supabase
      .from('orders_ready_to_pick')
      .select('id, order_number, customer_name, item_count')
      .order('received_at')
      .limit(100)
    setReadyOrders(data ?? [])
    setSelectedOrders(new Set((data ?? []).map(o => o.id)))
    setLoadingOrders(false)
  }

  function toggleOrder(id: string) {
    setSelectedOrders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (selectedOrders.size === 0) { setError('Select at least one order'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/pick-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sessionName || `Session ${new Date().toLocaleDateString()}`,
        assigned_to: assignTo,
        order_ids: [...selectedOrders],
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create session'); setLoading(false) }
    else router.push(`/picking/${data.session_id}`)
  }

  if (!profile) return null

  return (
    <AppLayout role={profile.role} name={profile.name}>
      <div className="max-w-2xl space-y-5">
        <div>
          <a href="/picking" className="text-xs text-gray-500 hover:text-gray-300 mb-1 block">← Pick Sessions</a>
          <h1 className="text-xl font-semibold text-white">New Pick Session</h1>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          {/* Session config */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-medium text-gray-400">Session Details</h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Session Name (optional)</label>
              <input
                className="input"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder={`Session ${new Date().toLocaleDateString()}`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Assign To</label>
              <select className="input" value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                {pickers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Quick Filter</label>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={selectedFilter}
                  onChange={e => setSelectedFilter(e.target.value)}
                >
                  <option value="">— Load all ready orders —</option>
                  {filters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={loadReadyOrders}
                  disabled={loadingOrders}
                  className="bg-gray-700 hover:bg-gray-600 text-sm text-white px-4 py-2 rounded-lg transition-colors shrink-0"
                >
                  {loadingOrders ? 'Loading…' : 'Load Orders'}
                </button>
              </div>
            </div>
          </div>

          {/* Order selection */}
          {readyOrders.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-400">{readyOrders.length} ready orders</h2>
                <div className="flex gap-3 text-xs text-gray-400">
                  <button type="button" onClick={() => setSelectedOrders(new Set(readyOrders.map(o => o.id)))} className="hover:text-white">
                    Select all
                  </button>
                  <button type="button" onClick={() => setSelectedOrders(new Set())} className="hover:text-white">
                    Deselect all
                  </button>
                  <span className="text-blue-400">{selectedOrders.size} selected</span>
                </div>
              </div>
              <div className="divide-y divide-gray-800/50 max-h-72 overflow-y-auto">
                {readyOrders.map(order => (
                  <label key={order.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-800/40">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => toggleOrder(order.id)}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white font-medium">#{order.order_number}</span>
                      <span className="text-xs text-gray-400 ml-2">{order.customer_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{order.item_count} items</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || selectedOrders.size === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating…' : `Create Session (${selectedOrders.size} orders)`}
          </button>
        </form>
      </div>
    </AppLayout>
  )
}
