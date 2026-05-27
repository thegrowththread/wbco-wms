export type UserRole = 'admin' | 'picker'
export type OrderStatus = 'pending_payment' | 'received' | 'picking' | 'qc' | 'fulfilled' | 'cancelled'
export type SessionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type PickResult = 'picked' | 'not_found' | 'wrong_item' | 'unable_to_pick' | 'override'
export type POStatus = 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled'
export type Platform = 'shopify' | 'amazon' | 'etsy' | 'faire' | 'manual'
export type InventoryReason = 'sale_pick' | 'count_adjustment' | 'receive' | 'return' | 'damage' | 'transfer_out' | 'transfer_in'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; name: string; role: UserRole; is_active: boolean; created_at: string }
        Insert: { id?: string; email: string; name: string; role: UserRole; is_active?: boolean; created_at?: string }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      warehouses: {
        Row: { id: string; code: string; name: string; is_active: boolean }
        Insert: { id?: string; code: string; name: string; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['warehouses']['Insert']>
      }
      locations: {
        Row: { id: string; warehouse_id: string; code: string; location_type: string; is_active: boolean }
        Insert: { id?: string; warehouse_id: string; code: string; location_type?: string; is_active?: boolean }
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
      }
      products: {
        Row: {
          sku: string; upc: string | null; fnsku: string | null; part_number: string | null
          title: string | null; note: string | null; moq: number | null; moq_info: string | null
          cost: number | null; retail_price: number | null; sale_price: number | null
          weight_value: number | null; weight_unit: string | null
          reorder_point: number | null; incremental_qty: number | null
          brand: string | null; primary_supplier: string | null
          primary_supplier_is_active: boolean | null; primary_supplier_cost: number | null
          primary_supplier_lead_time: number | null; primary_supplier_part_number: string | null
          classification: string | null; fulfillment_channel: string | null
          variation_parent_sku: string | null; disable_qty_sync: boolean | null
          short_description: string | null; long_description: string | null; picture_urls: string | null
          attribute1_name: string | null; attribute1_value: string | null
          attribute2_name: string | null; attribute2_value: string | null
          alternate_code_1: string | null; alternate_code_2: string | null
          alternate_sku_1: string | null; alternate_sku_2: string | null; alternate_sku_3: string | null
          alternate_sku_4: string | null; alternate_sku_5: string | null; alternate_sku_6: string | null
          alternate_sku_7: string | null
          shopify_product_id: string | null; shopify_variant_id: string | null
          shopify_inventory_item_id: string | null; amazon_asin: string | null
          is_active: boolean; sv_create_date: string | null; sv_modified_date: string | null
          created_at: string; updated_at: string
        }
        Insert: { sku: string; [key: string]: unknown }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      inventory: {
        Row: { id: string; sku: string; location_id: string; quantity_on_hand: number; last_known_location: string | null; updated_at: string }
        Insert: { id?: string; sku: string; location_id: string; quantity_on_hand?: number; last_known_location?: string | null; updated_at?: string }
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>
      }
      orders: {
        Row: { id: string; platform: Platform; platform_order_id: string; platform_order_number: string | null; customer_name: string | null; status: OrderStatus; received_at: string; fulfilled_at: string | null; notes: string | null }
        Insert: { id?: string; platform: Platform; platform_order_id: string; platform_order_number?: string | null; customer_name?: string | null; status?: OrderStatus; received_at?: string; fulfilled_at?: string | null; notes?: string | null }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: { id: string; order_id: string; sku: string; quantity_ordered: number; quantity_picked: number; unit_price: number | null }
        Insert: { id?: string; order_id: string; sku: string; quantity_ordered: number; quantity_picked?: number; unit_price?: number | null }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      pick_sessions: {
        Row: { id: string; session_name: string | null; user_id: string; warehouse_id: string; cart_label: string | null; status: SessionStatus; filter_name: string | null; created_at: string; started_at: string | null; completed_at: string | null }
        Insert: { id?: string; session_name?: string | null; user_id: string; warehouse_id: string; cart_label?: string | null; status?: SessionStatus; filter_name?: string | null; created_at?: string; started_at?: string | null; completed_at?: string | null }
        Update: Partial<Database['public']['Tables']['pick_sessions']['Insert']>
      }
      pick_session_orders: {
        Row: { pick_session_id: string; order_id: string; spot_number: number }
        Insert: { pick_session_id: string; order_id: string; spot_number: number }
        Update: Partial<Database['public']['Tables']['pick_session_orders']['Insert']>
      }
      pick_events: {
        Row: { id: string; pick_session_id: string; order_item_id: string; sku: string; location_id: string; quantity_picked: number; scanned_upc: string | null; result: PickResult; express_fill: boolean; picked_at: string }
        Insert: { id?: string; pick_session_id: string; order_item_id: string; sku: string; location_id: string; quantity_picked?: number; scanned_upc?: string | null; result: PickResult; express_fill?: boolean; picked_at?: string }
        Update: Partial<Database['public']['Tables']['pick_events']['Insert']>
      }
      purchase_orders: {
        Row: { id: string; po_number: string; supplier: string; status: POStatus; ordered_at: string | null; cancel_date: string | null; terms: string | null; tax_cost: number; shipping_cost: number; notes: string | null; created_by: string | null; created_at: string; received_at: string | null }
        Insert: { id?: string; po_number: string; supplier: string; status?: POStatus; ordered_at?: string | null; cancel_date?: string | null; terms?: string | null; tax_cost?: number; shipping_cost?: number; notes?: string | null; created_by?: string | null; created_at?: string; received_at?: string | null }
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>
      }
      kits: {
        Row: { id: string; kit_sku: string; kit_code: string | null; kit_title: string | null; kit_cost: number | null; kit_weight_lbs: number | null; kit_status: string | null; component_sku: string; component_code: string | null; component_line_name: string | null; component_qty: number; disable_qty_sync: boolean | null }
        Insert: { id?: string; kit_sku: string; component_sku: string; component_qty: number; [key: string]: unknown }
        Update: Partial<Database['public']['Tables']['kits']['Insert']>
      }
      inventory_log: {
        Row: { id: string; sku: string; location_id: string; quantity_delta: number; quantity_after: number; reason: InventoryReason; reference_id: string | null; notes: string | null; created_at: string; created_by: string }
        Insert: { id?: string; sku: string; location_id: string; quantity_delta: number; quantity_after: number; reason: InventoryReason; reference_id?: string | null; notes?: string | null; created_at?: string; created_by?: string }
        Update: Partial<Database['public']['Tables']['inventory_log']['Insert']>
      }
      webhook_log: {
        Row: { id: string; topic: string; platform_order_id: string | null; platform: string | null; payload_summary: Record<string,unknown> | null; processed: boolean; error_message: string | null; received_at: string }
        Insert: { id?: string; topic: string; platform_order_id?: string | null; platform?: string | null; payload_summary?: Record<string,unknown> | null; processed?: boolean; error_message?: string | null; received_at?: string }
        Update: Partial<Database['public']['Tables']['webhook_log']['Insert']>
      }
      platform_sync_log: {
        Row: { id: string; sku: string; platform: string; quantity_pushed: number; synced_at: string; trigger: string; success: boolean; error_message: string | null }
        Insert: { id?: string; sku: string; platform: string; quantity_pushed: number; synced_at?: string; trigger: string; success?: boolean; error_message?: string | null }
        Update: Partial<Database['public']['Tables']['platform_sync_log']['Insert']>
      }
    }
    Views: {
      inventory_summary: {
        Row: { sku: string; title: string | null; brand: string | null; classification: string | null; primary_supplier: string | null; cost: number | null; on_hand: number; pending: number; available: number }
      }
    }
    Functions: {
      get_user_role: { Args: Record<string, never>; Returns: string }
    }
  }
}
