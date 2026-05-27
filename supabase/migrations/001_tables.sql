-- ============================================================
-- 001_tables.sql -- WBCO WMS full schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'picker')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE locations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  code           TEXT NOT NULL,
  location_type  TEXT NOT NULL DEFAULT 'other'
                 CHECK (location_type IN ('zone','aisle','table_bin','container','mixbox','other')),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (warehouse_id, code)
);
CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_code ON locations(code);

CREATE TABLE products (
  sku                          TEXT PRIMARY KEY,
  upc                          TEXT,
  fnsku                        TEXT,
  part_number                  TEXT,
  title                        TEXT,
  note                         TEXT,
  moq                          INTEGER DEFAULT 1,
  moq_info                     TEXT,
  cost                         DECIMAL(10,4),
  retail_price                 DECIMAL(10,2),
  sale_price                   DECIMAL(10,2),
  weight_value                 DECIMAL(8,3),
  weight_unit                  TEXT DEFAULT 'lbs',
  reorder_point                INTEGER DEFAULT 0,
  incremental_qty              INTEGER DEFAULT 1,
  brand                        TEXT,
  primary_supplier             TEXT CHECK (primary_supplier IN (
                                 'Craig Bachman','PDW','Discontinued',
                                 'Travis UV Printer','Hobby Lobby','Jascotina','Unknown'
                               ) OR primary_supplier IS NULL),
  primary_supplier_is_active   BOOLEAN,
  primary_supplier_cost        DECIMAL(10,4),
  primary_supplier_lead_time   INTEGER,
  primary_supplier_part_number TEXT,
  classification               TEXT,
  fulfillment_channel          TEXT DEFAULT 'FBM',
  variation_parent_sku         TEXT,
  disable_qty_sync             BOOLEAN DEFAULT false,
  short_description            TEXT,
  long_description             TEXT,
  picture_urls                 TEXT,
  attribute1_name              TEXT, attribute1_value TEXT,
  attribute2_name              TEXT, attribute2_value TEXT,
  alternate_code_1             TEXT, alternate_code_2 TEXT,
  alternate_sku_1              TEXT, alternate_sku_2 TEXT, alternate_sku_3 TEXT,
  alternate_sku_4              TEXT, alternate_sku_5 TEXT, alternate_sku_6 TEXT, alternate_sku_7 TEXT,
  shopify_product_id           TEXT, shopify_variant_id TEXT, shopify_inventory_item_id TEXT,
  amazon_asin                  TEXT,
  is_active                    BOOLEAN NOT NULL DEFAULT true,
  sv_create_date               TIMESTAMPTZ, sv_modified_date TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_upc ON products(upc);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_supplier ON products(primary_supplier);
CREATE INDEX idx_products_shopify_variant ON products(shopify_variant_id);

CREATE TABLE product_suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku         TEXT NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
  supplier    TEXT NOT NULL,
  cost        DECIMAL(10,4),
  lead_time   INTEGER,
  part_number TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_product_suppliers_sku ON product_suppliers(sku);

CREATE TABLE kits (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_sku             TEXT NOT NULL,
  kit_code            TEXT, kit_title TEXT, kit_cost DECIMAL(10,4),
  kit_weight_lbs      DECIMAL(8,3), kit_status TEXT,
  component_sku       TEXT NOT NULL REFERENCES products(sku),
  component_code      TEXT, component_line_name TEXT,
  component_qty       INTEGER NOT NULL DEFAULT 1,
  disable_qty_sync    BOOLEAN DEFAULT false
);
CREATE INDEX idx_kits_kit_sku ON kits(kit_sku);
CREATE INDEX idx_kits_component_sku ON kits(component_sku);

CREATE TABLE inventory (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                TEXT NOT NULL REFERENCES products(sku),
  location_id        UUID NOT NULL REFERENCES locations(id),
  quantity_on_hand   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  last_known_location TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku, location_id)
);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_location ON inventory(location_id);

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform              TEXT NOT NULL CHECK (platform IN ('shopify','amazon','etsy','faire','manual')),
  platform_order_id     TEXT NOT NULL UNIQUE,
  platform_order_number TEXT,
  customer_name         TEXT,
  status                TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('pending_payment','received','picking','qc','fulfilled','cancelled')),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at          TIMESTAMPTZ,
  notes                 TEXT
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_platform ON orders(platform);

CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku              TEXT NOT NULL REFERENCES products(sku),
  quantity_ordered INTEGER NOT NULL,
  quantity_picked  INTEGER NOT NULL DEFAULT 0,
  unit_price       DECIMAL(10,2)
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

CREATE TABLE pick_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_name TEXT,
  user_id      UUID NOT NULL REFERENCES users(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  cart_label   TEXT,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open','in_progress','completed','cancelled')),
  filter_name  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at   TIMESTAMPTZ, completed_at TIMESTAMPTZ
);
CREATE INDEX idx_pick_sessions_user ON pick_sessions(user_id);
CREATE INDEX idx_pick_sessions_status ON pick_sessions(status);

CREATE TABLE pick_session_filters (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  criteria   JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pick_session_orders (
  pick_session_id UUID NOT NULL REFERENCES pick_sessions(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id),
  spot_number     INTEGER NOT NULL,
  PRIMARY KEY (pick_session_id, order_id)
);

CREATE TABLE pick_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pick_session_id UUID NOT NULL REFERENCES pick_sessions(id),
  order_item_id   UUID NOT NULL REFERENCES order_items(id),
  sku             TEXT NOT NULL,
  location_id     UUID NOT NULL REFERENCES locations(id),
  quantity_picked INTEGER NOT NULL DEFAULT 0,
  scanned_upc     TEXT,
  result          TEXT NOT NULL CHECK (result IN ('picked','not_found','wrong_item','unable_to_pick','override')),
  express_fill    BOOLEAN NOT NULL DEFAULT false,
  picked_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pick_events_session ON pick_events(pick_session_id);

CREATE TABLE qc_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  scanned_code  TEXT, expected_sku TEXT NOT NULL,
  result        TEXT NOT NULL CHECK (result IN ('pass','fail','override')),
  quantity      INTEGER NOT NULL DEFAULT 1,
  fail_reason   TEXT, notes TEXT,
  user_id       UUID NOT NULL REFERENCES users(id),
  qc_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qc_events_order ON qc_events(order_id);

CREATE TABLE inventory_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku            TEXT NOT NULL,
  location_id    UUID NOT NULL REFERENCES locations(id),
  quantity_delta INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('sale_pick','count_adjustment','receive','return','damage','transfer_out','transfer_in')),
  reference_id   TEXT, notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by     TEXT NOT NULL DEFAULT 'system'
);
CREATE INDEX idx_inventory_log_sku ON inventory_log(sku);

CREATE TABLE cycle_counts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id  UUID NOT NULL REFERENCES locations(id),
  counted_by   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','discarded')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE cycle_count_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_count_id  UUID NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
  sku             TEXT NOT NULL REFERENCES products(sku),
  expected_qty    INTEGER NOT NULL DEFAULT 0,
  counted_qty     INTEGER,
  variance        INTEGER GENERATED ALWAYS AS (counted_qty - expected_qty) STORED,
  scanned_upc     TEXT,
  adjusted        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number     TEXT NOT NULL UNIQUE,
  supplier      TEXT NOT NULL CHECK (supplier IN ('Craig Bachman','PDW','Discontinued','Travis UV Printer','Hobby Lobby','Jascotina','Unknown')),
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ordered','partial','received','cancelled')),
  ordered_at    DATE, cancel_date DATE, terms TEXT,
  tax_cost      DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at   TIMESTAMPTZ
);

CREATE TABLE purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id               UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sku                 TEXT NOT NULL REFERENCES products(sku),
  quantity_ordered    INTEGER NOT NULL,
  quantity_received   INTEGER NOT NULL DEFAULT 0,
  unit_cost           DECIMAL(10,4), notes TEXT,
  receive_location_id UUID REFERENCES locations(id)
);

CREATE TABLE webhook_log (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic             TEXT NOT NULL,
  platform_order_id TEXT, platform TEXT,
  payload_summary   JSONB,
  processed         BOOLEAN NOT NULL DEFAULT false,
  error_message     TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform_sync_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku             TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('shopify','amazon')),
  quantity_pushed INTEGER NOT NULL,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger         TEXT NOT NULL CHECK (trigger IN ('order_received','pick_closed','count_adjusted','manual')),
  success         BOOLEAN NOT NULL DEFAULT true,
  error_message   TEXT
);
