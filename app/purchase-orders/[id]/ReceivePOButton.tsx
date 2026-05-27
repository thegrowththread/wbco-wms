'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface POItem {
  id: string
  sku: string
  title: string | null
  quantity_ordered: number
  quantity_received: number
}

export default function ReceivePOButton({ poId, items }: { poId: string; items: POItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(items.map(i => [i.id, i.quantity_ordered - i.quantity_received]))
  )
  const [warehouseCode, setWarehouseCode] = useState('340')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleReceive() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouse_code: warehouseCode, quantities }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false) }
    else { setOpen(false); router.refresh() }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 text-sm text-white px-3 py-1.5 rounded-lg transition-colors">
        Receive Items
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white">Receive Items</h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Receive into Warehouse</label>
              <input className="input" value={warehouseCode} onChange={e => setWarehouseCode(e.target.value.toUpperCase())} placeholder="340" />
            </div>

            <div className="space-y-2">
              {items.filter(i => i.quantity_received < i.quantity_ordered).map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-mono">{item.sku}</p>
                    <p className="text-sm text-gray-300 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">Ordered: {item.quantity_ordered} · Already received: {item.quantity_received}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity_ordered - item.quantity_received}
                    value={quantities[item.id] ?? 0}
                    onChange={e => setQuantities(q => ({ ...q, [item.id]: parseInt(e.target.value) || 0 }))}
                    className="input w-20 text-center text-sm"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="flex-1 text-sm text-gray-400 border border-gray-700 rounded-lg py-2 hover:border-gray-500">
                Cancel
              </button>
              <button onClick={handleReceive} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2">
                {saving ? 'Receiving…' : 'Confirm Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
