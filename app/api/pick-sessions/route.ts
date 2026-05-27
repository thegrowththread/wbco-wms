import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, assigned_to, order_ids } = await request.json()

    if (!assigned_to || !order_ids?.length) {
      return NextResponse.json({ error: 'Missing assigned_to or order_ids' }, { status: 400 })
    }

    // Create session
    const { data: session, error: sessErr } = await supabase
      .from('pick_sessions')
      .insert({
        name: name || `Session ${new Date().toLocaleDateString()}`,
        assigned_to,
        status: 'open',
        created_by: user.id,
        filters: {},
      })
      .select('id')
      .single()

    if (sessErr || !session) return NextResponse.json({ error: sessErr?.message ?? 'Failed to create session' }, { status: 500 })

    // Add orders to session
    for (let i = 0; i < order_ids.length; i++) {
      const orderId = order_ids[i]
      await supabase.from('pick_session_orders').insert({ session_id: session.id, order_id: orderId, sequence: i + 1 })

      // Update order status to picking
      await supabase.from('orders').update({ status: 'picking' }).eq('id', orderId)

      // Fetch order items and create pick session items
      const { data: items } = await supabase
        .from('order_items')
        .select('id, sku, title, quantity_ordered, quantity_picked, location_hint')
        .eq('order_id', orderId)

      if (items) {
        for (const item of items) {
          const remaining = item.quantity_ordered - item.quantity_picked
          if (remaining <= 0) continue

          // Find inventory location
          const { data: inv } = await supabase
            .from('inventory')
            .select('warehouse_code')
            .eq('sku', item.sku)
            .gt('quantity_on_hand', 0)
            .order('quantity_on_hand', { ascending: false })
            .limit(1)
            .single()

          await supabase.from('pick_session_items').insert({
            session_id: session.id,
            order_id: orderId,
            order_item_id: item.id,
            sku: item.sku,
            title: item.title,
            quantity_required: remaining,
            quantity_picked: 0,
            warehouse_code: inv.warehouse_code ?? null,
            location_hint: item.location_hint,
            is_complete: false,
          })
        }
      }
    }

    return NextResponse.json({ ok: true, session_id: session.id })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
