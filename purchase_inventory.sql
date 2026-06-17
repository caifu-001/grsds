-- ============================================================
-- grsds CRM — 进销存/采购管理 数据库表（一次性执行，幂等安全）
-- 在 Supabase SQL Editor 执行
-- 2026-06-17
-- ============================================================

-- 1. 产品SKU表（多规格变体）
CREATE TABLE IF NOT EXISTS product_skus (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  specs JSONB DEFAULT '{}',
  cost_price NUMERIC(12,2) DEFAULT 0,
  selling_price NUMERIC(12,2) DEFAULT 0,
  barcode TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, sku_code)
);
CREATE INDEX IF NOT EXISTS idx_ps_product ON product_skus(product_id);
CREATE INDEX IF NOT EXISTS idx_ps_company ON product_skus(company_id);
ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access product_skus" ON product_skus;
CREATE POLICY "Company access product_skus" ON product_skus FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=product_skus.company_id)
);

-- 2. 库存调拨单表
CREATE TABLE IF NOT EXISTS stock_transfers (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  from_warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
  to_warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
  transfer_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stf_company ON stock_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_stf_status ON stock_transfers(status);
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access stock_transfers" ON stock_transfers;
CREATE POLICY "Company access stock_transfers" ON stock_transfers FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=stock_transfers.company_id)
);

-- 2b. 调拨明细表
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id BIGSERIAL PRIMARY KEY,
  transfer_id BIGINT REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  sku_id BIGINT REFERENCES product_skus(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  remark TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sti_transfer ON stock_transfer_items(transfer_id);
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "Company access stock_transfer_items" ON stock_transfer_items FOR ALL USING (
  EXISTS(SELECT 1 FROM stock_transfers st JOIN profiles p ON p.company_id=st.company_id WHERE st.id=stock_transfer_items.transfer_id AND p.user_id=auth.uid())
);

-- 3. 采购单表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access purchase_orders" ON purchase_orders;
CREATE POLICY "Company access purchase_orders" ON purchase_orders FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=purchase_orders.company_id)
);

-- 3b. 采购明细表
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  po_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  sku_id BIGINT REFERENCES product_skus(id) ON DELETE SET NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  received_qty NUMERIC(12,2) DEFAULT 0,
  warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE SET NULL,
  remark TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(po_id);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access purchase_order_items" ON purchase_order_items;
CREATE POLICY "Company access purchase_order_items" ON purchase_order_items FOR ALL USING (
  EXISTS(SELECT 1 FROM purchase_orders po JOIN profiles p ON p.company_id=po.company_id WHERE po.id=purchase_order_items.po_id AND p.user_id=auth.uid())
);

-- 4. 供应商结算表
CREATE TABLE IF NOT EXISTS supplier_settlements (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  po_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  settlement_date DATE DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'bank',
  status TEXT DEFAULT 'pending',
  invoice_no TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ss_company ON supplier_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_ss_supplier ON supplier_settlements(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ss_po ON supplier_settlements(po_id);
ALTER TABLE supplier_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access supplier_settlements" ON supplier_settlements;
CREATE POLICY "Company access supplier_settlements" ON supplier_settlements FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=supplier_settlements.company_id)
);

-- 5. 库存台账视图（运行余额）
CREATE OR REPLACE VIEW stock_ledger AS
SELECT
  sr.id,
  sr.company_id,
  sr.product_id,
  sr.warehouse_id,
  sr.type,
  sr.quantity,
  sr.unit_price,
  (sr.quantity * sr.unit_price) AS amount,
  sr.batch_no,
  sr.remark,
  sr.created_at,
  sr.recorded_by
FROM stock_records sr
ORDER BY sr.product_id, sr.warehouse_id, sr.created_at;

-- ============================================================
-- DONE
-- ============================================================
NOTIFY pgrst, 'reload schema';
