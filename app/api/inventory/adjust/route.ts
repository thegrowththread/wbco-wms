import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { sku, warehouse_code, quantity_change, reason, notes } = body

    if (!sku || !warehouse_code || quantity_change === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Upsert inventory row
    const { data: existing } = await supabase
      .from('inventory')
      .select('quantity_on_hand')
      .eq('sku', sku)
      .eq('warehouse_code', warehouse_code)
      .single()

    const currentQty = existing?.quantity_on_hand ?? 0
    const newQty = currentQty + quantity_change

    if (newQty < 0) {
      return NextResponse.json({ error: `Cannot reduce below zero. Current qty: ${currentQty}` }, { status: 400 })
    }

    // Upsert inventory
    const { error: invError } = await supabase
      .from('inventory')
      .upsert({ sku, warehouse_code, quantity_on_hand: newQty, updated_at: new Date().toISOString() })

    if (invError) return NextResponse.json({ error: invError.message }, { status: 500 })

    // Record adjustment
    const { error: adjError } = await supabase
      .from('inventory_adjustments')
      .insert({
        sku,
        warehouse_code,
        quantity_change,
        reason,
        notes: notes || null,
        adjusted_by: user.id,
        adjusted_at: new Date().toISOString(),
      })

    if (adjError) return NextResponse.json({ error: adjError.message }, { status: 500 })

    return NextResponse.json({ ok: true, new_qty: newQty })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
