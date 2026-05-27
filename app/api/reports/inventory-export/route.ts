import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: rows } = await supabase
      .from('inventory_summary')
      .select('sku, title, brand, classification, primary_supplier, cost, on_hand, pending, available')
      .order('sku')

    if (!rows) return NextResponse.json({ error: 'No data' }, { status: 500 })

    const headers = ['SKU', 'Title', 'Brand', 'Classification', 'Supplier', 'Cost', 'On Hand', 'Pending', 'Available']
    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        r.sku,
        `"${(r.title ?? '').replace(/"/g, '""')}"`,
        r.brand ?? '',
        r.classification ?? '',
        r.primary_supplier ?? '',
        r.cost ?? '',
        r.on_hand ?? 0,
        r.pending ?? 0,
        r.available ?? 0,
      ].join(',')),
    ]

    const csv = csvRows.join('\n')
    const date = new Date().toISOString().slice(0, 10)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wbco-inventory-${date}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
