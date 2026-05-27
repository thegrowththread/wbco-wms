-- ============================================================
-- 002_rls_policies.sql -- Row Level Security
-- ============================================================

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_session_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_session_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pick_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_count_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sync_log   ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "warehouses_select_all" ON warehouses
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "warehouses_write_admin" ON warehouses
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "locations_select_all" ON locations
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "locations_write_admin" ON locations
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "products_select_all" ON products
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "products_write_admin" ON products
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "product_suppliers_admin" ON product_suppliers
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "kits_select_all" ON kits
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kits_write_admin" ON kits
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "inventory_select_all" ON inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "inventory_write_admin" ON inventory
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "orders_select_all" ON orders
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "orders_write_admin" ON orders
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "order_items_select_all" ON order_items
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "order_items_write_admin" ON order_items
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "pick_sessions_select" ON pick_sessions
  FOR SELECT USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "pick_sessions_insert" ON pick_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pick_sessions_update" ON pick_sessions
  FOR UPDATE USING (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "pick_sessions_delete_admin" ON pick_sessions
  FOR DELETE USING (get_user_role() = 'admin');

CREATE POLICY "pick_session_filters_select" ON pick_session_filters
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pick_session_filters_write_admin" ON pick_session_filters
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "pick_session_orders_all" ON pick_session_orders
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "pick_events_select" ON pick_events
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "pick_events_insert" ON pick_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pick_events_update_admin" ON pick_events
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "qc_events_select" ON qc_events
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "qc_events_insert" ON qc_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "qc_events_update_admin" ON qc_events
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "inventory_log_admin" ON inventory_log
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "cycle_counts_all" ON cycle_counts
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "cycle_count_items_all" ON cycle_count_items
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "purchase_orders_admin" ON purchase_orders
  FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "purchase_order_items_admin" ON purchase_order_items
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "webhook_log_admin" ON webhook_log
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "platform_sync_log_admin" ON platform_sync_log
  FOR ALL USING (get_user_role() = 'admin');
