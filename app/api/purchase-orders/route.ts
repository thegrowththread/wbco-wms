import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function generatePONumber() {
  const date = new Date()
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PO-${yy}${mm}${dd}-${rand}`
}

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { supplier, expected_date, notes, items } = await request.json()

    if (!supplier || !items?.length) {
      return NextResponse.json({ error: 'Missing supplier or items' }, { status: 400 })
    }

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: generatePONumber(),
        supplier,
        status: 'draft',
        expected_date: expected_date || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (poErr || !po) return NextResponse.json({ error: poErr?.message ?? 'Failed to create PO' }, { status: 500 })

    const lineItems = items.map((item: { sku: string; title: string; quantity_ordered: number; unit_cost: number | null }) => ({
      po_id: po.id,
      sku: item.sku.trim().toUpperCase(),
      title: item.title || null,
      quantity_ordered: item.quantity_ordered,
      quantity_received: 0,
      unit_cost: item.unit_cost ?? null,
    }))

    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(lineItems)
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, po_id: po.id })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
