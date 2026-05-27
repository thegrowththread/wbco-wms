import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId, itemId } = await params
    const { quantity_picked } = await request.json()

    if (quantity_picked === undefined || quantity_picked < 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    // Get the pick session item
    const { data: pickItem } = await supabase
      .from('pick_session_items')
      .select('*')
      .eq('id', itemId)
      .eq('session_id', sessionId)
      .single()

    if (!pickItem) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const isComplete = quantity_picked >= pickItem.quantity_required
    const newTotal = pickItem.quantity_picked + quantity_picked

    // Update pick session item
    await supabase
      .from('pick_session_items')
      .update({
        quantity_picked: newTotal,
        is_complete: isComplete,
        picked_at: new Date().toISOString(),
        picked_by: user.id,
      })
      .eq('id', itemId)

    // Update the corresponding order item's quantity_picked
    if (pickItem.order_item_id && quantity_picked > 0) {
      const { data: orderItem } = await supabase
        .from('order_items')
        .select('quantity_picked')
        .eq('id', pickItem.order_item_id)
        .single()

      if (orderItem) {
        await supabase
          .from('order_items')
          .update({ quantity_picked: orderItem.quantity_picked + quantity_picked })
          .eq('id', pickItem.order_item_id)
      }

      // Reduce inventory
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity_on_hand')
        .eq('sku', pickItem.sku)
        .eq('warehouse_code', pickItem.warehouse_code)
        .single()

      if (inv && pickItem.warehouse_code) {
        const newQty = Math.max(0, inv.quantity_on_hand - quantity_picked)
        await supabase
          .from('inventory')
          .update({ quantity_on_hand: newQty, updated_at: new Date().toISOString() })
          .eq('sku', pickItem.sku)
          .eq('warehouse_code', pickItem.warehouse_code)

        // Record adjustment
        await supabase.from('inventory_adjustments').insert({
          sku: pickItem.sku,
          warehouse_code: pickItem.warehouse_code,
          quantity_change: -quantity_picked,
          reason: 'Picking',
          notes: `Pick session item ${itemId}`,
          adjusted_by: user.id,
          adjusted_at: new Date().toISOString(),
        })
      }
    }

    // Check if session should auto-start
    const { data: session } = await supabase.from('pick_sessions').select('status').eq('id', sessionId).single()
    if (session?.status === 'open') {
      await supabase.from('pick_sessions').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', sessionId)
    }

    return NextResponse.json({ ok: true, is_complete: isComplete })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
