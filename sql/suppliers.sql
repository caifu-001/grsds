-- ============================================================
-- 供应商库 SQL (请在 Supabase SQL Editor 中执行)
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT DEFAULT '[]',
  products TEXT DEFAULT '[]',
  category TEXT,
  cooperation_count INTEGER DEFAULT 0,
  cooperation_level TEXT DEFAULT 'C' CHECK(cooperation_level IN('A','B','C','D','E')),
  defect_rate NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sup_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_sup_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_sup_level ON suppliers(cooperation_level);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members view suppliers" ON suppliers;
CREATE POLICY "Company members view suppliers" ON suppliers FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=suppliers.company_id)
);

DROP POLICY IF EXISTS "Company members insert suppliers" ON suppliers;
CREATE POLICY "Company members insert suppliers" ON suppliers FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=suppliers.company_id)
);

DROP POLICY IF EXISTS "Company members update suppliers" ON suppliers;
CREATE POLICY "Company members update suppliers" ON suppliers FOR UPDATE USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=suppliers.company_id)
);

DROP POLICY IF EXISTS "Company members delete suppliers" ON suppliers;
CREATE POLICY "Company members delete suppliers" ON suppliers FOR DELETE USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=suppliers.company_id)
);

NOTIFY pgrst, 'reload schema';
