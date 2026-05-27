import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: poId } = await params
    const { warehouse_code, quantities } = await request.json()
    // quantities: { [item_id]: qty_received_this_time }

    if (!warehouse_code || !quantities) {
      return NextResponse.json({ error: 'Missing warehouse_code or quantities' }, { status: 400 })
    }

    const { data: poItems } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', poId)

    if (!poItems) return NextResponse.json({ error: 'PO not found' }, { status: 404 })

    let allReceived = true

    for (const item of poItems) {
      const receivingNow = quantities[item.id] ?? 0
      if (receivingNow <= 0) { allReceived = false; continue }

      const newReceived = item.quantity_received + receivingNow
      if (newReceived < item.quantity_ordered) allReceived = false

      // Update PO item
      await supabase
        .from('purchase_order_items')
        .update({ quantity_received: newReceived })
        .eq('id', item.id)

      // Add to inventory
      const { data: existing } = await supabase
        .from('inventory')
        .select('quantity_on_hand')
        .eq('sku', item.sku)
        .eq('warehouse_code', warehouse_code)
        .single()

      const currentQty = existing?.quantity_on_hand ?? 0
      await supabase.from('inventory').upsert({
        sku: item.sku,
        warehouse_code,
        quantity_on_hand: currentQty + receivingNow,
        updated_at: new Date().toISOString(),
      })

      // Log adjustment
      await supabase.from('inventory_adjustments').insert({
        sku: item.sku,
        warehouse_code,
        quantity_change: receivingNow,
        reason: 'Receiving / PO',
        notes: `PO ${poId}`,
        adjusted_by: user.id,
        adjusted_at: new Date().toISOString(),
      })

      // Update product cost if provided
      if (item.unit_cost) {
        await supabase.from('products').update({ cost: item.unit_cost }).eq('sku', item.sku)
      }
    }

    // Update PO status
    const newStatus = allReceived ? 'received' : 'partial'
    await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', poId)

    return NextResponse.json({ ok: true, status: newStatus })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
