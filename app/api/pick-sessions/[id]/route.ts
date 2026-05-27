import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const { status } = await request.json()

    if (status === 'in_progress') {
      await supabase
        .from('pick_sessions')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', sessionId)
    } else if (status === 'completed') {
      // Get all orders in session and update to QC
      const { data: sessionOrders } = await supabase
        .from('pick_session_orders')
        .select('order_id')
        .eq('session_id', sessionId)

      if (sessionOrders) {
        for (const so of sessionOrders) {
          await supabase.from('orders').update({ status: 'qc' }).eq('id', so.order_id)
        }
      }

      await supabase
        .from('pick_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
