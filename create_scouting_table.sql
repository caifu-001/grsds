-- 选品调研表
CREATE TABLE IF NOT EXISTS product_scouting (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  channel TEXT,                          -- 选品渠道
  product_name TEXT NOT NULL,            -- 产品名称
  product_category TEXT,                 -- 产品分类
  supplier_name TEXT,                    -- 供应商
  purchase_price NUMERIC DEFAULT 0,      -- 采购价
  selling_price NUMERIC DEFAULT 0,       -- 销售价格
  influencer_commission NUMERIC DEFAULT 0, -- 达人佣金
  compliance_requirements TEXT,          -- 合规要求
  product_params JSONB DEFAULT '{}',     -- 产品参数（JSONB）
  moq INTEGER,                           -- MOQ
  has_sample BOOLEAN DEFAULT FALSE,      -- 是否拿样品
  status TEXT DEFAULT 'pending',         -- pending/approved/rejected/ordered
  notes TEXT,                            -- 备注
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 权限：同一公司的用户可操作自己公司的选品数据
ALTER TABLE product_scouting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scouting_company_access" ON product_scouting FOR ALL
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));
