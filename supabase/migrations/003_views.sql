-- ============================================================
-- 003_views.sql — Computed views
-- Run after 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- inventory_summary
-- available = on_hand - pending
-- pending = sum of (qty_ordered - qty_picked) for orders in
--           [received, picking, qc]
-- ============================================================
CREATE OR REPLACE VIEW inventory_summary AS
SELECT
  p.sku,
  p.title,
  p.brand,
  p.classification,
  p.primary_supplier,
  p.cost,
  COALESCE(on_hand.total, 0) AS on_hand,
  COALESCE(pending.total, 0) AS pending,
  GREATEST(0, COALESCE(on_hand.total, 0) - COALESCE(pending.total, 0)) AS available
FROM products p
LEFT JOIN (
  SELECT sku, SUM(quantity_on_hand) AS total
  FROM inventory
  GROUP BY sku
) on_hand ON on_hand.sku = p.sku
LEFT JOIN (
  SELECT oi.sku, SUM(oi.quantity_ordered - oi.quantity_picked) AS total
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.status IN ('received', 'picking', 'qc')
  GROUP BY oi.sku
) pending ON pending.sku = p.sku;

-- ============================================================
-- orders_ready_to_pick
-- Ready = received status + all items have available stock
-- ============================================================
CREATE OR REPLACE VIEW orders_ready_to_pick AS
SELECT
  o.*,
  COUNT(oi.id) AS item_count,
  BOOL_AND(
    GREATEST(0, COALESCE(inv.total_on_hand, 0) - COALESCE(pend.total_pending, 0)) >= oi.quantity_ordered
  ) AS is_fully_in_stock
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN (
  SELECT sku, SUM(quantity_on_hand) AS total_on_hand
  FROM inventory
  GROUP BY sku
) inv ON inv.sku = oi.sku
LEFT JOIN (
  SELECT oi2.sku, SUM(oi2.quantity_ordered - oi2.quantity_picked) AS total_pending
  FROM order_items oi2
  JOIN orders o2 ON o2.id = oi2.order_id
  WHERE o2.status IN ('received', 'picking', 'qc')
  GROUP BY oi2.sku
) pend ON pend.sku = oi.sku
WHERE o.status = 'received'
GROUP BY o.id;
