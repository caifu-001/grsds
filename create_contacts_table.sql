-- ============================================================
-- 创建 contacts 表（联系人表）
-- 在 Supabase SQL Editor 执行
-- ============================================================

-- 先检查表是否存在
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='contacts' AND table_schema='public') THEN
    RAISE NOTICE 'contacts 表已存在，跳过 CREATE TABLE';
  ELSE
    RAISE NOTICE 'contacts 表不存在，即将创建...';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  is_decision_maker BOOLEAN DEFAULT false,
  birthday DATE,
  relationship_to TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access contacts" ON contacts;
CREATE POLICY "Company access contacts" ON contacts FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=contacts.company_id)
);

-- 验证
SELECT 'contacts 表已就绪' AS status;
