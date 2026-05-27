import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { name, warehouse_code, skus } = await request.json()

    if (!warehouse_code) return NextResponse.json({ error: 'Missing warehouse_code' }, { status: 400 })

    // Create session
    const { data: session, error: sessErr } = await supabase
      .from('cycle_count_sessions')
      .insert({
        name: name || `Cycle Count — ${warehouse_code} — ${new Date().toLocaleDateString()}`,
        warehouse_code,
        status: 'open',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (sessErr || !session) return NextResponse.json({ error: sessErr?.message ?? 'Failed' }, { status: 500 })

    // Get inventory for this warehouse (optionally filtered by SKU list)
    let invQuery = supabase
      .from('inventory')
      .select('sku, quantity_on_hand')
      .eq('warehouse_code', warehouse_code)
      .gt('quantity_on_hand', 0)

    if (skus && skus.length > 0) {
      invQuery = invQuery.in('sku', skus)
    }

    const { data: invRows } = await invQuery.order('sku')

    if (invRows && invRows.length > 0) {
      const countItems = invRows.map(row => ({
        session_id: session.id,
        sku: row.sku,
        expected_qty: row.quantity_on_hand,
        counted_qty: null,
        variance: null,
        is_approved: false,
      }))

      await supabase.from('cycle_count_items').insert(countItems)
    }

    return NextResponse.json({ ok: true, session_id: session.id, item_count: invRows?.length ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
